export function formatTokenMillions(value) {
  const tokenValue = Number(value || 0);
  const inMillions = tokenValue / 1_000_000;

  if (inMillions === 0) {
    return "0M";
  }

  if (inMillions >= 10 && Number.isInteger(inMillions)) {
    return `${inMillions}M`;
  }

  if (inMillions >= 10) {
    return `${inMillions.toFixed(1).replace(/\.0$/, "")}M`;
  }

  return `${inMillions.toFixed(2).replace(/\.00$/, "")}M`;
}

export function formatTokenRaw(value) {
  return Number(value || 0).toLocaleString("en-US");
}

export function formatPercent(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${Number(value).toFixed(0)}%`;
}

export function formatResetTime(unixSeconds) {
  if (!unixSeconds) {
    return "重置时间不可用";
  }

  return new Date(unixSeconds * 1000).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatUsd(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `$${Number(value).toFixed(2)}`;
}

export function formatPricePerMillion(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `$${Number(value).toFixed(2)}/M`;
}

export function formatPlanName(value) {
  if (!value) {
    return "未知";
  }

  return String(value).toUpperCase();
}

export function formatModelLabel(modelName) {
  if (!modelName) {
    return "未知模型";
  }

  const normalized = String(modelName).toLowerCase().trim();

  const exactLabels = {
    "gpt-5": "GPT-5",
    "gpt5": "GPT-5",
    "gpt-5-mini": "GPT-5 Mini",
    "gpt-5-nano": "GPT-5 Nano",
    "gpt-5-pro": "GPT-5 Pro",
    "gpt-5.4": "GPT-5.4",
    "gpt5.4": "GPT-5.4",
    "gpt-5.4-codex": "GPT-5.4",
    "gpt5.4-codex": "GPT-5.4",
    "gpt-5.3": "GPT-5.3",
    "gpt5.3": "GPT-5.3",
    "gpt-5.3-codex": "GPT-5.3 Codex",
    "gpt5.3-codex": "GPT-5.3 Codex",
    "gpt-5.3-codex-spark": "GPT-5.3 Codex Spark",
    "gpt-5.2": "GPT-5.2",
    "gpt-5.2-codex": "GPT-5.2 Codex",
    "gpt-5.1": "GPT-5.1",
    "gpt-5.1-codex": "GPT-5.1 Codex",
    "gpt-5.1-codex-mini": "GPT-5.1 Codex Mini",
    "gpt-5.1-codex-max": "GPT-5.1 Codex Max",
  };

  if (exactLabels[normalized]) {
    return exactLabels[normalized];
  }

  const match = normalized.match(/^gpt-5(?:\.(\d+))?(?:-(mini|nano|pro|codex))?(?:-(spark|max))?$/);
  if (match) {
    const [, minor, variant, trailingVariant] = match;
    const base = minor ? `GPT-5.${minor}` : "GPT-5";
    const parts = [base];

    if (variant) {
      parts.push(variant.charAt(0).toUpperCase() + variant.slice(1));
    }

    if (trailingVariant) {
      parts.push(trailingVariant.charAt(0).toUpperCase() + trailingVariant.slice(1));
    }

    return parts.join(" ");
  }

  return String(modelName);
}

export function formatUsageSource(value) {
  if (!value) {
    return "未知来源";
  }

  if (value === "local") {
    return "codexbar local";
  }

  if (value === "web" || value === "oauth") {
    return "codexbar web";
  }

  return String(value);
}

export function formatRelativeTime(value, now = Date.now()) {
  if (!value) {
    return "时间未知";
  }

  const targetMs = new Date(value).getTime();
  const nowMs = new Date(now).getTime();

  if (Number.isNaN(targetMs) || Number.isNaN(nowMs)) {
    return "时间未知";
  }

  const diffMs = Math.max(0, nowMs - targetMs);
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes <= 0) {
    return "刚刚";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} 小时前`;
  }

  return `${Math.floor(diffHours / 24)} 天前`;
}

