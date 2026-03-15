import { Badge } from "../ui/badge.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card.jsx";
import { Progress } from "../ui/progress.jsx";
import { formatCompactDateTime } from "../../lib/formatters.js";
import { formatTokenRaw } from "../../lib/dashboard-logic.mjs";

export function QuotaSnapshotDetails({ items, latestRateLimitAt }) {
  return (
    <Card className="rounded-xl shadow-none h-full bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">限额快照节奏</CardTitle>
        <CardDescription>
          这里只保留首屏没有展开的重置节奏信息。
          {latestRateLimitAt ? ` 最近快照 ${formatCompactDateTime(latestRateLimitAt)}。` : " 最近快照暂不可用。"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-1">
          {items.map((item) => (
            <div key={item.key} className="rounded-xl border bg-muted/20 p-4 transition-colors hover:bg-muted/30">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="text-sm font-semibold text-foreground">{item.summary.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    窗口时长 {formatTokenRaw(item.windowMinutes)} 分钟
                  </div>
                </div>
                <Badge variant={item.summary.stale ? "warning" : "secondary"} size="compact" className="shrink-0 mt-0.5">
                  {item.summary.statusLabel}
                </Badge>
              </div>
              <div className="mt-4 space-y-2.5">
                <Progress
                  value={item.summary.stale ? 100 : Math.max(0, Math.min(100, Number(item.progress.elapsedPercent || 0)))}
                  indicatorClassName={item.summary.stale ? "bg-amber-500" : "bg-primary"}
                  className="h-2"
                />
                <div className="flex items-center justify-between text-[11px] leading-5 text-muted-foreground">
                  <span className="truncate pr-2">{item.summary.stale ? "快照已过期，等待 rate_limits" : "距重置进度"}</span>
                  <strong className="mono text-foreground shrink-0">{item.progressLabel}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
