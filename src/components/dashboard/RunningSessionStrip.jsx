import { Badge } from "../ui/badge.jsx";
import { Card, CardContent } from "../ui/card.jsx";
import { EmptyState } from "./empty-state.jsx";
import { formatModelLabel, formatUsd, formatRuntimeDuration } from "../../lib/dashboard-logic.mjs";
import { formatCompactDateTime } from "../../lib/formatters.js";
import { statusBadgeVariant } from "../../lib/status-helpers.js";

export function RunningSessionStrip({
  rows,
  generatedAt,
  onOpenThread,
  title = "运行中会话",
  subtitle = "点击即可查看会话详情。",
  emptyCopy = "当前没有运行中会话。",
}) {
  return (
    <Card className="rounded-xl shadow-none">
      <CardContent className="space-y-2.5 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</div>
            <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
          </div>
          <Badge variant={rows.length ? "warning" : "secondary"} size="compact">
            {rows.length ? `前 ${rows.length} 条` : "0 条"}
          </Badge>
        </div>
        {rows.length ? (
          <div className="space-y-2 mt-2">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onOpenThread?.(row.id)}
                className="block w-full rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 pr-2">
                    <div className="truncate text-sm font-medium text-foreground">
                      {row.titlePreview || row.title || "(untitled)"}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground mt-0.5">
                      {row.workspaceLabel || row.cwd || "-"} · {formatModelLabel(row.modelName)}
                    </div>
                  </div>
                  <Badge variant={statusBadgeVariant(row.statusLabel)} size="compact" className="shrink-0">
                    {row.statusLabel}
                  </Badge>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] leading-4 text-muted-foreground">
                  <span>开始 {formatCompactDateTime(row.createdAt ? row.createdAt * 1000 : null)}</span>
                  <span>已运行 {formatRuntimeDuration(row.createdAt ? row.createdAt * 1000 : null, generatedAt)}</span>
                  <span>{row.cost ? formatUsd(row.cost.totalUsd) : "-"}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-2 text-sm text-center py-4 bg-muted/20 border border-dashed rounded-lg">
            <EmptyState>{emptyCopy}</EmptyState>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
