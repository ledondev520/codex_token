const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

let logic;

test.before(async () => {
  logic = await import(
    pathToFileURL(
      path.join(__dirname, "..", "src", "lib", "dashboard-logic.mjs")
    ).href
  );
});

const { estimateCost } = require("../server/lib/pricing");

test("dashboard formatters render readable token and quota values", () => {
  assert.equal(logic.formatTokenMillions(35000000), "35M");
  assert.equal(logic.formatTokenMillions(5013157), "5.01M");
  assert.equal(logic.formatPercent(12), "12%");
  assert.equal(logic.formatUsd(0.005363), "$0.01");
  assert.equal(logic.formatUsd(12), "$12.00");
  assert.match(
    logic.formatResetTime(1772950000),
    /2026|03|08|09/
  );
});

test("relative freshness labels stay compact and readable", () => {
  assert.equal(
    logic.formatRelativeTime("2026-03-13T01:55:00.000Z", "2026-03-13T02:00:00.000Z"),
    "5 分钟前"
  );
  assert.equal(
    logic.formatRelativeTime("2026-03-13T01:59:40.000Z", "2026-03-13T02:00:00.000Z"),
    "刚刚"
  );
  assert.equal(
    logic.formatRelativeTime("2026-03-12T02:00:00.000Z", "2026-03-13T02:00:00.000Z"),
    "1 天前"
  );
});

test("combined chart markup includes hover targets for token and cost values", () => {
  const markup = logic.buildCombinedChartMarkup([
    { day: "2026-03-07", totalTokens: 1500000, totalUsd: 2.4 },
    { day: "2026-03-08", totalTokens: 2400000, totalUsd: 3.25 },
  ]);

  assert.match(markup, /chart-line-token/);
  assert.match(markup, /chart-line-cost/);
  assert.match(markup, /data-day="2026-03-07"/);
  assert.match(markup, /data-cost="\$3.25"/);
  assert.match(markup, /chart-y-axis chart-y-axis-token/);
  assert.match(markup, /chart-brush/);
});

test("reset progress exposes elapsed and remaining percentages", () => {
  const progress = logic.calculateResetProgress({
    generatedAt: "2026-03-08T05:30:00.000Z",
    resetsAt: 1772956800,
    windowMinutes: 300,
  });

  assert.equal(progress.elapsedPercent, 50);
  assert.equal(progress.remainingPercent, 50);
});

test("runtime duration formatter stays compact for dense running-session rows", () => {
  assert.equal(
    logic.formatRuntimeDuration("2026-03-13T01:30:00.000Z", "2026-03-13T03:45:00.000Z"),
    "2小时15分"
  );
  assert.equal(
    logic.formatRuntimeDuration("2026-03-13T03:10:00.000Z", "2026-03-13T03:45:00.000Z"),
    "35分"
  );
});

test("runtime session helper defaults to the first three active rows for the compact homepage", () => {
  const rows = [
    { id: "thread-1", statusLabel: "进行中" },
    { id: "thread-2", statusLabel: "等待回答" },
    { id: "thread-3", statusLabel: "进行中" },
    { id: "thread-4", statusLabel: "等待回答" },
    { id: "thread-5", statusLabel: "已完结" },
  ];

  assert.deepEqual(
    logic.getRuntimeSessionRows(rows).map((row) => row.id),
    ["thread-1", "thread-2", "thread-3"]
  );
});

