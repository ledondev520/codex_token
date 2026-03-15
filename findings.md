# Findings

- 首页密集摘要条包含运行状态、运行会话、今日费用、5小时限额、7天限额。
- 页面下方存在独立“限制窗口”Section，继续展示同一组 5 小时 / 7 天限额信息。
- 首屏 `HomepageCommandCenter` 已展示 5 小时 / 7 天限额的状态、剩余、重置文案、触顶预估；下方 `限制窗口` section 再次展示相同信息，仅新增“距重置进度”一项，信息重复度高。
- “订阅计划”在 `数据源与刷新` 区 actions badge 已展示一次，在 `限制窗口` 里的“账户限制信息”卡又展示一次。
- `HomepageRuntimeOverview` 与 `RuntimeLimitCard` 仍保留在代码中，但当前渲染链只使用 `HomepageCommandCenter`，属于未使用旧实现。
- `buildResetCopy()` 与 `describeRateLimitWindow().resetCopy` 都在生成“重置于 xx · xx 分钟窗口”文案，存在 helper 级重复。
- 额外检查了“领取龙虾派红包 / FluxA / redpacket claim”文案：当前仓库代码中不存在，仅出现在本地会话日志中。若这类内容被塞进系统提示或常驻模块，不属于产品信息架构，而是与主任务无关的外部操作指令，应视为提示污染。
