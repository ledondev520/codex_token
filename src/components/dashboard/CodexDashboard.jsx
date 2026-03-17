import { useState, useMemo, useDeferredValue } from "react";
import { Badge } from "../ui/badge.jsx";
import { Button } from "../ui/button.jsx";
import { Input } from "../ui/input.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs.jsx";
import { ScrollArea } from "../ui/scroll-area.jsx";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card.jsx";
import { Label } from "../ui/label.jsx";

import { SectionCard } from "./section-card.jsx";
import { MetricTile } from "./metric-tile.jsx";
import { LedgerOverviewCard } from "./LedgerOverviewCard.jsx";
import { QuotaSnapshotDetails } from "./QuotaSnapshotDetails.jsx";
import { CostBreakdownTable } from "./CostBreakdownTable.jsx";
import { LedgerBillingTable } from "./LedgerBillingTable.jsx";
import { PricingCatalogTable } from "./PricingCatalogTable.jsx";
import { SessionDetailDialog } from "./SessionDetailDialog.jsx";
import { BillingChart } from "./BillingChart.jsx";
import { AlertStatusCard, AlertSettingsCard } from "./AlertSettings.jsx";
import { DecisionTopCostCard, DecisionEfficiencyCard, DecisionFailuresCard } from "./DecisionComponents.jsx";

import {
  calculateResetProgress,
  detectCostSpikes,
  describeRateLimitWindow,
  describeRuntimeStatus,
  formatPercent,
  formatTokenMillions,
  formatTokenRaw,
  formatModelLabel,
  formatUsd,
  formatPlanName,
  formatRelativeTime,
  formatResetTime,
  getFilteredSessionRows,
  getRuntimeSessionRows,
  getSessionPageCount,
  getSessionPageRows,
  getWindowSummary,
} from "../../lib/dashboard-logic.mjs";

import { EMPTY_SNAPSHOT } from "../../hooks/useDashboardSnapshot.js";

import { connectionBadgeVariant, getLedgerOriginLabel, resolveFreshnessState, statusBadgeVariant, alertPhaseBadgeVariant, alertPhaseLabel, formatAlertTimestamp } from "../../lib/status-helpers.js";

function getLedgerRows(rows, origin) {
  return (rows || []).filter((row) => String(row?.usageOrigin || "codex-local") === origin);
}

function buildCodexStateCopy({
  connectionLabel,
  refreshStatus,
  primaryWindowSummary,
  secondaryWindowSummary,
  alertState,
  runtimeSessions,
}) {
  if (refreshStatus === "loading") {
    return "同步中";
  }

  if (connectionLabel.includes("失败")) {
    return "同步异常";
  }

  if (primaryWindowSummary?.stale || secondaryWindowSummary?.stale) {
    return "有限额异常";
  }

  if (alertState?.isAbnormal) {
    return "有告警";
  }

  if ((runtimeSessions || []).length) {
    return "运行中";
  }

  return "正常";
}