test("rate-limit window copy includes projected exhaustion time and fallback wording", () => {
  const projected = logic.describeRateLimitWindow({
    generatedAt: "2026-03-13T05:30:00.000Z",
    latestRateLimitAt: "2026-03-13T05:20:00.000Z",
    windowData: {
      label: "5小时窗口",
      usedPercent: 80,
      remainingPercent: 20,
      windowMinutes: 300,
      resetsAt: 1773392400,
    },
  });

  assert.equal(projected.title, "5小时限额");
  assert.equal(projected.statusLabel, "接近触顶");
  assert.match(projected.projectedExhaustionCopy, /^估算触顶时间 /);
  assert.doesNotMatch(projected.projectedExhaustionCopy, /本窗口内不会触顶|等待新的限制快照|数据不足/);

  const fallback = logic.describeRateLimitWindow({
    generatedAt: "2026-03-13T05:30:00.000Z",
    latestRateLimitAt: "2026-03-13T05:20:00.000Z",
    windowData: {
      label: "7天窗口",
      usedPercent: 4,
      remainingPercent: 96,
      windowMinutes: 10080,
      resetsAt: Math.floor(new Date("2026-03-15T05:30:00.000Z").getTime() / 1000),
    },
  });

  assert.equal(fallback.title, "7天限额");
  assert.equal(fallback.statusLabel, "正常");
  assert.equal(fallback.projectedExhaustionCopy, "估算触顶时间 按当前速率，本窗口内不会触顶");

  const stale = logic.describeRateLimitWindow({
    generatedAt: "2026-03-13T05:30:00.000Z",
    latestRateLimitAt: "2026-03-13T04:00:00.000Z",
    windowData: {
      label: "5小时窗口",
      usedPercent: 62,
      remainingPercent: 38,
      windowMinutes: 300,
      resetsAt: 1773379800,
    },
  });

  assert.equal(stale.statusLabel, "快照过期");
  assert.equal(stale.projectedExhaustionCopy, "估算触顶时间 等待新的限制快照");
});

test("stale rate-limit snapshots are detected after the reset time passes", () => {
  assert.equal(
    logic.isRateLimitSnapshotStale({
      generatedAt: "2026-03-08T13:57:40.447Z",
      latestRateLimitAt: "2026-03-08T13:57:03.002Z",
      resetsAt: 1772977197,
    }),
    true
  );

  assert.equal(
    logic.isRateLimitSnapshotStale({
      generatedAt: "2026-03-08T13:30:00.000Z",
      latestRateLimitAt: "2026-03-08T13:20:00.000Z",
      resetsAt: 1772977197,
    }),
    false
  );
});

test("gpt-5.4 codex alias is rendered as GPT-5.4", () => {
  assert.equal(logic.formatModelLabel("gpt-5.4-codex"), "GPT-5.4");
  assert.equal(logic.formatModelLabel("gpt-5.1-codex"), "gpt-5.1-codex");
});

test("billing scope and range helpers support natural month and visible slices", () => {
  const rows = [
    { day: "2026-03-08", totalTokens: 500000, totalUsd: 10 },
    { day: "2026-03-07", totalTokens: 400000, totalUsd: 8 },
    { day: "2026-02-28", totalTokens: 300000, totalUsd: 6 },
  ];

  const monthRows = logic.getScopeRows(rows, "2026-03-08T10:00:00.000Z", "month");
  assert.deepEqual(monthRows.map((row) => row.day), ["2026-03-08", "2026-03-07"]);

  const visibleRows = logic.getVisibleLedgerRows(monthRows, 0, 1);
  assert.deepEqual(visibleRows.map((row) => row.day), ["2026-03-08", "2026-03-07"]);

  const summary = logic.summarizeLedgerRows(monthRows);
  assert.equal(summary.totalTokens, 900000);
  assert.equal(summary.totalUsd, 18);
});

test("homepage summary highlights today's spend, monthly spend, and 24h change", () => {
  const summary = logic.getHomepageSummary(
    [
      { day: "2026-03-13", totalTokens: 2200000, totalUsd: 12.8 },
      { day: "2026-03-12", totalTokens: 1500000, totalUsd: 7.4 },
      { day: "2026-03-01", totalTokens: 900000, totalUsd: 4.2 },
      { day: "2026-02-28", totalTokens: 400000, totalUsd: 1.1 },
    ],
    "2026-03-13T12:00:00.000Z"
  );

  assert.equal(summary.today.totalUsd, 12.8);
  assert.equal(summary.today.totalTokens, 2200000);
  assert.equal(summary.month.totalUsd, 24.4);
  assert.equal(summary.month.totalTokens, 4600000);
  assert.equal(summary.change.direction, "up");
  assert.equal(summary.change.deltaUsd, 5.4);
  assert.equal(summary.change.deltaTokens, 700000);
});

