const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const { resolveCodexPaths } = require("./codexPaths");
const { estimateCost, getPricingForModel, normalizeModelName } = require("./pricing");

function runSqliteJson(dbPath, query) {
  if (!fs.existsSync(dbPath)) {
    return [];
  }

  const stdout = execFileSync("sqlite3", ["-json", dbPath, query], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  }).trim();

  return stdout ? JSON.parse(stdout) : [];
}

function getThreadSummary(stateDbPath) {
  const [overview = { total_threads: 0, total_tokens: 0 }] = runSqliteJson(
    stateDbPath,
    `
      SELECT
        COUNT(*) AS total_threads,
        COALESCE(SUM(tokens_used), 0) AS total_tokens,
        MAX(updated_at) AS latest_updated_at
      FROM threads
      WHERE archived = 0;
    `
  );

  return {
    totalThreads: Number(overview.total_threads || 0),
    totalTokens: Number(overview.total_tokens || 0),
    latestUpdatedAt: overview.latest_updated_at ? Number(overview.latest_updated_at) : null,
  };
}

function getRecentThreads(stateDbPath, limit = 10) {
  const rows = runSqliteJson(
    stateDbPath,
    `
      SELECT
        id,
        title,
        cwd,
        model_provider,
        tokens_used,
        created_at,
        updated_at
      FROM threads
      WHERE archived = 0
      ORDER BY updated_at DESC
      LIMIT ${Number(limit)};
    `
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    cwd: row.cwd,
    modelProvider: row.model_provider,
    tokensUsed: Number(row.tokens_used || 0),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }));
}

function getDailyUsage(stateDbPath, days = 14) {
  const rows = runSqliteJson(
    stateDbPath,
    `
      SELECT
        date(created_at, 'unixepoch', 'localtime') AS day,
        COUNT(*) AS total_threads,
        COALESCE(SUM(tokens_used), 0) AS total_tokens
      FROM threads
      WHERE archived = 0
      GROUP BY day
      ORDER BY day DESC
      LIMIT ${Number(days)};
    `
  );

  return rows.map((row) => ({
    day: row.day,
    totalThreads: Number(row.total_threads || 0),
    totalTokens: Number(row.total_tokens || 0),
  }));
}

function listJsonlFiles(rootDir, target = []) {
  if (!fs.existsSync(rootDir)) {
    return target;
  }

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      listJsonlFiles(fullPath, target);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      const stats = fs.statSync(fullPath);
      target.push({
        path: fullPath,
        mtimeMs: stats.mtimeMs,
      });
    }
  }

  return target;
}

function normalizeTokenUsage(info) {
  if (!info) {
    return null;
  }

  return {
    totalTokens: Number(info.total_token_usage?.total_tokens || 0),
    inputTokens: Number(info.total_token_usage?.input_tokens || 0),
    cachedInputTokens: Number(info.total_token_usage?.cached_input_tokens || 0),
    outputTokens: Number(info.total_token_usage?.output_tokens || 0),
    reasoningOutputTokens: Number(info.total_token_usage?.reasoning_output_tokens || 0),
    lastTokens: Number(info.last_token_usage?.total_tokens || 0),
    modelContextWindow: Number(info.model_context_window || 0),
  };
}

function normalizeLastTokenUsage(info) {
  if (!info?.last_token_usage) {
    return null;
  }

  return {
    totalTokens: Number(info.last_token_usage.total_tokens || 0),
    inputTokens: Number(info.last_token_usage.input_tokens || 0),
    cachedInputTokens: Number(info.last_token_usage.cached_input_tokens || 0),
    outputTokens: Number(info.last_token_usage.output_tokens || 0),
    reasoningOutputTokens: Number(info.last_token_usage.reasoning_output_tokens || 0),
  };
}