export function normalizeInlineText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function summarizePromptText(value, maxLength = 220) {
  const normalized = normalizeInlineText(value);
  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function calculateResetProgress({ generatedAt, resetsAt, windowMinutes }) {
  if (!generatedAt || !resetsAt || !windowMinutes) {
    return {
      elapsedPercent: null,
      remainingPercent: null,
    };
  }

  const resetTimeMs = Number(resetsAt) * 1000;
  const windowDurationMs = Number(windowMinutes) * 60 * 1000;
  const startTimeMs = resetTimeMs - windowDurationMs;
  const nowMs = new Date(generatedAt).getTime();
  const elapsedMs = Math.max(0, Math.min(windowDurationMs, nowMs - startTimeMs));
  const elapsedPercent = Math.round((elapsedMs / windowDurationMs) * 100);

  return {
    elapsedPercent,
    remainingPercent: Math.max(0, 100 - elapsedPercent),
  };
}

export function formatRuntimeDuration(startedAt, now = Date.now()) {
  const startMs = new Date(startedAt || 0).getTime();
  const nowMs = new Date(now).getTime();

  if (!Number.isFinite(startMs) || !Number.isFinite(nowMs) || nowMs <= startMs) {
    return "刚开始";
  }

  const diffMinutes = Math.max(1, Math.floor((nowMs - startMs) / 60000));
  const totalHours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) {
    return hours ? `${days}天${hours}小时` : `${days}天`;
  }

  if (totalHours > 0) {
    return minutes ? `${totalHours}小时${minutes}分` : `${totalHours}小时`;
  }

  return `${diffMinutes}分`;
}

export function estimateRateLimitExhaustion({ generatedAt, windowData }) {
  const resetsAt = Number(windowData?.resetsAt || 0);
  const windowMinutes = Number(windowData?.windowMinutes || 0);
  const usedPercent = Number(windowData?.usedPercent || 0);
  const generatedAtMs = new Date(generatedAt || 0).getTime();

  if (!resetsAt || !windowMinutes || !usedPercent || !Number.isFinite(generatedAtMs)) {
    return null;
  }

  if (usedPercent >= 100) {
    return {
      hitAt: new Date(generatedAtMs).toISOString(),
      withinWindow: true,
    };
  }

  const resetTimeMs = resetsAt * 1000;
  const windowDurationMs = windowMinutes * 60 * 1000;
  const startTimeMs = resetTimeMs - windowDurationMs;
  const elapsedMs = Math.max(0, generatedAtMs - startTimeMs);

  if (!elapsedMs) {
    return {
      hitAt: null,
      withinWindow: false,
    };
  }

  const msPerPercent = elapsedMs / usedPercent;
  const hitAtMs = generatedAtMs + (100 - usedPercent) * msPerPercent;

  return {
    hitAt: new Date(hitAtMs).toISOString(),
    withinWindow: hitAtMs < resetTimeMs,
  };
}

export function getBillableInputTokens(tokenUsage) {
  return Math.max(
    0,
    Number(tokenUsage?.inputTokens || 0) - Number(tokenUsage?.cachedInputTokens || 0)
  );
}

export function shouldCloseDialogFromBackdropClick(dialog, eventTarget) {
  return Boolean(dialog) && eventTarget === dialog;
}

export function isRateLimitSnapshotStale({ generatedAt, latestRateLimitAt, resetsAt }) {
  if (!generatedAt || !latestRateLimitAt || !resetsAt) {
    return false;
  }

  const generatedAtMs = new Date(generatedAt).getTime();
  const latestRateLimitAtMs = new Date(latestRateLimitAt).getTime();
  const resetAtMs = Number(resetsAt) * 1000;

  return generatedAtMs >= resetAtMs && latestRateLimitAtMs <= generatedAtMs;
}

function quotaStatusLabel(usedPercent, stale) {
  if (stale) {
    return "快照过期";
  }

  if (usedPercent >= 90) {
    return "即将触顶";
  }

  if (usedPercent >= 75) {
    return "接近触顶";
  }

  if (usedPercent >= 50) {
    return "持续消耗";
  }

  return "正常";
}

function quotaTitle(label) {
  if (!label) {
    return "限制窗口";
  }

  return String(label).replace(/窗口$/, "限额");
}

