[English](#english) | [简体中文](#简体中文)

---

<span id="english"></span>

# Codex Usage Dashboard

A local dashboard for inspecting Codex usage, quota snapshots, model pricing, and estimated cost from files on your own machine.

This project is designed to stay local-first:
- it reads usage data from local Codex files
- it serves a local web UI
- it does not require a cloud backend for the dashboard itself

## Features

- Read Codex usage data from `~/.codex`
- Aggregate SQLite history and session JSONL events
- Show live quota snapshots and reset windows
- Estimate costs by model pricing
- Browse all sessions with filters, pagination, and detail drill-down
- Show billing trends with time-range controls
- Optionally include OpenClaw / ChatGPT usage from `codexbar`
- Support switching the scanned Codex folder from the UI

## How It Works

Data sources currently used by the app:
- `~/.codex/state_5.sqlite`
- `~/.codex/sessions/**/*.jsonl`
- `~/.codex/archived_sessions/**/*.jsonl`
- `codexbar cost --provider codex --format json` for OpenClaw-related usage when available

## Run Locally

```bash
npm test
npm start
```

Then open:

```text
http://127.0.0.1:4329
```

## Background Service

This repository also includes a macOS `launchd` setup for keeping the dashboard alive on port `4329`.

Relevant files:
- `scripts/run-dashboard.sh`
- `launchd/com.helena.codex-usage-dashboard.plist`

## VPS Preview Access

If you want to inspect the local dashboard from your phone, do not deploy the app itself to a VPS and expect it to show your Mac's local Codex data.

Instead, keep the dashboard running locally and expose it through a reverse tunnel:

```text
phone -> VPS public port -> VPS reverse proxy -> SSH reverse tunnel -> local 127.0.0.1:4329
```

This repository now includes a macOS launchd helper for the tunnel:
- `scripts/run-vps-preview-tunnel.sh`
- `launchd/com.helena.codex-usage-dashboard-vps-preview.plist`

The default tunnel target is:
- VPS: `23.81.118.51`
- remote loopback port: `14329`
- local dashboard port: `4329`

This setup lets the VPS act as a public entrypoint while the dashboard itself continues reading your local `~/.codex` data on your Mac.

Current preview entrypoint:

```text
http://23.81.118.51:18080/
```

The current VPS config does not require authentication. Anyone who can reach that IP and port can load the dashboard, so this should be treated as a temporary convenience setup rather than a hardened deployment.

## Project Structure

- `src/`: React + Tailwind + local shadcn component source
- `public/`: built frontend assets emitted by Vite
- `server/`: HTTP server and snapshot loaders
- `test/`: automated tests
- `docs/`: implementation notes and plans
- `launchd/`: macOS background service config
- `RESULTS/`, `PATCHES/`, `logs/`: checkpoint artifacts created during development

## Privacy

This app reads local files that may contain sensitive prompts, paths, titles, token counts, and cost-related metadata.

Before publishing screenshots, sample data, or recordings, make sure you review and redact anything sensitive.

## Contributing

Issues and pull requests are welcome.

If you plan to contribute:
- keep changes local-first
- avoid adding cloud dependencies unless clearly optional
- preserve the ability to run the dashboard from local files only

## License

[MIT](LICENSE)

---

<span id="简体中文"></span>

# Codex 用量统计

这是一个本地优先的 Codex 用量看板，用来读取你自己机器上的数据文件，展示会话、额度、模型价格、Token 消耗和费用估算。

这个项目准备公开仓库，因此 README 现在按“别人拿到仓库后能快速理解和运行”的方式组织。

## 功能特性

- 从 `~/.codex` 读取 Codex 本地使用数据
- 聚合 SQLite 历史记录和 session JSONL 事件
- 展示额度窗口、重置时间和限制快照
- 按模型价格估算费用
- 展示全部会话，支持筛选、分页和详情查看
- 展示账单走势，并支持时间范围切换
- 在可用时接入 `codexbar` 的 OpenClaw / ChatGPT 用量
- 支持从页面切换要扫描的 Codex 数据目录

## 当前数据来源

项目目前会读取这些本地来源：
- `~/.codex/state_5.sqlite`
- `~/.codex/sessions/**/*.jsonl`
- `~/.codex/archived_sessions/**/*.jsonl`
- `codexbar cost --provider codex --format json`

## 本地运行

```bash
npm test
npm start
```

启动后打开：

```text
http://127.0.0.1:4329
```

## 后台常驻

仓库里已经提供 macOS `launchd` 配置，用来把服务固定运行在 `4329` 端口。

相关文件：
- `scripts/run-dashboard.sh`
- `launchd/com.helena.codex-usage-dashboard.plist`

## 项目结构

- `src/`: React + Tailwind + 本地 shadcn 组件源码
- `public/`: Vite 构建输出的前端产物
- `server/`: HTTP 服务、快照加载和数据聚合
- `test/`: 自动化测试
- `docs/`: 计划和实现文档
- `launchd/`: macOS 常驻服务配置
- `RESULTS/`、`PATCHES/`、`logs/`: 开发过程中的检查点产物

## 隐私说明

这个项目会读取你本地的提示词、目录路径、会话标题、Token 数量和费用相关信息。

如果你准备公开截图、录屏、示例数据或者仓库说明，请先确认已经处理掉敏感信息。

## 贡献说明

欢迎提交 Issue 和 Pull Request。

如果你准备贡献：
- 优先保持本地优先设计
- 不要默认引入云端依赖
- 保持“只靠本地文件也能运行”的能力

## 许可证

[MIT](LICENSE)
