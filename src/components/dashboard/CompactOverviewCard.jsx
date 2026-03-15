import { Badge } from "../ui/badge.jsx";
import { Card, CardContent } from "../ui/card.jsx";
import { cn } from "../../lib/utils.js";

export function CompactOverviewCard({
  title,
  badgeLabel,
  badgeVariant = "secondary",
  meta,
  value,
  summary,
  footer,
  className = "",
}) {
  return (
    <Card className={cn("rounded-xl shadow-none", className)}>
      <CardContent className="space-y-2.5 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</div>
          <div className="flex flex-wrap min-w-0 items-start gap-2">
            {meta ? <div className="min-w-0 text-right text-[11px] leading-4 text-muted-foreground">{meta}</div> : null}
            {badgeLabel ? (
              <Badge variant={badgeVariant} size="compact" className="shrink-0">
                {badgeLabel}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="mono text-[1.25rem] leading-none tracking-[-0.05em] sm:text-[1.45rem] break-all">{value}</div>
        <div className="text-xs leading-5 text-muted-foreground">{summary}</div>
        {footer ? <div className="border-t border-border/70 pt-2 mt-2 text-xs leading-5 text-muted-foreground">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
