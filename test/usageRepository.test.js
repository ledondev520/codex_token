const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const {
  classifyUsageOrigin,
  extractSessionDetails,
  loadSnapshot,
} = require("../server/lib/usageRepository");
const { buildPricingCatalog } = require("../server/lib/pricing");

function writeJsonl(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join("\n"));
}

function setFileMtime(filePath, isoTimestamp) {
  const time = new Date(isoTimestamp);
  fs.utimesSync(filePath, time, time);
}

function createSqliteDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  execFileSync("sqlite3", [
    dbPath,
    `
      CREATE TABLE threads (
        id TEXT PRIMARY KEY,
        rollout_path TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        source TEXT NOT NULL,
        model_provider TEXT NOT NULL,
        cwd TEXT NOT NULL,
        title TEXT NOT NULL,
        sandbox_policy TEXT NOT NULL,
        approval_mode TEXT NOT NULL,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        has_user_event INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        archived_at INTEGER
      );
      INSERT INTO threads (
        id, rollout_path, created_at, updated_at, source, model_provider, cwd, title,
        sandbox_policy, approval_mode, tokens_used, has_user_event, archived, archived_at
      ) VALUES
        ('thread-1', '/tmp/rollout-1.jsonl', 1772940000, 1772940300, 'vscode', 'openai', '/workspace/a', 'first thread', 'danger', 'never', 1200, 1, 0, NULL),
        ('thread-2', '/tmp/rollout-2.jsonl', 1772940600, 1772940900, 'vscode', 'openai', '/workspace/b', 'second thread', 'danger', 'never', 3400, 1, 0, NULL);
    `,
  ]);
}

test("loadSnapshot aggregates sqlite history and latest live token/rate-limit events", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-usage-"));
  const codexHome = path.join(tempDir, ".codex");
  const dbPath = path.join(codexHome, "state_5.sqlite");
  const sessionPath = path.join(
    codexHome,
    "sessions",
    "2026",
    "03",
    "08",
    "rollout-2026-03-08T12-01-58-thread-2.jsonl"
  );

  createSqliteDb(dbPath);
  writeJsonl(sessionPath, [
    {
      timestamp: "2026-03-08T04:02:12.257Z",
      type: "session_meta",
      payload: {
        id: "thread-2",
        model_provider: "openai",
      },
    },
    {
      timestamp: "2026-03-08T04:02:14.470Z",
      type: "turn_context",
      payload: {
        turn_id: "turn-1",
        model: "gpt-5-codex",
      },
    },
    {
      timestamp: "2026-03-08T04:02:20.000Z",
      type: "event_msg",
      payload: {
        type: "user_message",
        message: "请把模型价格表按相同价格合并展示",
      },
    },
    {
      timestamp: "2026-03-08T04:02:59.064Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: {
            input_tokens: 1200,
            cached_input_tokens: 300,
            output_tokens: 400,
            reasoning_output_tokens: 50,
            total_tokens: 1600,
          },
          last_token_usage: {
            input_tokens: 200,
            cached_input_tokens: 100,
            output_tokens: 50,
            reasoning_output_tokens: 10,
            total_tokens: 250,
          },
          model_context_window: 950000,
        },
        rate_limits: {
          limit_id: "codex",
          primary: {
            used_percent: 12,
            window_minutes: 300,
            resets_at: 1772950000,
          },
          secondary: {
            used_percent: 37,
            window_minutes: 10080,
            resets_at: 1773200000,
          },
          credits: null,
          plan_type: "pro",
        },
      },
    },
  ]);
  writeJsonl(
    path.join(
      codexHome,
    "sessions",
    "2026",
    "03",
    "08",
    "rollout-2026-03-08T12-05-00-thread-2.jsonl"
  ),
  [
      {
        timestamp: "2026-03-08T04:04:10.000Z",
        type: "session_meta",
        payload: {
          id: "thread-2",
          model_provider: "openai",
        },
      },
      {
        timestamp: "2026-03-08T04:04:12.000Z",
        type: "turn_context",
        payload: {
          turn_id: "turn-2",
          model: "gpt-5-codex",
        },
      },
      {
        timestamp: "2026-03-08T04:05:00.000Z",
        type: "event_msg",
        payload: {
          type: "token_count",
          info: {
            total_token_usage: {
              input_tokens: 1800,
              cached_input_tokens: 500,
              output_tokens: 600,
              reasoning_output_tokens: 90,
              total_tokens: 2400,
            },
            last_token_usage: {
              input_tokens: 300,
              cached_input_tokens: 120,
              output_tokens: 80,
              reasoning_output_tokens: 20,
              total_tokens: 380,
            },
            model_context_window: 950000,
          },
          rate_limits: null,
        },
      },
      {
        timestamp: "2026-03-08T04:05:02.000Z",
        type: "event_msg",
        payload: {
          type: "task_complete",
        },
      },
    ]
  );

  const snapshot = await loadSnapshot({
    codexHome,
    now: new Date("2026-03-08T04:10:00.000Z"),
    loadOpenClawUsageFn: async () => null,
  });

  assert.equal(snapshot.overview.totalThreads, 2);
  assert.equal(snapshot.overview.totalTokens, 4600);
  assert.ok(Math.abs(snapshot.overview.totalEstimatedCost - 0.0016775) < 0.000001);
  assert.equal(snapshot.live.currentSession.totalTokens, 2400);
  assert.equal(snapshot.live.currentSession.lastTokens, 380);
  assert.equal(snapshot.live.currentSession.threadId, "thread-2");
  assert.equal(snapshot.live.currentSession.modelName, "gpt-5-codex");
  assert.equal(snapshot.live.currentSession.statusLabel, "已完结");
  assert.equal(snapshot.live.currentSession.titlePreview, "second thread");
  assert.ok(Math.abs(snapshot.live.currentSession.cost.totalUsd - 0.0076875) < 0.000001);
  assert.equal(snapshot.live.rateLimits.planType, "pro");
  assert.equal(snapshot.live.rateLimits.primary.label, "5小时窗口");
  assert.equal(snapshot.live.rateLimits.primary.usedPercent, 12);
  assert.equal(snapshot.recentThreads[0].id, "thread-2");
  assert.equal(snapshot.recentThreads[0].modelName, "gpt-5-codex");
  assert.equal(snapshot.recentThreads[0].promptText, "请把模型价格表按相同价格合并展示");
  assert.equal(snapshot.recentThreads[0].statusLabel, "已完结");
  assert.equal(snapshot.dailyUsage[0].totalTokens, 4600);
  assert.equal(snapshot.dailyLedger[0].totalTokens, 630);
  assert.ok(Math.abs(snapshot.dailyLedger[0].totalUsd - 0.0016775) < 0.000001);
  assert.equal(snapshot.pricingCatalog[0].modelName, "gpt-5-codex");
  assert.equal(snapshot.pricingCatalog[0].inputPerMillion, 1.25);
});

