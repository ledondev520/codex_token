import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "./empty-state.jsx";
import { formatUsd, formatTokenMillions } from "../../lib/dashboard-logic.mjs";

/**
 * Group daily rows into monthly buckets, summing tokens and usd.
 * Returns one entry per natural month (e.g. 2026-02, 2026-03).
 */
function groupByMonth(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = String(row.day || "").slice(0, 7); // "YYYY-MM"
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, { day: key, totalTokens: 0, totalUsd: 0 });
    }
    const entry = map.get(key);
    entry.totalTokens += Number(row.totalTokens || 0);
    entry.totalUsd += Number(row.totalUsd || 0);
  }
  return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
}

export function BillingChart({ rows, viewMode = "daily" }) {
  const chartRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => a.day.localeCompare(b.day));
    const source = viewMode === "monthly" ? groupByMonth(sorted) : sorted;
    return source.map((row) => ({
      ...row,
      tokensInMillions: Number((Number(row.totalTokens || 0) / 1_000_000).toFixed(2)),
    }));
  }, [rows, viewMode]);

  const gridColor = "hsl(var(--border))";
  const mutedTextColor = "hsl(var(--muted-foreground))";
  const tokenStroke = "hsl(var(--primary))";
  const costStroke = "hsl(var(--chart-2, 173 58% 39%))";

  if (chartRows.length < 1) {
    return (
      <div className="py-12 bg-muted/20 rounded-lg text-center border-dashed border">
        <EmptyState>没有每日账单数据。</EmptyState>
      </div>
    );
  }

  if (chartRows.length === 1) {
    return (
      <div className="py-12 bg-muted/20 rounded-lg text-center border-dashed border">
        <EmptyState>
          当前范围仅包含 <strong className="text-foreground">{chartRows[0].day}</strong> 这一天，走势图无法绘制。
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="min-w-0 rounded-xl border bg-card p-3 sm:p-5 shadow-sm">
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartRows} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTokensBilling" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={tokenStroke} stopOpacity={0.3} />
                <stop offset="95%" stopColor={tokenStroke} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCostBilling" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={costStroke} stopOpacity={0.3} />
                <stop offset="95%" stopColor={costStroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: mutedTextColor }}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              yAxisId="tokens"
              tick={{ fontSize: 11, fill: mutedTextColor }}
              tickFormatter={(v) => `${v}M`}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <YAxis
              yAxisId="cost"
              orientation="right"
              tick={{ fontSize: 11, fill: mutedTextColor }}
              tickFormatter={(v) => `$${v}`}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                borderColor: gridColor,
                backgroundColor: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                fontSize: 13,
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              formatter={(value, name) =>
                name === "Token" ? [`${value}M`, name] : [formatUsd(value), name]
              }
            />
            <Legend wrapperStyle={{ paddingTop: "16px", fontSize: "13px" }} iconType="circle" />
            <Area
              yAxisId="tokens"
              type="monotone"
              dataKey="tokensInMillions"
              name="Token"
              stroke={tokenStroke}
              strokeWidth={2}
              fill="url(#colorTokensBilling)"
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            <Area
              yAxisId="cost"
              type="monotone"
              dataKey="totalUsd"
              name="费用"
              stroke={costStroke}
              strokeWidth={2}
              fill="url(#colorCostBilling)"
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
