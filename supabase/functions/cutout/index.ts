// Supabase Edge Function: 智能抠图（衣物去背景）
//
// 功能：接收衣物原图 URL，使用 @imgly/background-removal 在云端完成去背景，
//      将透明 PNG 结果上传到 wardrobe 存储桶，返回公开访问地址。
//
// 部署：
//   supabase functions deploy cutout --no-verify-jwt
//   （--no-verify-jwt 由函数内部自行校验用户，避免 JWT 受众不匹配问题）
//
// 调用（前端）：
//   supabase.functions.invoke('cutout', { body: { imageUrl, userId } })

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import {
  removeBackground,
  type Config,
} from 'https://esm.sh/@imgly/background-removal@1.5.4'

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
  // 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: '仅支持 POST' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      return json({ error: '服务端缺少环境变量' }, 500)
    }

    // 用 service role 客户端（不受 RLS 限制，负责上传结果图）
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    // 校验调用者身份（前端 anon 客户端会自动带上用户 JWT）
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const {
      data: { user },
      error: authErr,
    } = await admin.auth.getUser(token)
    if (authErr || !user) {
      return json({ error: '未授权，请先登录' }, 401)
    }

    const { imageUrl, userId } = (await req.json()) as {
      imageUrl?: string
      userId?: string
    }
    if (!imageUrl || !userId) {
      return json({ error: '缺少 imageUrl 或 userId' }, 400)
    }
    // 只能对自己的衣物抠图
    if (userId !== user.id) {
      return json({ error: '无权操作他人衣物' }, 403)
    }

    // 下载原图
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) {
      return json({ error: '原图下载失败' }, 502)
    }
    const inputBlob = await imgRes.blob()

    // 去背景（默认 isnet_fp16 模型，输出透明 PNG）
    const config: Config = {
      model: 'isnet_fp16',
      output: { format: 'image/png' },
      progress: () => {},
    }
    const cutoutBlob: Blob = await removeBackground(inputBlob, config)

    // 上传到存储桶 wardrobe/cutout/{userId}/{timestamp}.png
    const ext = 'png'
    const fileName = `cutout/${userId}/${Date.now()}.${ext}`
    const { error: upErr } = await admin.storage
      .from('wardrobe')
      .upload(fileName, cutoutBlob, {
        contentType: 'image/png',
        upsert: true,
        cacheControl: '3600',
      })
    if (upErr) {
      return json({ error: '结果图上传失败: ' + upErr.message }, 500)
    }
    const { data } = admin.storage.from('wardrobe').getPublicUrl(fileName)

    return json({ cutoutUrl: data.publicUrl })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return json({ error: '抠图失败: ' + msg }, 500)
  }
})