test("loadSnapshot keeps model names for recent threads even when unrelated newer session files exist", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-recent-models-"));
  const codexHome = path.join(tempDir, ".codex");
  const dbPath = path.join(codexHome, "state_5.sqlite");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  execFileSync("sqlite3", [
    dbPath,
    `
      CREATE TABLE threads (
        id TEXT PRIMARY KEY,
        rollout_path TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        source TEXT NOT NULL,
        model_provider TEXT NOT NULL,
        cwd TEXT NOT NULL,
        title TEXT NOT NULL,
        sandbox_policy TEXT NOT NULL,
        approval_mode TEXT NOT NULL,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        has_user_event INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        archived_at INTEGER
      );
      INSERT INTO threads (
        id, rollout_path, created_at, updated_at, source, model_provider, cwd, title,
        sandbox_policy, approval_mode, tokens_used, has_user_event, archived, archived_at
      ) VALUES
        ('thread-target-1', '/tmp/target-1.jsonl', 1773453600, 1773457200, 'vscode', 'openai', '/workspace/alpha', 'alpha thread', 'danger', 'never', 1200, 1, 0, NULL),
        ('thread-target-2', '/tmp/target-2.jsonl', 1773453900, 1773457500, 'vscode', 'openai', '/workspace/beta', 'beta thread', 'danger', 'never', 800, 1, 0, NULL);
    `,
  ]);

  const target1Path = path.join(codexHome, "sessions", "2026", "03", "13", "thread-target-1.jsonl");
  const target2Path = path.join(codexHome, "sessions", "2026", "03", "13", "thread-target-2.jsonl");

  writeJsonl(target1Path, [
    { timestamp: "2026-03-13T02:00:00.000Z", type: "session_meta", payload: { id: "thread-target-1", model_provider: "openai" } },
    { timestamp: "2026-03-13T02:00:01.000Z", type: "turn_context", payload: { turn_id: "turn-target-1", model: "gpt-5.3-codex" } },
    { timestamp: "2026-03-13T02:00:02.000Z", type: "event_msg", payload: { type: "user_message", message: "alpha prompt" } },
  ]);
  writeJsonl(target2Path, [
    { timestamp: "2026-03-13T02:10:00.000Z", type: "session_meta", payload: { id: "thread-target-2", model_provider: "openai" } },
    { timestamp: "2026-03-13T02:10:01.000Z", type: "turn_context", payload: { turn_id: "turn-target-2", model: "gpt-5.4" } },
    { timestamp: "2026-03-13T02:10:02.000Z", type: "event_msg", payload: { type: "user_message", message: "beta prompt" } },
  ]);
  setFileMtime(target1Path, "2026-03-13T02:00:10.000Z");
  setFileMtime(target2Path, "2026-03-13T02:10:10.000Z");

  for (let index = 0; index < 41; index += 1) {
    const noisePath = path.join(
      codexHome,
      "archived_sessions",
      `noise-${String(index).padStart(2, "0")}.jsonl`
    );
    writeJsonl(noisePath, [
      {
        timestamp: "2026-03-13T03:00:00.000Z",
        type: "session_meta",
        payload: {
          id: `noise-thread-${index}`,
          model_provider: "openai",
        },
      },
      {
        timestamp: "2026-03-13T03:00:01.000Z",
        type: "turn_context",
        payload: {
          turn_id: `noise-turn-${index}`,
          model: "gpt-5.3-codex-spark",
        },
      },
    ]);
    setFileMtime(noisePath, `2026-03-13T03:${String(index).padStart(2, "0")}:00.000Z`);
  }

  const snapshot = await loadSnapshot({
    codexHome,
    recentThreadsLimit: null,
    loadOpenClawUsageFn: async () => null,
  });

  const recentThreadModels = new Map(
    snapshot.recentThreads.map((row) => [row.id, row.modelName])
  );

  assert.equal(recentThreadModels.get("thread-target-1"), "gpt-5.3-codex");
  assert.equal(recentThreadModels.get("thread-target-2"), "gpt-5.4");
});

