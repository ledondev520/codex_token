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

function createAlternateCodexHome() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-http-alt-"));
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
        ('thread-alt', '/tmp/alt.jsonl', 1772940000, 1772940300, 'vscode', 'openai', '/workspace/alt', 'alt thread', 'danger', 'never', 9900, 1, 0, NULL);
    `,
  ]);

  return codexHome;
}

test("snapshot endpoint returns normalized JSON and stream endpoint exposes SSE", async (t) => {
  const codexHome = createFixtureCodexHome();
  const alternateCodexHome = createAlternateCodexHome();
  const server = createAppServer({
    codexHome,
    refreshIntervalMs: 50,
    loadOpenClawUsageFn: async () => ({
      provider: "codex",
      source: "local",
      updatedAt: "2026-03-08T05:00:00.000Z",
      session: {
        totalTokens: 3200,
        totalUsd: 1.2,
      },
      totals: {
        totalTokens: 12800,
        totalUsd: 3.6,
      },
      daily: [
        {
          day: "2026-03-08",
          totalTokens: 3200,
          totalUsd: 1.2,
          modelsUsed: ["gpt-5.3-codex"],
          modelBreakdowns: [{ modelName: "gpt-5.3-codex", totalUsd: 1.2 }],
        },
      ],
      topModels: [{ modelName: "gpt-5.3-codex", totalUsd: 1.2 }],
    }),
  });

  const listenError = await new Promise((resolve) => {
    const handleError = (error) => {
      server.off("listening", handleListening);
      resolve(error);
    };
    const handleListening = () => {
      server.off("error", handleError);
      resolve(null);
    };

    server.once("error", handleError);
    server.once("listening", handleListening);
    server.listen(0, "127.0.0.1");
  });

  if (listenError?.code === "EPERM") {
    t.skip("sandbox blocks binding local test port (listen EPERM)");
    return;
  }

  if (listenError) {
    throw listenError;
  }
  const { port } = server.address();

  try {
    const snapshotResponse = await fetch(`http://127.0.0.1:${port}/api/snapshot`);
    assert.equal(snapshotResponse.status, 200);

    const snapshot = await snapshotResponse.json();
    assert.equal(typeof snapshot.overview.totalTokens, "number");
    assert.equal(typeof snapshot.overview.totalThreads, "number");
    assert.equal(snapshot.openclaw.provider, "codex");
    assert.equal(snapshot.openclaw.session.totalTokens, 3200);
    assert.equal(snapshot.openclaw.topModels[0].modelName, "gpt-5.3-codex");

    const pageResponse = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(pageResponse.status, 200);
    assert.match(pageResponse.headers.get("content-type"), /text\/html/);
    const pageHtml = await pageResponse.text();
    assert.match(pageHtml, /<div id="root"><\/div>/);
    assert.match(pageHtml, /\/assets\/index-/);
    assert.match(pageHtml, /window\.__INITIAL_SNAPSHOT__/);
    assert.doesNotMatch(pageHtml, /按 shadcn\/ui 文档里的 Card/);

    const assetMatch = pageHtml.match(/src="(\/assets\/[^"]+\.js)"/);
    assert.ok(assetMatch);

    const pricingPageResponse = await fetch(`http://127.0.0.1:${port}/settings/pricing`);
    assert.equal(pricingPageResponse.status, 200);
    assert.match(pricingPageResponse.headers.get("content-type"), /text\/html/);
    const pricingPageHtml = await pricingPageResponse.text();
    assert.match(pricingPageHtml, /<div id="root"><\/div>/);

    const assetResponse = await fetch(`http://127.0.0.1:${port}${assetMatch[1]}`);
    assert.equal(assetResponse.status, 200);
    assert.match(assetResponse.headers.get("content-type"), /application\/javascript/);

    const headPageResponse = await fetch(`http://127.0.0.1:${port}/`, {
      method: "HEAD",
    });
    assert.equal(headPageResponse.status, 200);
    assert.match(headPageResponse.headers.get("content-type"), /text\/html/);

    const headPricingPageResponse = await fetch(`http://127.0.0.1:${port}/settings/pricing`, {
      method: "HEAD",
    });
    assert.equal(headPricingPageResponse.status, 200);
    assert.match(headPricingPageResponse.headers.get("content-type"), /text\/html/);

    const headSnapshotResponse = await fetch(`http://127.0.0.1:${port}/api/snapshot`, {
      method: "HEAD",
    });
    assert.equal(headSnapshotResponse.status, 200);
    assert.match(headSnapshotResponse.headers.get("content-type"), /application\/json/);

    const refreshResponse = await fetch(`http://127.0.0.1:${port}/api/refresh`, {
      method: "POST",
    });
    assert.equal(refreshResponse.status, 200);
    const refreshedSnapshot = await refreshResponse.json();
    assert.equal(typeof refreshedSnapshot.generatedAt, "string");
    assert.equal(typeof refreshedSnapshot.overview.totalTokens, "number");

    const updateResponse = await fetch(`http://127.0.0.1:${port}/api/source`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        codexHome: alternateCodexHome,
      }),
    });
    assert.equal(updateResponse.status, 200);

    const updatedSnapshot = await (await fetch(`http://127.0.0.1:${port}/api/snapshot`)).json();
    assert.equal(updatedSnapshot.sources.codexHome, alternateCodexHome);
    assert.equal(updatedSnapshot.overview.totalTokens, 9900);

    const streamResponse = await fetch(`http://127.0.0.1:${port}/api/stream`);
    assert.equal(streamResponse.status, 200);
    assert.match(streamResponse.headers.get("content-type"), /text\/event-stream/);
    streamResponse.body.cancel();
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