test("window summary aggregates today and last7 totals from arbitrary daily rows", () => {
  const summary = logic.getWindowSummary(
    [
      { day: "2026-03-14", totalTokens: 1000000, totalUsd: 4 },
      { day: "2026-03-13", totalTokens: 2000000, totalUsd: 6 },
      { day: "2026-03-08", totalTokens: 3000000, totalUsd: 9 },
      { day: "2026-03-07", totalTokens: 4000000, totalUsd: 12 },
    ],
    "2026-03-14T10:00:00.000+08:00"
  );

  assert.equal(summary.today.totalTokens, 1000000);
  assert.equal(summary.today.totalUsd, 4);
  assert.equal(summary.last7Days.totalTokens, 6000000);
  assert.equal(summary.last7Days.totalUsd, 19);
  assert.equal(summary.last7Days.startDay, "2026-03-08");
  assert.equal(summary.last7Days.endDay, "2026-03-14");
});

test("cost spike detection surfaces model and project anomalies with baseline context", () => {
  const anomalies = logic.detectCostSpikes([
    {
      id: "thread-1",
      updatedAt: 1773943200,
      modelName: "gpt-5.4",
      workspaceLabel: "alpha",
      cost: { totalUsd: 6.8 },
    },
    {
      id: "thread-2",
      updatedAt: 1773939600,
      modelName: "gpt-5.4",
      workspaceLabel: "alpha",
      cost: { totalUsd: 1.6 },
    },
    {
      id: "thread-3",
      updatedAt: 1773936000,
      modelName: "gpt-5.4",
      workspaceLabel: "beta",
      cost: { totalUsd: 1.9 },
    },
    {
      id: "thread-4",
      updatedAt: 1773932400,
      modelName: "gpt-5.4",
      workspaceLabel: "alpha",
      cost: { totalUsd: 1.4 },
    },
  ]);

  assert.equal(anomalies.length, 2);
  assert.deepEqual(
    anomalies.map((item) => item.scope),
    ["project", "model"]
  );
  assert.equal(anomalies[0].label, "alpha");
  assert.equal(anomalies[0].latestUsd, 6.8);
  assert.ok(anomalies[0].baselineUsd < anomalies[0].latestUsd);
});

test("session pagination returns 10 rows per page and computes total pages", () => {
  const rows = Array.from({ length: 23 }, (_, index) => ({ id: `thread-${index + 1}` }));

  assert.equal(logic.getSessionPageCount(rows, 10), 3);
  assert.deepEqual(
    logic.getSessionPageRows(rows, 2, 10).map((row) => row.id),
    ["thread-11", "thread-12", "thread-13", "thread-14", "thread-15", "thread-16", "thread-17", "thread-18", "thread-19", "thread-20"]
  );
});

test("session filters match title, model, and created date together", () => {
  const rows = [
    {
      id: "thread-1",
      title: "修复 dashboard 慢启动",
      modelName: "gpt-5.4",
      createdAt: 1772940000,
    },
    {
      id: "thread-2",
      title: "OpenClaw 模型修正",
      modelName: "gpt-5.3-codex",
      createdAt: 1772853600,
    },
  ];

  const filtered = logic.getFilteredSessionRows(rows, {
    title: "openclaw",
    model: "5.3",
    createdDate: "2026-03-07",
  });

  assert.deepEqual(filtered.map((row) => row.id), ["thread-2"]);
});

test("session filters can distinguish codex local rows from openclaw oauth rows", () => {
  const rows = [
    { id: "thread-1", title: "local", modelName: "gpt-5.4", createdAt: 1772940000, usageOrigin: "codex-local" },
    { id: "thread-2", title: "oauth", modelName: "gpt-5.4", createdAt: 1772943600, usageOrigin: "openclaw-oauth" },
  ];

  const filtered = logic.getFilteredSessionRows(rows, {
    origin: "openclaw-oauth",
  });

  assert.deepEqual(filtered.map((row) => row.id), ["thread-2"]);
});