test("loadSnapshot derives session status from latest lifecycle event", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-status-"));
  const codexHome = path.join(tempDir, ".codex");
  const dbPath = path.join(codexHome, "state_5.sqlite");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  execFileSync("sqlite3", [
    dbPath,
    `
      CREATE TABLE threads (
        id TEXT PRIMARY KEY,
        rollout_path TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        source TEXT NOT NULL,
        model_provider TEXT NOT NULL,
        cwd TEXT NOT NULL,
        title TEXT NOT NULL,
        sandbox_policy TEXT NOT NULL,
        approval_mode TEXT NOT NULL,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        has_user_event INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        archived_at INTEGER
      );
      INSERT INTO threads (
        id, rollout_path, created_at, updated_at, source, model_provider, cwd, title,
        sandbox_policy, approval_mode, tokens_used, has_user_event, archived, archived_at
      ) VALUES
        ('thread-1', '/tmp/1.jsonl', 1773018000, 1773018060, 'vscode', 'openai', '/workspace/a', 'waiting', 'danger', 'never', 100, 1, 0, NULL),
        ('thread-2', '/tmp/2.jsonl', 1773018000, 1773018120, 'vscode', 'openai', '/workspace/b', 'running', 'danger', 'never', 100, 1, 0, NULL),
        ('thread-3', '/tmp/3.jsonl', 1773018000, 1773018180, 'vscode', 'openai', '/workspace/c', 'done', 'danger', 'never', 100, 1, 0, NULL),
        ('thread-4', '/tmp/4.jsonl', 1773018000, 1773018240, 'vscode', 'openai', '/workspace/d', 'aborted', 'danger', 'never', 100, 1, 0, NULL);
    `,
  ]);

  writeJsonl(path.join(codexHome, "sessions", "2026", "03", "09", "thread-1.jsonl"), [
    { timestamp: "2026-03-09T01:00:00.000Z", type: "session_meta", payload: { id: "thread-1", model_provider: "openai" } },
    { timestamp: "2026-03-09T01:00:01.000Z", type: "event_msg", payload: { type: "user_message", message: "hello" } },
  ]);

  writeJsonl(path.join(codexHome, "sessions", "2026", "03", "09", "thread-2.jsonl"), [
    { timestamp: "2026-03-09T01:00:00.000Z", type: "session_meta", payload: { id: "thread-2", model_provider: "openai" } },
    { timestamp: "2026-03-09T01:00:01.000Z", type: "event_msg", payload: { type: "user_message", message: "hello" } },
    { timestamp: "2026-03-09T01:00:02.000Z", type: "response_item", payload: { type: "reasoning" } },
  ]);

  writeJsonl(path.join(codexHome, "sessions", "2026", "03", "09", "thread-3.jsonl"), [
    { timestamp: "2026-03-09T01:00:00.000Z", type: "session_meta", payload: { id: "thread-3", model_provider: "openai" } },
    { timestamp: "2026-03-09T01:00:01.000Z", type: "event_msg", payload: { type: "task_complete" } },
  ]);

  writeJsonl(path.join(codexHome, "sessions", "2026", "03", "09", "thread-4.jsonl"), [
    { timestamp: "2026-03-09T01:00:00.000Z", type: "session_meta", payload: { id: "thread-4", model_provider: "openai" } },
    { timestamp: "2026-03-09T01:00:01.000Z", type: "event_msg", payload: { type: "turn_aborted" } },
  ]);

  const snapshot = await loadSnapshot({
    codexHome,
    recentThreadsLimit: null,
    loadOpenClawUsageFn: async () => null,
  });

  const statuses = Object.fromEntries(snapshot.recentThreads.map((row) => [row.id, row.statusLabel]));
  assert.equal(statuses["thread-1"], "等待回答");
  assert.equal(statuses["thread-2"], "进行中");
  assert.equal(statuses["thread-3"], "已完结");
  assert.equal(statuses["thread-4"], "已中断");
});

