import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table.jsx";
import { ScrollArea } from "../ui/scroll-area.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card.jsx";
import { Label } from "../ui/label.jsx";
import { Button } from "../ui/button.jsx";
import { EmptyState } from "./empty-state.jsx";
import { formatUsd, formatTokenMillions, formatTokenRaw, formatModelLabel } from "../../lib/dashboard-logic.mjs";
import { formatUsdPerThousandTokens, formatDecisionPercent, formatCompactDateTime } from "../../lib/formatters.js";

export function DecisionRankingTable({
  rows,
  labelFormatter = (value) => value,
  emptyCopy = "当前窗口暂无可用数据。",
}) {
  if (!rows?.length) {
    return (
      <div className="bg-muted/20 border border-dashed rounded-xl p-6 text-center text-sm">
         <EmptyState>{emptyCopy}</EmptyState>
      </div>
    );
  }

  return (
    <ScrollArea className="overflow-hidden rounded-xl border w-full">
      <Table className="min-w-[420px] sm:min-w-full table-fixed">
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[12%] text-xs font-semibold">Top</TableHead>
            <TableHead className="w-[34%] text-xs font-semibold">对象</TableHead>
            <TableHead className="w-[18%] text-right text-xs font-semibold">费用</TableHead>
            <TableHead className="w-[20%] text-right text-xs font-semibold">Token</TableHead>
            <TableHead className="w-[16%] text-right text-xs font-semibold">会话</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${row.key || row.label || "row"}-${index}`} className="group transition-colors data-[state=selected]:bg-muted hover:bg-muted/50">
              <TableCell className="mono text-[13px] text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="break-words text-[13px] font-medium py-3 text-foreground">{labelFormatter(row.label)}</TableCell>
              <TableCell className="text-right mono text-[13px] py-3 text-foreground group-hover:text-primary transition-colors">{formatUsd(row.totalUsd)}</TableCell>
              <TableCell className="text-right mono text-[13px] text-muted-foreground py-3 group-hover:text-foreground transition-colors">{formatTokenMillions(row.totalTokens)}</TableCell>
              <TableCell className="text-right mono text-[13px] text-muted-foreground py-3 group-hover:text-foreground transition-colors">{formatTokenRaw(row.threadCount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

export function DecisionTopCostCard({
  title,
  note,
  todayRows,
  last7DaysRows,
  labelFormatter,
}) {
  return (
    <Card className="rounded-xl shadow-none border-dashed border-muted-foreground/30">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg tracking-tight">{title}</CardTitle>
        <CardDescription className="text-[13px] mt-1">{note || "当前仅展示可解析到 token_count 增量费用的记录。"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        <div className="space-y-3">
          <Label className="text-foreground tracking-wide font-semibold text-sm">今日</Label>
          <DecisionRankingTable
            rows={todayRows || []}
            labelFormatter={labelFormatter}
            emptyCopy="今日暂无可用成本数据。"
          />
        </div>
        <div className="space-y-3 pt-2">
          <Label className="text-foreground tracking-wide font-semibold text-sm">近 7 天</Label>
          <DecisionRankingTable
            rows={last7DaysRows || []}
            labelFormatter={labelFormatter}
            emptyCopy="近 7 天暂无可用成本数据。"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function DecisionEfficiencyCard({ efficiency }) {
  const metricRows = [
    {
      label: "千 Token 成本",
      today: formatUsdPerThousandTokens(efficiency?.today?.costPer1kTokens),
      last7: formatUsdPerThousandTokens(efficiency?.last7Days?.costPer1kTokens),
      note: efficiency?.costPer1kNote || "-",
    },
    {
      label: "缓存命中率",
      today: formatDecisionPercent(efficiency?.today?.cacheHitRate),
      last7: formatDecisionPercent(efficiency?.last7Days?.cacheHitRate),
      note: efficiency?.cacheHitRateNote || "-",
    },
    {
      label: "成功率",
      today: formatDecisionPercent(efficiency?.today?.successRate),
      last7: formatDecisionPercent(efficiency?.last7Days?.successRate),
      note: efficiency?.successRateNote || "-",
    },
  ];

  return (
    <Card className="rounded-xl shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg tracking-tight">单位效率指标</CardTitle>
        <CardDescription className="text-[13px] mt-1">对比今日与近 7 天的单位成本、缓存命中率和终态成功率。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <ScrollArea className="overflow-hidden rounded-xl border w-full">
          <Table className="min-w-[480px] sm:min-w-full table-fixed">
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[28%] sm:w-[22%] text-xs font-semibold">指标</TableHead>
                <TableHead className="w-[20%] text-right text-xs font-semibold">今日</TableHead>
                <TableHead className="w-[22%] text-right text-xs font-semibold">近 7 天</TableHead>
                <TableHead className="w-[30%] sm:w-[36%] text-xs font-semibold hidden sm:table-cell">口径</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metricRows.map((row) => (
                <TableRow key={row.label} className="group transition-colors data-[state=selected]:bg-muted hover:bg-muted/50">
                  <TableCell className="text-[13px] font-medium py-3 text-foreground">{row.label}</TableCell>
                  <TableCell className="text-right mono text-[13px] py-3 text-foreground group-hover:text-primary transition-colors font-semibold">{row.today}</TableCell>
                  <TableCell className="text-right mono text-[13px] py-3 text-foreground group-hover:text-primary transition-colors font-semibold">{row.last7}</TableCell>
                  <TableCell className="text-[11px] leading-snug text-muted-foreground py-3 hidden sm:table-cell">{row.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="rounded-xl border bg-muted/20 p-4 text-[13px] text-muted-foreground transition-colors hover:bg-muted/30 hover:border-muted-foreground/30">
            <div className="mb-1 font-medium text-foreground">今日样本池</div>
            <div className="flex items-center justify-between mb-0.5"><span>用量：</span><span className="mono">{formatTokenMillions(efficiency?.today?.totalTokens)} · {formatUsd(efficiency?.today?.totalUsd)}</span></div>
            <div className="flex items-center justify-between"><span>终态：</span><span className="mono">{formatTokenRaw(efficiency?.today?.terminalCount)}（成功 {formatTokenRaw(efficiency?.today?.successCount)}）</span></div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-4 text-[13px] text-muted-foreground transition-colors hover:bg-muted/30 hover:border-muted-foreground/30">
            <div className="mb-1 font-medium text-foreground">近 7 天样本池</div>
            <div className="flex items-center justify-between mb-0.5"><span>用量：</span><span className="mono">{formatTokenMillions(efficiency?.last7Days?.totalTokens)} · {formatUsd(efficiency?.last7Days?.totalUsd)}</span></div>
            <div className="flex items-center justify-between"><span>终态：</span><span className="mono">{formatTokenRaw(efficiency?.last7Days?.terminalCount)}（成功 {formatTokenRaw(efficiency?.last7Days?.successCount)}）</span></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DecisionFailuresCard({
  failures,
  generatedAt,
  availableThreadIds,
  onOpenThread,
}) {
  const latestFailureAt = failures?.latestFailedAt || null;
  const recentFailures = failures?.recent || [];

  return (
    <Card className="rounded-xl shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg tracking-tight">失败任务概览</CardTitle>
        <CardDescription className="text-[13px] mt-1">{failures?.note || "失败定义为线程最新终态为“已中断”。"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3">
          <div className="rounded-xl border bg-muted/20 p-4 flex flex-col items-center justify-center text-center hover:bg-red-500/5 transition-colors group">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground group-hover:text-red-500/70">今日失败</Label>
            <div className="mono mt-2 text-3xl font-bold tracking-tight text-foreground group-hover:text-red-600 dark:group-hover:text-red-400">{formatTokenRaw(failures?.todayCount)}</div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-4 flex flex-col items-center justify-center text-center hover:bg-red-500/5 transition-colors group">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground group-hover:text-red-500/70">近 7 天失败</Label>
            <div className="mono mt-2 text-3xl font-bold tracking-tight text-foreground group-hover:text-red-600 dark:group-hover:text-red-400">{formatTokenRaw(failures?.last7DaysCount)}</div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-4 flex flex-col items-center justify-center text-center col-span-2 sm:col-span-1 min-h-[5.5rem]">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">最近失败时间</Label>
            <div className="mt-2 text-[13px] leading-snug font-medium text-foreground">
               {latestFailureAt ? <span className="mono">{formatCompactDateTime(latestFailureAt)}</span> : "暂无失败"}
            </div>
          </div>
        </div>
        
        {recentFailures.length ? (
          <ScrollArea className="overflow-hidden rounded-xl border w-full">
            <Table className="min-w-[640px] lg:min-w-full table-fixed">
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[6%] text-xs font-semibold hidden sm:table-cell">#</TableHead>
                  <TableHead className="w-[35%] sm:w-[29%] text-xs font-semibold">任务</TableHead>
                  <TableHead className="w-[18%] text-xs font-semibold">项目</TableHead>
                  <TableHead className="w-[18%] text-xs font-semibold">模型</TableHead>
                  <TableHead className="w-[17%] text-xs font-semibold hidden lg:table-cell">失败时间</TableHead>
                  <TableHead className="w-[20%] lg:w-[12%] text-right text-xs font-semibold">行操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentFailures.map((row, index) => {
                  const canOpen = availableThreadIds.has(row.threadId);
                  return (
                    <TableRow key={`${row.threadId || "failure"}-${index}`} className="group transition-colors data-[state=selected]:bg-muted hover:bg-muted/40">
                      <TableCell className="mono text-muted-foreground text-[13px] hidden sm:table-cell">{index + 1}</TableCell>
                      <TableCell className="py-3 pr-2">
                        <div className="font-medium text-[13px] text-foreground line-clamp-1">{row.titlePreview || row.title || row.threadId || "-"}</div>
                        <div className="mono mt-1 text-[11px] text-muted-foreground truncate" title={row.threadId}>{row.threadId || "-"}</div>
                      </TableCell>
                      <TableCell className="break-words text-[13px] text-muted-foreground group-hover:text-foreground transition-colors">{row.projectLabel || "-"}</TableCell>
                      <TableCell className="break-words text-[13px] text-muted-foreground group-hover:text-foreground transition-colors">{formatModelLabel(row.modelName)}</TableCell>
                      <TableCell className="text-[13px] text-muted-foreground hidden lg:table-cell">{row.failedAt ? <span className="mono">{formatCompactDateTime(row.failedAt)}</span> : "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2.5"
                          disabled={!canOpen}
                          onClick={() => onOpenThread(row.threadId)}
                        >
                          {canOpen ? "查看详情" : "不可用"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="bg-muted/20 border border-dashed rounded-xl p-8 text-center text-sm">
            <EmptyState>近 7 天暂无失败任务明细。</EmptyState>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
