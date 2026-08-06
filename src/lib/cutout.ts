// 浏览器端智能抠图（衣物去背景）
//
// 之前抠图走 Supabase Edge Function，但 @imgly/background-removal 首次要下载
// 40-70MB 模型，而 Edge Function 默认超时仅 10 秒，冷启动必然超时 → 网关 non-2xx。
// 改成本地（浏览器）运行：这是该库原本的设计用法，彻底消灭服务器超时/冷启动/鉴权问题。
//
// 浏览器首次会下载模型（~40MB，之后浏览器缓存），用本机 CPU 跑 5-20 秒，对个人衣物 app 完全 OK。

import { supabase } from '@/lib/supabase';

export type CutoutProgress = (pct: number, phase: 'download' | 'compute') => void;

// 从 Supabase 公开 URL 中解析出 storage 对象路径（相对 bucket），用于 SDK 下载，避开 CORS
function extractStoragePath(publicUrl: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

/**
 * 对一张衣物图做去背景，结果上传到 Storage，返回公开 URL。
 * @param imageUrl 原图公开 URL
 * @param userId   当前用户 id（决定上传目录，受 RLS 限制只能写自己目录）
 * @param onProgress 进度回调（0-100）
 */
export async function runClientCutout(
  imageUrl: string,
  userId: string,
  onProgress?: CutoutProgress,
): Promise<string> {
  // 1. 拿到原图 Blob（优先用 SDK 下载，避免跨域；失败再用 fetch 兜底）
  let inputBlob: Blob;
  const path = extractStoragePath(imageUrl, 'wardrobe');
  if (path) {
    const { data, error } = await supabase.storage.from('wardrobe').download(path);
    if (error || !data) {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`原图下载失败(HTTP ${res.status})`);
      inputBlob = await res.blob();
    } else {
      inputBlob = data;
    }
  } else {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`原图下载失败(HTTP ${res.status})`);
    inputBlob = await res.blob();
  }

  // 2. 动态加载抠图库（仅浏览器端执行，避免 SSR/构建报错）
  onProgress?.(0, 'download');
  const { removeBackground } = await import('@imgly/background-removal');

  // 3. 去背景（ML 模型，首次需下载模型）
  const cutoutBlob: Blob = await removeBackground(inputBlob, {
    model: 'isnet_fp16',
    output: { format: 'image/png' },
    progress: (key, current, total) => {
      if (!total) return;
      const pct = Math.round((current / total) * 100);
      onProgress?.(pct, key === 'fetch' ? 'download' : 'compute');
    },
  });
  onProgress?.(100, 'compute');

  // 4. 上传结果到 Storage（走用户会话，受 RLS 约束只能写 cutout/{userId}/）
  const fileName = `cutout/${userId}/${Date.now()}.png`;
  const { error: upErr } = await supabase.storage
    .from('wardrobe')
    .upload(fileName, cutoutBlob, {
      contentType: 'image/png',
      upsert: true,
      cacheControl: '3600',
    });
  if (upErr) throw new Error('结果图上传失败: ' + upErr.message);

  const { data } = supabase.storage.from('wardrobe').getPublicUrl(fileName);
  return data.publicUrl;
}