test("quick date presets resolve stable local ranges and support custom overrides", () => {
  assert.deepEqual(
    logic.getDatePresetRange("2026-03-13T09:46:00+08:00", "today"),
    { preset: "today", startDay: "2026-03-13", endDay: "2026-03-13" }
  );

  assert.deepEqual(
    logic.getDatePresetRange("2026-03-13T09:46:00+08:00", "yesterday"),
    { preset: "yesterday", startDay: "2026-03-12", endDay: "2026-03-12" }
  );

  assert.deepEqual(
    logic.getDatePresetRange("2026-03-13T09:46:00+08:00", "last7"),
    { preset: "last7", startDay: "2026-03-07", endDay: "2026-03-13" }
  );

  assert.deepEqual(
    logic.getDatePresetRange("2026-03-13T09:46:00+08:00", "month"),
    { preset: "month", startDay: "2026-03-01", endDay: "2026-03-13" }
  );

  assert.deepEqual(
    logic.getDatePresetRange("2026-03-13T09:46:00+08:00", "custom", {
      startDay: "2026-03-05",
      endDay: "2026-03-09",
    }),
    { preset: "custom", startDay: "2026-03-05", endDay: "2026-03-09" }
  );
});

test("session filters support created date ranges without breaking exact-date matching", () => {
  const rows = [
    {
      id: "thread-1",
      title: "today",
      modelName: "gpt-5.4",
      createdAt: 1773367200,
      usageOrigin: "codex-local",
    },
    {
      id: "thread-2",
      title: "week",
      modelName: "gpt-5.4",
      createdAt: 1773021600,
      usageOrigin: "codex-local",
    },
    {
      id: "thread-3",
      title: "older",
      modelName: "gpt-5.4",
      createdAt: 1772762400,
      usageOrigin: "codex-local",
    },
  ];

  const ranged = logic.getFilteredSessionRows(rows, {
    createdFrom: "2026-03-09",
    createdTo: "2026-03-13",
  });
  assert.deepEqual(ranged.map((row) => row.id), ["thread-1", "thread-2"]);

  const exact = logic.getFilteredSessionRows(rows, {
    createdDate: "2026-03-09",
  });
  assert.deepEqual(exact.map((row) => row.id), ["thread-2"]);
});

test("session export snapshot follows the active view columns and csv escaping rules", () => {
  const rows = [
    {
      id: "thread-2",
      title: "修复, export",
      titlePreview: "修复, export",
      usageOriginLabel: "Codex 本地",
      modelName: "gpt-5.4-codex",
      statusLabel: "进行中",
      workspaceLabel: "codex_token",
      cwd: "/workspace/codex_token",
      tokensUsed: 1250000,
      cost: { totalUsd: 3.5 },
      createdAt: 1773021600,
      updatedAt: 1773108000,
      promptText: "line one\nline two",
    },
  ];

  const costSnapshot = logic.buildSessionExportSnapshot(rows, "cost");
  assert.deepEqual(costSnapshot.columns, ["会话 ID", "标题", "来源", "模型", "Token", "费用", "更新时间"]);

  const performanceSnapshot = logic.buildSessionExportSnapshot(rows, "performance");
  assert.deepEqual(performanceSnapshot.columns, ["会话 ID", "标题", "状态", "模型", "创建时间", "更新时间"]);

  const projectSnapshot = logic.buildSessionExportSnapshot(rows, "project");
  assert.deepEqual(projectSnapshot.columns, ["会话 ID", "标题", "项目", "来源", "模型", "提示摘要"]);

  const csv = logic.stringifyCsvSnapshot(costSnapshot);
  assert.match(csv, /^会话 ID,标题,来源,模型,Token,费用,更新时间/m);
  assert.match(csv, /"修复, export"/);
  assert.match(csv, /GPT-5\.4/);
});

