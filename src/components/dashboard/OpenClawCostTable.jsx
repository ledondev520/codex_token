import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table.jsx";
import { ScrollArea } from "../ui/scroll-area.jsx";
import { EmptyState } from "./empty-state.jsx";
import { formatModelLabel, formatUsd } from "../../lib/dashboard-logic.mjs";

export function OpenClawCostTable({ rows }) {
  if (!rows?.length) {
    return (
       <div className={"bg-muted/20 border border-dashed rounded-xl p-6 text-center text-sm"}>
         <EmptyState>暂无模型费用明细。</EmptyState>
       </div>
    );
  }

  return (
    <ScrollArea className="overflow-hidden rounded-xl border w-full">
      <Table className="min-w-[320px] sm:min-w-full table-fixed">
        <TableHeader className={"bg-muted/40"}>
          <TableRow className={"hover:bg-transparent"}>
            <TableHead className="w-[65%] sm:w-[70%] text-xs">模型</TableHead>
            <TableHead className="w-[35%] sm:w-[30%] text-right text-xs">综合费用</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.modelName} className={"group transition-colors data-[state=selected]:bg-muted"}>
              <TableCell className="break-words font-medium py-3 text-[13px] text-foreground">{formatModelLabel(row.modelName)}</TableCell>
              <TableCell className="text-right mono whitespace-nowrap font-semibold py-3 text-[14px] text-foreground group-hover:text-primary transition-colors">{formatUsd(row.totalUsd)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