export function CodexDashboard({
  snapshot,
  connectionLabel,
  codexHomeInput,
  onCodexHomeInputChange,
  onApplySource,
  onResetSource,
  onRefreshSnapshot,
  refreshStatus,
  refreshMessage,
  onOpenPricing,
  alertConfig,
  alertMetrics,
  alertStates,
  onAlertRuleChange,
}) {
  const [workbenchLedger, setWorkbenchLedger] = useState("codex-local");
  const [workbenchTab, setWorkbenchTab] = useState("sessions");
  const [chartFilter, setChartFilter] = useState("all"); // "all" | "30" | "14" | "month" | "monthly"
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [sessionPage, setSessionPage] = useState(1);
  const [query, setQuery] = useState("");

  const allRows = snapshot.recentThreads || [];
  const codexRows = useMemo(() => getLedgerRows(allRows, "codex-local"), [allRows]);
  const lobsterRows = useMemo(() => getLedgerRows(allRows, "openclaw-oauth"), [allRows]);
  const ledgerRows = workbenchLedger === "openclaw-oauth" ? lobsterRows : codexRows;
  const deferredQuery = useDeferredValue(query);
  const filteredThreads = useMemo(
    () =>
      getFilteredSessionRows(ledgerRows, {
        title: deferredQuery,
        model: deferredQuery,
      }),
    [ledgerRows, deferredQuery]
  );
  const totalPages = getSessionPageCount(filteredThreads, 10);
  const safePage = Math.min(totalPages, Math.max(1, sessionPage));
  const pageRows = getSessionPageRows(filteredThreads, safePage, 10);
  const selectedThread = useMemo(
    () => (snapshot.recentThreads || []).find((row) => row.id === selectedThreadId) || null,
    [snapshot.recentThreads, selectedThreadId]
  );

  const anomalyRows = useMemo(
    () => detectCostSpikes(snapshot.recentThreads || []),
    [snapshot.recentThreads]
  );
  const decision = snapshot.decision || EMPTY_SNAPSHOT.decision;
  const currentSession = snapshot.live.currentSession;
  const rateLimits = snapshot.live.rateLimits;
  const primary = rateLimits?.primary || null;
  const secondary = rateLimits?.secondary || null;
  const codexRuntimeSessions = useMemo(() => getRuntimeSessionRows(codexRows, 4), [codexRows]);
  const lobsterRuntimeSessions = useMemo(() => getRuntimeSessionRows(lobsterRows, 4), [lobsterRows]);
  
  const primaryWindowSummary = useMemo(
    () =>
      describeRateLimitWindow({
        generatedAt: snapshot.generatedAt,
        latestRateLimitAt: snapshot.live.latestRateLimitAt,
        windowData: primary || { label: "5小时窗口" },
      }),
    [snapshot.generatedAt, snapshot.live.latestRateLimitAt, primary]
  );
  const secondaryWindowSummary = useMemo(
    () =>
      describeRateLimitWindow({
        generatedAt: snapshot.generatedAt,
        latestRateLimitAt: snapshot.live.latestRateLimitAt,
        windowData: secondary || { label: "7天窗口" },
      }),
    [snapshot.generatedAt, snapshot.live.latestRateLimitAt, secondary]
  );
  
  const resolvedAlertStates = {
    dailySpend: alertStates?.dailySpend || { phase: "inactive" },
    failureRate: alertStates?.failureRate || { phase: "inactive" },
  };
  
  const freshness = resolveFreshnessState(snapshot.generatedAt);
  const anomalyStatus = useMemo(() => {
    const triggeredAlerts = [];
    if (resolvedAlertStates.dailySpend.phase === "triggered") {
      triggeredAlerts.push("日花费告警");
    }
    if (resolvedAlertStates.failureRate.phase === "triggered") {
      triggeredAlerts.push("失败率告警");
    }

    if (connectionLabel.includes("失败")) {
      return { isAbnormal: true, value: "红点", badgeLabel: "异常", badgeVariant: "danger", reason: "快照读取失败", detail: "首屏已直接提示故障，优先检查本地 dashboard 服务。" };
    }

    if (connectionLabel.includes("重连")) {
      return { isAbnormal: true, value: "红点", badgeLabel: "异常", badgeVariant: "danger", reason: "实时流重连中", detail: "连接恢复前，部分数字可能停留在上一份快照。" };
    }

    if (triggeredAlerts.length) {
      return { isAbnormal: true, value: "红点", badgeLabel: "异常", badgeVariant: "danger", reason: `${triggeredAlerts.join("、")}触发`, detail: "这是现有本地阈值告警的首屏摘要，完整设置与历史仍保留在下方。" };
    }

    const staleQuotaWindow = [primaryWindowSummary, secondaryWindowSummary].find((item) => item.stale);
    if (staleQuotaWindow) {
      return { isAbnormal: true, value: "红点", badgeLabel: "异常", badgeVariant: "danger", reason: `${staleQuotaWindow.title}快照已过期`, detail: "本地限额快照已经过了重置点，等待新的 rate_limits 事件刷新。" };
    }

    if (anomalyRows.length) {
      return { isAbnormal: true, value: `${anomalyRows.length} 个`, badgeLabel: "异常", badgeVariant: "danger", reason: `检测到 ${anomalyRows.length} 个成本异常峰值`, detail: "当前异常检测仅使用现有会话费用峰值逻辑，没有新增后端依赖。" };
    }

    return { isAbnormal: false, value: "无异常", badgeLabel: "正常", badgeVariant: "success", reason: "当前未发现连接、限额或本地阈值异常。", detail: "次级明细已收进运营摘要折叠区，需要时再展开。" };
  }, [anomalyRows.length, connectionLabel, primaryWindowSummary, resolvedAlertStates.dailySpend.phase, resolvedAlertStates.failureRate.phase, secondaryWindowSummary]);

  const codexWindowSummary = useMemo(
    () => getWindowSummary(snapshot.dailyLedger || [], snapshot.generatedAt),
    [snapshot.dailyLedger, snapshot.generatedAt]
  );
  const lobsterWindowSummary = useMemo(
    () => getWindowSummary(snapshot.openclaw?.daily || [], snapshot.generatedAt),
    [snapshot.openclaw?.daily, snapshot.generatedAt]
  );
  
  const availableThreadIds = new Set((snapshot.recentThreads || []).map((row) => row.id));
  const handleOpenThread = (threadId) => setSelectedThreadId(threadId);

  const quotaDetailItems = [
    {
      key: "primary",
      summary: primaryWindowSummary,
      windowMinutes: Number(primary?.windowMinutes || 0),
      progress: calculateResetProgress({
        generatedAt: snapshot.generatedAt,
        resetsAt: primary?.resetsAt,
        windowMinutes: primary?.windowMinutes,
      }),
    },
    {
      key: "secondary",
      summary: secondaryWindowSummary,
      windowMinutes: Number(secondary?.windowMinutes || 0),
      progress: calculateResetProgress({
        generatedAt: snapshot.generatedAt,
        resetsAt: secondary?.resetsAt,
        windowMinutes: secondary?.windowMinutes,
      }),
    },
  ].map((item) => ({
    ...item,
    progressLabel: item.summary.stale
      ? "快照已过期"
      : item.progress.elapsedPercent !== null
        ? `${item.progress.elapsedPercent}%`
        : "等待快照",
  }));

  const dailySpendThresholdLabel = alertConfig.dailySpend.enabled
    ? `阈值 ${formatUsd(alertConfig.dailySpend.thresholdUsd)}`
    : "提醒已关闭";
  const failureRateThresholdLabel = alertConfig.failureRate.enabled
    ? `阈值 ${formatPercent(alertConfig.failureRate.thresholdPercent)}`
    : "提醒已关闭";

  const codexStateLabel = buildCodexStateCopy({
    connectionLabel,
    refreshStatus,
    primaryWindowSummary,
    secondaryWindowSummary,
    alertState: anomalyStatus,
    runtimeSessions: codexRuntimeSessions,
  });
  
  const lobsterStateLabel = !snapshot.openclaw
    ? "未接入"
    : lobsterRuntimeSessions.length
      ? "运行中"
      : "正常";

  const codexMetrics = [
    { label: "今日费用", value: formatUsd(codexWindowSummary.today.totalUsd), subvalue: `今日 Token ${formatTokenMillions(codexWindowSummary.today.totalTokens)}`, tone: "muted" },
    { label: "今日 Token", value: formatTokenMillions(codexWindowSummary.today.totalTokens), subvalue: `费用 ${formatUsd(codexWindowSummary.today.totalUsd)}` },
    { label: "近 7 天费用", value: formatUsd(codexWindowSummary.last7Days.totalUsd), subvalue: `${codexWindowSummary.last7Days.startDay} 至 ${codexWindowSummary.last7Days.endDay}`, tone: "muted" },
    { label: "近 7 天 Token", value: formatTokenMillions(codexWindowSummary.last7Days.totalTokens), subvalue: `${codexWindowSummary.last7Days.startDay} 至 ${codexWindowSummary.last7Days.endDay}` },
    { label: "限额摘要", value: `${formatPercent(primaryWindowSummary.usedPercent)} / ${formatPercent(secondaryWindowSummary.usedPercent)}`, subvalue: `5h ${primaryWindowSummary.statusLabel} · 7天 ${secondaryWindowSummary.statusLabel}`, tone: primaryWindowSummary.stale || secondaryWindowSummary.stale ? "dark" : "default" },
  ];

  const lobsterMetrics = [
    { label: "今日费用", value: formatUsd(lobsterWindowSummary.today.totalUsd), subvalue: `今日 Token ${formatTokenMillions(lobsterWindowSummary.today.totalTokens)}`, tone: "muted" },
    { label: "今日 Token", value: formatTokenMillions(lobsterWindowSummary.today.totalTokens), subvalue: `费用 ${formatUsd(lobsterWindowSummary.today.totalUsd)}` },
    { label: "近 7 天费用", value: formatUsd(lobsterWindowSummary.last7Days.totalUsd), subvalue: `${lobsterWindowSummary.last7Days.startDay} 至 ${lobsterWindowSummary.last7Days.endDay}`, tone: "muted" },
    { label: "近 7 天 Token", value: formatTokenMillions(lobsterWindowSummary.last7Days.totalTokens), subvalue: `${lobsterWindowSummary.last7Days.startDay} 至 ${lobsterWindowSummary.last7Days.endDay}` },
    { label: "当前活跃", value: snapshot.openclaw ? formatTokenRaw(lobsterRuntimeSessions.length) : "-", subvalue: snapshot.openclaw?.updatedAt ? `最近同步 ${new Date(snapshot.openclaw.updatedAt).toLocaleString("zh-CN")}` : "未读取到小龙虾主脑数据", tone: "teal" },
  ];

  const billingRows = useMemo(() => {
    const raw = workbenchLedger === "openclaw-oauth" ? snapshot.openclaw?.daily : snapshot.dailyLedger;
    // Fallback if the main ledger is empty but we have basic usage stats
    if ((!raw || raw.length === 0) && workbenchLedger === "codex-local") {
      return snapshot.dailyUsage || [];
    }
    return raw || [];
  }, [snapshot.dailyLedger, snapshot.dailyUsage, snapshot.openclaw?.daily, workbenchLedger]);

  const workbenchSummary = getWindowSummary(billingRows, snapshot.generatedAt);

  const allTimeSummary = useMemo(() => {
    const rows = billingRows || [];
    const totalUsd = rows.reduce((sum, row) => sum + Number(row.totalUsd || 0), 0);
    const totalTokens = rows.reduce((sum, row) => sum + Number(row.totalTokens || 0), 0);
    const sorted = [...rows].sort((a, b) => a.day.localeCompare(b.day));
    return {
      totalUsd,
      totalTokens,
      startDay: sorted[0]?.day || "-",
      endDay: sorted[sorted.length - 1]?.day || "-",
    };
  }, [billingRows]);

  const filteredBillingRows = useMemo(() => {
    const all = [...(billingRows || [])].sort((a, b) => a.day.localeCompare(b.day));
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    if (chartFilter === "all" || chartFilter === "monthly") return all;
    if (chartFilter === "30") {
      const cutoff = new Date(today); cutoff.setDate(today.getDate() - 29);
      return all.filter((r) => r.day >= cutoff.toISOString().slice(0, 10) && r.day <= todayStr);
    }
    if (chartFilter === "14") {
      const cutoff = new Date(today); cutoff.setDate(today.getDate() - 13);
      return all.filter((r) => r.day >= cutoff.toISOString().slice(0, 10) && r.day <= todayStr);
    }
    if (chartFilter === "month") {
      const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
      return all.filter((r) => r.day >= firstOfMonth && r.day <= todayStr);
    }
    return all;
  }, [billingRows, chartFilter]);

  const filteredSummary = useMemo(() => {
    if (!filteredBillingRows.length) return null;
    
    const totalUsd = filteredBillingRows.reduce((sum, row) => sum + Number(row.totalUsd || 0), 0);
    const totalTokens = filteredBillingRows.reduce((sum, row) => sum + Number(row.totalTokens || 0), 0);
    return {
      totalUsd,
      totalTokens,
      startDay: filteredBillingRows[0]?.day,
      endDay: filteredBillingRows[filteredBillingRows.length - 1]?.day,
    };
  }, [filteredBillingRows]);

  return (
    <>
      <div className="grid min-w-0 gap-5 lg:gap-8 xl:gap-10">
        <SectionCard title="双账本总览" description="把你直接使用 Codex 和小龙虾主脑的开销拆开看。">
          <div className="grid gap-4 xl:gap-6 xl:grid-cols-2">
            <LedgerOverviewCard
              title="Codex 编程"
              subtitle="直接来自本地 Codex 会话与限额快照。"
              stateLabel={codexStateLabel}
              metrics={codexMetrics}
              sessions={codexRuntimeSessions}
              generatedAt={snapshot.generatedAt}
              onOpenThread={handleOpenThread}
              emptySessionCopy="当前没有正在运行的 Codex 会话。"
            />
            <LedgerOverviewCard
              title="小龙虾主脑"
              subtitle="来自 CodeX OS / 小龙虾主脑的 Codex 开销。"
              stateLabel={lobsterStateLabel}
              metrics={lobsterMetrics}
              sessions={lobsterRuntimeSessions}
              generatedAt={snapshot.generatedAt}
              onOpenThread={handleOpenThread}
              emptySessionCopy="当前没有正在运行的小龙虾主脑会话。"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="全部会话"
          description="默认只看当前账本，不再把两类来源混在一起。"
          actions={
            <Tabs value={workbenchLedger} onValueChange={setWorkbenchLedger} className="w-full sm:w-auto mt-3 sm:mt-0">
              <TabsList className="h-auto w-full flex-wrap sm:flex-nowrap p-1 bg-muted/50">
                <TabsTrigger value="codex-local" className="flex-1 text-sm py-1.5 px-3">Codex 编程</TabsTrigger>
                <TabsTrigger value="openclaw-oauth" className="flex-1 text-sm py-1.5 px-3">小龙虾主脑</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        >
          <Tabs value={workbenchTab} onValueChange={setWorkbenchTab}>
            <TabsList className="w-full sm:w-auto grid grid-cols-2 max-w-[400px]">
              <TabsTrigger value="sessions" className="text-sm">全部会话</TabsTrigger>
              <TabsTrigger value="billing" className="text-sm">全部账单</TabsTrigger>
            </TabsList>

            <TabsContent value="sessions">
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 flex-col sm:flex-row md:grid-cols-[minmax(0,1fr)_auto_auto] items-center">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="按标题或模型搜索当前账本会话"
                    className="w-full h-10 shadow-sm"
                  />
                  <div className="rounded-lg border bg-muted/20 px-4 py-2 text-sm text-foreground font-medium shadow-sm w-full sm:w-auto text-center sm:text-left">
                    {getLedgerOriginLabel(workbenchLedger)} <span className="text-muted-foreground mx-1">·</span> <span className="mono">{formatTokenRaw(filteredThreads.length)}</span> 条
                  </div>
                  <Button type="button" variant="outline" className="w-full sm:w-auto h-10" onClick={() => setQuery("")}>
                    清除搜索
                  </Button>
                </div>

                <ScrollArea className="overflow-hidden rounded-xl border w-full">
                  <Table className="min-w-[680px] sm:min-w-full table-fixed">
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[30%] sm:w-[35%] text-xs font-semibold py-3">标题</TableHead>
                        <TableHead className="w-[12%] text-xs font-semibold py-3 hidden sm:table-cell">状态</TableHead>
                        <TableHead className="w-[18%] sm:w-[15%] text-xs font-semibold py-3">模型</TableHead>
                        <TableHead className="w-[15%] sm:w-[12%] text-right text-xs font-semibold py-3">Token</TableHead>
                        <TableHead className="w-[15%] sm:w-[12%] text-right text-xs font-semibold py-3">费用</TableHead>
                        <TableHead className="w-[14%] text-xs font-semibold py-3 hidden md:table-cell">更新时间</TableHead>
                        <TableHead className="w-[10%] sm:w-[8%] text-right text-xs font-semibold py-3">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageRows.length ? (
                        pageRows.map((thread) => (
                          <TableRow key={thread.id} className="group transition-colors data-[state=selected]:bg-muted hover:bg-muted/30">
                            <TableCell className="py-2.5 sm:py-3 pr-2">
                              <div className="line-clamp-2 text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors">{thread.titlePreview || thread.title || "(untitled)"}</div>
                              <div className="mt-1 truncate text-[11px] font-mono text-muted-foreground bg-muted/40 inline-block px-1.5 py-0.5 border rounded-sm">{thread.workspaceLabel || thread.cwd || "-"}</div>
                              <div className="mt-1 sm:hidden">
                                 <Badge variant={statusBadgeVariant(thread.statusLabel)} className="scale-90 origin-left">{thread.statusLabel || "未知"}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5 sm:py-3 hidden sm:table-cell">
                              <Badge variant={statusBadgeVariant(thread.statusLabel)}>{thread.statusLabel || "未知"}</Badge>
                            </TableCell>
                            <TableCell className="py-2.5 sm:py-3 text-[13px] text-muted-foreground">{formatModelLabel(thread.modelName)}</TableCell>
                            <TableCell className="text-right mono py-2.5 sm:py-3 text-[13px] font-medium text-foreground">{formatTokenMillions(thread.tokensUsed)}</TableCell>
                            <TableCell className="text-right mono py-2.5 sm:py-3 text-[13px] font-bold text-foreground group-hover:text-primary transition-colors">{thread.cost ? formatUsd(thread.cost.totalUsd) : "-"}</TableCell>
                            <TableCell className="py-2.5 sm:py-3 text-[12px] text-muted-foreground hidden md:table-cell"><span className="mono">{formatResetTime(thread.updatedAt)}</span></TableCell>
                            <TableCell className="text-right py-2.5 sm:py-3">
                              <Button variant="outline" size="sm" className="h-7 px-2.5 text-[12px]" onClick={() => handleOpenThread(thread.id)}>详情</Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-[13px] text-muted-foreground py-10 bg-muted/10 border-dashed border-b-0">
                            当前账本没有符合条件的会话。
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>

                <div className="flex flex-col gap-2.5 text-sm text-foreground sm:flex-row sm:items-center sm:justify-end sm:gap-4 py-2 border-t">
                  <div className="flex items-center gap-2 justify-center sm:justify-end">
                    <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setSessionPage((page) => Math.max(1, page - 1))} className="h-8 shadow-sm">
                      上一页
                    </Button>
                    <span className="min-w-[4rem] text-center font-mono font-medium">第 {safePage} / {totalPages} 页</span>
                    <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setSessionPage((page) => page + 1)} className="h-8 shadow-sm">
                      下一页
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="billing">
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[12px] text-muted-foreground font-medium mr-1">快捷日期：</span>
                  {[
                    { key: "all", label: "全量" },
                    { key: "30", label: "近 30 天" },
                    { key: "14", label: "近 14 天" },
                    { key: "month", label: "本月" },
                    { key: "monthly", label: "以自然月" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setChartFilter(key)}
                      className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-all ${
                        chartFilter === key
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                  <MetricTile
                    label={chartFilter === "all" ? "全部费用" : chartFilter === "monthly" ? "月度累计费用" : "选中范围费用"}
                    value={formatUsd(filteredSummary?.totalUsd ?? allTimeSummary.totalUsd)}
                    subvalue={filteredSummary ? `${filteredSummary.startDay} 至 ${filteredSummary.endDay}` : `${allTimeSummary.startDay} 至 ${allTimeSummary.endDay}`}
                    compact
                    tone="muted"
                  />
                  <MetricTile
                    label={chartFilter === "all" ? "全部 Token" : chartFilter === "monthly" ? "月度累计 Token" : "选中范围 Token"}
                    value={formatTokenMillions(filteredSummary?.totalTokens ?? allTimeSummary.totalTokens)}
                    subvalue={filteredSummary ? `${filteredSummary.startDay} 至 ${filteredSummary.endDay}` : `${allTimeSummary.startDay} 至 ${allTimeSummary.endDay}`}
                    compact
                  />
                </div>
                <BillingChart rows={filteredBillingRows} viewMode={chartFilter === "monthly" ? "monthly" : "daily"} />
                <LedgerBillingTable rows={filteredBillingRows} emptyCopy="当前账本暂无账单数据。" />
              </div>
            </TabsContent>

          </Tabs>
        </SectionCard>

        <SectionCard title="高级明细" description="默认折叠，只在你需要排查或核对口径时展开。">
          <Accordion type="multiple" className="rounded-xl border bg-card shadow-sm">
            <AccordionItem value="sources" className="border-b last:border-b-0">
              <AccordionTrigger className="py-4 px-4 sm:px-6 text-sm sm:text-[15px] font-semibold hover:no-underline hover:text-primary transition-colors hover:bg-muted/20">
                数据源说明
              </AccordionTrigger>
              <AccordionContent className="pb-4 sm:pb-6 px-4 sm:px-6 bg-muted/5">
                <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] pt-2">
                  <div className="grid min-w-0 gap-4 sm:gap-5 md:grid-cols-2">
                    <Card className="rounded-xl bg-card border-dashed shadow-sm border-muted-foreground/30 hover:border-muted-foreground/50 transition-colors">
                      <CardContent className="space-y-3 p-5">
                        <Label className="uppercase tracking-[0.15em] text-[11px] text-muted-foreground font-semibold">Codex 编程</Label>
                        <div className="text-xl font-bold tracking-tight text-foreground">Codex 本地</div>
                        <p className="text-[13px] leading-relaxed text-muted-foreground">来自 <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] border shadow-sm">~/.codex</code> 的 SQLite 与 session JSONL。</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl bg-card border-dashed shadow-sm border-muted-foreground/30 hover:border-muted-foreground/50 transition-colors">
                      <CardContent className="space-y-3 p-5">
                        <Label className="uppercase tracking-[0.15em] text-[11px] text-muted-foreground font-semibold">小龙虾主脑</Label>
                        <div className="text-xl font-bold tracking-tight text-foreground">CodeX OS / 小龙虾主脑</div>
                        <p className="text-[13px] leading-relaxed text-muted-foreground">来自小龙虾主脑链路的本地聚合结果。</p>
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="rounded-xl shadow-none border-foreground/10 bg-gradient-to-br from-card to-muted/20">
                    <CardContent className="space-y-5 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={connectionBadgeVariant(connectionLabel)} className="shadow-sm">{connectionLabel}</Badge>
                        <Badge variant="secondary" className="shadow-sm">订阅计划 {formatPlanName(rateLimits?.planType)}</Badge>
                        <Badge variant={freshness.variant} className="shadow-sm">最近同步 {formatRelativeTime(snapshot.generatedAt)}</Badge>
                      </div>
                      <div className="space-y-1.5 bg-background p-3 rounded-lg border shadow-sm">
                        <Label className="text-[13px] font-semibold flex justify-between items-center text-foreground">
                           当前验证目录
                           <span className="text-[11px] text-muted-foreground font-normal bg-muted px-1.5 py-0.5 rounded">
                             最近 {new Date(snapshot.generatedAt).toLocaleString("zh-CN", {hour: '2-digit', minute:'2-digit'})}
                           </span>
                        </Label>
                        <div className="break-all font-mono text-[12px] text-primary/80 leading-snug select-all">{snapshot.sources.codexHome || "未知目录"}</div>
                      </div>
                      <form
                        className="grid gap-3 pt-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          onApplySource();
                        }}
                      >
                        <Label htmlFor="codex-home-input" className="text-sm">覆盖本地数据目录路径</Label>
                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <Input id="codex-home-input" className="flex-1 font-mono text-[13px] shadow-sm bg-background border-muted-foreground/40" value={codexHomeInput} onChange={(event) => onCodexHomeInputChange(event.target.value)} placeholder="输入 .codex 绝对路径" />
                          <div className="flex gap-2">
                            <Button type="submit" className="flex-1 sm:flex-none sm:w-[5.5rem] shadow-sm">应用</Button>
                            <Button type="button" variant="outline" className="flex-1 sm:flex-none sm:w-[5.5rem] shadow-sm" onClick={onResetSource}>重置</Button>
                          </div>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="alerts" className="border-b last:border-b-0">
              <AccordionTrigger className="py-4 px-4 sm:px-6 text-sm sm:text-[15px] font-semibold hover:no-underline hover:text-primary transition-colors hover:bg-muted/20">
                本地阈值告警设置
              </AccordionTrigger>
              <AccordionContent className="pb-4 sm:pb-6 px-4 sm:px-6 bg-muted/5">
                <div className="grid gap-4 sm:gap-6 xl:gap-8 xl:grid-cols-2 pt-2">
                  <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                    <AlertStatusCard
                      title="日花费告警"
                      tooltip="按 `snapshot.generatedAt` 所在本地自然日，读取 `dailyLedger` 当天费用估算值。超过阈值即触发，回落后显示已恢复。"
                      state={resolvedAlertStates.dailySpend}
                      value={formatUsd(alertMetrics.dailySpendUsd)}
                      thresholdLabel={dailySpendThresholdLabel}
                      detail={`今日账单估算基于 ${alertMetrics.todayKey || "-"} 的本地日账单汇总。`}
                      changeLabel={`${alertPhaseLabel(resolvedAlertStates.dailySpend.phase)}时间 ${formatAlertTimestamp(resolvedAlertStates.dailySpend.changedAt)}`}
                    />
                    <AlertStatusCard
                      title="失败率告警"
                      tooltip="失败率 = 当天已中断会话 / 当天已完结 + 已中断会话；进行中或等待回答的会话不会计入分母，避免误报。"
                      state={resolvedAlertStates.failureRate}
                      value={alertMetrics.terminalCount ? formatPercent(alertMetrics.failureRatePercent) : "-"}
                      thresholdLabel={`${failureRateThresholdLabel} · 失败 ${alertMetrics.failureCount} / 终态 ${alertMetrics.terminalCount}`}
                      detail={
                        alertMetrics.terminalCount
                          ? `今日共有 ${alertMetrics.completedCount} 个已完结、${alertMetrics.failureCount} 个已中断会话。`
                          : "今日暂无可计算失败率的终态会话。"
                      }
                      changeLabel={`${alertPhaseLabel(resolvedAlertStates.failureRate.phase)}时间 ${formatAlertTimestamp(resolvedAlertStates.failureRate.changedAt)}`}
                    />
                  </div>
                  <AlertSettingsCard alertConfig={alertConfig} onRuleChange={onAlertRuleChange} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="quota" className="border-b last:border-b-0">
              <AccordionTrigger className="py-4 px-4 sm:px-6 text-sm sm:text-[15px] font-semibold hover:no-underline hover:text-primary transition-colors hover:bg-muted/20">
                限额重置进度与详情
              </AccordionTrigger>
              <AccordionContent className="pb-4 sm:pb-6 px-4 sm:px-6 bg-muted/5">
                <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] pt-2">
                  <QuotaSnapshotDetails items={quotaDetailItems} latestRateLimitAt={snapshot.live.latestRateLimitAt} />
                  <Card className="rounded-xl shadow-none bg-card">
                    <CardHeader className="pb-4 border-b">
                      <CardTitle className="text-lg">当前最新会话费用预估</CardTitle>
                      <CardDescription className="text-[13px] mt-0.5">基于当前正在进行或最新完成的会话的输入输出 Token。</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 p-4 sm:p-5">
                      <CostBreakdownTable currentSession={currentSession} />
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="billing" className="border-b last:border-b-0">
              <AccordionTrigger className="py-4 px-4 sm:px-6 text-sm sm:text-[15px] font-semibold hover:no-underline hover:text-primary transition-colors hover:bg-muted/20">
                最近 14 天完整账单表格
              </AccordionTrigger>
              <AccordionContent className="pb-4 sm:pb-6 px-4 sm:px-6 bg-muted/5">
                <div className="grid gap-4 sm:gap-6 xl:gap-8 xl:grid-cols-2 pt-2">
                  <Card className="rounded-xl shadow-none border-border/50">
                    <CardHeader className="pb-4 sm:pb-5 bg-card rounded-t-xl border-b">
                      <CardTitle className="text-[16px] tracking-tight">Codex 编程</CardTitle>
                      <CardDescription className="text-xs">按日汇总 · 最近 14 天</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 sm:pt-5 bg-card/40">
                      <LedgerBillingTable rows={(snapshot.dailyLedger || []).slice(0, 14)} emptyCopy="暂无本地 Codex 账单数据。" />
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl shadow-none border-border/50">
                    <CardHeader className="pb-4 sm:pb-5 bg-card rounded-t-xl border-b">
                      <CardTitle className="text-[16px] tracking-tight">小龙虾主脑</CardTitle>
                      <CardDescription className="text-xs">按日汇总 · 最近 14 天</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 sm:pt-5 bg-card/40">
                      <LedgerBillingTable rows={(snapshot.openclaw?.daily || []).slice(0, 14)} emptyCopy="暂无小龙虾主脑账单数据。" />
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pricing" className="border-b last:border-b-0">
              <AccordionTrigger className="py-4 px-4 sm:px-6 text-sm sm:text-[15px] font-semibold hover:no-underline hover:text-primary transition-colors hover:bg-muted/20">
                API 模型缓存折算参考价格
              </AccordionTrigger>
              <AccordionContent className="pb-4 sm:pb-6 px-4 sm:px-6 bg-muted/5">
                <div className="grid gap-4 sm:gap-6 xl:gap-8 xl:grid-cols-[minmax(0,1.15fr)_auto] pt-2">
                  <PricingCatalogTable rows={snapshot.pricingCatalog || []} />
                  <div className="flex items-start justify-end sm:justify-start">
                    <Button type="button" variant="default" className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all" onClick={onOpenPricing}>
                       前往独立大屏价格面板
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="rankings" className="last:border-b-0">
              <AccordionTrigger className="py-4 px-4 sm:px-6 text-sm sm:text-[15px] font-semibold hover:no-underline hover:text-primary transition-colors hover:bg-muted/20">
                排行榜与运营决策分析
              </AccordionTrigger>
              <AccordionContent className="pb-4 sm:pb-6 px-4 sm:px-6 bg-muted/5">
                <div className="grid gap-4 sm:gap-6 xl:gap-8 xl:grid-cols-2 pt-2">
                  <DecisionTopCostCard
                    title="项目仓库花费排行"
                    note={decision.projectCost?.note}
                    todayRows={decision.projectCost?.today || []}
                    last7DaysRows={decision.projectCost?.last7Days || []}
                    labelFormatter={(value) => value || "未知项目"}
                  />
                  <DecisionTopCostCard
                    title="API 模型花费排行"
                    note={decision.modelCost?.note}
                    todayRows={decision.modelCost?.today || []}
                    last7DaysRows={decision.modelCost?.last7Days || []}
                    labelFormatter={(value) => formatModelLabel(value)}
                  />
                </div>
                <div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 xl:gap-8 xl:grid-cols-2">
                  <DecisionEfficiencyCard efficiency={decision.efficiency} />
                  <DecisionFailuresCard
                    failures={decision.failures}
                    generatedAt={snapshot.generatedAt}
                    availableThreadIds={availableThreadIds}
                    onOpenThread={handleOpenThread}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </SectionCard>
      </div>

      <SessionDetailDialog row={selectedThread} open={Boolean(selectedThread)} onOpenChange={(open) => !open && setSelectedThreadId(null)} />
    </>
  );
}