test("classifyUsageOrigin marks openclaw workspaces separately from local codex workspaces", () => {
  assert.deepEqual(
    classifyUsageOrigin({ cwd: "/Users/helena/.openclaw/workspace", source: "vscode" }),
    {
      kind: "openclaw-oauth",
      label: "小龙虾主脑",
      description: "来自 CodeX OS / 小龙虾主脑的 Codex 开销",
    }
  );

  assert.deepEqual(
    classifyUsageOrigin({ cwd: "/Users/helena/Cursor/codex_token", source: "cli" }),
    {
      kind: "codex-local",
      label: "Codex 编程",
      description: "直接来自本地 Codex 会话与限额快照",
    }
  );

  assert.deepEqual(
    classifyUsageOrigin({
      cwd: "/Users/helena/Cursor/codex_token",
      source: "vscode",
      modelName: "gpt-5.4",
    }),
    {
      kind: "codex-local",
      label: "Codex 编程",
      description: "直接来自本地 Codex 会话与限额快照",
    }
  );
});

test("extractSessionDetails keeps each user turn from event messages", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-user-turns-"));
  const filePath = path.join(tempDir, "thread.jsonl");

  writeJsonl(filePath, [
    {
      timestamp: "2026-03-12T12:00:00.000Z",
      type: "session_meta",
      payload: {
        id: "thread-turns",
        model_provider: "openai",
      },
    },
    {
      timestamp: "2026-03-12T12:00:01.000Z",
      type: "event_msg",
      payload: {
        type: "user_message",
        message: "第一轮提问",
      },
    },
    {
      timestamp: "2026-03-12T12:01:01.000Z",
      type: "event_msg",
      payload: {
        type: "user_message",
        message: "第二轮追问",
      },
    },
  ]);

  const details = extractSessionDetails(filePath);
  assert.deepEqual(
    details.userMessages.map((message) => message.text),
    ["第一轮提问", "第二轮追问"]
  );
});

test("pricing catalog groups models with identical pricing and removes the gpt-5.4-codex label", () => {
  const catalog = buildPricingCatalog([
    "gpt-5-codex",
    "gpt-5.1-codex",
    "gpt-5.1-codex-max",
    "gpt-5.4",
    "gpt-5.4-codex",
    "gpt-5.1-codex-mini",
  ]);

  assert.equal(catalog.length, 2);
  assert.equal(catalog[0].modelName, "gpt-5-codex / gpt-5.1-codex / gpt-5.1-codex-max");
  assert.equal(catalog[1].modelName, "GPT-5.4");
  assert.ok(catalog.every((row) => row.modelName !== "gpt-5.4-codex"));
  assert.ok(catalog.every((row) => row.modelName !== "GPT-5.4 / GPT-5.4"));
  assert.ok(catalog.every((row) => row.modelName !== "gpt-5.1-codex-mini"));
});