test("openclaw model table markup renders model costs and fallback source state", () => {
  const markup = logic.buildOpenClawModelTableMarkup([
    { modelName: "gpt-5", totalUsd: 24.52151025 },
    { modelName: "gpt-5.3-codex", totalUsd: 4.31679775 },
  ]);

  assert.match(markup, /<table/);
  assert.match(markup, /<td>gpt-5<\/td>/);
  assert.match(markup, /gpt-5\.3-codex/);
  assert.match(markup, /\$24\.52/);
  assert.match(markup, /模型/);

  const emptyMarkup = logic.buildOpenClawModelTableMarkup([]);
  assert.match(emptyMarkup, /暂无模型费用明细/);
});

test("cost estimate charges cached input at cached rate instead of double charging", () => {
  const cost = estimateCost(
    {
      inputTokens: 59273389,
      cachedInputTokens: 56845696,
      outputTokens: 135022,
    },
    "gpt-5.4"
  );

  assert.ok(Math.abs(cost.inputUsd - 6.0692325) < 0.000001);
  assert.ok(Math.abs(cost.cachedInputUsd - 14.211424) < 0.000001);
  assert.ok(Math.abs(cost.totalUsd - 22.3059865) < 0.000001);
});

test("billable input tokens exclude cached input tokens", () => {
  assert.equal(
    logic.getBillableInputTokens({
      inputTokens: 6080000,
      cachedInputTokens: 5720000,
    }),
    360000
  );
});

test("alert config is clamped to safe numeric boundaries and preserves disable switches", () => {
  const config = logic.normalizeAlertConfig({
    dailySpend: {
      enabled: false,
      thresholdUsd: -4,
    },
    failureRate: {
      enabled: true,
      thresholdPercent: 170,
    },
  });

  assert.equal(config.dailySpend.enabled, false);
  assert.equal(config.dailySpend.thresholdUsd, 0);
  assert.equal(config.failureRate.enabled, true);
  assert.equal(config.failureRate.thresholdPercent, 100);
});

test("alert metrics derive today's spend and terminal failure rate from the snapshot", () => {
  const metrics = logic.getAlertMetrics({
    generatedAt: "2026-03-13T08:00:00.000Z",
    dailyLedger: [
      { day: "2026-03-13", totalUsd: 6.2, totalTokens: 1200000 },
      { day: "2026-03-12", totalUsd: 1.5, totalTokens: 400000 },
    ],
    recentThreads: [
      { id: "done", createdAt: 1773360000, statusLabel: "已完结" },
      { id: "aborted", createdAt: 1773360300, statusLabel: "已中断" },
      { id: "running", createdAt: 1773360600, statusLabel: "进行中" },
      { id: "older", createdAt: 1773270000, statusLabel: "已中断" },
    ],
  });

  assert.equal(metrics.dailySpendUsd, 6.2);
  assert.equal(metrics.failureRatePercent, 50);
  assert.equal(metrics.failureCount, 1);
  assert.equal(metrics.completedCount, 1);
  assert.equal(metrics.terminalCount, 2);
});

