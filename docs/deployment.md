# 部署与维护

## 当前部署

服务器目录 `/home/ubuntu/watchtv`，Docker Compose 服务 `watchtv`，仅监听服务器 `127.0.0.1:3210`，容器有健康检查和自动重启。机器重启后 Docker 自动启动应用。

本机运行 `./scripts/start-tunnel.ps1`，打开 http://127.0.0.1:13210 。密码单独保存于本项目忽略目录 `.local/server-access.txt`，不要提交或分享此文件。停止隧道：`./scripts/stop-tunnel.ps1`。电脑重启后需重新启动隧道。

隧道使用 `~/.ssh/watchtv_deploy_ed25519`，远端该专用公钥仅允许连接 `127.0.0.1:3210` 的转发。服务器 IP 与用户写在隧道脚本中，迁移服务器时同步修改。

## 更新

将新源码同步到服务器目录，保留现有 `.env`，然后：

```bash
cd /home/ubuntu/watchtv
sudo docker compose up -d --build
sudo docker compose ps
sudo docker compose logs --tail=80 watchtv
```

构建会运行测试、类型检查和生产构建。首次构建需要可访问镜像仓库与 npm。默认 Node 镜像使用 AWS ECR 的 Docker 官方镜像镜像源；可在 `.env` 修改 `NODE_IMAGE`、`NPM_REGISTRY`。

部署前可用 `sudo docker tag watchtv:local watchtv:previous` 保存旧镜像；回滚时 `sudo docker tag watchtv:previous watchtv:local`，再执行 `sudo docker compose up -d --no-build --force-recreate`。

## 数据与密码

服务器没有影片资料库；来源、收藏和观看记录存储在每个浏览器或桌面客户端。使用页面中的完整备份导出/导入迁移数据。服务器只保存 `.env` 配置；会话在内存中，重启后需要重新登录。

修改 `.env` 中 `APP_PASSWORD` 后执行 `sudo docker compose up -d --force-recreate`。`SESSION_SECRET` 用于媒体地址签名，修改后旧播放地址失效。不要把 `.env`、SSH 私钥或访问密码提交到 GitHub。

## 以后配置域名

域名解析到服务器后，添加 HTTPS 反向代理，将流量转发到 `127.0.0.1:3210`，保留 Host，关闭搜索接口的响应缓冲，并在 `.env` 设置 `COOKIE_SECURE=true`。只需向公网开放代理的 80/443 端口。这样手机可直接通过域名访问，无需电脑隧道。

目前验收包含 Windows 网页真实搜索与详情、Electron 启动、服务器 Docker 健康与认证搜索。第三方来源的所有影片、Safari/iOS 原生 HLS 及公网 HTTPS 尚未逐项验证。

## 热门首页（2026-10-21）

首页使用豆瓣热门的真实推荐顺序，支持剧集、综艺、电影、动漫、纪录片分类；不自行编造热度值或评分。海报通过带签名、限定豆瓣图片域名的本站接口加载，榜单缓存一小时。点击推荐海报会在已启用来源中聚合搜索，不把推荐站当作播放来源。

播放器默认优先选择 m3u8/MP4 等直接媒体线路。网页播放器链接不能当作视频直接播放；上游 403/404 会显示具体原因。重试会重建 HLS 连接。

已确认当前非凡媒体域名在本机网络返回403，同一链接在服务器返回200。遇到这种情况，优先使用 SSH 隧道中的服务器版（http://127.0.0.1:13210）；或调整本机代理，使片源域名走可用网络出口。应用不会绕过片源的访问限制。

## 公网入口当前状态

已配置 Caddy 域名 `watchtv.193-112-55-186.sslip.io`，但证书验证受到腾讯云/DNSPod 拦截（返回 webblock.html / 566，TLS 验证连接被重置）。443 安全组已放行并确认有验证请求到达。为避免反复申请失败，Caddy 目前已停止；应用 Docker 与 SSH 隧道保持运行。

GitHub Pages 的公网跳转尚未启用，因为目标 HTTPS 地址未通过验收。需要先提供云厂商允许接入的域名并完成域名相关要求，再更新 Caddy 站点名、启用 HTTPS、设置 COOKIE_SECURE=true，最后发布 Pages 入口。不要将当前失败域名视为可用交付地址。
