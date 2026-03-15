# VPS 18080 Deployment Checklist

## 先确认当前仓库的真实运行方式

- 依赖安装：`corepack yarn install --immutable`
- 前端构建：`npm run build`
- 服务入口：`node server/index.js`
- 端口默认值：代码默认 `4318`；仓库内本地脚本固定跑在 `127.0.0.1:4329`
- PM2 现状：仓库里没有现成的 `ecosystem.config.js` / PM2 配置文件
- 运行期额外依赖：`sqlite3` CLI 必需；`codexbar` 可选

当前仓库已经存在一条“本机数据 + VPS 公网入口”的链路：

- 本机服务：[`scripts/run-dashboard.sh`](/Users/helena/Cursor/codex_token/scripts/run-dashboard.sh)
- VPS 预览隧道：[`scripts/run-vps-preview-tunnel.sh`](/Users/helena/Cursor/codex_token/scripts/run-vps-preview-tunnel.sh)
- 这条链路不是 PM2 直跑业务，而是“本机 `4329` -> SSH 反向隧道 -> VPS `18080`”

如果这次要把代码直接部署到 VPS:`18080`，下面这组命令是基于当前仓库推导出来的最短路径。

## 最短直部署清单

### 1. 本地同步到服务器

```bash
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude 'build' \
  ./ root@23.81.118.51:/srv/codex_token/
```

### 2. 服务器安装依赖

```bash
ssh root@23.81.118.51 'cd /srv/codex_token && corepack enable && corepack yarn install --immutable'
```

服务器还需要系统里可执行的：

- `sqlite3`
- `pm2`
- 可选：`codexbar`

### 3. 服务器 build

```bash
ssh root@23.81.118.51 'cd /srv/codex_token && npm run build'
```

### 4. PM2 启动 / 重启

首次启动：

```bash
ssh root@23.81.118.51 "cd /srv/codex_token && HOST=0.0.0.0 PORT=18080 pm2 start server/index.js --name codex-usage-dashboard --time"
```

后续更新重启：

```bash
ssh root@23.81.118.51 "cd /srv/codex_token && HOST=0.0.0.0 PORT=18080 pm2 restart codex-usage-dashboard --update-env"
```

如果 VPS 上的 Codex 数据不在默认 `~/.codex`，补上：

```bash
CODEX_HOME=/path/to/.codex
```

如果要显示 OpenClaw / OAuth 面板，且 `codexbar` 不在默认 PATH，补上：

```bash
CODEXBAR_BIN=/usr/local/bin/codexbar
```

## 最短健康检查

进程检查：

```bash
ssh root@23.81.118.51 'pm2 status codex-usage-dashboard'
```

HTTP 检查：

```bash
ssh root@23.81.118.51 'curl -I http://127.0.0.1:18080/'
ssh root@23.81.118.51 'curl http://127.0.0.1:18080/api/snapshot | head'
curl -I http://23.81.118.51:18080/
```

通过标准：

- `/` 返回 `200`
- `/api/snapshot` 返回 JSON
- `pm2 status` 为 `online`

## 一句话执行版

```bash
rsync -az --delete --exclude '.git' --exclude 'node_modules' --exclude 'dist' --exclude 'build' ./ root@23.81.118.51:/srv/codex_token/ \
&& ssh root@23.81.118.51 'cd /srv/codex_token && corepack enable && corepack yarn install --immutable && npm run build' \
&& ssh root@23.81.118.51 "cd /srv/codex_token && HOST=0.0.0.0 PORT=18080 pm2 restart codex-usage-dashboard --update-env || HOST=0.0.0.0 PORT=18080 pm2 start server/index.js --name codex-usage-dashboard --time" \
&& curl -I http://23.81.118.51:18080/
```