export function describeRateLimitWindow({ generatedAt, latestRateLimitAt, windowData }) {
  const stale = isRateLimitSnapshotStale({
    generatedAt,
    latestRateLimitAt,
    resetsAt: windowData?.resetsAt,
  });
  const estimate = estimateRateLimitExhaustion({ generatedAt, windowData });

  let projectedExhaustionCopy = "估算触顶时间 数据不足";
  if (stale) {
    projectedExhaustionCopy = "估算触顶时间 等待新的限制快照";
  } else if (estimate?.withinWindow) {
    projectedExhaustionCopy = `估算触顶时间 ${new Date(estimate.hitAt).toLocaleString("zh-CN")}`;
  } else if (estimate) {
    projectedExhaustionCopy = "估算触顶时间 按当前速率，本窗口内不会触顶";
  }

  return {
    title: quotaTitle(windowData?.label),
    label: windowData?.label || "限制窗口",
    statusLabel: quotaStatusLabel(Number(windowData?.usedPercent || 0), stale),
    usedPercent: Number(windowData?.usedPercent || 0),
    remainingPercent: Number(windowData?.remainingPercent || 0),
    remainingCopy: `剩余 ${formatPercent(windowData?.remainingPercent)}`,
    resetCopy: windowData?.resetsAt
      ? `重置于 ${formatResetTime(windowData.resetsAt)} · ${windowData?.windowMinutes || 0} 分钟窗口`
      : "重置时间不可用",
    projectedExhaustionCopy,
    stale,
  };
}

export function describeRuntimeStatus({ currentSession, anomalyCount = 0 }) {
  const statusLabel = currentSession?.statusLabel || "空闲";

  if (statusLabel === "已中断") {
    return {
      label: "异常状态",
      badgeVariant: "danger",
      detail: "最近活跃会话已中断，请检查最新日志或重新触发任务。",
    };
  }

  if (statusLabel === "进行中") {
    return {
      label: "运行中",
      badgeVariant: "warning",
      detail: anomalyCount
        ? `检测到 ${anomalyCount} 个异常成本尖峰，建议检查当前任务。`
        : "当前最近活跃会话仍在持续消耗 token。",
    };
  }

  if (statusLabel === "等待回答") {
    return {
      label: "等待回答",
      badgeVariant: "secondary",
      detail: "最近活跃会话正在等待模型继续输出。",
    };
  }

  if (statusLabel === "已完结") {
    return {
      label: "已完结",
      badgeVariant: anomalyCount ? "warning" : "success",
      detail: anomalyCount
        ? `最近会话已完结，但检测到 ${anomalyCount} 个异常成本尖峰。`
        : "最近活跃会话已经正常结束。",
    };
  }

  return {
    label: "空闲",
    badgeVariant: "secondary",
    detail: "当前没有可识别的活跃会话。",
  };
}

export function getRuntimeSessionRows(rows, limit = 3) {
  const allRows = Array.isArray(rows) ? rows : [];
  const activeRows = allRows.filter((row) => row?.statusLabel === "进行中" || row?.statusLabel === "等待回答");
  return activeRows.slice(0, limit);
}

export function getScopeRows(rows, generatedAt, scope) {
  if (scope !== "month") {
    return [...rows];
  }

  const generatedDate = new Date(generatedAt || Date.now());
  const monthKey = `${generatedDate.getFullYear()}-${String(generatedDate.getMonth() + 1).padStart(
    2,
    "0"
  )}`;

  return rows.filter((row) => String(row.day || "").startsWith(monthKey));
}

export function summarizeLedgerRows(rows) {
  return rows.reduce(
    (summary, row) => {
      summary.totalTokens += Number(row.totalTokens || 0);
      summary.totalUsd += Number(row.totalUsd || 0);
      return summary;
    },
    { totalTokens: 0, totalUsd: 0 }
  );
}