test("loadSnapshot chooses the newest rate-limit event by rateLimitsAt instead of thread latestTimestamp", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-usage-ratelimit-"));
  const codexHome = path.join(tempDir, ".codex");
  const dbPath = path.join(codexHome, "state_5.sqlite");

  createSqliteDb(dbPath);

  writeJsonl(
    path.join(codexHome, "sessions", "2026", "03", "08", "a-thread-1.jsonl"),
    [
      {
        timestamp: "2026-03-08T04:00:00.000Z",
        type: "session_meta",
        payload: { id: "thread-1", model_provider: "openai" },
      },
      {
        timestamp: "2026-03-08T04:00:01.000Z",
        type: "turn_context",
        payload: { turn_id: "turn-1", model: "gpt-5-codex" },
      },
      {
        timestamp: "2026-03-08T04:01:00.000Z",
        type: "event_msg",
        payload: {
          type: "token_count",
          info: {
            total_token_usage: { total_tokens: 100, input_tokens: 40, cached_input_tokens: 0, output_tokens: 60, reasoning_output_tokens: 0 },
            last_token_usage: { total_tokens: 100, input_tokens: 40, cached_input_tokens: 0, output_tokens: 60, reasoning_output_tokens: 0 },
            model_context_window: 950000,
          },
          rate_limits: {
            limit_id: "codex",
            primary: { used_percent: 12, window_minutes: 300, resets_at: 1772950000 },
            secondary: { used_percent: 37, window_minutes: 10080, resets_at: 1773200000 },
            credits: null,
            plan_type: "pro",
          },
        },
      },
      {
        timestamp: "2026-03-08T04:10:00.000Z",
        type: "event_msg",
        payload: {
          type: "token_count",
          info: {
            total_token_usage: { total_tokens: 120, input_tokens: 50, cached_input_tokens: 0, output_tokens: 70, reasoning_output_tokens: 0 },
            last_token_usage: { total_tokens: 20, input_tokens: 10, cached_input_tokens: 0, output_tokens: 10, reasoning_output_tokens: 0 },
            model_context_window: 950000,
          },
          rate_limits: null,
        },
      },
    ]
  );

  writeJsonl(
    path.join(codexHome, "sessions", "2026", "03", "08", "b-thread-2.jsonl"),
    [
      {
        timestamp: "2026-03-08T04:00:00.000Z",
        type: "session_meta",
        payload: { id: "thread-2", model_provider: "openai" },
      },
      {
        timestamp: "2026-03-08T04:00:01.000Z",
        type: "turn_context",
        payload: { turn_id: "turn-2", model: "gpt-5-codex" },
      },
      {
        timestamp: "2026-03-08T04:05:00.000Z",
        type: "event_msg",
        payload: {
          type: "token_count",
          info: {
            total_token_usage: { total_tokens: 200, input_tokens: 80, cached_input_tokens: 0, output_tokens: 120, reasoning_output_tokens: 0 },
            last_token_usage: { total_tokens: 200, input_tokens: 80, cached_input_tokens: 0, output_tokens: 120, reasoning_output_tokens: 0 },
            model_context_window: 950000,
          },
          rate_limits: {
            limit_id: "codex",
            primary: { used_percent: 4, window_minutes: 300, resets_at: 1772977197 },
            secondary: { used_percent: 4, window_minutes: 10080, resets_at: 1773544636 },
            credits: null,
            plan_type: "pro",
          },
        },
      },
    ]
  );

  const snapshot = await loadSnapshot({
    codexHome,
    now: new Date("2026-03-08T04:12:00.000Z"),
    loadOpenClawUsageFn: async () => null,
  });

  assert.equal(snapshot.live.rateLimits.primary.usedPercent, 4);
  assert.equal(snapshot.live.rateLimits.secondary.usedPercent, 4);
  assert.equal(snapshot.live.latestRateLimitAt, "2026-03-08T04:05:00.000Z");
});

