import { Badge } from "@/components/ui/badge.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";

export function PageHeader({ connectionLabel, connectionVariant, planLabel }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Codex Local Usage Dashboard</div>
          <div className="text-4xl font-semibold tracking-[-0.06em] lg:text-6xl">Codex用量统计</div>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-[15px]">
            本地 Codex 与 OpenClaw / OAuth 用量分开展示，优先保留高密度信息。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={connectionVariant}>{connectionLabel}</Badge>
          <Badge variant="secondary">订阅计划 {planLabel}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
