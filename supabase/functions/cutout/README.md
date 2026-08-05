# 智能抠图 Edge Function

衣物原图一键去背景，生成透明 PNG，供「搭配预览」叠加使用。

## 原理
- 接收前端传来的 `imageUrl`（衣物原图）与 `userId`
- 在 Deno 运行时用 [`@imgly/background-removal`](https://github.com/imgly/background-removal-js)（本地 ONNX 模型，无需第三方 API Key）完成去背景
- 把透明 PNG 上传到 `wardrobe` 存储桶 `cutout/{userId}/` 目录，返回公开 URL
- 前端把返回的 `cutoutUrl` 写回 `clothing_items.cutout_url`

## 部署（需本地装好 Supabase CLI 并登录）
```bash
cd personal-workbench
supabase functions deploy cutout --no-verify-jwt
```
> `--no-verify-jwt`：函数内部用 service role 自行校验用户 JWT，
> 避免 GitHub Pages 静态站点的 JWT 受众（aud）与函数默认校验不一致导致 401。

## 环境变量
Supabase 部署 Edge Function 时会自动注入：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

无需手动配置。

## 冷启动说明
首次调用会下载模型（约 40–70MB），耗时 10–30 秒属正常；
实例预热后后续调用很快。若需极限提速，可把模型托管到自己的
存储桶并通过 `Config.publicPath` 指定（见 `index.ts` 注释）。

## 前端调用
```ts
const { data, error } = await supabase.functions.invoke('cutout', {
  body: { imageUrl: cloth.image_url, userId: user.id },
})
if (!error && data?.cutoutUrl) {
  // 更新 clothing_items.cutout_url = data.cutoutUrl
}
```
