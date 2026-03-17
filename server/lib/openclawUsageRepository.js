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

function resolveOpenClawSessionsIndexPath(options = {}) {
  if (options.openclawSessionsIndexPath) {
    return options.openclawSessionsIndexPath;
  }

  return path.join(os.homedir(), ".openclaw", "agents", "main", "sessions", "sessions.json");
}

function getLocalDayKey(value, timeZone) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function createUsageAccumulator() {
  return {
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0,
    totalUsd: 0,
    modelsUsed: new Set(),
    modelBreakdowns: new Map(),
  };
}

function addUsageRow(targetByDay, row) {
  if (!row?.day) {
    return;
  }

  const existing = targetByDay.get(row.day) || createUsageAccumulator();
  existing.totalTokens += Number(row.totalTokens || 0);
  existing.inputTokens += Number(row.inputTokens || 0);
  existing.outputTokens += Number(row.outputTokens || 0);
  existing.cachedInputTokens += Number(row.cachedInputTokens || 0);
  existing.totalUsd += Number(row.totalUsd || 0);

  if (row.modelName) {
    existing.modelsUsed.add(row.modelName);
    existing.modelBreakdowns.set(
      row.modelName,
      (existing.modelBreakdowns.get(row.modelName) || 0) + Number(row.totalUsd || 0)
    );
  }

  targetByDay.set(row.day, existing);
}

function finalizeUsageRows(rowsByDay) {
  return Array.from(rowsByDay.entries())
    .map(([day, values]) => ({
      day,
      totalTokens: Number(values.totalTokens || 0),
      inputTokens: Number(values.inputTokens || 0),
      outputTokens: Number(values.outputTokens || 0),
      cachedInputTokens: Number(values.cachedInputTokens || 0),
      totalUsd: Number(values.totalUsd || 0),
      modelsUsed: Array.from(values.modelsUsed || []).sort(),
      modelBreakdowns: Array.from(values.modelBreakdowns.entries())
        .map(([modelName, totalUsd]) => ({
          modelName,
          totalUsd: Number(totalUsd || 0),
        }))
        .sort((left, right) => {
          if (right.totalUsd !== left.totalUsd) {
            return right.totalUsd - left.totalUsd;
          }

          return String(left.modelName).localeCompare(String(right.modelName));
        }),
    }))
    .sort((left, right) => right.day.localeCompare(left.day));
}

function summarizeRows(rows) {
  return rows.reduce(
    (summary, row) => {
      summary.totalTokens += Number(row.totalTokens || 0);
      summary.inputTokens += Number(row.inputTokens || 0);
      summary.outputTokens += Number(row.outputTokens || 0);
      summary.cachedInputTokens += Number(row.cachedInputTokens || 0);
      summary.totalUsd += Number(row.totalUsd || 0);
      return summary;
    },
    {
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
      totalUsd: 0,
    }
  );
}

function mergeDailyRowsBySum(rowSets) {
  const byDay = new Map();

  for (const rows of rowSets) {
    for (const row of rows || []) {
      if (!row?.day) {
        continue;
      }

      const existing = byDay.get(row.day) || createUsageAccumulator();
      existing.totalTokens += Number(row.totalTokens || 0);
      existing.inputTokens += Number(row.inputTokens || 0);
      existing.outputTokens += Number(row.outputTokens || 0);
      existing.cachedInputTokens += Number(row.cachedInputTokens || 0);
      existing.totalUsd += Number(row.totalUsd || 0);

      for (const modelName of row.modelsUsed || []) {
        if (modelName) {
          existing.modelsUsed.add(String(modelName));
        }
      }

      for (const breakdown of row.modelBreakdowns || []) {
        if (!breakdown?.modelName) {
          continue;
        }

        existing.modelBreakdowns.set(
          String(breakdown.modelName),
          (existing.modelBreakdowns.get(String(breakdown.modelName)) || 0) +
            Number(breakdown.totalUsd || 0)
        );
      }

      byDay.set(row.day, existing);
    }
  }

  return finalizeUsageRows(byDay);
}

