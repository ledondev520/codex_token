import { Card, CardContent } from "@/components/ui/card.jsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { cn } from "@/lib/utils.js";
import { CircleHelp } from "lucide-react";

export function MetricTileSkeleton() {
  return (
    <Card className="min-w-0 rounded-xl border shadow-none">
      <CardContent className="flex min-h-[112px] min-w-0 flex-col gap-3 p-3.5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="mt-auto h-4 w-40" />
      </CardContent>
    </Card>
  );
}

export function MetricTile({
  label,
  value,
  subvalue,
  tooltip,
  tone = "default",
  compact = false,
  wrapValue = false,
}) {
  const toneClasses = {
    default: "bg-card",
    dark: "bg-primary text-primary-foreground border-primary",
    teal: "bg-accent text-accent-foreground border-accent",
    muted: "bg-muted/40",
  };

  return (
    <Card className={cn("min-w-0 overflow-hidden rounded-xl border shadow-none", toneClasses[tone])}>
      <CardContent className="flex min-h-[112px] min-w-0 flex-col gap-3 overflow-hidden p-3.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">
          <span>{label}</span>
          {tooltip ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full opacity-80 transition-opacity hover:opacity-100"
                  aria-label={`${label}口径说明`}
                >
                  <CircleHelp className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-72 text-xs leading-6">
                <div className="font-semibold text-foreground">口径说明</div>
                <p className="mt-1 text-muted-foreground">{tooltip}</p>
              </PopoverContent>
            </Popover>
          ) : null}
        </div>
        <div
          className={cn(
            "mono min-w-0 max-w-full leading-none",
            compact ? "text-[1.58rem] sm:text-[1.8rem] md:text-[2.15rem]" : "text-[1.8rem] sm:text-[2rem] md:text-[2.45rem]",
            wrapValue
              ? "break-words whitespace-normal tracking-[-0.03em] leading-[1.06]"
              : "whitespace-nowrap tracking-[-0.05em]"
          )}
        >
          {value}
        </div>
        <div className="mt-auto break-words border-t border-current/15 pt-2.5 text-sm opacity-85">{subvalue}</div>
      </CardContent>
    </Card>
  );
}
