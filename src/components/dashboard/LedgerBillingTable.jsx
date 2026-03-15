import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table.jsx";
import { ScrollArea } from "../ui/scroll-area.jsx";
import { EmptyState } from "./empty-state.jsx";
import { formatTokenMillions, formatUsd } from "../../lib/dashboard-logic.mjs";

export function LedgerBillingTable({ rows, emptyCopy = "当前范围暂无账单数据。" }) {
  if (!rows?.length) {
    return (
       <div className={"bg-muted/20 border border-dashed rounded-xl p-8 text-center"}>
         <EmptyState>{emptyCopy}</EmptyState>
       </div>
    );
  }

  return (
    <ScrollArea className="overflow-hidden rounded-xl border w-full">
      <Table className="min-w-[340px] sm:min-w-full table-fixed">
        <TableHeader className={"bg-muted/30"}>
          <TableRow className={"hover:bg-transparent"}>
            <TableHead className="w-[35%] sm:w-[40%] text-xs font-semibold">日期</TableHead>
            <TableHead className="w-[30%] sm:w-[30%] text-right text-xs font-semibold">Token</TableHead>
            <TableHead className="w-[35%] sm:w-[30%] text-right text-xs font-semibold">费用</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.day} className={"group transition-colors data-[state=selected]:bg-muted hover:bg-muted/50"}>
              <TableCell className="font-medium text-[13px] py-3 text-foreground">{row.day}</TableCell>
              <TableCell className="text-right mono text-[13px] text-muted-foreground py-3 group-hover:text-foreground transition-colors">{formatTokenMillions(row.totalTokens)}</TableCell>
              <TableCell className="text-right mono text-[13px] py-3 text-foreground font-semibold group-hover:text-primary transition-colors">{formatUsd(row.totalUsd)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
