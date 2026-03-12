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

  if (String(modelName).toLowerCase() === "gpt-5.4-codex") {
    return "GPT-5.4";
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
  const origin = String(filters.origin || "").trim();

  return (rows || []).filter((row) => {
    const matchesTitle = !titleQuery || String(row.title || "").toLowerCase().includes(titleQuery);
    const matchesModel = !modelQuery || String(row.modelName || "").toLowerCase().includes(modelQuery);
    const matchesCreatedDate =
      !createdDate || getLocalDateKeyFromUnixSeconds(row.createdAt) === createdDate;
    const matchesOrigin = !origin || String(row.usageOrigin || "") === origin;

    return matchesTitle && matchesModel && matchesCreatedDate && matchesOrigin;
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