export function getHomepageSummary(rows, generatedAt = Date.now()) {
  const currentDay = formatDayKey(new Date(generatedAt || Date.now()));
  const previousDay = formatDayKey(addDays(new Date(generatedAt || Date.now()), -1));
  const todayRow = (rows || []).find((row) => row.day === currentDay) || {};
  const previousRow = (rows || []).find((row) => row.day === previousDay) || {};
  const monthSummary = summarizeLedgerRows(getScopeRows(rows || [], generatedAt, "month"));
  const deltaUsd = Number(
    (
      Number(todayRow.totalUsd || 0) -
      Number(previousRow.totalUsd || 0)
    ).toFixed(2)
  );

  return {
    today: {
      day: currentDay,
      totalUsd: Number(todayRow.totalUsd || 0),
      totalTokens: Number(todayRow.totalTokens || 0),
    },
    yesterday: {
      day: previousDay,
      totalUsd: Number(previousRow.totalUsd || 0),
      totalTokens: Number(previousRow.totalTokens || 0),
    },
    month: {
      totalUsd: Number(Number(monthSummary.totalUsd || 0).toFixed(2)),
      totalTokens: Number(monthSummary.totalTokens || 0),
    },
    change: {
      direction: deltaUsd > 0 ? "up" : deltaUsd < 0 ? "down" : "flat",
      deltaUsd,
      deltaTokens: Number(todayRow.totalTokens || 0) - Number(previousRow.totalTokens || 0),
    },
  };
}

export function getWindowSummary(rows, generatedAt = Date.now()) {
  const baseDate = new Date(generatedAt || Date.now());
  const endDay = formatDayKey(baseDate);
  const startDay = formatDayKey(addDays(baseDate, -6));
  const todayRows = filterRowsByDayRange(rows || [], endDay, endDay);
  const last7DaysRows = filterRowsByDayRange(rows || [], startDay, endDay);

  return {
    today: {
      day: endDay,
      totalUsd: Number(Number(summarizeLedgerRows(todayRows).totalUsd || 0).toFixed(2)),
      totalTokens: Number(summarizeLedgerRows(todayRows).totalTokens || 0),
    },
    last7Days: {
      startDay,
      endDay,
      totalUsd: Number(Number(summarizeLedgerRows(last7DaysRows).totalUsd || 0).toFixed(2)),
      totalTokens: Number(summarizeLedgerRows(last7DaysRows).totalTokens || 0),
    },
  };
}

function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function buildCostSpikeEntries(rows, scope, getLabel) {
  const groups = new Map();

  for (const row of (rows || []).sort((left, right) => Number(right.updatedAt || 0) - Number(left.updatedAt || 0))) {
    const latestUsd = Number(row?.cost?.totalUsd || 0);
    const label = String(getLabel(row) || "").trim();
    if (!label || label === "-" || latestUsd <= 0) {
      continue;
    }

    if (!groups.has(label)) {
      groups.set(label, []);
    }

    groups.get(label).push(row);
  }

  return Array.from(groups.entries())
    .map(([label, groupRows]) => {
      const [latest, ...history] = groupRows;
      const baselineRows = history.slice(0, 3);
      const latestUsd = Number(latest?.cost?.totalUsd || 0);
      const baselineUsd = Number(average(baselineRows.map((row) => row?.cost?.totalUsd || 0)).toFixed(2));
      const deltaUsd = Number((latestUsd - baselineUsd).toFixed(2));
      const ratio = baselineUsd > 0 ? latestUsd / baselineUsd : Infinity;

      if (!baselineRows.length || latestUsd < 1 || deltaUsd < 1) {
        return null;
      }

      if (baselineUsd > 0 && ratio < 2.5) {
        return null;
      }

      return {
        scope,
        label,
        latestUsd,
        baselineUsd,
        deltaUsd,
        ratio: Number.isFinite(ratio) ? Number(ratio.toFixed(2)) : null,
      };
    })
    .filter(Boolean);
}

export function detectCostSpikes(rows) {
  return [
    ...buildCostSpikeEntries(rows, "project", (row) => row.workspaceLabel || row.cwd),
    ...buildCostSpikeEntries(rows, "model", (row) => row.modelName),
  ].sort((left, right) => right.deltaUsd - left.deltaUsd);
}

