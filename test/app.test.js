const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const { createAppServer } = require("../server/app");

function createFixtureCodexHome() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-http-"));
  const codexHome = path.join(tempDir, ".codex");
  const dbPath = path.join(codexHome, "state_5.sqlite");
  const sessionPath = path.join(
    codexHome,
    "sessions",
    "2026",
    "03",
    "08",
    "rollout-2026-03-08T12-01-58-thread-9.jsonl"
  );

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
        ('thread-9', '/tmp/live.jsonl', 1772940000, 1772940300, 'vscode', 'openai', '/workspace/a', 'live thread', 'danger', 'never', 2200, 1, 0, NULL);
    `,
  ]);

  fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
  fs.writeFileSync(
    sessionPath,
    JSON.stringify({
      timestamp: "2026-03-08T04:02:59.064Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: { total_tokens: 2200, input_tokens: 1000, cached_input_tokens: 0, output_tokens: 1200, reasoning_output_tokens: 0 },
          last_token_usage: { total_tokens: 300, input_tokens: 120, cached_input_tokens: 0, output_tokens: 180, reasoning_output_tokens: 0 },
          model_context_window: 950000,
        },
        rate_limits: {
          limit_id: "codex",
          plan_type: "pro",
          primary: { used_percent: 4, window_minutes: 300, resets_at: 1772950000 },
        },
      },
    })
  );

  return codexHome;
}

test("snapshot endpoint returns normalized JSON and stream endpoint exposes SSE", async () => {
  const codexHome = createFixtureCodexHome();
  const server = createAppServer({ codexHome, refreshIntervalMs: 50 });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  try {
    const snapshotResponse = await fetch(`http://127.0.0.1:${port}/api/snapshot`);
    assert.equal(snapshotResponse.status, 200);

    const snapshot = await snapshotResponse.json();
    assert.equal(typeof snapshot.overview.totalTokens, "number");
    assert.equal(typeof snapshot.overview.totalThreads, "number");

    const pageResponse = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(pageResponse.status, 200);
    assert.match(pageResponse.headers.get("content-type"), /text\/html/);

    const assetResponse = await fetch(`http://127.0.0.1:${port}/app.js`);
    assert.equal(assetResponse.status, 200);
    assert.match(assetResponse.headers.get("content-type"), /application\/javascript/);

    const streamResponse = await fetch(`http://127.0.0.1:${port}/api/stream`);
    assert.equal(streamResponse.status, 200);
    assert.match(streamResponse.headers.get("content-type"), /text\/event-stream/);
    streamResponse.body.cancel();
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
