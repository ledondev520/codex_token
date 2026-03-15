import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "./empty-state.jsx";
import { formatUsd } from "../../lib/dashboard-logic.mjs";

export function BillingChart({ rows }) {
  const chartRows = [...rows].reverse().map((row) => ({
    ...row,
    tokensInMillions: Number((Number(row.totalTokens || 0) / 1_000_000).toFixed(2)),
  }));
  
  const gridColor = "hsl(var(--border))";
  const mutedTextColor = "hsl(var(--muted-foreground))";
  const tokenStroke = "hsl(var(--primary))";
  const tokenFill = "color-mix(in srgb, hsl(var(--primary)) 20%, transparent)";
  const costStroke = "hsl(var(--chart-2, 173 58% 39%))";
  const costFill = "color-mix(in srgb, hsl(var(--chart-2, 173 58% 39%)) 24%, transparent)";

  return (
    <div className="min-w-0 rounded-xl border bg-card p-3 sm:p-5 shadow-sm">
      {chartRows.length > 1 ? (
        <div className="h-[240px] sm:h-[300px] lg:h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartRows} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
              <defs>
                 <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor={tokenStroke} stopOpacity={0.3}/>
                   <stop offset="95%" stopColor={tokenStroke} stopOpacity={0}/>
                 </linearGradient>
                 <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor={costStroke} stopOpacity={0.3}/>
                   <stop offset="95%" stopColor={costStroke} stopOpacity={0}/>
                 </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3"/>
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
                tickFormatter={(value) => `${value}M`}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <YAxis
                yAxisId="cost"
                orientation="right"
                tick={{ fontSize: 11, fill: mutedTextColor }}
                tickFormatter={(value) => `$${value}`}
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, borderColor: gridColor, backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))", fontSize: 13, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }}
                itemStyle={{ fontSize: 13, fontWeight: 500 }}
                formatter={(value, name) => {
                  if (name === "Token") {
                    return [`${value}M`, name];
                  }

                  return [formatUsd(value), name];
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "13px" }} iconType="circle"/>
              <Area
                yAxisId="tokens"
                type="monotone"
                dataKey="tokensInMillions"
                name="Token"
                stroke={tokenStroke}
                strokeWidth={2}
                fill="url(#colorTokens)"
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Area
                yAxisId="cost"
                type="monotone"
                dataKey="totalUsd"
                name="费用"
                stroke={costStroke}
                strokeWidth={2}
                fill="url(#colorCost)"
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : chartRows.length === 1 ? (
        <div className="py-12 bg-muted/20 rounded-lg text-center border-dashed border">
          <EmptyState>
            当前范围仅包含 <strong className="text-foreground">{chartRows[0].day}</strong> 这一天，走势图无法绘制，请直接查看下方账单明细表。
          </EmptyState>
        </div>
      ) : (
        <div className="py-12 bg-muted/20 rounded-lg text-center border-dashed border">
           <EmptyState>没有每日账单数据。</EmptyState>
        </div>
      )}
    </div>
  );
}
