import { CircleHelp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover.jsx";

export function MetricHint({ title, children }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          aria-label={`${title}口径说明`}
        >
          <CircleHelp className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-[calc(100vw-32px)] max-w-80 text-xs leading-6 p-3 shadow-md z-[100]">
        <div className="font-medium text-foreground mb-1">{title} · 口径说明</div>
        <div className="text-muted-foreground leading-relaxed">{children}</div>
      </PopoverContent>
    </Popover>
  );
}
