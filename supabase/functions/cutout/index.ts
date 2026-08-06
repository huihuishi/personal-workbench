// Supabase Edge Function: 智能抠图（衣物去背景）
//
// 调用：supabase.functions.invoke('cutout', { body: { imageUrl, userId } })
//
// 注意：首次调用会下载 ML 模型(~40-70MB)，耗时 10-30 秒属正常。
//       后续调用(实例预热后)通常 3-10 秒。

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  removeBackground,
  type Config,
} from 'https://esm.sh/@imgly/background-removal@1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  const t0 = Date.now()
  const log = (step: string) => console.log(`[cutout ${new Date().toISOString()} +${Date.now()-t0}ms] ${step}`)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: '仅支持 POST' }, 405)
  }

  try {
    // --- 1. 环境检查 ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      log('ERROR: 缺少环境变量')
      return json({ error: '服务端缺少环境变量(SUPABASE_URL / SERVICE_ROLE_KEY)', step: 'env' }, 500)
    }

    // --- 2. 身份校验 ---
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !user) {
      log(`AUTH_FAIL: ${authErr?.message}`)
      return json({ error: '未授权，请先登录', detail: authErr?.message }, 401)
    }
    log(`AUTH_OK: user=${user.id}`)

    // --- 3. 参数校验 ---
    const body = await req.json()
    const { imageUrl, userId } = body as { imageUrl?: string; userId?: string }
    if (!imageUrl || !userId) {
      return json({ error: '缺少 imageUrl 或 userId', received: { imageUrl: !!imageUrl, userId: !!userId } }, 400)
    }
    if (userId !== user.id) {
      return json({ error: '无权操作他人衣物' }, 403)
    }
    log(`PARAMS_OK: img=${imageUrl.slice(0,80)}...`)

    // --- 4. 下载原图 ---
    log('FETCH_IMG: start')
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) {
      log(`FETCH_IMG_FAIL: HTTP ${imgRes.status}`)
      return json({ error: `原图下载失败(HTTP ${imgRes.status})`, url: imageUrl.slice(0,100) }, 502)
    }
    const inputBlob = await imgRes.blob()
    log(`FETCH_IMG_OK: size=${(inputBlob.size/1024/1024).toFixed(1)}MB type=${inputBlob.type}`)

    // --- 5. 去背景（ML 模型） ---
    log('REMOVE_BG: start (首次调用需下载模型 ~40-70MB, 请耐心等待)')
    const config: Config = {
      model: 'isnet_fp16',
      output: { format: 'image/png' },
      progress: (key, current, total) => {
        if (current % 5 === 0 || current === total) {
          log(`PROGRESS: ${key} ${current}/${total}`)
        }
      },
    }
    const cutoutBlob: Blob = await removeBackground(inputBlob, config)
    log(`REMOVE_BG_OK: output=${(cutoutBlob.size/1024/1024).toFixed(1)}MB took ${Date.now()-t0}ms total`)

    // --- 6. 上传结果 ---
    const fileName = `cutout/${userId}/${Date.now()}.png`
    const { error: upErr } = await admin.storage
      .from('wardrobe')
      .upload(fileName, cutoutBlob, {
        contentType: 'image/png',
        upsert: true,
        cacheControl: '3600',
      })
    if (upErr) {
      log(`UPLOAD_FAIL: ${upErr.message}`)
      return json({ error: '结果图上传失败: ' + upErr.message }, 500)
    }
    const { data } = admin.storage.from('wardrobe').getPublicUrl(fileName)
    log(`DONE: ${data.publicUrl.slice(0,80)}...`)

    return json({ cutoutUrl: data.publicUrl, timingMs: Date.now() - t0 })

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    log(`CATCH_ERROR: ${msg} stack=${e instanceof Error ? e.stack?.slice(0,300) : ''}`)
    // 区分超时和其他错误
    const isTimeout = msg.toLowerCase().includes('timeout') ||
                       msg.toLowerCase().includes('aborted') ||
                       msg.toLowerCase().includes('signal')
    return json({
      error: '抠图失败: ' + msg,
      step: isTimeout ? 'timeout' : 'unknown',
      hint: isTimeout ? '模型可能仍在下载中(首次~40-70MB)，请稍后重试' : undefined,
      timingMs: Date.now() - t0,
    }, 500)
  }
})
