const test = require("node:test");
const assert = require("node:assert/strict");

const {
  loadOpenClawUsageSnapshot,
  resolveCodexbarBin,
  resolveOpenClawConfiguredModel,
} = require("../server/lib/openclawUsageRepository");

test("loadOpenClawUsageSnapshot keeps only ChatGPT-related Codex usage and aggregates top models", async () => {
  const snapshot = await loadOpenClawUsageSnapshot({
    openclawConfigReader: async () =>
      JSON.stringify({
        agents: {
          defaults: {
            model: {
              primary: "openai-codex/gpt-5.3-codex",
            },
          },
        },
      }),
    commandRunner: async () =>
      JSON.stringify([
        {
          provider: "codex",
          source: "local",
          updatedAt: "2026-03-08T12:55:09Z",
          sessionTokens: 121808179,
          sessionCostUSD: 24.52151025,
          last30DaysTokens: 449733141,
          last30DaysCostUSD: 35.16933075,
          totals: {
            inputTokens: 447250096,
            outputTokens: 2483045,
            totalTokens: 449733141,
            totalCost: 35.16933075,
          },
          daily: [
            {
              date: "2026-03-08",
              totalTokens: 121808179,
              totalCost: 24.52151025,
              inputTokens: 121392149,
              outputTokens: 416030,
              modelsUsed: ["gpt-5", "text-embedding-3-small"],
              modelBreakdowns: [
                { modelName: "gpt-5", cost: 24.52151025 },
                { modelName: "text-embedding-3-small", cost: 1.2 },
              ],
            },
            {
              date: "2026-03-07",
              totalTokens: 17432499,
              totalCost: 4.31679775,
              inputTokens: 17273227,
              outputTokens: 159272,
              modelsUsed: ["gpt-5.3-codex", "whisper-1"],
              modelBreakdowns: [
                { modelName: "gpt-5.3-codex", cost: 4.31679775 },
                { modelName: "whisper-1", cost: 0.4 },
              ],
            },
          ],
        },
      ]),
  });

  assert.equal(snapshot.provider, "codex");
  assert.equal(snapshot.source, "local");
  assert.equal(snapshot.configuredModel, "gpt-5.3-codex");
  assert.equal(snapshot.session.totalTokens, 121808179);
  assert.equal(snapshot.totals.totalUsd, 35.16933075);
  assert.deepEqual(snapshot.daily[0].modelsUsed, ["gpt-5"]);
  assert.equal(snapshot.daily[1].modelsUsed[0], "gpt-5.3-codex");
  assert.equal(snapshot.topModels[0].modelName, "gpt-5");
  assert.equal(snapshot.topModels[0].totalUsd, 24.52151025);
  assert.equal(snapshot.topModels[1].modelName, "gpt-5.3-codex");
  assert.equal(snapshot.topModels[1].totalUsd, 4.31679775);
});

test("resolveCodexbarBin prefers explicit and known absolute paths", () => {
  assert.equal(
    resolveCodexbarBin({
      codexbarBin: "/custom/codexbar",
      pathExistsFn: (candidate) => candidate === "/custom/codexbar",
    }),
    "/custom/codexbar"
  );

  assert.equal(
    resolveCodexbarBin({
      pathExistsFn: (candidate) => candidate === "/opt/homebrew/bin/codexbar",
    }),
    "/opt/homebrew/bin/codexbar"
  );
});

test("resolveOpenClawConfiguredModel extracts the configured primary model", async () => {
  const model = await resolveOpenClawConfiguredModel({
    openclawConfigReader: async () =>
      JSON.stringify({
        agents: {
          defaults: {
            model: {
              primary: "openai-codex/gpt-5.3-codex",
            },
          },
        },
      }),
  });

  assert.equal(model, "gpt-5.3-codex");
});