export function getLocalDateKeyFromUnixSeconds(unixSeconds) {
  if (!unixSeconds) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date(unixSeconds * 1000));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isValidDayKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function formatDayKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(referenceDate, amount) {
  return new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() + Number(amount || 0)
  );
}

export function getDatePresetRange(referenceDate, preset, customRange = {}) {
  const baseDate = new Date(referenceDate || Date.now());
  const safePreset = String(preset || "custom");
  const referenceDay = formatDayKey(baseDate);

  if (!referenceDay) {
    return {
      preset: safePreset,
      startDay: "",
      endDay: "",
    };
  }

  if (safePreset === "today") {
    return { preset: safePreset, startDay: referenceDay, endDay: referenceDay };
  }

  if (safePreset === "yesterday") {
    const yesterday = formatDayKey(addDays(baseDate, -1));
    return { preset: safePreset, startDay: yesterday, endDay: yesterday };
  }

  if (safePreset === "last7") {
    return {
      preset: safePreset,
      startDay: formatDayKey(addDays(baseDate, -6)),
      endDay: referenceDay,
    };
  }

  if (safePreset === "month") {
    return {
      preset: safePreset,
      startDay: formatDayKey(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)),
      endDay: referenceDay,
    };
  }

  const startDay = isValidDayKey(customRange.startDay) ? customRange.startDay : "";
  const endDay = isValidDayKey(customRange.endDay) ? customRange.endDay : "";
  if (startDay && endDay && startDay > endDay) {
    return {
      preset: safePreset,
      startDay: endDay,
      endDay: startDay,
    };
  }

  return {
    preset: safePreset,
    startDay,
    endDay,
  };
}

export function filterRowsByDayRange(rows, startDay, endDay, dayAccessor = (row) => row?.day) {
  const start = isValidDayKey(startDay) ? startDay : "";
  const end = isValidDayKey(endDay) ? endDay : "";

  return (rows || []).filter((row) => {
    const day = String(dayAccessor(row) || "");
    if (!day) {
      return false;
    }

    if (start && day < start) {
      return false;
    }

    if (end && day > end) {
      return false;
    }

    return true;
  });
}

export function getSessionPageCount(rows, pageSize = 10) {
  return Math.max(1, Math.ceil((rows || []).length / pageSize));
}

export function getSessionPageRows(rows, page = 1, pageSize = 10) {
  const safePage = Math.max(1, Number(page || 1));
  const startIndex = (safePage - 1) * pageSize;
  return (rows || []).slice(startIndex, startIndex + pageSize);
}

export function getFilteredSessionRows(rows, filters = {}) {
  const titleQuery = String(filters.title || "").trim().toLowerCase();
  const modelQuery = String(filters.model || "").trim().toLowerCase();
  const createdDate = String(filters.createdDate || "").trim();
  const createdFrom = String(filters.createdFrom || "").trim();
  const createdTo = String(filters.createdTo || "").trim();
  const origin = String(filters.origin || "").trim();

  return (rows || []).filter((row) => {
    const createdDay = getLocalDateKeyFromUnixSeconds(row.createdAt);
    const matchesTitle = !titleQuery || String(row.title || "").toLowerCase().includes(titleQuery);
    const matchesModel = !modelQuery || String(row.modelName || "").toLowerCase().includes(modelQuery);
    const matchesCreatedDate = !createdDate || createdDay === createdDate;
    const matchesCreatedFrom = !createdFrom || createdDay >= createdFrom;
    const matchesCreatedTo = !createdTo || createdDay <= createdTo;
    const matchesOrigin = !origin || String(row.usageOrigin || "") === origin;

    return (
      matchesTitle &&
      matchesModel &&
      matchesCreatedDate &&
      matchesCreatedFrom &&
      matchesCreatedTo &&
      matchesOrigin
    );
  });
}

export function normalizeRangeBounds(length, startIndex, endIndex) {
  if (!length) {
    return { startIndex: 0, endIndex: 0 };
  }

  const maxIndex = length - 1;
  const left = Math.max(0, Math.min(maxIndex, Number(startIndex || 0)));
  const right = Math.max(0, Math.min(maxIndex, Number(endIndex ?? maxIndex)));

  return {
    startIndex: Math.min(left, right),
    endIndex: Math.max(left, right),
  };
}