function pickLatestIso(left, right) {
  const leftMs = left ? new Date(left).getTime() : 0;
  const rightMs = right ? new Date(right).getTime() : 0;
  if (leftMs >= rightMs) {
    return left || right || null;
  }

  return right || left || null;
}

function isMainBrainSession(sessionKey, entry) {
  return (
    String(sessionKey || "").startsWith("agent:main:") &&
    Boolean(entry?.sessionFile)
  );
}

async function loadLocalMainUsageSnapshot(options = {}) {
  let rawIndex;
  try {
    rawIndex = options.openclawSessionsIndexReader
      ? await options.openclawSessionsIndexReader()
      : fs.readFileSync(resolveOpenClawSessionsIndexPath(options), "utf8");
  } catch {
    return null;
  }

  let sessionIndex;
  try {
    sessionIndex = typeof rawIndex === "string" ? JSON.parse(rawIndex) : rawIndex;
  } catch {
    return null;
  }

  if (!sessionIndex || typeof sessionIndex !== "object") {
    return null;
  }

  const timeZone = options.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const rowsByDay = new Map();
  const seenFiles = new Set();
  let latestUpdatedAt = null;
  let latestSession = null;

  for (const [sessionKey, entry] of Object.entries(sessionIndex)) {
    if (!isMainBrainSession(sessionKey, entry)) {
      continue;
    }

    const sessionFile = String(entry.sessionFile || "").trim();
    if (!sessionFile || seenFiles.has(sessionFile)) {
      continue;
    }
    seenFiles.add(sessionFile);

    let content;
    try {
      content = options.openclawSessionFileReader
        ? await options.openclawSessionFileReader(sessionFile, { sessionKey, entry })
        : fs.readFileSync(sessionFile, "utf8");
    } catch {
      continue;
    }

    let latestUsageForFile = null;
    const defaultModelName = normalizeConfiguredModel(entry.model);
    const lines = String(content || "").split("\n").filter(Boolean);

    for (const line of lines) {
      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }

      const message = parsed?.message;
      if (!message || message.role !== "assistant" || !message.usage) {
        continue;
      }

      const usage = message.usage || {};
      const totalUsd = Number(usage.cost?.total || 0);
      const row = {
        day: getLocalDayKey(message.timestamp || parsed.timestamp, timeZone),
        timestamp: message.timestamp || parsed.timestamp || null,
        modelName: normalizeConfiguredModel(message.model || defaultModelName),
        totalTokens: Number(usage.totalTokens || 0),
        inputTokens: Number(usage.input || 0),
        outputTokens: Number(usage.output || 0),
        cachedInputTokens: Number(usage.cacheRead || 0),
        totalUsd,
      };

      const hasUsage =
        row.totalTokens > 0 ||
        row.inputTokens > 0 ||
        row.outputTokens > 0 ||
        row.cachedInputTokens > 0 ||
        row.totalUsd > 0;

      if (!hasUsage) {
        continue;
      }

      addUsageRow(rowsByDay, row);

      const rowMs = row.timestamp ? new Date(row.timestamp).getTime() : 0;
      const latestMs = latestUsageForFile?.timestamp
        ? new Date(latestUsageForFile.timestamp).getTime()
        : 0;
      if (!latestUsageForFile || rowMs >= latestMs) {
        latestUsageForFile = row;
      }
    }

    const updatedAtIso = entry.updatedAt ? new Date(Number(entry.updatedAt)).toISOString() : null;
    latestUpdatedAt = pickLatestIso(latestUpdatedAt, updatedAtIso);

    const updatedAtMs = updatedAtIso ? new Date(updatedAtIso).getTime() : 0;
    const latestSessionMs = latestSession?.updatedAt ? new Date(latestSession.updatedAt).getTime() : 0;
    if (latestUsageForFile && (!latestSession || updatedAtMs >= latestSessionMs)) {
      latestSession = {
        updatedAt: updatedAtIso,
        totalTokens: Number(entry.totalTokens || latestUsageForFile.totalTokens || 0),
        totalUsd: Number(latestUsageForFile.totalUsd || 0),
      };
    }
  }

  const dailyRows = finalizeUsageRows(rowsByDay);
  if (!dailyRows.length) {
    return null;
  }

  const totals = summarizeRows(dailyRows);
  const topModels = buildTopModels(dailyRows);

  return {
    provider: "openclaw",
    source: "local-main",
    updatedAt: latestUpdatedAt,
    configuredModel: null,
    session: latestSession || {
      totalTokens: 0,
      totalUsd: 0,
    },
    totals,
    daily: dailyRows,
    topModels,
    segments: {
      codexDaily: [],
      mainDaily: dailyRows,
    },
  };
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
    segments: {
      codexDaily: dailyRows,
      mainDaily: [],
    },
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

