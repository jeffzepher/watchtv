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