export function getVisibleLedgerRows(rows, startIndex, endIndex) {
  const chronologicalRows = [...rows].sort((left, right) => left.day.localeCompare(right.day));
  const bounds = normalizeRangeBounds(chronologicalRows.length, startIndex, endIndex);
  return chronologicalRows.slice(bounds.startIndex, bounds.endIndex + 1).reverse();
}

function buildScaledPoints(rows, field, maxValue) {
  const pointGap = rows.length > 1 ? 100 / (rows.length - 1) : 100;

  return rows.map((row, index) => {
    const x = rows.length > 1 ? index * pointGap : 50;
    const ratio = maxValue ? row[field] / maxValue : 0;
    const y = 100 - Math.max(10, ratio * 78);
    return { row, x, y };
  });
}

function buildAxisLabels(maxValue, formatter) {
  return [1, 0.5, 0].map((ratio) => formatter(maxValue * ratio));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildCombinedChartMarkup(rows) {
  if (!rows.length) {
    return "没有每日账单数据";
  }

  const chronologicalRows = [...rows].reverse();
  const tokenMaxValue = Math.max(...chronologicalRows.map((row) => row.totalTokens), 0.0001);
  const costMaxValue = Math.max(...chronologicalRows.map((row) => row.totalUsd), 0.0001);
  const tokenPoints = buildScaledPoints(chronologicalRows, "totalTokens", tokenMaxValue);
  const costPoints = buildScaledPoints(chronologicalRows, "totalUsd", costMaxValue);
  const tokenPolyline = tokenPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const costPolyline = costPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const tokenAxisLabels = buildAxisLabels(tokenMaxValue, formatTokenMillions);
  const costAxisLabels = buildAxisLabels(costMaxValue, formatUsd);

  return `
    <div class="chart-grid-shell">
      <div class="chart-y-axis chart-y-axis-token">
        ${tokenAxisLabels.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}
      </div>
      <div class="chart-stage">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="line-chart">
          <line x1="0" y1="88" x2="100" y2="88" class="chart-axis"></line>
          <line x1="0" y1="49" x2="100" y2="49" class="chart-axis chart-axis-mid"></line>
          <polyline points="${tokenPolyline}" class="chart-line chart-line-token"></polyline>
          <polyline points="${costPolyline}" class="chart-line chart-line-cost"></polyline>
          ${tokenPoints
            .map((point) => `<circle cx="${point.x}" cy="${point.y}" r="1.7" class="chart-point-token"></circle>`)
            .join("")}
          ${costPoints
            .map((point) => `<circle cx="${point.x}" cy="${point.y}" r="1.7" class="chart-point-cost"></circle>`)
            .join("")}
        </svg>
        <div class="chart-hover-grid">
          ${chronologicalRows
            .map((row, index) => {
              const left = chronologicalRows.length > 1 ? index * (100 / (chronologicalRows.length - 1)) : 50;
              return `
                <button
                  type="button"
                  class="chart-tooltip-target"
                  style="left:${left}%"
                  data-day="${escapeHtml(row.day)}"
                  data-tokens="${escapeHtml(formatTokenMillions(row.totalTokens))}"
                  data-cost="${escapeHtml(formatUsd(row.totalUsd))}"
                ></button>
              `;
            })
            .join("")}
        </div>
        <div class="chart-tooltip"></div>
      </div>
      <div class="chart-y-axis chart-y-axis-cost">
        ${costAxisLabels.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}
      </div>
    </div>
    <div class="chart-legend">
      <span>${chronologicalRows[0].day} -> ${chronologicalRows[chronologicalRows.length - 1].day}</span>
      <span class="chart-legend-key chart-legend-token">Token</span>
      <span class="chart-legend-key chart-legend-cost">费用</span>
    </div>
    <div class="chart-brush">
      <span>${escapeHtml(chronologicalRows[0].day)}</span>
      <span>拖动下方时间轴可缩放范围</span>
      <span>${escapeHtml(chronologicalRows[chronologicalRows.length - 1].day)}</span>
    </div>
  `;
}

export function buildOpenClawModelTableMarkup(rows) {
  if (!rows.length) {
    return "暂无模型费用明细";
  }

  return `
    <table>
      <thead>
        <tr>
          <th>模型</th>
          <th>费用</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(formatModelLabel(row.modelName))}</td>
                <td>${formatUsd(row.totalUsd)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function getSessionExportDefinition(viewMode) {
  const safeViewMode = String(viewMode || "cost");

  if (safeViewMode === "performance") {
    return [
      { header: "会话 ID", value: (row) => row.id || "" },
      { header: "标题", value: (row) => row.titlePreview || row.title || "" },
      { header: "状态", value: (row) => row.statusLabel || "未知" },
      { header: "模型", value: (row) => formatModelLabel(row.modelName) },
      { header: "创建时间", value: (row) => formatResetTime(row.createdAt) },
      { header: "更新时间", value: (row) => formatResetTime(row.updatedAt) },
    ];
  }

  if (safeViewMode === "project") {
    return [
      { header: "会话 ID", value: (row) => row.id || "" },
      { header: "标题", value: (row) => row.titlePreview || row.title || "" },
      { header: "项目", value: (row) => row.workspaceLabel || row.cwd || "-" },
      { header: "来源", value: (row) => row.usageOriginLabel || "Codex 本地" },
      { header: "模型", value: (row) => formatModelLabel(row.modelName) },
      { header: "提示摘要", value: (row) => summarizePromptText(row.promptText || "", 80) },
    ];
  }

  return [
    { header: "会话 ID", value: (row) => row.id || "" },
    { header: "标题", value: (row) => row.titlePreview || row.title || "" },
    { header: "来源", value: (row) => row.usageOriginLabel || "Codex 本地" },
    { header: "模型", value: (row) => formatModelLabel(row.modelName) },
    { header: "Token", value: (row) => formatTokenMillions(row.tokensUsed) },
    { header: "费用", value: (row) => (row.cost ? formatUsd(row.cost.totalUsd) : "-") },
    { header: "更新时间", value: (row) => formatResetTime(row.updatedAt) },
  ];
}

export function buildSessionExportSnapshot(rows, viewMode) {
  const definition = getSessionExportDefinition(viewMode);
  return {
    columns: definition.map((column) => column.header),
    rows: (rows || []).map((row) => definition.map((column) => column.value(row))),
  };
}

export function buildBillingExportSnapshot(rows) {
  return {
    columns: ["日期", "Token", "费用"],
    rows: (rows || []).map((row) => [
      row.day || "",
      formatTokenMillions(row.totalTokens),
      formatUsd(row.totalUsd),
    ]),
  };
}

export function stringifyCsvSnapshot(snapshot) {
  const columns = Array.isArray(snapshot?.columns) ? snapshot.columns : [];
  const rows = Array.isArray(snapshot?.rows) ? snapshot.rows : [];

  const escapeCell = (value) => {
    const cell = String(value ?? "");
    if (/[",\n]/.test(cell)) {
      return `"${cell.replaceAll('"', '""')}"`;
    }

    return cell;
  };

  return [columns, ...rows]
    .map((row) => row.map((cell) => escapeCell(cell)).join(","))
    .join("\n");
}

