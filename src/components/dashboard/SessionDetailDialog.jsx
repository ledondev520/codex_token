import { Badge } from "../ui/badge.jsx";
import { Card, CardContent } from "../ui/card.jsx";
import { Label } from "../ui/label.jsx";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion.jsx";
import { ScrollArea } from "../ui/scroll-area.jsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog.jsx";
import { EmptyState } from "./empty-state.jsx";
import { CostBreakdownTable } from "./CostBreakdownTable.jsx";
import { summarizePromptText, normalizeInlineText } from "../../lib/dashboard-logic.mjs";
import { originBadgeVariant, getLedgerOriginLabel } from "../../lib/status-helpers.js";

export function SessionDetailDialog({ row, open, onOpenChange }) {
  const promptText = row?.promptText || "";
  const promptSummary = summarizePromptText(promptText, 220);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <div className="p-4 sm:p-6 pb-2 border-b">
          <DialogHeader>
            <DialogTitle className="text-xl">会话详情</DialogTitle>
            <DialogDescription className="text-sm mt-1.5">本地日志里能读取到的会话信息与用户轮次。</DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-8">
          {!row ? null : (
            <div className="space-y-6 sm:space-y-8 max-w-full">
              <div className="grid gap-4 sm:gap-6 text-sm grid-cols-1 sm:grid-cols-2 bg-muted/20 p-4 rounded-xl border border-dashed">
                <div className="min-w-0">
                  <Label className="mb-2 block text-muted-foreground">会话 ID</Label>
                  <div className="mono font-medium text-foreground text-[13px] break-all bg-background border px-2.5 py-1.5 rounded-md select-all">{row.id}</div>
                </div>
                <div>
                  <Label className="mb-2 block text-muted-foreground">来源</Label>
                  <Badge variant={originBadgeVariant(row.usageOrigin)} className="rounded-full shadow-sm">
                    {getLedgerOriginLabel(row.usageOrigin)}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="mb-2.5 block text-muted-foreground">标题</Label>
                <div className="text-lg leading-snug font-semibold text-foreground break-words">{row.titlePreview || row.title}</div>
              </div>

              <div className="rounded-xl border bg-muted/10 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b bg-muted/30">
                  <Label className="mb-0 block text-foreground font-medium">提示词摘要</Label>
                </div>
                <div className="p-4 sm:p-5 bg-background">
                  <div className="whitespace-pre-wrap text-[13px] sm:text-sm leading-relaxed text-muted-foreground break-words">{promptSummary || "未在本地日志中找到提示词。"}</div>
                </div>
                {promptText && promptSummary !== normalizeInlineText(promptText) ? (
                  <Accordion type="single" collapsible className="bg-muted/10">
                    <AccordionItem value="prompt" className="border-t-0 p-0">
                      <AccordionTrigger className="py-3 px-4 sm:px-5 text-[13px] font-medium text-muted-foreground hover:bg-muted/20 hover:text-foreground hover:no-underline transition-colors">
                        查看完整提示词
                      </AccordionTrigger>
                      <AccordionContent className="p-0 border-t">
                        <div className="p-4 sm:p-5 bg-background">
                           <pre className="whitespace-pre-wrap font-mono text-[11px] sm:text-xs leading-relaxed text-muted-foreground break-words w-full">{promptText}</pre>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ) : null}
              </div>

              <div className="space-y-4">
                <Label className="block text-foreground font-medium text-base">用户轮次</Label>
                {(row.userMessages || []).length ? (
                  <div className="grid gap-3 sm:gap-4 pr-2">
                    {row.userMessages.map((message, index) => (
                      <Card key={`${message.timestamp}-${index}`} className="rounded-xl shadow-sm border-muted-foreground/20 hover:border-primary/30 transition-colors">
                        <CardContent className="space-y-3 p-4 sm:p-5">
                          <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
                            <strong className="text-foreground text-[13px] font-semibold tracking-wide">第 {index + 1} 轮</strong>
                            <span className="text-[11px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-full">{message.timestamp ? new Date(message.timestamp).toLocaleString("zh-CN") : "时间未知"}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-[13px] sm:text-sm leading-relaxed text-muted-foreground break-words">{summarizePromptText(message.text, 360)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="bg-muted/20 border-dashed border rounded-xl items-center justify-center p-8">
                     <EmptyState>当前本地日志里没有更多用户轮次。</EmptyState>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-dashed">
                <Label className="block text-foreground font-medium text-base">Token / 费用明细</Label>
                <CostBreakdownTable currentSession={row.tokenUsage ? { ...row.tokenUsage, cost: row.cost } : null} />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
