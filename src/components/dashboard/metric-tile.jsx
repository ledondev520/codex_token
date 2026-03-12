import { Card, CardContent } from "@/components/ui/card.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { cn } from "@/lib/utils.js";

export function MetricTileSkeleton() {
  return (
    <Card className="rounded-xl border shadow-none">
      <CardContent className="flex min-h-[132px] flex-col gap-4 p-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="mt-auto h-4 w-40" />
      </CardContent>
    </Card>
  );
}

export function MetricTile({ label, value, subvalue, tone = "default", compact = false }) {
  const toneClasses = {
    default: "bg-card",
    dark: "bg-primary text-primary-foreground border-primary",
    teal: "bg-accent text-accent-foreground border-accent",
    muted: "bg-muted/40",
  };

  return (
    <Card className={cn("rounded-xl border shadow-none", toneClasses[tone])}>
      <CardContent className="flex min-h-[132px] flex-col gap-4 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">{label}</div>
        <div
          className={cn(
            "mono leading-none tracking-[-0.06em]",
            compact ? "text-[2rem] md:text-[2.4rem]" : "text-[2.2rem] md:text-[2.8rem]"
          )}
        >
          {value}
        </div>
        <div className="mt-auto border-t border-current/15 pt-3 text-sm opacity-85">{subvalue}</div>
      </CardContent>
    </Card>
  );
}