test("alerts evaluate trigger and recovery states without blocking disabled rules", () => {
  const config = logic.normalizeAlertConfig({
    dailySpend: {
      enabled: true,
      thresholdUsd: 5,
    },
    failureRate: {
      enabled: false,
      thresholdPercent: 20,
    },
  });

  const alertMetrics = {
    dailySpendUsd: 6.2,
    failureRatePercent: 10,
    failureCount: 1,
    completedCount: 9,
    terminalCount: 10,
  };

  const states = logic.evaluateAlertStates({
    metrics: alertMetrics,
    config,
    previousStates: {
      dailySpend: { phase: "inactive" },
      failureRate: { phase: "triggered" },
    },
    timestamp: "2026-03-13T08:00:00.000Z",
  });

  assert.equal(states.dailySpend.phase, "triggered");
  assert.equal(states.dailySpend.isActive, true);
  assert.equal(states.dailySpend.changedAt, "2026-03-13T08:00:00.000Z");
  assert.equal(states.failureRate.phase, "disabled");
  assert.equal(states.failureRate.isActive, false);
  assert.equal(states.failureRate.changedAt, "2026-03-13T08:00:00.000Z");

  const recoveredStates = logic.evaluateAlertStates({
    metrics: {
      ...alertMetrics,
      dailySpendUsd: 2,
    },
    config: {
      ...config,
      failureRate: {
        enabled: true,
        thresholdPercent: 20,
      },
    },
    previousStates: {
      dailySpend: states.dailySpend,
      failureRate: { phase: "triggered" },
    },
    timestamp: "2026-03-13T09:00:00.000Z",
  });

  assert.equal(recoveredStates.dailySpend.phase, "recovered");
  assert.equal(recoveredStates.dailySpend.isActive, false);
  assert.equal(recoveredStates.dailySpend.changedAt, "2026-03-13T09:00:00.000Z");
  assert.equal(recoveredStates.failureRate.phase, "recovered");
  assert.equal(recoveredStates.failureRate.changedAt, "2026-03-13T09:00:00.000Z");

  const steadyRecoveredStates = logic.evaluateAlertStates({
    metrics: {
      ...alertMetrics,
      dailySpendUsd: 1.5,
      failureRatePercent: 5,
    },
    config: {
      ...config,
      failureRate: {
        enabled: true,
        thresholdPercent: 20,
      },
    },
    previousStates: recoveredStates,
    timestamp: "2026-03-13T10:00:00.000Z",
  });

  assert.equal(steadyRecoveredStates.dailySpend.phase, "recovered");
  assert.equal(steadyRecoveredStates.dailySpend.changedAt, "2026-03-13T09:00:00.000Z");
  assert.equal(steadyRecoveredStates.failureRate.phase, "recovered");
  assert.equal(steadyRecoveredStates.failureRate.changedAt, "2026-03-13T09:00:00.000Z");

  const steadyDisabledStates = logic.evaluateAlertStates({
    metrics: alertMetrics,
    config,
    previousStates: {
      dailySpend: { phase: "inactive" },
      failureRate: states.failureRate,
    },
    timestamp: "2026-03-13T11:00:00.000Z",
  });

  assert.equal(steadyDisabledStates.failureRate.phase, "disabled");
  assert.equal(steadyDisabledStates.failureRate.changedAt, "2026-03-13T08:00:00.000Z");
});

test("dialog closes when the backdrop itself is clicked", () => {
  const dialog = { nodeName: "DIALOG" };
  assert.equal(logic.shouldCloseDialogFromBackdropClick(dialog, dialog), true);
  assert.equal(logic.shouldCloseDialogFromBackdropClick(dialog, { nodeName: "DIV" }), false);
});

test("prompt summaries collapse whitespace and trim long prompts", () => {
  assert.equal(logic.summarizePromptText("  第一行\n\n第二行  ", 20), "第一行 第二行");
  assert.equal(
    logic.summarizePromptText("这是一个很长的提示词，用来验证前端会先展示摘要而不是整段直接撑开布局。", 18),
    "这是一个很长的提示词，用来验证..."
  );
});

test("dashboard html exposes the current dual-ledger shell structure", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "..", "src", "App.jsx"), "utf8");

  assert.match(appSource, /我直接使用 Codex/);
  assert.match(appSource, /小龙虾代用/);
  assert.match(appSource, /高级明细/);
  assert.match(appSource, /全部会话/);
  assert.match(appSource, /账单分析/);
  assert.match(appSource, /SectionCard/);
  assert.match(appSource, /TabsTrigger/);
  assert.match(appSource, /EmptyState/);
  assert.match(appSource, /Label/);
  assert.doesNotMatch(appSource, /OpenClaw \/ OAuth 经 Codex/);
});

