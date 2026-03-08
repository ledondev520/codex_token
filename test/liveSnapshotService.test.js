const test = require("node:test");
const assert = require("node:assert/strict");

const { createLiveSnapshotService } = require("../server/lib/liveSnapshotService");

function createSnapshot(label) {
  return {
    generatedAt: "2026-03-08T00:00:00.000Z",
    sources: {
      codexHome: "/tmp/.codex",
    },
    overview: {
      totalThreads: label === "full" ? 3 : 1,
      totalTokens: label === "full" ? 300 : 100,
      latestUpdatedAt: null,
      totalEstimatedCost: label === "full" ? 9 : 1,
    },
    dailyLedger: [],
    pricingCatalog: [],
    live: {
      currentSession: null,
      rateLimits: null,
      latestEventAt: null,
      latestEventFile: null,
      latestRateLimitAt: null,
      latestRateLimitFile: null,
    },
    recentThreads: [],
    dailyUsage: [],
  };
}

test("getCurrentSnapshot returns immediately and schedules warmup asynchronously", async () => {
  const calls = [];
  const service = createLiveSnapshotService({
    codexHome: "/tmp/.codex",
    refreshIntervalMs: 10_000,
    loadSnapshotFn: async (options) => {
      calls.push(options.skipSessionParsing ? "fast" : "full");
      return createSnapshot(options.skipSessionParsing ? "fast" : "full");
    },
    loadSnapshotInBackgroundFn: async (options) => {
      calls.push(options.skipSessionParsing ? "fast-bg" : "full");
      return createSnapshot(options.skipSessionParsing ? "fast-bg" : "full");
    },
  });

  const snapshot = service.getCurrentSnapshot();
  assert.equal(snapshot.loading, true);
  assert.equal(calls.length, 0);

  const deadline = Date.now() + 200;
  while (calls.length < 2 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  assert.deepEqual(calls, ["fast", "full"]);

  const hydratedSnapshot = service.getCurrentSnapshot();
  assert.equal(hydratedSnapshot.loading, false);
  assert.equal(hydratedSnapshot.overview.totalThreads, 3);
});

test("full refresh can use a separate async loader", async () => {
  const calls = [];
  const service = createLiveSnapshotService({
    codexHome: "/tmp/.codex",
    refreshIntervalMs: 10_000,
    loadSnapshotFn: async (options) => {
      calls.push(options.skipSessionParsing ? "fast" : "full-main");
      return createSnapshot(options.skipSessionParsing ? "fast" : "full-main");
    },
    loadSnapshotInBackgroundFn: async () => {
      calls.push("full-bg");
      return createSnapshot("full");
    },
  });

  service.getCurrentSnapshot();

  const deadline = Date.now() + 200;
  while (calls.length < 2 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  assert.deepEqual(calls, ["fast", "full-bg"]);
  assert.equal(service.getCurrentSnapshot().overview.totalThreads, 3);
});