test("loadSnapshot builds decision insights for project/model costs, efficiency, and failures", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-decision-"));
  const codexHome = path.join(tempDir, ".codex");
  const dbPath = path.join(codexHome, "state_5.sqlite");

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  execFileSync("sqlite3", [
    dbPath,
    `
      CREATE TABLE threads (
        id TEXT PRIMARY KEY,
        rollout_path TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        source TEXT NOT NULL,
        model_provider TEXT NOT NULL,
        cwd TEXT NOT NULL,
        title TEXT NOT NULL,
        sandbox_policy TEXT NOT NULL,
        approval_mode TEXT NOT NULL,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        has_user_event INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        archived_at INTEGER
      );
      INSERT INTO threads (
        id, rollout_path, created_at, updated_at, source, model_provider, cwd, title,
        sandbox_policy, approval_mode, tokens_used, has_user_event, archived, archived_at
      ) VALUES
        ('thread-alpha-today', '/tmp/alpha-today.jsonl', 1773325200, 1773325320, 'vscode', 'openai', '/workspace/alpha', 'alpha today', 'danger', 'never', 2000, 1, 0, NULL),
        ('thread-beta-today', '/tmp/beta-today.jsonl', 1773328800, 1773328920, 'vscode', 'openai', '/workspace/beta', 'beta today', 'danger', 'never', 1000, 1, 0, NULL),
        ('thread-alpha-history', '/tmp/alpha-history.jsonl', 1773066000, 1773066120, 'vscode', 'openai', '/workspace/alpha', 'alpha history', 'danger', 'never', 3000, 1, 0, NULL),
        ('thread-gamma-failed', '/tmp/gamma-failed.jsonl', 1772881200, 1772881320, 'vscode', 'openai', '/workspace/gamma', 'gamma failed', 'danger', 'never', 800, 1, 0, NULL);
    `,
  ]);

  writeJsonl(path.join(codexHome, "sessions", "2026", "03", "13", "thread-alpha-today.jsonl"), [
    { timestamp: "2026-03-13T01:00:00.000Z", type: "session_meta", payload: { id: "thread-alpha-today", model_provider: "openai" } },
    { timestamp: "2026-03-13T01:00:01.000Z", type: "turn_context", payload: { turn_id: "turn-alpha", model: "gpt-5-codex" } },
    { timestamp: "2026-03-13T01:00:02.000Z", type: "event_msg", payload: { type: "user_message", message: "alpha prompt" } },
    {
      timestamp: "2026-03-13T01:01:00.000Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: { total_tokens: 2000, input_tokens: 1200, cached_input_tokens: 200, output_tokens: 600, reasoning_output_tokens: 0 },
          last_token_usage: { total_tokens: 2000, input_tokens: 1200, cached_input_tokens: 200, output_tokens: 600, reasoning_output_tokens: 0 },
          model_context_window: 950000,
        },
        rate_limits: null,
      },
    },
    { timestamp: "2026-03-13T01:02:00.000Z", type: "event_msg", payload: { type: "task_complete" } },
  ]);

  writeJsonl(path.join(codexHome, "sessions", "2026", "03", "13", "thread-beta-today.jsonl"), [
    { timestamp: "2026-03-13T02:00:00.000Z", type: "session_meta", payload: { id: "thread-beta-today", model_provider: "openai" } },
    { timestamp: "2026-03-13T02:00:01.000Z", type: "turn_context", payload: { turn_id: "turn-beta", model: "gpt-5.4" } },
    { timestamp: "2026-03-13T02:00:02.000Z", type: "event_msg", payload: { type: "user_message", message: "beta prompt" } },
    {
      timestamp: "2026-03-13T02:01:00.000Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: { total_tokens: 1000, input_tokens: 700, cached_input_tokens: 0, output_tokens: 300, reasoning_output_tokens: 0 },
          last_token_usage: { total_tokens: 1000, input_tokens: 700, cached_input_tokens: 0, output_tokens: 300, reasoning_output_tokens: 0 },
          model_context_window: 950000,
        },
        rate_limits: null,
      },
    },
    { timestamp: "2026-03-13T02:02:00.000Z", type: "event_msg", payload: { type: "turn_aborted" } },
  ]);

  writeJsonl(path.join(codexHome, "sessions", "2026", "03", "10", "thread-alpha-history.jsonl"), [
    { timestamp: "2026-03-10T03:00:00.000Z", type: "session_meta", payload: { id: "thread-alpha-history", model_provider: "openai" } },
    { timestamp: "2026-03-10T03:00:01.000Z", type: "turn_context", payload: { turn_id: "turn-alpha-history", model: "gpt-5.4" } },
    {
      timestamp: "2026-03-10T03:01:00.000Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: { total_tokens: 3000, input_tokens: 2000, cached_input_tokens: 500, output_tokens: 1000, reasoning_output_tokens: 0 },
          last_token_usage: { total_tokens: 3000, input_tokens: 2000, cached_input_tokens: 500, output_tokens: 1000, reasoning_output_tokens: 0 },
          model_context_window: 950000,
        },
        rate_limits: null,
      },
    },
    { timestamp: "2026-03-10T03:02:00.000Z", type: "event_msg", payload: { type: "task_complete" } },
  ]);

  writeJsonl(path.join(codexHome, "sessions", "2026", "03", "08", "thread-gamma-failed.jsonl"), [
    { timestamp: "2026-03-08T04:00:00.000Z", type: "session_meta", payload: { id: "thread-gamma-failed", model_provider: "openai" } },
    { timestamp: "2026-03-08T04:00:01.000Z", type: "turn_context", payload: { turn_id: "turn-gamma", model: "gpt-5-codex" } },
    {
      timestamp: "2026-03-08T04:01:00.000Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: { total_tokens: 800, input_tokens: 500, cached_input_tokens: 0, output_tokens: 300, reasoning_output_tokens: 0 },
          last_token_usage: { total_tokens: 800, input_tokens: 500, cached_input_tokens: 0, output_tokens: 300, reasoning_output_tokens: 0 },
          model_context_window: 950000,
        },
        rate_limits: null,
      },
    },
    { timestamp: "2026-03-08T04:02:00.000Z", type: "event_msg", payload: { type: "turn_aborted" } },
  ]);

  const snapshot = await loadSnapshot({
    codexHome,
    recentThreadsLimit: null,
    ledgerFileLimit: 50,
    now: new Date("2026-03-13T08:00:00.000Z"),
    loadOpenClawUsageFn: async () => null,
  });

  assert.equal(snapshot.decision.projectCost.today[0].label, "alpha");
  assert.ok(Math.abs(snapshot.decision.projectCost.today[0].totalUsd - 0.007275) < 0.000001);
  assert.equal(snapshot.decision.projectCost.last7Days[0].label, "alpha");
  assert.ok(Math.abs(snapshot.decision.projectCost.last7Days[0].totalUsd - 0.02615) < 0.000001);

  assert.equal(snapshot.decision.modelCost.today[0].label, "gpt-5-codex");
  assert.ok(Math.abs(snapshot.decision.modelCost.today[0].totalUsd - 0.007275) < 0.000001);
  assert.equal(snapshot.decision.modelCost.last7Days[0].label, "gpt-5.4");
  assert.ok(Math.abs(snapshot.decision.modelCost.last7Days[0].totalUsd - 0.025125) < 0.000001);

  assert.ok(Math.abs(snapshot.decision.efficiency.today.costPer1kTokens - 0.004508333333333334) < 0.0000001);
  assert.ok(Math.abs(snapshot.decision.efficiency.today.cacheHitRate - 10.526315789473683) < 0.0000001);
  assert.equal(snapshot.decision.efficiency.today.successRate, 50);

  assert.ok(
    Math.abs(
      snapshot.decision.efficiency.last7Days.costPer1kTokens -
        (snapshot.decision.efficiency.last7Days.totalUsd /
          snapshot.decision.efficiency.last7Days.totalTokens) *
          1000
    ) < 0.0000001
  );
  assert.ok(Math.abs(snapshot.decision.efficiency.last7Days.cacheHitRate - 15.909090909090908) < 0.0000001);
  assert.equal(snapshot.decision.efficiency.last7Days.successRate, 50);

  assert.equal(snapshot.decision.failures.todayCount, 1);
  assert.equal(snapshot.decision.failures.last7DaysCount, 2);
  assert.equal(snapshot.decision.failures.latestFailedAt, "2026-03-13T02:02:00.000Z");
  assert.deepEqual(
    snapshot.decision.failures.recent.map((row) => row.threadId),
    ["thread-beta-today", "thread-gamma-failed"]
  );
  assert.match(snapshot.decision.efficiency.cacheHitRateNote, /token_count/i);
  assert.match(snapshot.decision.efficiency.successRateNote, /已完结/);
});
