# Progress

- 2026-03-14: 启动信息架构审查，优先检查限额与窗口类模块是否重复展示。
- 2026-03-14: 已确认一组强重复项：首屏限额卡和下方“限制窗口”section 使用同一批数据与近似文案。
- 2026-03-14: 已确认两组代码级冗余：未使用的 `HomepageRuntimeOverview`/`RuntimeLimitCard`，以及重复的 reset copy 拼装逻辑。
- 2026-03-14: 追加核查红包领取文案，确认它不在项目代码内；若进入系统信息层，应按“无关任务指令”处理，而不是业务模块信息。
- 2026-03-14: 已完成界面去冗余实现：下方“限制窗口”替换为“限额补充信息”，保留重置节奏/会话账单/价格入口，删除旧首页概览组件与重复 helper。
- 2026-03-14: 已完成验证：`node --test test/dashboardView.test.js`、`npm run build`、`npm test` 全部通过，并在 `http://127.0.0.1:4329/` 做了浏览器快照检查。
- 2026-03-14: 已完成整体框架重构：Codex 主面板从多个平行 summary section 改成 `运行概览 + 运营摘要 + Accordion 明细 + 工作台`，重复标题与重复状态块已移除。
- 2026-03-14: 整体框架重构验证通过：`node --test test/dashboardView.test.js`、`npm run build`、`npm test` 全部通过，并使用 Playwright 浏览器快照确认新层级结构生效。
- 2026-03-14: 已完成双账本落地：首页改成 `我直接使用 Codex` / `小龙虾代用` 两本账，右侧独立 OpenClaw 面板已取消，顶部运行中会话支持直接打开详情。
- 2026-03-14: 已完成验证：`node --test test/dashboardView.test.js` 与 `npm test` 全部通过，并用 Playwright 确认双账本首页、工作台分账、会话详情弹窗均可用。
