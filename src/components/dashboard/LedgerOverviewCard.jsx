import { Badge } from "../ui/badge.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card.jsx";
import { MetricTile } from "./metric-tile.jsx";
import { RunningSessionStrip } from "./RunningSessionStrip.jsx";
import { ledgerStateVariant } from "../../lib/status-helpers.js";

export function LedgerOverviewCard({
  title,
  subtitle,
  stateLabel,
  metrics,
  sessions,
  generatedAt,
  onOpenThread,
  emptySessionCopy,
}) {
  return (
    <Card className="rounded-2xl shadow-none border-dashed border-muted-foreground/20">
      <CardHeader className="space-y-4 pb-5 pt-5 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-3">
          <div className="space-y-1.5">
            <CardTitle className="text-xl sm:text-2xl tracking-tight">{title}</CardTitle>
            <CardDescription className="text-sm">{subtitle}</CardDescription>
          </div>
          <Badge variant={ledgerStateVariant(stateLabel)} className="w-fit text-sm px-2.5 py-0.5 shadow-sm">
            {stateLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-0 sm:px-6 pb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
          {metrics.map((metric) => (
            <MetricTile
              key={metric.label}
              label={metric.label}
              value={metric.value}
              subvalue={metric.subvalue}
              compact
              tone={metric.tone || "default"}
              wrapValue={Boolean(metric.wrapValue)}
            />
          ))}
        </div>
        <div className="pt-2">
          <RunningSessionStrip
            rows={sessions}
            generatedAt={generatedAt}
            onOpenThread={onOpenThread}
            subtitle="点击会话即可查看详情。"
            emptyCopy={emptySessionCopy}
          />
        </div>
      </CardContent>
    </Card>
  );
}
