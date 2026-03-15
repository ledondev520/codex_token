import { Badge } from "../ui/badge.jsx";
import { Button } from "../ui/button.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card.jsx";
import { Alert, AlertDescription } from "../ui/alert.jsx";
import { Label } from "../ui/label.jsx";
import { Input } from "../ui/input.jsx";
import { MetricHint } from "./MetricHint.jsx";
import { ALERT_CONFIG_LIMITS } from "../../lib/dashboard-logic.mjs";
import { alertPhaseBadgeVariant, alertPhaseLabel } from "../../lib/status-helpers.js";

export function AlertStatusCard({
  title,
  tooltip,
  state,
  value,
  thresholdLabel,
  detail,
  changeLabel,
}) {
  return (
    <Card className="rounded-xl shadow-none overflow-hidden hover:border-foreground/20 transition-colors">
      <CardContent className="space-y-4 p-5 sm:p-6 bg-gradient-to-br from-card to-muted/10 h-full flex flex-col justify-between">
        <div>
           <div className="flex items-start justify-between gap-3 mb-6">
             <div className="flex items-center gap-2">
               <span className="font-semibold tracking-tight text-[15px]">{title}</span>
               <MetricHint title={title}>{tooltip}</MetricHint>
             </div>
             <Badge variant={alertPhaseBadgeVariant(state.phase)} className="shadow-sm">{alertPhaseLabel(state.phase)}</Badge>
           </div>
           
           <div className="flex items-end justify-between gap-4">
             <div className="w-full">
               <div className="mono text-4xl sm:text-5xl font-bold leading-none tracking-[-0.05em] text-foreground drop-shadow-sm">{value}</div>
               <div className="mt-3 text-[13px] font-medium text-foreground/80 bg-background inline-block px-2.5 py-1 rounded-md border shadow-sm">{thresholdLabel}</div>
             </div>
           </div>
        </div>
        
        <div className="space-y-1.5 pt-4 text-xs sm:text-[13px] text-muted-foreground border-t border-border/60 mt-4">
          <p className="leading-relaxed">{detail}</p>
          <p className="font-mono text-[11px] opacity-70">{changeLabel}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AlertSettingsCard({ alertConfig, onRuleChange }) {
  return (
    <Card className="rounded-xl shadow-none h-full bg-card/60 flex flex-col">
      <CardHeader className="pb-4 border-b bg-card">
        <CardTitle className="text-lg">配置与规则</CardTitle>
        <CardDescription className="text-sm mt-1">本地提醒不会阻断主流程，可以随时关闭或调整。</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 space-y-5 p-5 sm:p-6">
        <Alert variant="muted" className="bg-muted/30 border-dashed">
          <AlertDescription className="text-xs leading-relaxed text-muted-foreground">
            口径说明：日花费按当前本地自然日的账单估算；失败率按当天已完结 + 已中断会话计算，进行中的会话不会计入分母。
          </AlertDescription>
        </Alert>

        <div className="space-y-4 p-4 rounded-xl border bg-background hover:bg-muted/10 transition-colors shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="daily-spend-threshold" className="text-[14px] font-semibold">今日估算花费</Label>
                <MetricHint title="日花费阈值">
                  触发条件为今日 `dailyLedger` 估算费用大于等于阈值。最小值 0，最大值{" "}
                  {ALERT_CONFIG_LIMITS.dailySpend.maxThresholdUsd}。
                </MetricHint>
              </div>
              <p className="text-[12px] leading-snug text-muted-foreground mr-1">
                默认 ${ALERT_CONFIG_LIMITS.dailySpend.defaultThresholdUsd.toFixed(2)}，上限 {ALERT_CONFIG_LIMITS.dailySpend.maxThresholdUsd} USD。
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={alertConfig.dailySpend.enabled ? "secondary" : "outline"}
              onClick={() => onRuleChange("dailySpend", { enabled: !alertConfig.dailySpend.enabled })}
              className="shrink-0 w-full sm:w-auto"
            >
              {alertConfig.dailySpend.enabled ? "已开启" : "开启"}
            </Button>
          </div>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-muted-foreground font-mono">$</span>
            <Input
              id="daily-spend-threshold"
              type="number"
              min={ALERT_CONFIG_LIMITS.dailySpend.minThresholdUsd}
              max={ALERT_CONFIG_LIMITS.dailySpend.maxThresholdUsd}
              step="0.5"
              className="pl-7 font-mono text-[15px]"
              value={alertConfig.dailySpend.thresholdUsd}
              disabled={!alertConfig.dailySpend.enabled}
              onChange={(e) => onRuleChange("dailySpend", { thresholdUsd: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-4 p-4 rounded-xl border bg-background hover:bg-muted/10 transition-colors shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="failure-rate-threshold" className="text-[14px] font-semibold">任务中断率</Label>
                <MetricHint title="失败率阈值">
                  触发条件为当天已中断会话数 / (当天已完结 + 已中断会话数) ≥ 阈值。
                </MetricHint>
              </div>
              <p className="text-[12px] leading-snug text-muted-foreground mr-1">
                默认 {ALERT_CONFIG_LIMITS.failureRate.defaultThresholdPercent}%。
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={alertConfig.failureRate.enabled ? "secondary" : "outline"}
              onClick={() => onRuleChange("failureRate", { enabled: !alertConfig.failureRate.enabled })}
              className="shrink-0 w-full sm:w-auto"
            >
              {alertConfig.failureRate.enabled ? "已开启" : "开启"}
            </Button>
          </div>
           <div className="relative flex items-center">
              <Input
                id="failure-rate-threshold"
                type="number"
                min={ALERT_CONFIG_LIMITS.failureRate.minThresholdPercent}
                max={ALERT_CONFIG_LIMITS.failureRate.maxThresholdPercent}
                step="1"
                className="pr-8 font-mono text-[15px]"
                value={alertConfig.failureRate.thresholdPercent}
                disabled={!alertConfig.failureRate.enabled}
                onChange={(e) => onRuleChange("failureRate", { thresholdPercent: e.target.value })}
              />
              <span className="absolute right-3 text-muted-foreground font-mono">%</span>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}