export const ALERT_CONFIG_LIMITS = {
  dailySpend: {
    minThresholdUsd: 0,
    maxThresholdUsd: 100000,
    defaultThresholdUsd: 10,
  },
  failureRate: {
    minThresholdPercent: 0,
    maxThresholdPercent: 100,
    defaultThresholdPercent: 20,
  },
};

const DEFAULT_ALERT_CONFIG = {
  dailySpend: {
    enabled: true,
    thresholdUsd: ALERT_CONFIG_LIMITS.dailySpend.defaultThresholdUsd,
  },
  failureRate: {
    enabled: true,
    thresholdPercent: ALERT_CONFIG_LIMITS.failureRate.defaultThresholdPercent,
  },
};

export function normalizeAlertConfig(config = {}) {
  const dailySpendThreshold = Number(config.dailySpend?.thresholdUsd);
  const failureRateThreshold = Number(config.failureRate?.thresholdPercent);

  return {
    dailySpend: {
      enabled: config.dailySpend?.enabled !== false,
      thresholdUsd: Number.isFinite(dailySpendThreshold)
        ? Math.max(
            ALERT_CONFIG_LIMITS.dailySpend.minThresholdUsd,
            Math.min(ALERT_CONFIG_LIMITS.dailySpend.maxThresholdUsd, dailySpendThreshold)
          )
        : DEFAULT_ALERT_CONFIG.dailySpend.thresholdUsd,
    },
    failureRate: {
      enabled: config.failureRate?.enabled !== false,
      thresholdPercent: Number.isFinite(failureRateThreshold)
        ? Math.max(
            ALERT_CONFIG_LIMITS.failureRate.minThresholdPercent,
            Math.min(ALERT_CONFIG_LIMITS.failureRate.maxThresholdPercent, failureRateThreshold)
          )
        : DEFAULT_ALERT_CONFIG.failureRate.thresholdPercent,
    },
  };
}

