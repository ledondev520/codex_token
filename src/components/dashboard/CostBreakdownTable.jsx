import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table.jsx";
import { ScrollArea } from "../ui/scroll-area.jsx";
import { EmptyState } from "./empty-state.jsx";
import { formatTokenMillions, formatPricePerMillion, formatUsd, getBillableInputTokens } from "../../lib/dashboard-logic.mjs";

export function CostBreakdownTable({ currentSession }) {
  const cost = currentSession?.cost;

  if (!currentSession || !cost) {
    return (
      <div className="bg-muted/20 border border-dashed rounded-xl p-6 text-center text-sm">
        <EmptyState>当前模型没有匹配到价格，无法估算费用。</EmptyState>
      </div>
    );
  }

  const rows = [
    {
      label: "未缓存输入",
      tokens: formatTokenMillions(getBillableInputTokens(currentSession)),
      rate: formatPricePerMillion(cost.inputPerMillion),
      total: formatUsd(cost.inputUsd),
    },
    {
      label: "缓存输入",
      tokens: formatTokenMillions(currentSession.cachedInputTokens),
      rate: formatPricePerMillion(cost.cachedInputPerMillion),
      total: formatUsd(cost.cachedInputUsd),
    },
    {
      label: "输出 token",
      tokens: formatTokenMillions(currentSession.outputTokens),
      rate: formatPricePerMillion(cost.outputPerMillion),
      total: formatUsd(cost.outputUsd),
    },
  ];

  return (
    <ScrollArea className="overflow-hidden rounded-xl border w-full">
      <Table className="min-w-[400px] sm:min-w-full table-fixed">
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[35%] sm:w-[40%] text-xs shrink-0">项目</TableHead>
            <TableHead className="w-[25%] sm:w-[20%] text-right text-xs">数量</TableHead>
            <TableHead className="w-[20%] text-right text-xs">单价</TableHead>
            <TableHead className="w-[20%] text-right text-xs">费用</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label} className="group transition-colors data-[state=selected]:bg-muted">
              <TableCell className="break-words py-2.5 sm:py-3 text-[13px]">{row.label}</TableCell>
              <TableCell className="text-right mono whitespace-nowrap py-2.5 sm:py-3 text-[13px] text-muted-foreground">{row.tokens}</TableCell>
              <TableCell className="text-right whitespace-nowrap py-2.5 sm:py-3 text-[13px] text-muted-foreground">{row.rate}</TableCell>
              <TableCell className="text-right mono whitespace-nowrap py-2.5 sm:py-3 text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors">{row.total}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/10 hover:bg-muted/20 transition-colors">
            <TableCell className="font-semibold py-3 sm:py-4">估算总费用</TableCell>
            <TableCell />
            <TableCell />
            <TableCell className="text-right mono whitespace-nowrap text-[15px] sm:text-base font-bold text-foreground py-3 sm:py-4">{formatUsd(cost.totalUsd)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