test("dashboard ui primitives avoid hard-coded slate palette classes", () => {
  const uiFiles = [
    path.join(__dirname, "..", "src", "components", "ui", "dialog.jsx"),
    path.join(__dirname, "..", "src", "components", "ui", "progress.jsx"),
    path.join(__dirname, "..", "src", "components", "ui", "slider.jsx"),
    path.join(__dirname, "..", "src", "components", "ui", "skeleton.jsx"),
    path.join(__dirname, "..", "src", "components", "dashboard", "metric-tile.jsx"),
  ];

  for (const filePath of uiFiles) {
    const source = fs.readFileSync(filePath, "utf8");
    assert.doesNotMatch(
      source,
      /\b(?:bg|text|border|fill|stroke)-slate-\d{2,3}\b/,
      `${path.basename(filePath)} still contains hard-coded slate classes`
    );
  }
});

test("dashboard source includes a local password gate and relock control", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "..", "src", "App.jsx"), "utf8");

  assert.match(appSource, /970520/);
  assert.match(appSource, /localStorage/);
  assert.match(appSource, /访问密码/);
  assert.match(appSource, /重新锁定|退出授权/);
});

test("dashboard source uses dual ledgers and hides secondary controls behind advanced details", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "..", "src", "App.jsx"), "utf8");

  assert.match(appSource, /高级明细/);
  assert.match(appSource, /AccordionTrigger/);
  assert.match(appSource, /数据源说明/);
  assert.match(appSource, /告警设置/);
  assert.match(appSource, /成本排行/);
  assert.match(appSource, /限额细节/);
  assert.match(appSource, /模型价格/);
  assert.match(appSource, /账单分析/);
});

test("dashboard source removes default-visible favorite export and multi-view controls from the main reading flow", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "..", "src", "App.jsx"), "utf8");

  assert.doesNotMatch(appSource, /成本视图/);
  assert.doesNotMatch(appSource, /性能视图/);
  assert.doesNotMatch(appSource, /项目视图/);
  assert.doesNotMatch(appSource, /收藏视图/);
  assert.doesNotMatch(appSource, /导出 CSV（全部筛选结果）/);
  assert.doesNotMatch(appSource, /导出当前视图快照（JSON）/);
});

test("dashboard source includes alert controls and metric explanation hover copy", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "..", "src", "App.jsx"), "utf8");

  assert.match(appSource, /日花费阈值/);
  assert.match(appSource, /失败率阈值/);
  assert.match(appSource, /告警设置/);
  assert.match(appSource, /口径说明/);
});

test("dashboard source keeps secondary decision insights only inside advanced details", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "..", "src", "App.jsx"), "utf8");

  assert.match(appSource, /成本排行/);
  assert.match(appSource, /Top 项目成本排行（今日\/7天）/);
  assert.match(appSource, /Top 模型成本排行（今日\/7天）/);
  assert.match(appSource, /单位效率指标/);
  assert.match(appSource, /失败任务概览/);
  assert.match(appSource, /查看详情|详情不可用/);
});

test("homepage keeps two ledgers as the only primary summary surfaces", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "..", "src", "App.jsx"), "utf8");

  assert.match(appSource, /我直接使用 Codex/);
  assert.match(appSource, /小龙虾代用/);
  assert.match(appSource, /今日费用/);
  assert.match(appSource, /近 7 天费用/);
  assert.match(appSource, /近 7 天 Token/);
  assert.match(appSource, /当前活跃/);
  assert.match(appSource, /双账本总览/);
});

test("homepage source includes clickable runtime sessions and removes ambiguous status labels", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "..", "src", "App.jsx"), "utf8");

  assert.match(appSource, /onOpenThread/);
  assert.match(appSource, /handleOpenThread/);
  assert.match(appSource, /运行中会话/);
  assert.match(appSource, /会话详情/);
  assert.doesNotMatch(appSource, /异常 异常/);
  assert.doesNotMatch(appSource, /OpenClaw \/ OAuth 经 Codex/);
});
