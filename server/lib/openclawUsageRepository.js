const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const CHATGPT_MODEL_PATTERN = /^(gpt-|chatgpt-)/i;

let cachedSnapshot = null;
let cachedAtMs = 0;

function isChatgptModel(modelName) {
  return CHATGPT_MODEL_PATTERN.test(String(modelName || "").trim());
}

function pickCodexEntry(payload) {
  if (Array.isArray(payload)) {
    return payload.find((entry) => entry?.provider === "codex") || null;
  }

  if (payload?.provider === "codex") {
    return payload;
  }

  return null;
}

function normalizeDailyRow(row) {
  const modelsUsed = Array.isArray(row?.modelsUsed)
    ? row.modelsUsed.filter((modelName) => isChatgptModel(modelName))
    : [];
  const modelBreakdowns = Array.isArray(row?.modelBreakdowns)
    ? row.modelBreakdowns
        .filter((entry) => isChatgptModel(entry?.modelName))
        .map((entry) => ({
          modelName: String(entry.modelName),
          totalUsd: Number(entry.cost || entry.totalUsd || 0),
        }))
    : [];

  if (!modelsUsed.length && !modelBreakdowns.length) {
    return null;
  }

  return {
    day: row.date,
    totalTokens: Number(row.totalTokens || 0),
    totalUsd: Number(row.totalCost || row.totalUsd || 0),
    inputTokens: Number(row.inputTokens || 0),
    outputTokens: Number(row.outputTokens || 0),
    modelsUsed,
    modelBreakdowns,
  };
}

function buildTopModels(rows) {
  const totals = new Map();

  for (const row of rows) {
    for (const entry of row.modelBreakdowns) {
      totals.set(entry.modelName, (totals.get(entry.modelName) || 0) + Number(entry.totalUsd || 0));
    }
  }

  return Array.from(totals.entries())
    .map(([modelName, totalUsd]) => ({
      modelName,
      totalUsd,
    }))
    .sort((left, right) => right.totalUsd - left.totalUsd);
}

function normalizeConfiguredModel(modelName) {
  if (!modelName) {
    return null;
  }

  const raw = String(modelName).trim();
  const slashIndex = raw.lastIndexOf("/");
  return slashIndex >= 0 ? raw.slice(slashIndex + 1) : raw;
}

function resolveOpenClawConfigPath(options = {}) {
  if (options.openclawConfigPath) {
    return options.openclawConfigPath;
  }

  return path.join(os.homedir(), ".openclaw", "openclaw.json");
}

async function resolveOpenClawConfiguredModel(options = {}) {
  try {
    const content = options.openclawConfigReader
      ? await options.openclawConfigReader()
      : fs.readFileSync(resolveOpenClawConfigPath(options), "utf8");
    const parsed = JSON.parse(content);
    return normalizeConfiguredModel(parsed?.agents?.defaults?.model?.primary);
  } catch {
    return null;
  }
}

function normalizeSnapshot(entry, configuredModel) {
  if (!entry) {
    return null;
  }

  const dailyRows = Array.isArray(entry.daily)
    ? entry.daily.map((row) => normalizeDailyRow(row)).filter(Boolean)
    : [];
  const topModels = buildTopModels(dailyRows);

  if (!dailyRows.length && !topModels.length) {
    return null;
  }

  return {
    provider: "codex",
    source: entry.source || "local",
    updatedAt: entry.updatedAt || null,
    configuredModel: configuredModel || null,
    session: {
      totalTokens: Number(entry.sessionTokens || 0),
      totalUsd: Number(entry.sessionCostUSD || 0),
    },
    totals: {
      inputTokens: Number(entry.totals?.inputTokens || 0),
      outputTokens: Number(entry.totals?.outputTokens || 0),
      totalTokens: Number(entry.totals?.totalTokens || entry.last30DaysTokens || 0),
      totalUsd: Number(entry.totals?.totalCost || entry.last30DaysCostUSD || 0),
    },
    daily: dailyRows.sort((left, right) => right.day.localeCompare(left.day)),
    topModels,
  };
}

function resolveCodexbarBin(options = {}) {
  const pathExistsFn = options.pathExistsFn || fs.existsSync;
  const candidates = [
    options.codexbarBin,
    process.env.CODEXBAR_BIN,
    "/opt/homebrew/bin/codexbar",
    "/usr/local/bin/codexbar",
    "codexbar",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === "codexbar" || pathExistsFn(candidate)) {
      return candidate;
    }
  }

  return "codexbar";
}

function runCodexbarCost(options = {}) {
  return execFileSync(resolveCodexbarBin(options), ["cost", "--provider", "codex", "--format", "json"], {
    encoding: "utf8",
    timeout: 8000,
    maxBuffer: 10 * 1024 * 1024,
  }).trim();
}

async function loadOpenClawUsageSnapshot(options = {}) {
  const nowMs =
    options.now instanceof Date ? options.now.getTime() : new Date(options.now || Date.now()).getTime();
  const cacheTtlMs = Number(options.cacheTtlMs ?? 60000);

  if (!options.disableCache && cachedSnapshot && nowMs - cachedAtMs < cacheTtlMs) {
    return cachedSnapshot;
  }

  const rawPayload = options.commandRunner
    ? await options.commandRunner()
    : runCodexbarCost(options);
  const parsedPayload = JSON.parse(rawPayload);
  const configuredModel = await resolveOpenClawConfiguredModel(options);
  const normalized = normalizeSnapshot(pickCodexEntry(parsedPayload), configuredModel);

  if (!options.disableCache) {
    cachedSnapshot = normalized;
    cachedAtMs = nowMs;
  }

  return normalized;
}

module.exports = {
  isChatgptModel,
  loadOpenClawUsageSnapshot,
  resolveCodexbarBin,
  resolveOpenClawConfiguredModel,
};
