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

function getThreadSummary(stateDbPath, options = {}) {
  const includeArchived = Boolean(options.includeArchived);
  const archivedFilter = includeArchived ? "" : "WHERE archived = 0";

  const [overview = { total_threads: 0, total_tokens: 0 }] = runSqliteJson(
    stateDbPath,
    `
      SELECT
        COUNT(*) AS total_threads,
        COALESCE(SUM(tokens_used), 0) AS total_tokens,
        MAX(updated_at) AS latest_updated_at
      FROM threads
      ${archivedFilter};
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

function getThreadMetadata(stateDbPath, options = {}) {
  const includeArchived = Boolean(options.includeArchived);
  const archivedFilter = includeArchived ? "" : "WHERE archived = 0";

  const rows = runSqliteJson(
    stateDbPath,
    `
      SELECT id, source, cwd
      FROM threads
      ${archivedFilter};
    `
  );

  const map = new Map();
  for (const row of rows) {
    const id = String(row?.id || "").trim();
    if (!id) {
      continue;
    }

    map.set(id, {
      id,
      source: String(row.source || ""),
      cwd: String(row.cwd || ""),
    });
  }

  return map;
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

function classifyUsageOrigin({ cwd, source, modelName }) {
  const normalizedCwd = String(cwd || "").trim();
  const normalizedSource = String(source || "").trim().toLowerCase();

  if (
    normalizedCwd.includes("/.openclaw/") ||
    normalizedCwd.includes("\\.openclaw\\") ||
    normalizedSource === "oauth"
  ) {
    return {
      kind: "openclaw-oauth",
      label: "小龙虾主脑",
      description: "包含 OpenClaw 主脑会话消耗，以及主脑进一步调用 Codex 产生的开销",
    };
  }

  return {
    kind: "codex-local",
    label: "Codex 编程",
    description: "直接来自本地 Codex 会话与限额快照",
  };
}

function getDailyUsage(stateDbPath, days = 14, options = {}) {
  const includeArchived = Boolean(options.includeArchived);
  const archivedFilter = includeArchived ? "" : "WHERE archived = 0";
  const safeDays = Number(days) > 0 ? Number(days) : 14;

  const rows = runSqliteJson(
    stateDbPath,
    `
      SELECT
        date(created_at, 'unixepoch', 'localtime') AS day,
        COUNT(*) AS total_threads,
        COALESCE(SUM(tokens_used), 0) AS total_tokens
      FROM threads
      ${archivedFilter}
      GROUP BY day
      ORDER BY day DESC
      LIMIT ${safeDays};
    `
  );

  return rows.map((row) => ({
    day: row.day,
    totalThreads: Number(row.total_threads || 0),
    totalTokens: Number(row.total_tokens || 0),
  }));
}

function createDecisionWindowSummary() {
  return {
    totalUsd: 0,
    totalTokens: 0,
    inputTokens: 0,
    cachedInputTokens: 0,
    successCount: 0,
    failureCount: 0,
    terminalCount: 0,
    projectTotals: new Map(),
    modelTotals: new Map(),
  };
}

function upsertDecisionAggregate(map, key, label, entry) {
  if (!key || !label || !entry?.tokenUsage) {
    return;
  }

  const existing = map.get(key) || {
    key,
    label,
    totalUsd: 0,
    totalTokens: 0,
    threadIds: new Set(),
  };

  existing.totalUsd += Number(entry.cost?.totalUsd || 0);
  existing.totalTokens += Number(entry.tokenUsage.totalTokens || 0);
  if (entry.threadId) {
    existing.threadIds.add(entry.threadId);
  }

  map.set(key, existing);
}

function finalizeDecisionRanking(map, limit = 5) {
  return Array.from(map.values())
    .map((row) => ({
      key: row.key,
      label: row.label,
      totalUsd: row.totalUsd,
      totalTokens: row.totalTokens,
      threadCount: row.threadIds.size,
    }))
    .sort((left, right) => {
      if (right.totalUsd !== left.totalUsd) {
        return right.totalUsd - left.totalUsd;
      }

      if (right.totalTokens !== left.totalTokens) {
        return right.totalTokens - left.totalTokens;
      }

      return left.label.localeCompare(right.label);
    })
    .slice(0, limit);
}

function finalizeEfficiencyWindow(window) {
  const costPer1kTokens = window.totalTokens
    ? (window.totalUsd / window.totalTokens) * 1000
    : null;
  const cacheHitRate = window.inputTokens
    ? (window.cachedInputTokens / window.inputTokens) * 100
    : null;
  const successRate = window.terminalCount
    ? (window.successCount / window.terminalCount) * 100
    : null;

  return {
    totalUsd: window.totalUsd,
    totalTokens: window.totalTokens,
    inputTokens: window.inputTokens,
    cachedInputTokens: window.cachedInputTokens,
    successCount: window.successCount,
    failureCount: window.failureCount,
    terminalCount: window.terminalCount,
    costPer1kTokens,
    cacheHitRate,
    successRate,
  };
}

function buildDecisionInsights({
  stateDbPath,
  sessionsDir,
  archivedSessionsDir,
  now,
  timeZone,
}) {
  const nowMs = new Date(now || Date.now()).getTime();
  const todayKey = getLocalDayKey(nowMs, timeZone);
  const last7DayKeys = new Set(
    Array.from({ length: 7 }, (_, offset) =>
      getLocalDayKey(nowMs - offset * 24 * 60 * 60 * 1000, timeZone)
    )
  );
  const oldestRelevantMs = nowMs - 8 * 24 * 60 * 60 * 1000;
  const threadLookup = new Map(
    getRecentThreads(stateDbPath, null).map((thread) => [
      thread.id,
      {
        ...thread,
        workspaceLabel: formatWorkspaceLabel(thread.cwd),
      },
    ])
  );
  const files = [
    ...listJsonlFiles(sessionsDir),
    ...listJsonlFiles(archivedSessionsDir),
  ]
    .filter((file) => file.mtimeMs >= oldestRelevantMs)
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  const sessionMap = new Map();

  for (const file of files) {
    const details = extractSessionDetails(file.path, { timeZone });
    if (!details?.threadId) {
      continue;
    }

    sessionMap.set(details.threadId, mergeSessionDetails(sessionMap.get(details.threadId), details));
  }

  const todayWindow = createDecisionWindowSummary();
  const last7DaysWindow = createDecisionWindowSummary();
  const failedThreads = [];

  for (const details of sessionMap.values()) {
    const thread = threadLookup.get(details.threadId);
    const projectKey = String(thread?.cwd || details.threadId || "").trim() || details.threadId;
    const projectLabel = thread?.workspaceLabel || "未知项目";

    for (const entry of details.ledgerEntries || []) {
      const entryDay = String(entry.day || "");
      const row = {
        ...entry,
        threadId: details.threadId,
      };

      if (entryDay === todayKey) {
        todayWindow.totalUsd += Number(entry.cost?.totalUsd || 0);
        todayWindow.totalTokens += Number(entry.tokenUsage?.totalTokens || 0);
        todayWindow.inputTokens += Number(entry.tokenUsage?.inputTokens || 0);
        todayWindow.cachedInputTokens += Number(entry.tokenUsage?.cachedInputTokens || 0);
        upsertDecisionAggregate(todayWindow.projectTotals, projectKey, projectLabel, row);
        upsertDecisionAggregate(
          todayWindow.modelTotals,
          String(entry.modelName || "unknown"),
          String(entry.modelName || "未知模型"),
          row
        );
      }

      if (last7DayKeys.has(entryDay)) {
        last7DaysWindow.totalUsd += Number(entry.cost?.totalUsd || 0);
        last7DaysWindow.totalTokens += Number(entry.tokenUsage?.totalTokens || 0);
        last7DaysWindow.inputTokens += Number(entry.tokenUsage?.inputTokens || 0);
        last7DaysWindow.cachedInputTokens += Number(entry.tokenUsage?.cachedInputTokens || 0);
        upsertDecisionAggregate(last7DaysWindow.projectTotals, projectKey, projectLabel, row);
        upsertDecisionAggregate(
          last7DaysWindow.modelTotals,
          String(entry.modelName || "unknown"),
          String(entry.modelName || "未知模型"),
          row
        );
      }
    }

    const terminalStatus = details.statusLabel === "已完结" || details.statusLabel === "已中断";
    const statusDay = details.statusAt ? getLocalDayKey(details.statusAt, timeZone) : "";

    if (terminalStatus && statusDay === todayKey) {
      todayWindow.terminalCount += 1;
      if (details.statusLabel === "已完结") {
        todayWindow.successCount += 1;
      } else {
        todayWindow.failureCount += 1;
      }
    }

    if (terminalStatus && last7DayKeys.has(statusDay)) {
      last7DaysWindow.terminalCount += 1;
      if (details.statusLabel === "已完结") {
        last7DaysWindow.successCount += 1;
      } else {
        last7DaysWindow.failureCount += 1;
      }
    }

    if (details.statusLabel === "已中断" && last7DayKeys.has(statusDay)) {
      failedThreads.push({
        threadId: details.threadId,
        title: thread?.title || "",
        titlePreview: summarizeTitle(thread?.title),
        projectLabel,
        modelName: details.modelName || null,
        failedAt: details.statusAt || null,
        cost: details.cost || null,
      });
    }
  }

  failedThreads.sort(
    (left, right) => new Date(right.failedAt || 0).getTime() - new Date(left.failedAt || 0).getTime()
  );

  return {
    projectCost: {
      today: finalizeDecisionRanking(todayWindow.projectTotals),
      last7Days: finalizeDecisionRanking(last7DaysWindow.projectTotals),
      note: "仅统计本地 session 日志里可解析的 token_count 增量费用，并按线程工作目录聚合项目。",
    },
    modelCost: {
      today: finalizeDecisionRanking(todayWindow.modelTotals),
      last7Days: finalizeDecisionRanking(last7DaysWindow.modelTotals),
      note: "仅统计本地 session 日志里可解析的 token_count 增量费用，并按当时模型名聚合。",
    },
    efficiency: {
      today: finalizeEfficiencyWindow(todayWindow),
      last7Days: finalizeEfficiencyWindow(last7DaysWindow),
      costPer1kNote: "按 token_count 增量费用 / 增量 total_tokens * 1000 计算。",
      cacheHitRateNote:
        "按 token_count 增量里的 cached_input_tokens / input_tokens 计算；缺少 input_tokens 时返回空值。",
      successRateNote:
        "按近 7 个自然日内最新终态计算：成功率 = 已完结 / (已完结 + 已中断)。",
    },
    failures: {
      todayCount: todayWindow.failureCount,
      last7DaysCount: last7DaysWindow.failureCount,
      latestFailedAt: failedThreads[0]?.failedAt || null,
      recent: failedThreads.slice(0, 5),
      note: "失败定义为线程最新终态为“已中断”。",
    },
  };
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
    cwd: null,
    source: null,
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
      details.cwd = parsed.payload?.cwd || details.cwd;
      details.source = parsed.payload?.source || details.source;
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

function buildLedgerAccumulator() {
  return {
    totalTokens: 0,
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    totalUsd: 0,
    modelsUsed: null,
    modelBreakdowns: null,
  };
}

function addLedgerEntry(targetByDay, day, entry, options = {}) {
  if (!day) {
    return;
  }

  const existing = targetByDay.get(day) || buildLedgerAccumulator();
  existing.totalTokens += Number(entry.tokenUsage.totalTokens || 0);
  existing.inputTokens += Number(entry.tokenUsage.inputTokens || 0);
  existing.cachedInputTokens += Number(entry.tokenUsage.cachedInputTokens || 0);
  existing.outputTokens += Number(entry.tokenUsage.outputTokens || 0);
  existing.totalUsd += Number(entry.cost?.totalUsd || 0);

  if (options.trackModelUsage && entry.modelName) {
    if (existing.modelsUsed === null) {
      existing.modelsUsed = new Set();
      existing.modelBreakdowns = new Map();
    }

    existing.modelsUsed.add(entry.modelName);
    const currentModelCost = existing.modelBreakdowns.get(entry.modelName) || 0;
    existing.modelBreakdowns.set(entry.modelName, currentModelCost + Number(entry.cost?.totalUsd || 0));
  }

  targetByDay.set(day, existing);
}

function finalizeLedgerRows(rowsByDay, includeModelUsage = false) {
  const rows = Array.from(rowsByDay.entries()).map(([day, values]) => {
    const row = {
      day,
      totalTokens: values.totalTokens,
      inputTokens: values.inputTokens,
      cachedInputTokens: values.cachedInputTokens,
      outputTokens: values.outputTokens,
      totalUsd: values.totalUsd,
    };

    if (includeModelUsage) {
      if (values.modelsUsed) {
        row.modelsUsed = Array.from(values.modelsUsed).sort();
      }

      if (values.modelBreakdowns) {
        row.modelBreakdowns = Array.from(values.modelBreakdowns.entries())
          .map(([modelName, totalUsd]) => ({
            modelName,
            totalUsd: Number(totalUsd || 0),
          }))
          .sort((left, right) => {
            if (right.totalUsd !== left.totalUsd) {
              return right.totalUsd - left.totalUsd;
            }

            return String(left.modelName).localeCompare(String(right.modelName));
          });
      }
    }

    return row;
  });

  return rows.sort((left, right) => right.day.localeCompare(left.day));
}

function buildRecentSessionMap(sessionsDir, archivedSessionsDir, options = {}) {
  const targetThreadIds = new Set(
    Array.isArray(options.targetThreadIds)
      ? options.targetThreadIds.filter(Boolean).map((value) => String(value))
      : []
  );
  const hasTargetThreadIds = targetThreadIds.size > 0;
  const fileLimit = hasTargetThreadIds ? null : options.fileLimit ?? 40;
  const files = [
    ...listJsonlFiles(sessionsDir),
    ...listJsonlFiles(archivedSessionsDir),
  ]
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  const hasFileLimit = fileLimit !== null && fileLimit !== undefined && Number.isFinite(Number(fileLimit));
  const selectedFiles = hasFileLimit ? files.slice(0, Number(fileLimit)) : files;

  const byThreadId = new Map();

  for (const file of selectedFiles) {
    const details = extractSessionDetails(file.path);
    if (!details?.threadId) {
      continue;
    }

    if (hasTargetThreadIds && !targetThreadIds.has(String(details.threadId))) {
      continue;
    }

    byThreadId.set(details.threadId, mergeSessionDetails(byThreadId.get(details.threadId), details));
  }

  return byThreadId;
}

function buildDailyLedger(sessionsDir, archivedSessionsDir, options = {}) {
  const threadMetadata = options.threadMetadata instanceof Map
    ? options.threadMetadata
    : new Map(Array.isArray(options.threadMetadata) ? options.threadMetadata : []);
  const files = [
    ...listJsonlFiles(sessionsDir),
    ...listJsonlFiles(archivedSessionsDir),
  ]
    .sort((left, right) => left.mtimeMs - right.mtimeMs)
    .slice(-(options.ledgerFileLimit || Number.MAX_SAFE_INTEGER));

  const byDay = new Map();
  const openclawByDay = new Map();
  const usedModels = new Set();

  for (const file of files) {
    const details = extractSessionDetails(file.path, options);
    for (const modelName of details?.modelsUsed || []) {
      usedModels.add(modelName);
    }

    for (const entry of details?.ledgerEntries || []) {
      const threadMeta = threadMetadata.get(String(details.threadId || "")) || {};
      const source = threadMeta.source || details.source || "";
      const cwd = threadMeta.cwd || details.cwd || file.path;
      const usageOrigin = classifyUsageOrigin({
        source,
        cwd,
        modelName: entry.modelName || details.modelName,
      });
      const isOpenClaw = usageOrigin.kind === "openclaw-oauth";

      addLedgerEntry(isOpenClaw ? openclawByDay : byDay, entry.day, entry, {
        trackModelUsage: isOpenClaw,
      });
    }
  }

  return {
    rows: finalizeLedgerRows(byDay),
    openclawRows: finalizeLedgerRows(openclawByDay, true),
    usedModels: Array.from(usedModels).sort(),
  };
}

function mergeOpenClawUsage(openclawSnapshot, localRows, nowIso) {
  const sourceRows = Array.isArray(localRows) ? localRows : [];
  if (!sourceRows.length && !openclawSnapshot) {
    return null;
  }

  if (!openclawSnapshot) {
    const baseRows = sourceRows.map((row) => ({
      day: row.day,
      totalTokens: Number(row.totalTokens || 0),
      inputTokens: Number(row.inputTokens || 0),
      outputTokens: Number(row.outputTokens || 0),
      cachedInputTokens: Number(row.cachedInputTokens || 0),
      totalUsd: Number(row.totalUsd || 0),
      modelsUsed: Array.isArray(row.modelsUsed)
        ? row.modelsUsed.slice().sort()
        : [],
      modelBreakdowns: Array.isArray(row.modelBreakdowns)
        ? row.modelBreakdowns
            .filter((entry) => entry?.modelName)
            .map((entry) => ({
              modelName: String(entry.modelName),
              totalUsd: Number(entry.totalUsd || 0),
            }))
        : [],
    }));

    const dailyTotals = summarizeDailyRows(baseRows);
    return {
      provider: "codex",
      source: "local",
      updatedAt: nowIso || null,
      configuredModel: null,
      session: {
        totalTokens: dailyTotals.totalTokens,
        totalUsd: dailyTotals.totalUsd,
      },
      totals: {
        inputTokens: dailyTotals.inputTokens,
        outputTokens: dailyTotals.outputTokens,
        totalTokens: dailyTotals.totalTokens,
        totalUsd: dailyTotals.totalUsd,
      },
      daily: baseRows,
      topModels: deriveTopModelsFromDailyRows(baseRows),
    };
  }

  const cloneLedgerRow = (row) => ({
    day: row.day,
    totalTokens: Number(row.totalTokens || 0),
    inputTokens: Number(row.inputTokens || 0),
    outputTokens: Number(row.outputTokens || 0),
    cachedInputTokens: Number(row.cachedInputTokens || 0),
    totalUsd: Number(row.totalUsd || 0),
    modelsUsed: Array.isArray(row.modelsUsed) ? Array.from(new Set(row.modelsUsed.filter(Boolean))) : [],
    modelBreakdowns: Array.isArray(row.modelBreakdowns)
      ? row.modelBreakdowns
          .filter((entry) => entry?.modelName)
          .map((entry) => ({
            modelName: String(entry.modelName),
            totalUsd: Number(entry.totalUsd || 0),
          }))
      : [],
  });

  const mergeRowsByMode = (rows, mode = "sum") => {
    const byDay = new Map();

    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row?.day) {
        continue;
      }

      const normalizedRow = cloneLedgerRow(row);
      const existing = byDay.get(normalizedRow.day);
      if (!existing) {
        byDay.set(normalizedRow.day, normalizedRow);
        continue;
      }

      if (mode === "max") {
        existing.totalTokens = Math.max(existing.totalTokens, normalizedRow.totalTokens);
        existing.inputTokens = Math.max(existing.inputTokens, normalizedRow.inputTokens);
        existing.outputTokens = Math.max(existing.outputTokens, normalizedRow.outputTokens);
        existing.cachedInputTokens = Math.max(existing.cachedInputTokens, normalizedRow.cachedInputTokens);
        existing.totalUsd = Math.max(existing.totalUsd, normalizedRow.totalUsd);
      } else {
        existing.totalTokens += normalizedRow.totalTokens;
        existing.inputTokens += normalizedRow.inputTokens;
        existing.outputTokens += normalizedRow.outputTokens;
        existing.cachedInputTokens += normalizedRow.cachedInputTokens;
        existing.totalUsd += normalizedRow.totalUsd;
      }

      existing.modelsUsed = Array.from(
        new Set([...(existing.modelsUsed || []), ...(normalizedRow.modelsUsed || [])].filter(Boolean))
      );

      const breakdownByModel = new Map();
      for (const entry of existing.modelBreakdowns || []) {
        breakdownByModel.set(String(entry.modelName), Number(entry.totalUsd || 0));
      }
      for (const entry of normalizedRow.modelBreakdowns || []) {
        const modelName = String(entry.modelName);
        const value = Number(entry.totalUsd || 0);
        breakdownByModel.set(
          modelName,
          mode === "max"
            ? Math.max(breakdownByModel.get(modelName) || 0, value)
            : (breakdownByModel.get(modelName) || 0) + value
        );
      }

      existing.modelBreakdowns = Array.from(breakdownByModel.entries())
        .map(([modelName, totalUsd]) => ({
          modelName,
          totalUsd,
        }))
        .sort((left, right) => {
          if (right.totalUsd !== left.totalUsd) {
            return right.totalUsd - left.totalUsd;
          }

          return String(left.modelName).localeCompare(String(right.modelName));
        });
    }

    return finalizeLedgerRows(byDay);
  };

  const segmentedCodexRows = Array.isArray(openclawSnapshot.segments?.codexDaily)
    ? openclawSnapshot.segments.codexDaily
    : null;
  const segmentedMainRows = Array.isArray(openclawSnapshot.segments?.mainDaily)
    ? openclawSnapshot.segments.mainDaily
    : null;

  const mergedRows = segmentedCodexRows || segmentedMainRows
    ? mergeRowsByMode(
        [
          ...(segmentedMainRows || []),
          ...mergeRowsByMode([...(segmentedCodexRows || []), ...sourceRows], "max"),
        ],
        "sum"
      )
    : mergeRowsByMode([...(Array.isArray(openclawSnapshot.daily) ? openclawSnapshot.daily : []), ...sourceRows], "max");
  const mergedTotals = summarizeDailyRows(mergedRows);
  const mergedTopModels = deriveTopModelsFromDailyRows(mergedRows);

  return {
    ...openclawSnapshot,
    topModels: mergedTopModels.length ? mergedTopModels : openclawSnapshot.topModels || [],
    totals: {
      ...openclawSnapshot.totals,
      inputTokens: Number(mergedTotals.inputTokens || 0),
      outputTokens: Number(mergedTotals.outputTokens || 0),
      cachedInputTokens: Number(mergedTotals.cachedInputTokens || 0),
      totalTokens: Number(mergedTotals.totalTokens || 0),
      totalUsd: Number(mergedTotals.totalUsd || 0),
    },
    session: openclawSnapshot.session || {
      totalTokens: Number(openclawSnapshot.totals?.totalTokens || 0),
      totalUsd: Number(openclawSnapshot.totals?.totalUsd || 0),
    },
    segments: {
      codexDaily: mergeRowsByMode([...(segmentedCodexRows || []), ...sourceRows], "max"),
      mainDaily: segmentedMainRows || [],
    },
    daily: mergedRows,
  };
}

function summarizeDailyRows(rows) {
  return rows.reduce(
    (summary, row) => {
      summary.totalTokens += Number(row.totalTokens || 0);
      summary.inputTokens += Number(row.inputTokens || 0);
      summary.cachedInputTokens += Number(row.cachedInputTokens || 0);
      summary.outputTokens += Number(row.outputTokens || 0);
      summary.totalUsd += Number(row.totalUsd || 0);
      return summary;
    },
    {
      totalTokens: 0,
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      totalUsd: 0,
    }
  );
}

function deriveTopModelsFromDailyRows(rows) {
  const totals = new Map();

  for (const row of rows) {
    for (const breakdown of row.modelBreakdowns || []) {
      if (!breakdown?.modelName) {
        continue;
      }

      totals.set(
        String(breakdown.modelName),
        (totals.get(String(breakdown.modelName)) || 0) + Number(breakdown.totalUsd || 0)
      );
    }
  }

  return Array.from(totals.entries())
    .map(([modelName, totalUsd]) => ({
      modelName,
      totalUsd: Number(totalUsd || 0),
    }))
    .sort((left, right) => {
      if (right.totalUsd !== left.totalUsd) {
        return right.totalUsd - left.totalUsd;
      }

      return String(left.modelName).localeCompare(String(right.modelName));
    });
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
  const includeArchived = options.includeArchived ?? true;
  const overview = getThreadSummary(paths.stateDbPath, {
    includeArchived,
  });
  const recentThreadsBase = getRecentThreads(paths.stateDbPath, options.recentThreadsLimit);
  const recentSessionMap = options.skipSessionParsing
    ? new Map()
    : buildRecentSessionMap(
        paths.sessionsDir,
        paths.archivedSessionsDir,
        {
          fileLimit: options.recentSessionFileLimit || 40,
          targetThreadIds: recentThreadsBase.map((thread) => thread.id),
        }
      );
  const dailyLedger = options.skipSessionParsing
    ? { rows: [], usedModels: [] }
      : buildDailyLedger(paths.sessionsDir, paths.archivedSessionsDir, {
        timeZone,
        ledgerFileLimit: options.ledgerFileLimit,
        threadMetadata: getThreadMetadata(paths.stateDbPath, { includeArchived }),
      });
  const decision = options.skipSessionParsing
    ? {
        projectCost: { today: [], last7Days: [], note: "" },
        modelCost: { today: [], last7Days: [], note: "" },
        efficiency: {
          today: finalizeEfficiencyWindow(createDecisionWindowSummary()),
          last7Days: finalizeEfficiencyWindow(createDecisionWindowSummary()),
          costPer1kNote: "按 token_count 增量费用 / 增量 total_tokens * 1000 计算。",
          cacheHitRateNote:
            "按 token_count 增量里的 cached_input_tokens / input_tokens 计算；缺少 input_tokens 时返回空值。",
          successRateNote:
            "按近 7 个自然日内最新终态计算：成功率 = 已完结 / (已完结 + 已中断)。",
        },
        failures: {
          todayCount: 0,
          last7DaysCount: 0,
          latestFailedAt: null,
          recent: [],
          note: "失败定义为线程最新终态为“已中断”。",
        },
      }
    : buildDecisionInsights({
        stateDbPath: paths.stateDbPath,
        sessionsDir: paths.sessionsDir,
        archivedSessionsDir: paths.archivedSessionsDir,
        now: options.now || new Date(),
        timeZone,
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
  openclaw = mergeOpenClawUsage(openclaw, dailyLedger.openclawRows, options.now?.toISOString?.());
  overview.totalEstimatedCost = dailyLedger.rows.reduce((sum, item) => sum + item.totalUsd, 0);
  const pricingCatalog = buildPricingCatalog(dailyLedger.usedModels);
  const recentThreads = recentThreadsBase.map(
    (thread) => {
      const sessionDetails = recentSessionMap.get(thread.id);
      const usageOrigin = classifyUsageOrigin({ ...thread, modelName: sessionDetails?.modelName });
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
  const dailyUsage = getDailyUsage(paths.stateDbPath, options.dailyUsageLimit || 14, {
    includeArchived,
  });
  const liveThread = latestLiveEvent.currentSession?.threadId
    ? threadsById.get(latestLiveEvent.currentSession.threadId)
    : null;

  const result = {
    generatedAt: (options.now || new Date()).toISOString(),
    sources: {
      codexHome: paths.codexHome,
      stateDbPath: paths.stateDbPath,
      sessionsDir: paths.sessionsDir,
      archivedSessionsDir: paths.archivedSessionsDir,
    },
    overview,
    decision,
    openclaw,
    dailyLedger: dailyLedger.rows,
    pricingCatalog,
    live: {
      currentSession: latestLiveEvent.currentSession
        ? {
            ...latestLiveEvent.currentSession.tokenUsage,
            threadId: latestLiveEvent.currentSession.threadId,
            modelName: latestLiveEvent.currentSession.modelName,
            cost: latestLiveEvent.currentSession.cost,
            usageOrigin: liveThread?.usageOrigin || "codex-local",
            usageOriginLabel: liveThread?.usageOriginLabel || "Codex 本地",
            statusLabel: liveThread?.statusLabel || "未知",
            title: liveThread?.title || latestLiveEvent.currentSession.threadId,
            titlePreview:
              liveThread?.titlePreview ||
              summarizeTitle(liveThread?.title || latestLiveEvent.currentSession.threadId),
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
  return result;
}

module.exports = {
  classifyUsageOrigin,
  loadSnapshot,
  normalizeTokenUsage,
  normalizeRateLimits,
  extractSessionDetails,
};