function getLocalDayKey(timestamp, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function labelForWindow(windowMinutes) {
  if (windowMinutes === 300) {
    return "5小时窗口";
  }

  if (windowMinutes === 10080) {
    return "7天窗口";
  }

  return `${windowMinutes}分钟窗口`;
}

function normalizeRateLimits(rateLimits) {
  if (!rateLimits) {
    return null;
  }

  const primaryWindow = rateLimits.primary ? Number(rateLimits.primary.window_minutes || 0) : null;
  const secondaryWindow = rateLimits.secondary
    ? Number(rateLimits.secondary.window_minutes || 0)
    : null;

  return {
    limitId: rateLimits.limit_id || null,
    planType: rateLimits.plan_type || null,
    credits: rateLimits.credits || null,
    primary: rateLimits.primary
      ? {
          usedPercent: Number(rateLimits.primary.used_percent || 0),
          remainingPercent: Math.max(0, 100 - Number(rateLimits.primary.used_percent || 0)),
          windowMinutes: primaryWindow,
          resetsAt: Number(rateLimits.primary.resets_at || 0),
          label: labelForWindow(primaryWindow),
        }
      : null,
    secondary: rateLimits.secondary
      ? {
          usedPercent: Number(rateLimits.secondary.used_percent || 0),
          remainingPercent: Math.max(0, 100 - Number(rateLimits.secondary.used_percent || 0)),
          windowMinutes: secondaryWindow,
          resetsAt: Number(rateLimits.secondary.resets_at || 0),
          label: labelForWindow(secondaryWindow),
        }
      : null,
  };
}

function getThreadIdFromFilePath(filePath) {
  const basename = path.basename(filePath, ".jsonl");
  const match = basename.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
  );
  return match ? match[1] : basename;
}

function extractSessionDetails(filePath, options = {}) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter(Boolean);
  const timeZone = options.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const details = {
    filePath,
    threadId: null,
    modelProvider: null,
    latestTimestamp: null,
    tokenUsage: null,
    tokenUsageAt: null,
    rateLimits: null,
    rateLimitsAt: null,
    modelName: null,
    modelAt: null,
    ledgerEntries: [],
    modelsUsed: [],
  };
  let currentModelName = null;
  const modelSet = new Set();

  for (const line of lines) {
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }

    if (parsed.type === "session_meta") {
      details.threadId = parsed.payload?.id || details.threadId;
      details.modelProvider = parsed.payload?.model_provider || details.modelProvider;
      continue;
    }

    if (parsed.type === "turn_context") {
      currentModelName = normalizeModelName(parsed.payload?.model) || currentModelName;
      details.modelName = currentModelName || details.modelName;
      details.modelAt = parsed.timestamp || details.modelAt;
      details.latestTimestamp = parsed.timestamp || details.latestTimestamp;
      if (currentModelName) {
        modelSet.add(currentModelName);
      }
      continue;
    }

    if (parsed.type === "event_msg" && parsed.payload?.type === "token_count") {
      details.tokenUsage = normalizeTokenUsage(parsed.payload.info);
      details.tokenUsageAt = parsed.payload?.info ? parsed.timestamp : details.tokenUsageAt;
      details.rateLimits = normalizeRateLimits(parsed.payload.rate_limits);
      details.rateLimitsAt = parsed.payload?.rate_limits ? parsed.timestamp : details.rateLimitsAt;
      details.latestTimestamp = parsed.timestamp || details.latestTimestamp;

      const incrementalUsage = normalizeLastTokenUsage(parsed.payload.info);
      if (incrementalUsage) {
        const cost = estimateCost(incrementalUsage, currentModelName);
        details.ledgerEntries.push({
          day: getLocalDayKey(parsed.timestamp, timeZone),
          timestamp: parsed.timestamp,
          modelName: currentModelName,
          tokenUsage: incrementalUsage,
          cost,
        });
      }
    }
  }

  details.threadId = details.threadId || getThreadIdFromFilePath(filePath);
  details.cost = estimateCost(details.tokenUsage, details.modelName);
  details.modelsUsed = Array.from(modelSet);

  if (!details.tokenUsage && !details.rateLimits && !details.modelName) {
    return null;
  }

  return details;
}

