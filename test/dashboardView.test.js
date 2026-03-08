const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildOpenClawModelTableMarkup,
  formatTokenMillions,
  formatPercent,
  formatResetTime,
  formatUsd,
  getBillableInputTokens,
  buildCombinedChartMarkup,
  calculateResetProgress,
  isRateLimitSnapshotStale,
  formatModelLabel,
  getScopeRows,
  summarizeLedgerRows,
  getVisibleLedgerRows,
  getFilteredSessionRows,
  getSessionPageRows,
  getSessionPageCount,
} = require("../public/app.js");
const { estimateCost } = require("../server/lib/pricing");

test("dashboard formatters render readable token and quota values", () => {
  assert.equal(formatTokenMillions(35000000), "35M");
  assert.equal(formatTokenMillions(5013157), "5.01M");
  assert.equal(formatPercent(12), "12%");
  assert.equal(formatUsd(0.005363), "$0.01");
  assert.equal(formatUsd(12), "$12.00");
  assert.match(
    formatResetTime(1772950000),
    /2026|03|08|09/
  );
});

test("combined chart markup includes hover targets for token and cost values", () => {
  const markup = buildCombinedChartMarkup([
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
  const progress = calculateResetProgress({
    generatedAt: "2026-03-08T05:30:00.000Z",
    resetsAt: 1772956800,
    windowMinutes: 300,
  });

  assert.equal(progress.elapsedPercent, 50);
  assert.equal(progress.remainingPercent, 50);
});

test("stale rate-limit snapshots are detected after the reset time passes", () => {
  assert.equal(
    isRateLimitSnapshotStale({
      generatedAt: "2026-03-08T13:57:40.447Z",
      latestRateLimitAt: "2026-03-08T13:57:03.002Z",
      resetsAt: 1772977197,
    }),
    true
  );

  assert.equal(
    isRateLimitSnapshotStale({
      generatedAt: "2026-03-08T13:30:00.000Z",
      latestRateLimitAt: "2026-03-08T13:20:00.000Z",
      resetsAt: 1772977197,
    }),
    false
  );
});

test("gpt-5.4 codex alias is rendered as GPT-5.4", () => {
  assert.equal(formatModelLabel("gpt-5.4-codex"), "GPT-5.4");
  assert.equal(formatModelLabel("gpt-5.1-codex"), "gpt-5.1-codex");
});

test("billing scope and range helpers support natural month and visible slices", () => {
  const rows = [
    { day: "2026-03-08", totalTokens: 500000, totalUsd: 10 },
    { day: "2026-03-07", totalTokens: 400000, totalUsd: 8 },
    { day: "2026-02-28", totalTokens: 300000, totalUsd: 6 },
  ];

  const monthRows = getScopeRows(rows, "2026-03-08T10:00:00.000Z", "month");
  assert.deepEqual(monthRows.map((row) => row.day), ["2026-03-08", "2026-03-07"]);

  const visibleRows = getVisibleLedgerRows(monthRows, 0, 1);
  assert.deepEqual(visibleRows.map((row) => row.day), ["2026-03-08", "2026-03-07"]);

  const summary = summarizeLedgerRows(monthRows);
  assert.equal(summary.totalTokens, 900000);
  assert.equal(summary.totalUsd, 18);
});

test("session pagination returns 10 rows per page and computes total pages", () => {
  const rows = Array.from({ length: 23 }, (_, index) => ({ id: `thread-${index + 1}` }));

  assert.equal(getSessionPageCount(rows, 10), 3);
  assert.deepEqual(
    getSessionPageRows(rows, 2, 10).map((row) => row.id),
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

  const filtered = getFilteredSessionRows(rows, {
    title: "openclaw",
    model: "5.3",
    createdDate: "2026-03-07",
  });

  assert.deepEqual(filtered.map((row) => row.id), ["thread-2"]);
});

test("openclaw model table markup renders model costs and fallback source state", () => {
  const markup = buildOpenClawModelTableMarkup([
    { modelName: "gpt-5", totalUsd: 24.52151025 },
    { modelName: "gpt-5.3-codex", totalUsd: 4.31679775 },
  ]);

  assert.match(markup, /gpt-5\.3-codex/);
  assert.match(markup, /\$24\.52/);
  assert.match(markup, /模型/);

  const emptyMarkup = buildOpenClawModelTableMarkup([]);
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
    getBillableInputTokens({
      inputTokens: 6080000,
      cachedInputTokens: 5720000,
    }),
    360000
  );
});
