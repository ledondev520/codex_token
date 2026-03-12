const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const { resolveCodexPaths } = require("./codexPaths");
const { loadOpenClawUsageSnapshot } = require("./openclawUsageRepository");
const { buildPricingCatalog, estimateCost, normalizeModelName } = require("./pricing");

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

function getRecentThreads(stateDbPath, limit = null) {
  const hasLimit = limit !== null && limit !== undefined && Number.isFinite(Number(limit));
  const limitClause = hasLimit ? `LIMIT ${Number(limit)}` : "";
  const rows = runSqliteJson(
    stateDbPath,
    `
      SELECT
        id,
        source,
        title,
        cwd,
        model_provider,
        tokens_used,
        created_at,
        updated_at
      FROM threads
      ORDER BY updated_at DESC
      ${limitClause};
    `
  );

  return rows.map((row) => ({
    id: row.id,
    source: row.source,
    title: row.title,
    cwd: row.cwd,
    modelProvider: row.model_provider,
    tokensUsed: Number(row.tokens_used || 0),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }));
}

function normalizeInlineText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function summarizeTitle(value, maxLength = 80) {
  const normalized = normalizeInlineText(value);
  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function formatWorkspaceLabel(cwd) {
  const normalized = String(cwd || "").trim();
  if (!normalized) {
    return "-";
  }

  const basename = path.basename(normalized) || normalized;
  if (normalized.includes("/.openclaw/")) {
    return `${basename} · ~/.openclaw`;
  }

  return basename;
}

function classifyUsageOrigin({ cwd, source }) {
  const normalizedCwd = String(cwd || "").trim();
  const normalizedSource = String(source || "").trim().toLowerCase();

  if (
    normalizedCwd.includes("/.openclaw/") ||
    normalizedCwd.includes("\\.openclaw\\") ||
    normalizedSource === "oauth"
  ) {
    return {
      kind: "openclaw-oauth",
      label: "OpenClaw / OAuth",
      description: "通过 OpenClaw 工作区触发，底层仍消耗 Codex token",
    };
  }

  return {
    kind: "codex-local",
    label: "Codex 本地",
    description: "直接来自 ~/.codex 的本地线程与会话日志",
  };
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

function normalizeSessionStatus(statusType) {
  if (statusType === "task_complete") {
    return "已完结";
  }

  if (statusType === "turn_aborted") {
    return "已中断";
  }

  if (statusType === "user_message" || statusType === "task_started") {
    return "等待回答";
  }

  if (
    statusType === "agent_message" ||
    statusType === "token_count" ||
    statusType === "reasoning" ||
    statusType === "function_call" ||
    statusType === "function_call_output"
  ) {
    return "进行中";
  }

  return null;
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
    promptText: null,
    promptAt: null,
    userMessages: [],
    statusLabel: null,
    statusAt: null,
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

    if (parsed.type === "event_msg" && parsed.payload?.type === "user_message") {
      const promptText = String(parsed.payload.message || "").trim();
      if (promptText) {
        details.promptText = promptText;
        details.promptAt = parsed.timestamp || details.promptAt;
        details.latestTimestamp = parsed.timestamp || details.latestTimestamp;
        details.userMessages.push({
          timestamp: parsed.timestamp || null,
          text: promptText,
        });
      }
      details.statusLabel = normalizeSessionStatus("user_message") || details.statusLabel;
      details.statusAt = parsed.timestamp || details.statusAt;
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
      details.statusLabel = normalizeSessionStatus("token_count") || details.statusLabel;
      details.statusAt = parsed.timestamp || details.statusAt;
      continue;
    }

    if (parsed.type === "event_msg" && (parsed.payload?.type === "task_complete" || parsed.payload?.type === "task_started" || parsed.payload?.type === "agent_message" || parsed.payload?.type === "turn_aborted")) {
      details.statusLabel = normalizeSessionStatus(parsed.payload.type) || details.statusLabel;
      details.statusAt = parsed.timestamp || details.statusAt;
      details.latestTimestamp = parsed.timestamp || details.latestTimestamp;
      continue;
    }

    if (parsed.type === "response_item") {
      const responseStatus = normalizeSessionStatus(parsed.payload?.type);
      if (responseStatus) {
        details.statusLabel = responseStatus;
        details.statusAt = parsed.timestamp || details.statusAt;
        details.latestTimestamp = parsed.timestamp || details.latestTimestamp;
      }
    }
  }

  details.threadId = details.threadId || getThreadIdFromFilePath(filePath);
  details.cost = estimateCost(details.tokenUsage, details.modelName);
  details.modelsUsed = Array.from(modelSet);

  if (
    !details.tokenUsage &&
    !details.rateLimits &&
    !details.modelName &&
    !details.promptText &&
    !details.statusLabel
  ) {
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
  const existingPromptTime = new Date(existing.promptAt || 0).getTime();
  const incomingPromptTime = new Date(incoming.promptAt || 0).getTime();
  const existingStatusTime = new Date(existing.statusAt || 0).getTime();
  const incomingStatusTime = new Date(incoming.statusAt || 0).getTime();
  const mergedUserMessages = [
    ...(existing.userMessages || []),
    ...(incoming.userMessages || []),
  ]
    .filter((message) => message?.text)
    .sort(
      (left, right) =>
        new Date(left.timestamp || 0).getTime() - new Date(right.timestamp || 0).getTime()
    )
    .filter((message, index, rows) => {
      const key = `${message.timestamp || ""}:${message.text}`;
      return rows.findIndex((candidate) => `${candidate.timestamp || ""}:${candidate.text}` === key) === index;
    });
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
    promptText:
      incoming.promptText && incomingPromptTime >= existingPromptTime
        ? incoming.promptText
        : existing.promptText,
    promptAt:
      incoming.promptText && incomingPromptTime >= existingPromptTime
        ? incoming.promptAt
        : existing.promptAt,
    userMessages: mergedUserMessages,
    statusLabel:
      incoming.statusLabel && incomingStatusTime >= existingStatusTime
        ? incoming.statusLabel
        : existing.statusLabel,
    statusAt:
      incoming.statusLabel && incomingStatusTime >= existingStatusTime
        ? incoming.statusAt
        : existing.statusAt,
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
  ]
    .sort((left, right) => left.mtimeMs - right.mtimeMs)
    .slice(-(options.ledgerFileLimit || Number.MAX_SAFE_INTEGER));

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
    const candidateTokenTimestamp = new Date(
      candidate.tokenUsageAt || candidate.latestTimestamp || 0
    ).getTime();
    const candidateRateLimitTimestamp = new Date(
      candidate.rateLimitsAt || candidate.latestTimestamp || 0
    ).getTime();

    if (
      candidate.tokenUsage &&
      (!latestTokenUsage ||
        candidateTokenTimestamp >
          new Date(latestTokenUsage.tokenUsageAt || latestTokenUsage.latestTimestamp || 0).getTime())
    ) {
      latestTokenUsage = candidate;
    }

    if (
      candidate.rateLimits &&
      (!latestRateLimits ||
        candidateRateLimitTimestamp >
          new Date(
            latestRateLimits.rateLimitsAt || latestRateLimits.latestTimestamp || 0
          ).getTime())
    ) {
      latestRateLimits = candidate;
    }
  }

  return {
    currentSession: latestTokenUsage
      ? {
          threadId: latestTokenUsage.threadId,
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
  const loadOpenClawUsageFn = options.loadOpenClawUsageFn || loadOpenClawUsageSnapshot;
  const overview = getThreadSummary(paths.stateDbPath);
  const recentSessionMap = options.skipSessionParsing
    ? new Map()
    : buildRecentSessionMap(
        paths.sessionsDir,
        paths.archivedSessionsDir,
        options.recentSessionFileLimit || 40
      );
  const dailyLedger = options.skipSessionParsing
    ? { rows: [], usedModels: [] }
    : buildDailyLedger(paths.sessionsDir, paths.archivedSessionsDir, {
        timeZone,
        ledgerFileLimit: options.ledgerFileLimit,
      });
  const latestLiveEvent = getLatestLiveEvent(recentSessionMap);
  let openclaw = null;
  if (!options.skipOpenClawUsage) {
    try {
      openclaw = await loadOpenClawUsageFn(options);
    } catch {
      openclaw = null;
    }
  }
  overview.totalEstimatedCost = dailyLedger.rows.reduce((sum, item) => sum + item.totalUsd, 0);
  const pricingCatalog = buildPricingCatalog(dailyLedger.usedModels);
  const recentThreads = getRecentThreads(paths.stateDbPath, options.recentThreadsLimit).map(
    (thread) => {
      const sessionDetails = recentSessionMap.get(thread.id);
      const usageOrigin = classifyUsageOrigin(thread);
      return {
        ...thread,
        titlePreview: summarizeTitle(thread.title),
        workspaceLabel: formatWorkspaceLabel(thread.cwd),
        usageOrigin: usageOrigin.kind,
        usageOriginLabel: usageOrigin.label,
        usageOriginDescription: usageOrigin.description,
        modelName: sessionDetails?.modelName || null,
        promptText: sessionDetails?.promptText || null,
        userMessages: sessionDetails?.userMessages || [],
        statusLabel: sessionDetails?.statusLabel || "未知",
        tokenUsage: sessionDetails?.tokenUsage || null,
        cost: sessionDetails?.cost || null,
      };
    }
  );
  const threadsById = new Map(recentThreads.map((thread) => [thread.id, thread]));
  const dailyUsage = getDailyUsage(paths.stateDbPath, options.dailyUsageLimit || 14);
  const liveThread = latestLiveEvent.currentSession?.threadId
    ? threadsById.get(latestLiveEvent.currentSession.threadId)
    : null;

  return {
    generatedAt: (options.now || new Date()).toISOString(),
    sources: {
      codexHome: paths.codexHome,
      stateDbPath: paths.stateDbPath,
      sessionsDir: paths.sessionsDir,
      archivedSessionsDir: paths.archivedSessionsDir,
    },
    overview,
    openclaw,
    dailyLedger: dailyLedger.rows,
    pricingCatalog,
    live: {
      currentSession: latestLiveEvent.currentSession
        ? {
          ...latestLiveEvent.currentSession.tokenUsage,
          modelName: latestLiveEvent.currentSession.modelName,
          cost: latestLiveEvent.currentSession.cost,
          usageOrigin: liveThread?.usageOrigin || "codex-local",
          usageOriginLabel: liveThread?.usageOriginLabel || "Codex 本地",
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
  classifyUsageOrigin,
  loadSnapshot,
  normalizeTokenUsage,
  normalizeRateLimits,
  extractSessionDetails,
};
