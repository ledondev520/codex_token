import { Badge } from "@/components/ui/badge.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";

export function PageHeader({ connectionLabel, connectionVariant, planLabel }) {
  return (
    <Card className="overflow-hidden rounded-2xl">
      <CardContent className="flex flex-col gap-4 px-5 py-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-[11px]">
            Codex Local Usage Dashboard
          </div>
          <div className="text-[2rem] font-semibold leading-none tracking-[-0.07em] sm:text-4xl lg:text-6xl">
            Codex用量统计
          </div>
          <p className="max-w-[34rem] text-sm leading-6 text-muted-foreground md:text-[15px] md:leading-7">
            本地 Codex 与 OpenClaw / OAuth 用量分开展示，优先保留高密度信息。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-3">
          <Badge variant={connectionVariant}>{connectionLabel}</Badge>
          <Badge variant="secondary">订阅计划 {planLabel}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