function mergeSessionDetails(existing, incoming) {
  if (!existing) {
    return incoming;
  }

  const existingTime = new Date(existing.latestTimestamp || 0).getTime();
  const incomingTime = new Date(incoming.latestTimestamp || 0).getTime();
  const existingTokenTime = new Date(existing.tokenUsageAt || 0).getTime();
  const incomingTokenTime = new Date(incoming.tokenUsageAt || 0).getTime();
  const existingRateLimitTime = new Date(existing.rateLimitsAt || 0).getTime();
  const incomingRateLimitTime = new Date(incoming.rateLimitsAt || 0).getTime();
  const existingModelTime = new Date(existing.modelAt || 0).getTime();
  const incomingModelTime = new Date(incoming.modelAt || 0).getTime();
  const merged = {
    ...existing,
    ...incoming,
    latestTimestamp: incomingTime >= existingTime ? incoming.latestTimestamp : existing.latestTimestamp,
    tokenUsage:
      incoming.tokenUsage && incomingTokenTime >= existingTokenTime
        ? incoming.tokenUsage
        : existing.tokenUsage,
    tokenUsageAt:
      incoming.tokenUsage && incomingTokenTime >= existingTokenTime
        ? incoming.tokenUsageAt
        : existing.tokenUsageAt,
    rateLimits:
      incoming.rateLimits && incomingRateLimitTime >= existingRateLimitTime
        ? incoming.rateLimits
        : existing.rateLimits,
    rateLimitsAt:
      incoming.rateLimits && incomingRateLimitTime >= existingRateLimitTime
        ? incoming.rateLimitsAt
        : existing.rateLimitsAt,
    modelName:
      incoming.modelName && incomingModelTime >= existingModelTime
        ? incoming.modelName
        : existing.modelName,
    modelAt:
      incoming.modelName && incomingModelTime >= existingModelTime
        ? incoming.modelAt
        : existing.modelAt,
  };

  merged.cost = estimateCost(merged.tokenUsage, merged.modelName);
  return merged;
}

function buildRecentSessionMap(sessionsDir, archivedSessionsDir, fileLimit = 40) {
  const files = [
    ...listJsonlFiles(sessionsDir),
    ...listJsonlFiles(archivedSessionsDir),
  ]
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
    .slice(0, fileLimit);

  const byThreadId = new Map();

  for (const file of files) {
    const details = extractSessionDetails(file.path);
    if (!details?.threadId) {
      continue;
    }

    byThreadId.set(details.threadId, mergeSessionDetails(byThreadId.get(details.threadId), details));
  }

  return byThreadId;
}

function buildDailyLedger(sessionsDir, archivedSessionsDir, options = {}) {
  const files = [
    ...listJsonlFiles(sessionsDir),
    ...listJsonlFiles(archivedSessionsDir),
  ].sort((left, right) => left.mtimeMs - right.mtimeMs);

  const byDay = new Map();
  const usedModels = new Set();

  for (const file of files) {
    const details = extractSessionDetails(file.path, options);
    for (const modelName of details?.modelsUsed || []) {
      usedModels.add(modelName);
    }
    for (const entry of details?.ledgerEntries || []) {
      const existing = byDay.get(entry.day) || {
        day: entry.day,
        totalTokens: 0,
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        totalUsd: 0,
      };

      existing.totalTokens += entry.tokenUsage.totalTokens;
      existing.inputTokens += entry.tokenUsage.inputTokens;
      existing.cachedInputTokens += entry.tokenUsage.cachedInputTokens;
      existing.outputTokens += entry.tokenUsage.outputTokens;
      existing.totalUsd += entry.cost?.totalUsd || 0;
      byDay.set(entry.day, existing);
    }
  }

  return {
    rows: Array.from(byDay.values()).sort((left, right) => right.day.localeCompare(left.day)),
    usedModels: Array.from(usedModels).sort(),
  };
}

