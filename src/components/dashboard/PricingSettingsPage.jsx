import { Badge } from "../ui/badge.jsx";
import { Button } from "../ui/button.jsx";
import { SectionCard } from "./section-card.jsx";
import { PricingCatalogTable } from "./PricingCatalogTable.jsx";
import { resolveFreshnessState, refreshStatusVariant, refreshStatusLabel } from "../../lib/status-helpers.js";
import { formatRelativeTime } from "../../lib/dashboard-logic.mjs";

export function PricingSettingsPage({
  snapshot,
  refreshStatus,
  refreshMessage,
  onRefreshSnapshot,
  onBackHome,
}) {
  const freshness = resolveFreshnessState(snapshot.generatedAt);

  return (
    <div className="grid min-w-0 gap-6 sm:gap-8 max-w-5xl mx-auto">
      <SectionCard
        title="设置 / 模型系统价格核算表"
        description="用于核算每日花费开销时采用的千 Token 均价字典。"
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-end mt-4 sm:mt-0">
            <Badge variant={refreshStatusVariant(refreshStatus)} className="justify-center py-1">刷新状态 {refreshStatusLabel(refreshStatus)}</Badge>
            <Button type="button" size="sm" onClick={onRefreshSnapshot} disabled={refreshStatus === "loading"} className="shadow-sm">
              {refreshStatus === "loading" ? "后台同步中..." : "立刻刷新价格"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onBackHome} className="shadow-sm">
              返回仪表盘首页
            </Button>
          </div>
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-foreground bg-muted/20 p-4 border border-dashed rounded-xl mt-4">
          <Badge variant={freshness.variant} className="shadow-sm w-fit">数据鲜度：{freshness.label}</Badge>
          <span className="font-medium text-muted-foreground"><span className="hidden sm:inline">最近刷新版本：</span><span className="mono">{new Date(snapshot.generatedAt).toLocaleString("zh-CN")}</span></span>
          <span className="text-muted-foreground">({formatRelativeTime(snapshot.generatedAt)})</span>
          {refreshMessage ? <span className="text-primary font-medium bg-primary/10 px-2 py-0.5 rounded text-xs">{refreshMessage}</span> : null}
        </div>
      </SectionCard>

      <SectionCard title="实时价格参考图鉴" description="后台解析的已知官方价格，同价模型及别名已自动合并折算展示。价格单位：USD / 百万 Token">
        <div className="mt-2 bg-card rounded-xl border shadow-sm">
           <PricingCatalogTable rows={snapshot.pricingCatalog || []} />
        </div>
      </SectionCard>
    </div>
  );
}
