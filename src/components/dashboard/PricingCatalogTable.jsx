import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table.jsx";
import { ScrollArea } from "../ui/scroll-area.jsx";
import { EmptyState } from "./empty-state.jsx";
import { formatPricePerMillion } from "../../lib/dashboard-logic.mjs";

export function PricingCatalogTable({ rows }) {
  if (!rows.length) {
    return (
      <div className="bg-muted/20 border border-dashed rounded-xl p-8 text-center text-sm">
        <EmptyState>没有识别到模型价格。</EmptyState>
      </div>
    );
  }

  return (
    <ScrollArea className="overflow-hidden rounded-xl border w-full">
      <Table className="min-w-[500px] sm:min-w-full table-fixed">
        <TableHeader className="bg-muted/40 transition-colors">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[40%] sm:w-[45%] text-xs font-semibold">模型</TableHead>
            <TableHead className="w-[20%] text-right text-xs">输入单价</TableHead>
            <TableHead className="w-[20%] sm:w-[15%] text-right text-xs">缓存输入</TableHead>
            <TableHead className="w-[20%] text-right text-xs">输出单价</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.modelName} className="group transition-colors data-[state=selected]:bg-muted hover:bg-muted/50">
              <TableCell className="align-top py-3 sm:py-4">
                <div className="break-words font-medium text-foreground">{row.modelName}</div>
                <div className="mt-1.5 break-words text-[11px] leading-4 text-muted-foreground bg-muted/50 inline-flex items-center rounded-sm px-1.5 py-0.5">{row.sourceLabel || "-"}</div>
              </TableCell>
              <TableCell className="text-right mono whitespace-nowrap py-3 sm:py-4 text-[13px] text-muted-foreground group-hover:text-foreground transition-colors">{formatPricePerMillion(row.inputPerMillion)}</TableCell>
              <TableCell className="text-right mono whitespace-nowrap py-3 sm:py-4 text-[13px] text-muted-foreground group-hover:text-foreground transition-colors">{formatPricePerMillion(row.cachedInputPerMillion)}</TableCell>
              <TableCell className="text-right mono whitespace-nowrap py-3 sm:py-4 text-[13px] text-muted-foreground group-hover:text-foreground transition-colors">{formatPricePerMillion(row.outputPerMillion)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