function getLatestLiveEvent(sessionMap) {
  let latestTokenUsage = null;
  let latestRateLimits = null;

  for (const candidate of sessionMap.values()) {
    const candidateTimestamp = new Date(candidate.latestTimestamp || 0).getTime();

    if (
      candidate.tokenUsage &&
      (!latestTokenUsage ||
        candidateTimestamp > new Date(latestTokenUsage.latestTimestamp || 0).getTime())
    ) {
      latestTokenUsage = candidate;
    }

    if (
      candidate.rateLimits &&
      (!latestRateLimits ||
        candidateTimestamp > new Date(latestRateLimits.latestTimestamp || 0).getTime())
    ) {
      latestRateLimits = candidate;
    }
  }

  return {
    currentSession: latestTokenUsage
      ? {
          timestamp: latestTokenUsage.latestTimestamp,
          filePath: latestTokenUsage.filePath,
          tokenUsage: latestTokenUsage.tokenUsage,
          modelName: latestTokenUsage.modelName,
          cost: latestTokenUsage.cost,
        }
      : null,
    rateLimits: latestRateLimits
      ? {
          timestamp: latestRateLimits.latestTimestamp,
          filePath: latestRateLimits.filePath,
          rateLimits: latestRateLimits.rateLimits,
        }
      : null,
  };
}

async function loadSnapshot(options = {}) {
  const paths = resolveCodexPaths(options.codexHome);
  const timeZone = options.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const recentSessionMap = buildRecentSessionMap(
    paths.sessionsDir,
    paths.archivedSessionsDir,
    options.recentSessionFileLimit || 40
  );
  const dailyLedger = buildDailyLedger(paths.sessionsDir, paths.archivedSessionsDir, { timeZone });
  const latestLiveEvent = getLatestLiveEvent(recentSessionMap);
  const overview = getThreadSummary(paths.stateDbPath);
  overview.totalEstimatedCost = dailyLedger.rows.reduce((sum, item) => sum + item.totalUsd, 0);
  const pricingCatalog = dailyLedger.usedModels
    .map((modelName) => {
      const pricing = getPricingForModel(modelName);
      return pricing
        ? {
            modelName,
            pricingModelName: pricing.pricingModelName,
            inputPerMillion: pricing.inputPerMillion,
            cachedInputPerMillion: pricing.cachedInputPerMillion,
            outputPerMillion: pricing.outputPerMillion,
            sourceType: pricing.sourceType,
            sourceLabel: pricing.sourceLabel,
            sourceUrl: pricing.sourceUrl,
          }
        : {
            modelName,
            pricingModelName: null,
            inputPerMillion: null,
            cachedInputPerMillion: null,
            outputPerMillion: null,
            sourceType: "missing",
            sourceLabel: "没有找到价格映射",
            sourceUrl: null,
          };
    })
    .sort((left, right) => left.modelName.localeCompare(right.modelName));
  const recentThreads = getRecentThreads(paths.stateDbPath, options.recentThreadsLimit || 10).map(
    (thread) => {
      const sessionDetails = recentSessionMap.get(thread.id);
      return {
        ...thread,
        modelName: sessionDetails?.modelName || null,
        tokenUsage: sessionDetails?.tokenUsage || null,
        cost: sessionDetails?.cost || null,
      };
    }
  );
  const dailyUsage = getDailyUsage(paths.stateDbPath, options.dailyUsageLimit || 14);

  return {
    generatedAt: (options.now || new Date()).toISOString(),
    sources: {
      codexHome: paths.codexHome,
      stateDbPath: paths.stateDbPath,
      sessionsDir: paths.sessionsDir,
      archivedSessionsDir: paths.archivedSessionsDir,
    },
    overview,
    dailyLedger: dailyLedger.rows,
    pricingCatalog,
    live: {
      currentSession: latestLiveEvent.currentSession
        ? {
            ...latestLiveEvent.currentSession.tokenUsage,
            modelName: latestLiveEvent.currentSession.modelName,
            cost: latestLiveEvent.currentSession.cost,
          }
        : null,
      rateLimits: latestLiveEvent.rateLimits?.rateLimits || null,
      latestEventAt: latestLiveEvent.currentSession?.timestamp || null,
      latestEventFile: latestLiveEvent.currentSession?.filePath || null,
      latestRateLimitAt: latestLiveEvent.rateLimits?.timestamp || null,
      latestRateLimitFile: latestLiveEvent.rateLimits?.filePath || null,
    },
    recentThreads,
    dailyUsage,
  };
}

module.exports = {
  loadSnapshot,
  normalizeTokenUsage,
  normalizeRateLimits,
  extractSessionDetails,
};
