(function bootstrap(globalScope) {
  const dashboardState = {
    billingScope: "cumulative",
    rangeStart: 0,
    rangeEnd: 0,
    sessionPage: 1,
    sessionFilters: {
      title: "",
      model: "",
      createdDate: "",
    },
    snapshot: null,
  };

  function formatTokenMillions(value) {
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

  function formatTokenRaw(value) {
    return Number(value || 0).toLocaleString("en-US");
  }

  function formatPercent(value) {
    if (value === null || value === undefined) {
      return "-";
    }

    return `${Number(value).toFixed(0)}%`;
  }

  function formatResetTime(unixSeconds) {
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

  function formatUsd(value) {
    if (value === null || value === undefined) {
      return "-";
    }

    return `$${Number(value).toFixed(2)}`;
  }

  function formatPricePerMillion(value) {
    if (value === null || value === undefined) {
      return "-";
    }

    return `$${Number(value).toFixed(2)}/M`;
  }

  function formatPlanName(value) {
    if (!value) {
      return "未知";
    }

    return String(value).toUpperCase();
  }

  function formatModelLabel(modelName) {
    if (!modelName) {
      return "未知模型";
    }

    if (String(modelName).toLowerCase() === "gpt-5.4-codex") {
      return "GPT-5.4";
    }

    return String(modelName);
  }

  function formatUsageSource(value) {
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

  function clampPercent(value) {
    return `${Math.max(0, Math.min(100, Number(value || 0)))}%`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function calculateResetProgress({ generatedAt, resetsAt, windowMinutes }) {
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

  function getBillableInputTokens(tokenUsage) {
    return Math.max(
      0,
      Number(tokenUsage?.inputTokens || 0) - Number(tokenUsage?.cachedInputTokens || 0)
    );
  }

  function isRateLimitSnapshotStale({ generatedAt, latestRateLimitAt, resetsAt }) {
    if (!generatedAt || !latestRateLimitAt || !resetsAt) {
      return false;
    }

    const generatedAtMs = new Date(generatedAt).getTime();
    const latestRateLimitAtMs = new Date(latestRateLimitAt).getTime();
    const resetAtMs = Number(resetsAt) * 1000;

    return generatedAtMs >= resetAtMs && latestRateLimitAtMs <= generatedAtMs;
  }

  function getScopeRows(rows, generatedAt, scope) {
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

  function summarizeLedgerRows(rows) {
    return rows.reduce(
      (summary, row) => {
        summary.totalTokens += Number(row.totalTokens || 0);
        summary.totalUsd += Number(row.totalUsd || 0);
        return summary;
      },
      { totalTokens: 0, totalUsd: 0 }
    );
  }

  function getLocalDateKeyFromUnixSeconds(unixSeconds) {
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

  function getSessionPageCount(rows, pageSize = 10) {
    return Math.max(1, Math.ceil((rows || []).length / pageSize));
  }

  function getSessionPageRows(rows, page = 1, pageSize = 10) {
    const safePage = Math.max(1, Number(page || 1));
    const startIndex = (safePage - 1) * pageSize;
    return (rows || []).slice(startIndex, startIndex + pageSize);
  }

  function getFilteredSessionRows(rows, filters = {}) {
    const titleQuery = String(filters.title || "").trim().toLowerCase();
    const modelQuery = String(filters.model || "").trim().toLowerCase();
    const createdDate = String(filters.createdDate || "").trim();

    return (rows || []).filter((row) => {
      const matchesTitle = !titleQuery || String(row.title || "").toLowerCase().includes(titleQuery);
      const matchesModel =
        !modelQuery || String(row.modelName || "").toLowerCase().includes(modelQuery);
      const matchesCreatedDate =
        !createdDate || getLocalDateKeyFromUnixSeconds(row.createdAt) === createdDate;

      return matchesTitle && matchesModel && matchesCreatedDate;
    });
  }

  function normalizeRangeBounds(length, startIndex, endIndex) {
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

  function getVisibleLedgerRows(rows, startIndex, endIndex) {
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

  function buildCombinedChartMarkup(rows) {
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
              .map(
                (point) =>
                  `<circle cx="${point.x}" cy="${point.y}" r="1.7" class="chart-point-token"></circle>`
              )
              .join("")}
            ${costPoints
              .map(
                (point) =>
                  `<circle cx="${point.x}" cy="${point.y}" r="1.7" class="chart-point-cost"></circle>`
              )
              .join("")}
          </svg>
          <div class="chart-hover-grid">
            ${chronologicalRows
              .map((row, index) => {
                const left =
                  chronologicalRows.length > 1 ? index * (100 / (chronologicalRows.length - 1)) : 50;
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

  function buildOpenClawModelTableMarkup(rows) {
    if (!rows.length) {
      return "暂无模型费用明细";
    }

    return `
      <div class="pricing-head pricing-head-two">
        <span>模型</span>
        <span>费用</span>
      </div>
      ${rows
        .map(
          (row) => `
            <div class="openclaw-model-row">
              <strong>${escapeHtml(formatModelLabel(row.modelName))}</strong>
              <strong>${formatUsd(row.totalUsd)}</strong>
            </div>
          `
        )
        .join("")}
    `;
  }

  function buildSessionDetailCostMarkup(row) {
    if (!row?.tokenUsage || !row?.cost) {
      return '<div class="session-detail-cost-row"><span>本地最近日志里没有可用的细分账单</span></div>';
    }

    return `
      <div class="session-detail-cost-row">
        <span>未缓存输入</span>
        <strong>${formatTokenMillions(getBillableInputTokens(row.tokenUsage))}</strong>
        <strong>${formatUsd(row.cost.inputUsd)}</strong>
      </div>
      <div class="session-detail-cost-row">
        <span>缓存输入</span>
        <strong>${formatTokenMillions(row.tokenUsage.cachedInputTokens)}</strong>
        <strong>${formatUsd(row.cost.cachedInputUsd)}</strong>
      </div>
      <div class="session-detail-cost-row">
        <span>输出</span>
        <strong>${formatTokenMillions(row.tokenUsage.outputTokens)}</strong>
        <strong>${formatUsd(row.cost.outputUsd)}</strong>
      </div>
    `;
  }

  function bindCombinedChartInteractions(container) {
    if (!container || !container.querySelectorAll) {
      return;
    }

    const tooltip = container.querySelector(".chart-tooltip");
    const targets = container.querySelectorAll(".chart-tooltip-target");

    if (!tooltip || !targets.length) {
      return;
    }

    const showTooltip = (event) => {
      const target = event.currentTarget;
      tooltip.innerHTML = `
        <strong>${escapeHtml(target.dataset.day || "-")}</strong>
        <span>Token: ${escapeHtml(target.dataset.tokens || "-")}</span>
        <span>费用: ${escapeHtml(target.dataset.cost || "-")}</span>
      `;
      tooltip.classList.add("visible");

      const targetRect = target.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const offsetLeft = Math.max(
        18,
        Math.min(containerRect.width - 190, targetRect.left - containerRect.left - 80)
      );
      tooltip.style.left = `${offsetLeft}px`;
    };

    const hideTooltip = () => {
      tooltip.classList.remove("visible");
    };

    for (const target of targets) {
      target.addEventListener("mouseenter", showTooltip);
      target.addEventListener("focus", showTooltip);
      target.addEventListener("mouseleave", hideTooltip);
      target.addEventListener("blur", hideTooltip);
    }
  }

  function renderRecentThreads(snapshot) {
    const tableBody = document.getElementById("recent-threads");
    const pageLabel = document.getElementById("session-page-label");
    const prevButton = document.getElementById("session-prev");
    const nextButton = document.getElementById("session-next");
    const rows = getFilteredSessionRows(snapshot.recentThreads || [], dashboardState.sessionFilters);
    const totalPages = getSessionPageCount(rows, 10);
    dashboardState.sessionPage = Math.min(totalPages, Math.max(1, dashboardState.sessionPage));
    const pageRows = getSessionPageRows(rows, dashboardState.sessionPage, 10);

    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="8" class="empty-row">没有符合条件的会话</td></tr>';
      if (pageLabel) {
        pageLabel.textContent = "第 1 / 1 页";
      }
      if (prevButton) {
        prevButton.disabled = true;
      }
      if (nextButton) {
        nextButton.disabled = true;
      }
      return;
    }

    tableBody.innerHTML = pageRows
      .map(
        (thread) => `
          <tr>
            <td><span class="thread-id">${escapeHtml(thread.id || "-")}</span></td>
            <td>
              <span class="thread-title">${escapeHtml(thread.title || "(untitled)")}</span>
              <span class="thread-meta">${escapeHtml(thread.cwd || "-")}</span>
            </td>
            <td>${escapeHtml(formatModelLabel(thread.modelName))}</td>
            <td>${formatResetTime(thread.createdAt)}</td>
            <td>${formatTokenMillions(thread.tokensUsed)}</td>
            <td>${thread.cost ? formatUsd(thread.cost.totalUsd) : "-"}</td>
            <td>${formatResetTime(thread.updatedAt)}</td>
            <td><button type="button" class="secondary-button session-detail-button" data-thread-id="${escapeHtml(thread.id || "")}">详情</button></td>
          </tr>
        `
      )
      .join("");

    if (pageLabel) {
      pageLabel.textContent = `第 ${dashboardState.sessionPage} / ${totalPages} 页`;
    }
    if (prevButton) {
      prevButton.disabled = dashboardState.sessionPage <= 1;
    }
    if (nextButton) {
      nextButton.disabled = dashboardState.sessionPage >= totalPages;
    }

    bindSessionDetailButtons(snapshot);
  }

  function renderCostBreakdown(currentSession) {
    const container = document.getElementById("cost-breakdown");
    const cost = currentSession?.cost;

    if (!currentSession || !cost) {
      container.innerHTML =
        '<div class="cost-row single-row"><span>当前模型没有匹配到价格，无法估算费用</span></div>';
      return;
    }

    container.innerHTML = `
      <div class="cost-row">
        <span>未缓存输入</span>
        <strong>${formatTokenMillions(getBillableInputTokens(currentSession))}</strong>
        <span class="cost-meta">${formatPricePerMillion(cost.inputPerMillion)}</span>
        <strong>${formatUsd(cost.inputUsd)}</strong>
      </div>
      <div class="cost-row">
        <span>缓存输入</span>
        <strong>${formatTokenMillions(currentSession.cachedInputTokens)}</strong>
        <span class="cost-meta">${formatPricePerMillion(cost.cachedInputPerMillion)}</span>
        <strong>${formatUsd(cost.cachedInputUsd)}</strong>
      </div>
      <div class="cost-row">
        <span>输出 token</span>
        <strong>${formatTokenMillions(currentSession.outputTokens)}</strong>
        <span class="cost-meta">${formatPricePerMillion(cost.outputPerMillion)}</span>
        <strong>${formatUsd(cost.outputUsd)}</strong>
      </div>
      <div class="cost-row total-row">
        <span>估算总费用</span>
        <strong>${formatUsd(cost.totalUsd)}</strong>
      </div>
    `;
  }

  function renderPricingCatalog(snapshot) {
    const container = document.getElementById("pricing-table");
    const rows = snapshot.pricingCatalog || [];

    if (!rows.length) {
      container.className = "pricing-table empty-state";
      container.textContent = "没有识别到模型价格";
      return;
    }

    container.className = "pricing-table";
    container.innerHTML = `
      <div class="pricing-head">
        <span>模型</span>
        <span>输入</span>
        <span>缓存输入</span>
        <span>输出</span>
      </div>
      ${rows
        .map(
          (row) => `
            <div class="pricing-row">
              <div>
                <strong>${escapeHtml(row.modelName)}</strong>
                <span class="pricing-source-note">${escapeHtml(row.sourceLabel || "-")}</span>
              </div>
              <strong>${formatPricePerMillion(row.inputPerMillion)}</strong>
              <strong>${formatPricePerMillion(row.cachedInputPerMillion)}</strong>
              <strong>${formatPricePerMillion(row.outputPerMillion)}</strong>
            </div>
          `
        )
      .join("")}
    `;
  }

  function renderOpenClawUsage(snapshot) {
    const openclaw = snapshot.openclaw;
    const sourceName = document.getElementById("openclaw-source-name");
    const sourceUpdated = document.getElementById("openclaw-source-updated");
    const sessionTokens = document.getElementById("openclaw-session-tokens");
    const sessionCost = document.getElementById("openclaw-session-cost");
    const totalTokens = document.getElementById("openclaw-total-tokens");
    const totalCost = document.getElementById("openclaw-total-cost");
    const topModel = document.getElementById("openclaw-top-model");
    const topModelCost = document.getElementById("openclaw-top-model-cost");
    const modelTable = document.getElementById("openclaw-model-table");
    const dailyBody = document.getElementById("openclaw-daily-body");

    if (
      !sourceName ||
      !sourceUpdated ||
      !sessionTokens ||
      !sessionCost ||
      !totalTokens ||
      !totalCost ||
      !topModel ||
      !topModelCost ||
      !modelTable ||
      !dailyBody
    ) {
      return;
    }

    if (!openclaw) {
      sourceName.textContent = "不可用";
      sourceUpdated.textContent = "未读取到 OpenClaw / codexbar 数据";
      sessionTokens.textContent = "-";
      sessionCost.textContent = "当前费用 -";
      totalTokens.textContent = "-";
      totalCost.textContent = "近 30 天费用 -";
      topModel.textContent = "-";
      topModelCost.textContent = "模型费用 -";
      modelTable.className = "pricing-table empty-state";
      modelTable.textContent = "暂无模型费用明细";
      dailyBody.innerHTML = '<tr><td colspan="3" class="empty-row">暂无每日汇总</td></tr>';
      return;
    }

    const leadModel = openclaw.topModels?.[0] || null;
    const configuredModel = openclaw.configuredModel || null;

    sourceName.textContent = formatUsageSource(openclaw.source);
    sourceUpdated.textContent = openclaw.updatedAt
      ? `最近更新 ${new Date(openclaw.updatedAt).toLocaleString("zh-CN")}`
      : "更新时间不可用";
    sessionTokens.textContent = formatTokenMillions(openclaw.session?.totalTokens);
    sessionCost.textContent = `当前费用 ${formatUsd(openclaw.session?.totalUsd)}`;
    totalTokens.textContent = formatTokenMillions(openclaw.totals?.totalTokens);
    totalCost.textContent = `近 30 天费用 ${formatUsd(openclaw.totals?.totalUsd)}`;
    topModel.textContent = configuredModel ? formatModelLabel(configuredModel) : "-";
    topModelCost.textContent = leadModel
      ? `费用主模型 ${formatModelLabel(leadModel.modelName)} · ${formatUsd(leadModel.totalUsd)}`
      : "费用主模型 -";

    modelTable.className = "pricing-table";
    modelTable.innerHTML = buildOpenClawModelTableMarkup(openclaw.topModels || []);
    dailyBody.innerHTML = (openclaw.daily || []).length
      ? openclaw.daily
          .slice(0, 7)
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(row.day)}</td>
                <td>${formatTokenMillions(row.totalTokens)}</td>
                <td>${formatUsd(row.totalUsd)}</td>
              </tr>
            `
          )
          .join("")
      : '<tr><td colspan="3" class="empty-row">暂无每日汇总</td></tr>';
  }

  function applyResetProgress(prefix, generatedAt, latestRateLimitAt, windowData) {
    const progressLabel = document.getElementById(`${prefix}-reset-progress`);
    const progressBar = document.getElementById(`${prefix}-reset-progress-bar`);
    const progressTrack = progressBar?.parentElement;
    const progress = calculateResetProgress({
      generatedAt,
      resetsAt: windowData?.resetsAt,
      windowMinutes: windowData?.windowMinutes,
    });
    const staleSnapshot = isRateLimitSnapshotStale({
      generatedAt,
      latestRateLimitAt,
      resetsAt: windowData?.resetsAt,
    });

    if (!windowData || progress.elapsedPercent === null) {
      progressLabel.textContent = "-";
      progressBar.style.width = "0%";
      progressBar.removeAttribute("title");
      progressTrack?.classList.remove("stale");
      return;
    }

    if (staleSnapshot) {
      progressLabel.textContent = "快照已过期";
      progressBar.style.width = "100%";
      progressBar.title = "已过重置点，等待新的限制快照";
      progressTrack?.classList.add("stale");
      return;
    }

    progressLabel.textContent = `${progress.elapsedPercent}%`;
    progressBar.style.width = `${progress.elapsedPercent}%`;
    progressBar.title = `${windowData.label} 已运行 ${progress.elapsedPercent}%，剩余 ${progress.remainingPercent}%`;
    progressTrack?.classList.remove("stale");
  }

  function updateSourceInput(snapshot) {
    const input = document.getElementById("codex-home-input");
    if (!input) {
      return;
    }

    if (document.activeElement === input && input.dataset.dirty === "true") {
      return;
    }

    input.value = snapshot.sources.codexHome || "";
    input.dataset.dirty = "false";
  }

  function syncBillingRange(scopeRows) {
    const scopeSize = scopeRows.length;
    if (!scopeSize) {
      dashboardState.rangeStart = 0;
      dashboardState.rangeEnd = 0;
      return;
    }

    const bounds = normalizeRangeBounds(scopeSize, dashboardState.rangeStart, dashboardState.rangeEnd);
    dashboardState.rangeStart = bounds.startIndex;
    dashboardState.rangeEnd = bounds.endIndex;
  }

  function setRangePreset(preset, scopeRows, generatedAt) {
    const chronologicalRows = [...scopeRows].reverse();
    const total = chronologicalRows.length;

    if (!total) {
      dashboardState.rangeStart = 0;
      dashboardState.rangeEnd = 0;
      return;
    }

    if (preset === "all") {
      dashboardState.rangeStart = 0;
      dashboardState.rangeEnd = total - 1;
      return;
    }

    if (preset === "month") {
      if (dashboardState.billingScope === "month") {
        dashboardState.rangeStart = 0;
        dashboardState.rangeEnd = total - 1;
        return;
      }

      const generatedDate = new Date(generatedAt || Date.now());
      const monthKey = `${generatedDate.getFullYear()}-${String(
        generatedDate.getMonth() + 1
      ).padStart(2, "0")}`;
      const matchingIndexes = chronologicalRows
        .map((row, index) => (String(row.day || "").startsWith(monthKey) ? index : null))
        .filter((index) => index !== null);

      if (matchingIndexes.length) {
        dashboardState.rangeStart = matchingIndexes[0];
        dashboardState.rangeEnd = matchingIndexes[matchingIndexes.length - 1];
        return;
      }

      dashboardState.rangeStart = 0;
      dashboardState.rangeEnd = total - 1;
      return;
    }

    const days = Number(preset);
    if (!Number.isFinite(days) || days <= 0) {
      dashboardState.rangeStart = 0;
      dashboardState.rangeEnd = total - 1;
      return;
    }

    dashboardState.rangeEnd = total - 1;
    dashboardState.rangeStart = Math.max(0, total - days);
  }

  function updateRangeInputs(scopeRows) {
    const startInput = document.getElementById("billing-range-start");
    const endInput = document.getElementById("billing-range-end");
    const selectionBar = document.getElementById("billing-range-selection");
    const rangeLabel = document.getElementById("billing-range-label");
    const chronologicalRows = [...scopeRows].reverse();
    const total = chronologicalRows.length;

    if (!startInput || !endInput || !selectionBar || !rangeLabel) {
      return;
    }

    if (!total) {
      startInput.disabled = true;
      endInput.disabled = true;
      rangeLabel.textContent = "没有可选时间范围";
      selectionBar.style.left = "0%";
      selectionBar.style.width = "0%";
      return;
    }

    syncBillingRange(scopeRows);
    const bounds = normalizeRangeBounds(total, dashboardState.rangeStart, dashboardState.rangeEnd);
    const denominator = Math.max(1, total - 1);
    const left = (bounds.startIndex / denominator) * 100;
    const right = (bounds.endIndex / denominator) * 100;

    startInput.disabled = false;
    endInput.disabled = false;
    startInput.max = String(total - 1);
    endInput.max = String(total - 1);
    startInput.value = String(bounds.startIndex);
    endInput.value = String(bounds.endIndex);
    selectionBar.style.left = `${left}%`;
    selectionBar.style.width = `${Math.max(8, right - left)}%`;
    rangeLabel.textContent = `${chronologicalRows[bounds.startIndex].day} -> ${
      chronologicalRows[bounds.endIndex].day
    }`;
  }

  function renderDailyUsage(snapshot) {
    const chartContainer = document.getElementById("combined-chart");
    const ledgerBody = document.getElementById("daily-ledger-body");
    const scopeRows = getScopeRows(snapshot.dailyLedger || [], snapshot.generatedAt, dashboardState.billingScope);

    if (!scopeRows.length) {
      chartContainer.innerHTML = "没有每日账单数据";
      chartContainer.className = "line-chart-shell empty-state";
      ledgerBody.innerHTML = '<tr><td colspan="3" class="empty-row">没有账单明细</td></tr>';
      document.getElementById("scope-total-cost").textContent = "-";
      document.getElementById("scope-total-tokens").textContent = "-";
      document.getElementById("range-total-cost").textContent = "-";
      document.getElementById("range-total-tokens").textContent = "-";
      document.getElementById("combined-chart-peak").textContent = "-";
      document.getElementById("billing-empty-note").textContent = "当前范围暂无数据";
      updateRangeInputs(scopeRows);
      return;
    }

    if (dashboardState.rangeEnd === 0 && dashboardState.rangeStart === 0) {
      setRangePreset("all", scopeRows);
    }
    syncBillingRange(scopeRows);

    const visibleRows = getVisibleLedgerRows(
      scopeRows,
      dashboardState.rangeStart,
      dashboardState.rangeEnd
    );
    const scopeSummary = summarizeLedgerRows(scopeRows);
    const visibleSummary = summarizeLedgerRows(visibleRows);
    const scopeLabel = dashboardState.billingScope === "month" ? "自然月" : "累计";

    chartContainer.className = "line-chart-shell";
    chartContainer.innerHTML = buildCombinedChartMarkup(visibleRows);
    bindCombinedChartInteractions(chartContainer);

    document.getElementById("billing-scope-name").textContent = scopeLabel;
    document.getElementById("scope-total-cost-label").textContent = `${scopeLabel}费用`;
    document.getElementById("scope-total-tokens-label").textContent = `${scopeLabel} Token`;
    document.getElementById("scope-total-cost").textContent = formatUsd(scopeSummary.totalUsd);
    document.getElementById("scope-total-tokens").textContent = formatTokenMillions(scopeSummary.totalTokens);
    document.getElementById("range-total-cost").textContent = formatUsd(visibleSummary.totalUsd);
    document.getElementById("range-total-tokens").textContent = formatTokenMillions(
      visibleSummary.totalTokens
    );
    document.getElementById("combined-chart-peak").textContent = [
      `Token 峰值 ${formatTokenMillions(Math.max(...visibleRows.map((row) => row.totalTokens), 0))}`,
      `费用峰值 ${formatUsd(Math.max(...visibleRows.map((row) => row.totalUsd), 0))}`,
    ].join(" · ");
    document.getElementById("billing-empty-note").textContent = `共 ${visibleRows.length} 天明细`;

    ledgerBody.innerHTML = visibleRows.length
      ? visibleRows
          .map(
            (row) => `
              <tr>
                <td>${row.day}</td>
                <td>${formatTokenMillions(row.totalTokens)}</td>
                <td>${formatUsd(row.totalUsd)}</td>
              </tr>
            `
          )
          .join("")
      : '<tr><td colspan="3" class="empty-row">没有账单明细</td></tr>';

    updateRangeInputs(scopeRows);
  }

  function renderSnapshot(snapshot) {
    dashboardState.snapshot = snapshot;

    document.getElementById("generated-at").textContent = `最近更新 ${new Date(
      snapshot.generatedAt
    ).toLocaleString("zh-CN")}`;
    document.getElementById("source-home").textContent = `当前目录 ${snapshot.sources.codexHome || "-"}`;
    updateSourceInput(snapshot);

    document.getElementById("total-tokens").textContent = formatTokenMillions(snapshot.overview.totalTokens);
    document.getElementById("total-tokens-raw").textContent = `${formatTokenRaw(
      snapshot.overview.totalTokens
    )} tokens`;
    document.getElementById("total-threads").textContent = formatTokenRaw(snapshot.overview.totalThreads);

    const currentSession = snapshot.live.currentSession;
    document.getElementById("current-session-tokens").textContent = currentSession
      ? formatTokenMillions(currentSession.totalTokens)
      : "-";
    document.getElementById("current-session-last").textContent = currentSession
      ? `最近一次 ${formatTokenMillions(currentSession.lastTokens)}`
      : "最近一次不可用";
    document.getElementById("current-model-name").textContent = formatModelLabel(
      currentSession?.modelName
    );
    document.getElementById("current-model-cost").textContent = currentSession?.cost
      ? `当前会话费用 ${formatUsd(currentSession.cost.totalUsd)}`
      : "当前会话费用不可用";
    document.getElementById("total-estimated-cost").textContent = formatUsd(
      snapshot.overview.totalEstimatedCost
    );

    const rateLimits = snapshot.live.rateLimits;
    const primary = rateLimits?.primary || null;
    const secondary = rateLimits?.secondary || null;
    const planName = formatPlanName(rateLimits?.planType);

    document.getElementById("hero-plan").textContent = planName;
    document.getElementById("plan-type").textContent = planName;
    document.getElementById("primary-label").textContent = primary?.label || "主限制窗口";
    document.getElementById("secondary-label").textContent = secondary?.label || "次限制窗口";
    document.getElementById("primary-percent").textContent = formatPercent(primary?.usedPercent);
    document.getElementById("secondary-percent").textContent = formatPercent(secondary?.usedPercent);
    document.getElementById("primary-bar").style.width = clampPercent(primary?.usedPercent);
    document.getElementById("secondary-bar").style.width = clampPercent(secondary?.usedPercent);
    document.getElementById("primary-remaining").textContent = primary
      ? `剩余 ${formatPercent(primary.remainingPercent)}`
      : "剩余不可用";
    document.getElementById("secondary-remaining").textContent = secondary
      ? `剩余 ${formatPercent(secondary.remainingPercent)}`
      : "剩余不可用";
    const primaryStale = isRateLimitSnapshotStale({
      generatedAt: snapshot.generatedAt,
      latestRateLimitAt: snapshot.live.latestRateLimitAt,
      resetsAt: primary?.resetsAt,
    });
    const secondaryStale = isRateLimitSnapshotStale({
      generatedAt: snapshot.generatedAt,
      latestRateLimitAt: snapshot.live.latestRateLimitAt,
      resetsAt: secondary?.resetsAt,
    });

    document.getElementById("primary-reset").textContent = primary
      ? primaryStale
        ? `已过重置点，等待新的限制快照 · 上次快照 ${new Date(
            snapshot.live.latestRateLimitAt
          ).toLocaleString("zh-CN")}`
        : `重置于 ${formatResetTime(primary.resetsAt)} · ${primary.windowMinutes} 分钟窗口`
      : "主限制窗口不可用";
    document.getElementById("secondary-reset").textContent = secondary
      ? secondaryStale
        ? `已过重置点，等待新的限制快照 · 上次快照 ${new Date(
            snapshot.live.latestRateLimitAt
          ).toLocaleString("zh-CN")}`
        : `重置于 ${formatResetTime(secondary.resetsAt)} · ${secondary.windowMinutes} 分钟窗口`
      : "次限制窗口不可用";
    document.getElementById("credits-status").textContent =
      rateLimits?.credits === null || rateLimits?.credits === undefined
        ? "本地数据里没有可用的 Credits 数值"
        : `Credits 余额: ${rateLimits.credits}`;
    document.getElementById("rate-limit-source").textContent = snapshot.live.latestRateLimitAt
      ? `限制快照时间 ${new Date(snapshot.live.latestRateLimitAt).toLocaleString("zh-CN")}`
      : "暂无限制快照";

    applyResetProgress("primary", snapshot.generatedAt, snapshot.live.latestRateLimitAt, primary);
    applyResetProgress(
      "secondary",
      snapshot.generatedAt,
      snapshot.live.latestRateLimitAt,
      secondary
    );

    renderDailyUsage(snapshot);
    renderOpenClawUsage(snapshot);
    renderRecentThreads(snapshot);
    renderCostBreakdown(currentSession);
    renderPricingCatalog(snapshot);
  }

  function setConnectionState(isLive, label) {
    const dot = document.getElementById("live-dot");
    const status = document.getElementById("live-status");
    if (!dot || !status) {
      return;
    }

    dot.classList.toggle("live", isLive);
    status.textContent = label;
  }

  async function fetchSnapshot() {
    const response = await fetch("/api/snapshot");
    if (!response.ok) {
      throw new Error(`Snapshot request failed with ${response.status}`);
    }

    return response.json();
  }

  async function updateSource(codexHome) {
    const response = await fetch("/api/source", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        codexHome,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || `Source update failed with ${response.status}`);
    }

    return payload;
  }

  function setSourceFeedback(message, state) {
    const feedback = document.getElementById("source-feedback");
    if (!feedback) {
      return;
    }

    feedback.textContent = message;
    feedback.className = `source-feedback${state ? ` ${state}` : ""}`;
  }

  function initializeTabs() {
    const triggers = document.querySelectorAll("[data-tab-trigger]");
    const panels = document.querySelectorAll("[data-tab-panel]");

    const selectTab = (nextTab) => {
      for (const trigger of triggers) {
        const active = trigger.dataset.tabTrigger === nextTab;
        trigger.classList.toggle("active", active);
        trigger.setAttribute("aria-selected", String(active));
      }

      for (const panel of panels) {
        const active = panel.dataset.tabPanel === nextTab;
        panel.classList.toggle("active", active);
        panel.hidden = !active;
      }
    };

    for (const trigger of triggers) {
      trigger.addEventListener("click", () => {
        selectTab(trigger.dataset.tabTrigger);
      });
    }
  }

  function initializeBillingControls() {
    const scopeButtons = document.querySelectorAll("[data-billing-scope]");
    const presetButtons = document.querySelectorAll("[data-range-preset]");
    const startInput = document.getElementById("billing-range-start");
    const endInput = document.getElementById("billing-range-end");

    for (const button of scopeButtons) {
      button.addEventListener("click", () => {
        dashboardState.billingScope = button.dataset.billingScope;
        for (const sibling of scopeButtons) {
          sibling.classList.toggle("active", sibling === button);
        }

        if (dashboardState.snapshot) {
          const scopeRows = getScopeRows(
            dashboardState.snapshot.dailyLedger || [],
            dashboardState.snapshot.generatedAt,
            dashboardState.billingScope
          );
          setRangePreset(
            button.dataset.billingScope === "month" ? "month" : "all",
            scopeRows,
            dashboardState.snapshot.generatedAt
          );
          renderDailyUsage(dashboardState.snapshot);
        }
      });
    }

    for (const button of presetButtons) {
      button.addEventListener("click", () => {
        if (!dashboardState.snapshot) {
          return;
        }

        const scopeRows = getScopeRows(
          dashboardState.snapshot.dailyLedger || [],
          dashboardState.snapshot.generatedAt,
          dashboardState.billingScope
        );
        setRangePreset(button.dataset.rangePreset, scopeRows, dashboardState.snapshot.generatedAt);
        renderDailyUsage(dashboardState.snapshot);
      });
    }

    const updateRange = () => {
      dashboardState.rangeStart = Number(startInput.value || 0);
      dashboardState.rangeEnd = Number(endInput.value || 0);
      if (dashboardState.snapshot) {
        renderDailyUsage(dashboardState.snapshot);
      }
    };

    startInput.addEventListener("input", updateRange);
    endInput.addEventListener("input", updateRange);
  }

  function initializeSessionPagination() {
    const prevButton = document.getElementById("session-prev");
    const nextButton = document.getElementById("session-next");

    if (!prevButton || !nextButton) {
      return;
    }

    prevButton.addEventListener("click", () => {
      dashboardState.sessionPage = Math.max(1, dashboardState.sessionPage - 1);
      if (dashboardState.snapshot) {
        renderRecentThreads(dashboardState.snapshot);
      }
    });

    nextButton.addEventListener("click", () => {
      dashboardState.sessionPage += 1;
      if (dashboardState.snapshot) {
        renderRecentThreads(dashboardState.snapshot);
      }
    });
  }

  function bindSessionDetailButtons(snapshot) {
    const dialog = document.getElementById("session-detail-dialog");
    const idNode = document.getElementById("detail-thread-id");
    const titleNode = document.getElementById("detail-thread-title");
    const promptNode = document.getElementById("detail-thread-prompt");
    const costsNode = document.getElementById("detail-thread-costs");
    const buttons = document.querySelectorAll(".session-detail-button");

    if (!dialog || !idNode || !titleNode || !promptNode || !costsNode || !buttons.length) {
      return;
    }

    const rowsById = new Map((snapshot.recentThreads || []).map((row) => [row.id, row]));

    for (const button of buttons) {
      button.addEventListener("click", () => {
        const row = rowsById.get(button.dataset.threadId);
        idNode.textContent = row?.id || "-";
        titleNode.textContent = row?.title || "-";
        promptNode.textContent = row?.promptText || "未在本地日志中找到提示词";
        costsNode.innerHTML = buildSessionDetailCostMarkup(row);
        dialog.showModal();
      });
    }
  }

  function initializeSessionFilters() {
    const titleInput = document.getElementById("session-filter-title");
    const modelInput = document.getElementById("session-filter-model");
    const dateInput = document.getElementById("session-filter-date");

    if (!titleInput || !modelInput || !dateInput) {
      return;
    }

    const updateFilters = () => {
      dashboardState.sessionFilters = {
        title: titleInput.value,
        model: modelInput.value,
        createdDate: dateInput.value,
      };
      dashboardState.sessionPage = 1;
      if (dashboardState.snapshot) {
        renderRecentThreads(dashboardState.snapshot);
      }
    };

    titleInput.addEventListener("input", updateFilters);
    modelInput.addEventListener("input", updateFilters);
    dateInput.addEventListener("input", updateFilters);
  }

  function initializeSourceForm() {
    const form = document.getElementById("source-form");
    const input = document.getElementById("codex-home-input");
    const resetButton = document.getElementById("reset-source-button");

    if (!form || !input || !resetButton) {
      return;
    }

    input.addEventListener("input", () => {
      input.dataset.dirty = "true";
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setSourceFeedback("正在切换数据目录...", "");

      try {
        const snapshot = await updateSource(input.value.trim());
        input.dataset.dirty = "false";
        renderSnapshot(snapshot);
        setConnectionState(true, "实时中");
        setSourceFeedback("数据目录已更新。", "success");
      } catch (error) {
        setSourceFeedback(error.message, "error");
      }
    });

    resetButton.addEventListener("click", async () => {
      setSourceFeedback("正在恢复默认目录...", "");

      try {
        const snapshot = await updateSource("");
        input.dataset.dirty = "false";
        renderSnapshot(snapshot);
        setConnectionState(true, "实时中");
        setSourceFeedback("已恢复默认目录。", "success");
      } catch (error) {
        setSourceFeedback(error.message, "error");
      }
    });
  }

  async function startDashboard() {
    initializeTabs();
    initializeSourceForm();
    initializeBillingControls();
    initializeSessionPagination();
    initializeSessionFilters();

    try {
      renderSnapshot(await fetchSnapshot());
      setConnectionState(true, "实时中");
    } catch (error) {
      setConnectionState(false, "读取失败");
      console.error(error);
    }

    if ("EventSource" in globalScope) {
      const source = new EventSource("/api/stream");

      source.addEventListener("snapshot", (event) => {
        setConnectionState(true, "实时流");
        renderSnapshot(JSON.parse(event.data));
      });

      source.onerror = () => {
        setConnectionState(false, "重连中");
      };
      return;
    }

    setInterval(async () => {
      try {
        renderSnapshot(await fetchSnapshot());
      } catch (error) {
        console.error(error);
      }
    }, 5000);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      buildCombinedChartMarkup,
      buildOpenClawModelTableMarkup,
      calculateResetProgress,
      isRateLimitSnapshotStale,
      formatModelLabel,
      formatPercent,
      formatResetTime,
      formatTokenMillions,
      formatUsageSource,
      formatUsd,
      getBillableInputTokens,
      getFilteredSessionRows,
      getSessionPageCount,
      getSessionPageRows,
      getScopeRows,
      getVisibleLedgerRows,
      summarizeLedgerRows,
    };
  }

  if (typeof document !== "undefined") {
    globalScope.addEventListener("DOMContentLoaded", startDashboard);
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
