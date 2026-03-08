const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const { loadSnapshot } = require("../server/lib/usageRepository");

function writeJsonl(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join("\n"));
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
    ]
  );

  const snapshot = await loadSnapshot({ codexHome, now: new Date("2026-03-08T04:10:00.000Z") });

  assert.equal(snapshot.overview.totalThreads, 2);
  assert.equal(snapshot.overview.totalTokens, 4600);
  assert.ok(Math.abs(snapshot.overview.totalEstimatedCost - 0.0019525) < 0.000001);
  assert.equal(snapshot.live.currentSession.totalTokens, 2400);
  assert.equal(snapshot.live.currentSession.lastTokens, 380);
  assert.equal(snapshot.live.currentSession.modelName, "gpt-5-codex");
  assert.ok(Math.abs(snapshot.live.currentSession.cost.totalUsd - 0.0083125) < 0.000001);
  assert.equal(snapshot.live.rateLimits.planType, "pro");
  assert.equal(snapshot.live.rateLimits.primary.label, "5小时窗口");
  assert.equal(snapshot.live.rateLimits.primary.usedPercent, 12);
  assert.equal(snapshot.recentThreads[0].id, "thread-2");
  assert.equal(snapshot.recentThreads[0].modelName, "gpt-5-codex");
  assert.equal(snapshot.dailyUsage[0].totalTokens, 4600);
  assert.equal(snapshot.dailyLedger[0].totalTokens, 630);
  assert.ok(Math.abs(snapshot.dailyLedger[0].totalUsd - 0.0019525) < 0.000001);
  assert.equal(snapshot.pricingCatalog[0].modelName, "gpt-5-codex");
  assert.equal(snapshot.pricingCatalog[0].inputPerMillion, 1.25);
});