function mergeOpenClawSnapshots(codexSnapshot, mainSnapshot) {
  if (!codexSnapshot && !mainSnapshot) {
    return null;
  }

  if (!codexSnapshot) {
    return mainSnapshot;
  }

  if (!mainSnapshot) {
    return codexSnapshot;
  }

  const daily = mergeDailyRowsBySum([codexSnapshot.daily, mainSnapshot.daily]);
  const totals = summarizeRows(daily);

  return {
    ...codexSnapshot,
    source: "codexbar+local-main",
    updatedAt: pickLatestIso(codexSnapshot.updatedAt, mainSnapshot.updatedAt),
    session: {
      totalTokens:
        Number(codexSnapshot.session?.totalTokens || 0) +
        Number(mainSnapshot.session?.totalTokens || 0),
      totalUsd:
        Number(codexSnapshot.session?.totalUsd || 0) +
        Number(mainSnapshot.session?.totalUsd || 0),
    },
    totals: {
      inputTokens:
        Number(codexSnapshot.totals?.inputTokens || 0) +
        Number(mainSnapshot.totals?.inputTokens || 0),
      outputTokens:
        Number(codexSnapshot.totals?.outputTokens || 0) +
        Number(mainSnapshot.totals?.outputTokens || 0),
      totalTokens: Number(totals.totalTokens || 0),
      totalUsd: Number(totals.totalUsd || 0),
      cachedInputTokens:
        Number(codexSnapshot.totals?.cachedInputTokens || 0) +
        Number(mainSnapshot.totals?.cachedInputTokens || 0),
    },
    daily,
    topModels: buildTopModels(daily),
    segments: {
      codexDaily: codexSnapshot.segments?.codexDaily || codexSnapshot.daily || [],
      mainDaily: mainSnapshot.segments?.mainDaily || mainSnapshot.daily || [],
    },
  };
}

async function loadOpenClawUsageSnapshot(options = {}) {
  const nowMs =
    options.now instanceof Date ? options.now.getTime() : new Date(options.now || Date.now()).getTime();
  const cacheTtlMs = Number(options.cacheTtlMs ?? 60000);

  if (!options.disableCache && cachedSnapshot && nowMs - cachedAtMs < cacheTtlMs) {
    return cachedSnapshot;
  }

  const configuredModel = await resolveOpenClawConfiguredModel(options);
  let codexSnapshot = null;
  try {
    const rawPayload = options.commandRunner
      ? await options.commandRunner()
      : runCodexbarCost(options);
    const parsedPayload = JSON.parse(rawPayload);
    codexSnapshot = normalizeSnapshot(pickCodexEntry(parsedPayload), configuredModel);
  } catch {
    codexSnapshot = null;
  }

  const mainSnapshot = await loadLocalMainUsageSnapshot(options);
  const normalized = mergeOpenClawSnapshots(codexSnapshot, mainSnapshot);

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
