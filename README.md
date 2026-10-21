# WatchTV

自用的多来源影视聚合网站与 Electron 桌面播放器。支持 AppleCMS JSON 来源、逐来源聚合搜索、线路和选集切换、收藏、观看记录、进度续播、JSON 备份以及响应式手机布局。

项目不提供或存储影片。来源由用户自行配置和启用，候选来源默认关闭；请仅使用有权访问的内容。来源可能失效，搜索成功不代表所有播放链接都可用。

## 本机运行

需要 Node.js 22.16+。

```powershell
npm ci
npm test
npm run typecheck
npm run build
./scripts/start-local.ps1
```

访问 http://127.0.0.1:3210 。停止：`./scripts/stop-local.ps1`。本机默认只监听回环地址。收藏、历史、来源保存在当前浏览器的 IndexedDB；换浏览器或清理数据前请在来源管理中导出完整备份。

```powershell
npm run desktop
npm run desktop:pack
```

Windows 便携版输出到 `release/WatchTV-0.1.0-x64.exe`。桌面版使用独立的本地 3211 端口和独立资料，退出时关闭内置服务。当前产物未做代码签名。

网页包含 PWA 清单，可在支持的浏览器中安装；离线只缓存静态界面，搜索和播放仍需要网络。手机访问远程版本时需另行配置 HTTPS 或手机端隧道。

## 来源

在“来源管理”中手动添加名称与 AppleCMS JSON API 地址，也可导入 JSON 文件或远程 JSON 订阅。导入只读取当前快照，不会自动更新订阅。

```json
{"sources":[{"name":"我的来源","url":"https://example.com/api.php/provide/vod/","enabled":true}]}
```

最多 50 个来源，搜索并发 5，逐来源超时 10 秒。搜索结果按片名、年份和分类保守聚合。媒体优先直接播放，遇到跨域等问题可回退到带签名的服务端代理；仅支持 HTTP(S) 媒体，网页解析/iframe 线路可能无法播放。

## Docker 服务器

详见 [部署说明](docs/deployment.md)。GitHub 用来保存代码，应用在服务器 Docker 中运行。

```bash
cp .env.example .env
# 编辑 .env：为 APP_PASSWORD 和 SESSION_SECRET 设置不同的随机长字符串
chmod 600 .env
docker compose up -d --build
docker compose ps
```

默认只发布 `127.0.0.1:3210`，通过 SSH 隧道访问。不要直接把无 HTTPS 的入口开放到公网。

## 开发与验证

`npm test` 覆盖解析、聚合、备份、分页快照、播放行为、鉴权、搜索、HLS 重写、签名、DNS/SSRF 防护和桌面导航边界；`npm run typecheck` 检查类型，`npm run build` 构建网页和服务端。

如本机 VPN 把域名解析到 198.18.x.x 等保留地址，安全检查会拒绝连接。可在本机 `.env` 设置 `WATCHTV_PUBLIC_DNS=cloudflare`，通过 Cloudflare DNS-over-HTTPS 查询来源域名；桌面版默认启用此设置。服务器默认使用系统 DNS。该选项会把查询域名发送给 Cloudflare，仍保留公共地址校验和连接地址固定。

代码使用 MIT 许可证。第三方依赖遵循各自许可证。