export function getAlertMetrics(snapshot = {}) {
  const today = formatDayKey(new Date(snapshot.generatedAt || Date.now()));
  const todayLedger = (snapshot.dailyLedger || []).find((row) => row.day === today);
  const todayThreads = (snapshot.recentThreads || []).filter(
    (row) => getLocalDateKeyFromUnixSeconds(row.createdAt) === today
  );
  const terminalThreads = todayThreads.filter(
    (row) => row.statusLabel === "已完结" || row.statusLabel === "已中断"
  );
  const failureCount = terminalThreads.filter((row) => row.statusLabel === "已中断").length;
  const completedCount = terminalThreads.filter((row) => row.statusLabel === "已完结").length;
  const terminalCount = terminalThreads.length;

  return {
    todayKey: today,
    dailySpendUsd: Number(todayLedger?.totalUsd || 0),
    dailySpendTokens: Number(todayLedger?.totalTokens || 0),
    failureRatePercent: terminalCount
      ? Number(((failureCount / terminalCount) * 100).toFixed(1))
      : 0,
    failureCount,
    completedCount,
    terminalCount,
    sessionCountToday: todayThreads.length,
  };
}

export function evaluateAlertStates({ metrics = {}, config = {}, previousStates = {}, timestamp } = {}) {
  const normalizedConfig = normalizeAlertConfig(config);
  const rules = {
    dailySpend: {
      enabled: normalizedConfig.dailySpend.enabled,
      threshold: Number(normalizedConfig.dailySpend.thresholdUsd || 0),
      value: Number(metrics.dailySpendUsd || 0),
    },
    failureRate: {
      enabled: normalizedConfig.failureRate.enabled,
      threshold: Number(normalizedConfig.failureRate.thresholdPercent || 0),
      value: Number(metrics.failureRatePercent || 0),
    },
  };

  return Object.fromEntries(
    Object.entries(rules).map(([key, rule]) => {
      const previous = previousStates[key] || { phase: "inactive", isActive: false };
      const changedAt = timestamp || previous.changedAt || null;

      if (!rule.enabled) {
        const stillDisabled = previous.phase === "disabled";
        return [
          key,
          {
            phase: "disabled",
            isActive: false,
            threshold: rule.threshold,
            currentValue: rule.value,
            changedAt: stillDisabled ? previous.changedAt || changedAt : changedAt,
          },
        ];
      }

      if (rule.value >= rule.threshold) {
        return [
          key,
          {
            phase: "triggered",
            isActive: true,
            threshold: rule.threshold,
            currentValue: rule.value,
            changedAt: previous.phase === "triggered" ? previous.changedAt || changedAt : changedAt,
          },
        ];
      }

      const wasActive = previous.phase === "triggered" || previous.isActive;
      const recovered = wasActive || previous.phase === "recovered";
      return [
        key,
        {
          phase: recovered ? "recovered" : "inactive",
          isActive: false,
          threshold: rule.threshold,
          currentValue: rule.value,
          changedAt: wasActive ? changedAt : previous.changedAt || null,
        },
      ];
    })
  );
}
