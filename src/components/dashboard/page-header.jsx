import { Card, CardContent } from "@/components/ui/card.jsx";

export function PageHeader({ title = "Codex用量统计", description = "本地高密度用量面板", actions = null }) {
  return (
    <Card className="overflow-hidden rounded-2xl shadow-none">
      <CardContent className="flex flex-col gap-3 px-4 py-3 sm:px-5 sm:py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-[11px]">
            Codex Local Usage Dashboard
          </div>
          <div className="text-[1.55rem] font-semibold leading-none tracking-[-0.06em] sm:text-[1.75rem]">
            {title}
          </div>
          {description ? <p className="max-w-[34rem] text-sm leading-5 text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
      </CardContent>
    </Card>
  );
}
