[English](#english) | [简体中文](#简体中文)

---

<span id="english"></span>

# Codex Usage Dashboard

A standalone local dashboard for Codex token usage and quota snapshots.

## What It Does

- Reads local Codex usage data from `~/.codex`
- Lets you switch the scanned local Codex folder from the dashboard UI
- Aggregates SQLite history and recent session JSONL events
- Serves a local dashboard with live updates
- Shows token usage, quota snapshots, grouped model pricing, and daily cost estimates

## Run Locally

```bash
npm install
npm test
npm start
```

Then open `http://127.0.0.1:4318`.

## Project Structure

- `server/`: HTTP app, usage aggregation, live snapshot service
- `public/`: Static dashboard assets
- `test/`: Repository, API, and frontend tests
- `docs/`: Implementation notes

## Contributing

Contributions are welcome! If you'd like to improve the project, please open an issue or submit a pull request.

## Note on Privacy

This app reads local files under `~/.codex`. Please be mindful of this when publishing your own screenshots or sharing sample data, as it may contain sensitive usage information.

## License

This project is licensed under the [MIT License](LICENSE).

---

<span id="简体中文"></span>

# Codex 使用量仪表盘 (Codex Usage Dashboard)

一个在本地独立运行的仪表盘，用于查看 Codex Token 使用情况及配额快照。

## 功能特性

- 从 `~/.codex` 读取本地 Codex 使用数据
- 支持在仪表盘里切换要读取的本地 Codex 文件夹
- 聚合 SQLite 历史记录与最近的会话 JSONL 事件
- 启动一个支持实时更新的本地仪表盘服务
- 展示 Token 使用量、配额快照、合并后的模型价格以及每日预估成本

## 本地运行

```bash
npm install
npm test
npm start
```

然后打开浏览器访问 `http://127.0.0.1:4318`。

## 项目结构

- `server/`: HTTP 应用、使用量聚合相关逻辑、实时快照服务
- `public/`: 仪表盘静态资源
- `test/`: 数据层、API 以及前端的测试用例
- `docs/`: 实现相关的文档笔记

## 贡献指南

欢迎各位贡献代码！如果您希望改进该项目，请随时提交 Issue 或发起 Pull Request。

## 隐私注意事项

此应用会读取位于 `~/.codex` 下的本地文件。在您公开分享仪表盘截图或示例数据时，请务必注意保护由于使用产生的一些潜在敏感信息。

## 开源协议

本项目基于 [MIT 协议](LICENSE) 开源。
