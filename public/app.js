(function bootstrap(globalScope) {
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

    return `$${Number(value).toFixed(4)}`;
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

  function buildLineChartMarkup(rows, options) {
    if (!rows.length) {
      return "没有数据";
    }

    const chronologicalRows = [...rows].reverse();
    const maxValue = Math.max(...chronologicalRows.map((row) => row[options.field]), 0.0001);
    const pointGap = chronologicalRows.length > 1 ? 100 / (chronologicalRows.length - 1) : 100;
    const points = chronologicalRows
      .map(
        (row, index) =>
          `${index * pointGap},${100 - Math.max(6, (row[options.field] / maxValue) * 88)}`
      )
      .join(" ");

    return `
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="line-chart">
        <line x1="0" y1="88" x2="100" y2="88" class="chart-axis"></line>
        <polyline points="${points}" class="chart-line ${options.lineClass || ""}"></polyline>
      </svg>
      <div class="chart-legend">
        <span>${chronologicalRows[0].day} -> ${chronologicalRows[chronologicalRows.length - 1].day}</span>
        <strong>峰值 ${options.formatter(maxValue)}</strong>
      </div>
    `;
  }

  function renderDailyUsage(snapshot) {
    const tokenChartContainer = document.getElementById("token-chart");
    const costChartContainer = document.getElementById("cost-chart");
    const ledgerContainer = document.getElementById("daily-ledger");
    const rows = snapshot.dailyLedger || [];

    if (!rows.length) {
      tokenChartContainer.innerHTML = "没有每日账单数据";
      costChartContainer.innerHTML = "没有每日账单数据";
      ledgerContainer.innerHTML = "没有每日账单明细";
      tokenChartContainer.className = "line-chart-shell empty-state";
      costChartContainer.className = "line-chart-shell empty-state";
      ledgerContainer.className = "daily-ledger empty-state";
      document.getElementById("daily-total-cost").textContent = "-";
      document.getElementById("latest-daily-cost").textContent = "-";
      document.getElementById("token-chart-peak").textContent = "-";
      document.getElementById("cost-chart-peak").textContent = "-";
      return;
    }

    tokenChartContainer.className = "line-chart-shell";
    costChartContainer.className = "line-chart-shell";
    tokenChartContainer.innerHTML = buildLineChartMarkup(rows, {
      field: "totalTokens",
      formatter: formatTokenMillions,
      lineClass: "chart-line-token",
    });
    costChartContainer.innerHTML = buildLineChartMarkup(rows, {
      field: "totalUsd",
      formatter: formatUsd,
      lineClass: "chart-line-cost",
    });

    ledgerContainer.className = "daily-ledger";
    ledgerContainer.innerHTML = rows
      .map(
        (row) => `
          <div class="ledger-row">
            <span>${row.day}</span>
            <strong>${formatTokenMillions(row.totalTokens)}</strong>
            <strong>${formatUsd(row.totalUsd)}</strong>
          </div>
        `
      )
      .join("");

    document.getElementById("daily-total-cost").textContent = formatUsd(
      snapshot.overview.totalEstimatedCost
    );
    document.getElementById("latest-daily-cost").textContent = formatUsd(rows[0].totalUsd);
    document.getElementById("token-chart-peak").textContent = `峰值 ${formatTokenMillions(
      Math.max(...rows.map((row) => row.totalTokens), 0)
    )}`;
    document.getElementById("cost-chart-peak").textContent = `峰值 ${formatUsd(
      Math.max(...rows.map((row) => row.totalUsd), 0)
    )}`;
  }

  function renderRecentThreads(snapshot) {
    const tableBody = document.getElementById("recent-threads");
    const rows = snapshot.recentThreads || [];

    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="5" class="empty-row">没有最近会话</td></tr>';
      return;
    }

    tableBody.innerHTML = rows
      .map(
        (thread) => `
          <tr>
            <td>
              <span class="thread-title">${escapeHtml(thread.title || "(untitled)")}</span>
              <span class="thread-meta">${escapeHtml(thread.cwd || "-")}</span>
            </td>
            <td>${escapeHtml(thread.modelName || "未知模型")}</td>
            <td>${formatTokenMillions(thread.tokensUsed)}</td>
            <td>${thread.cost ? formatUsd(thread.cost.totalUsd) : "-"}</td>
            <td>${formatResetTime(thread.updatedAt)}</td>
          </tr>
        `
      )
      .join("");
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
        <span>输入 token</span>
        <strong>${formatTokenMillions(currentSession.inputTokens)}</strong>
        <span class="cost-meta">$${cost.inputPerMillion}/M</span>
        <strong>${formatUsd(cost.inputUsd)}</strong>
      </div>
      <div class="cost-row">
        <span>缓存输入</span>
        <strong>${formatTokenMillions(currentSession.cachedInputTokens)}</strong>
        <span class="cost-meta">$${cost.cachedInputPerMillion ?? "-"}/M</span>
        <strong>${formatUsd(cost.cachedInputUsd)}</strong>
      </div>
      <div class="cost-row">
        <span>输出 token</span>
        <strong>${formatTokenMillions(currentSession.outputTokens)}</strong>
        <span class="cost-meta">$${cost.outputPerMillion}/M</span>
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
              <strong>${row.inputPerMillion == null ? "-" : `$${row.inputPerMillion}/M`}</strong>
              <strong>${row.cachedInputPerMillion == null ? "-" : `$${row.cachedInputPerMillion}/M`}</strong>
              <strong>${row.outputPerMillion == null ? "-" : `$${row.outputPerMillion}/M`}</strong>
            </div>
          `
        )
        .join("")}
    `;
  }

  function renderSnapshot(snapshot) {
    document.getElementById("generated-at").textContent = `最近更新 ${new Date(
      snapshot.generatedAt
    ).toLocaleString("zh-CN")}`;
    document.getElementById("source-home").textContent = snapshot.sources.codexHome;
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
    document.getElementById("current-model-name").textContent = currentSession?.modelName || "未知模型";
    document.getElementById("current-model-cost").textContent = currentSession?.cost
      ? `当前会话费用 ${formatUsd(currentSession.cost.totalUsd)}`
      : "当前会话费用不可用";
    document.getElementById("total-estimated-cost").textContent = formatUsd(
      snapshot.overview.totalEstimatedCost
    );

    const rateLimits = snapshot.live.rateLimits;
    const primary = rateLimits?.primary || null;
    const secondary = rateLimits?.secondary || null;

    document.getElementById("plan-type").textContent = rateLimits?.planType || "未知计划";
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
    document.getElementById("primary-reset").textContent = primary
      ? `重置于 ${formatResetTime(primary.resetsAt)} · ${primary.windowMinutes} 分钟窗口`
      : "主限制窗口不可用";
    document.getElementById("secondary-reset").textContent = secondary
      ? `重置于 ${formatResetTime(secondary.resetsAt)} · ${secondary.windowMinutes} 分钟窗口`
      : "次限制窗口不可用";
    document.getElementById("credits-status").textContent =
      rateLimits?.credits === null || rateLimits?.credits === undefined
        ? "本地日志未暴露 credits 字段"
        : `Credits: ${rateLimits.credits}`;
    document.getElementById("rate-limit-source").textContent = snapshot.live.latestRateLimitAt
      ? `限制快照时间 ${new Date(snapshot.live.latestRateLimitAt).toLocaleString("zh-CN")}`
      : "暂无限制快照";

    renderDailyUsage(snapshot);
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

  async function startDashboard() {
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
      formatTokenMillions,
      formatPercent,
      formatResetTime,
      formatUsd,
    };
  }

  if (typeof document !== "undefined") {
    globalScope.addEventListener("DOMContentLoaded", startDashboard);
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
