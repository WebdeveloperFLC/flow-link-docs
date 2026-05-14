import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { formatAccounting } from "../../lib/format";
import { getDrilldownTxns } from "../../data/mockReports";
import type { ReportNode } from "../../types/reports";

interface Props {
  node: ReportNode | null;
  onClose: () => void;
}

export default function ReportDrilldownModal({ node, onClose }: Props) {
  const txns = useMemo(
    () => (node && node.drilldownKey ? getDrilldownTxns(node.drilldownKey, Math.abs(node.current)) : []),
    [node]
  );

  return (
    <Dialog open={!!node} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl bg-card">
        <DialogHeader>
          <DialogTitle>{node?.label ?? ""}</DialogTitle>
          <DialogDescription>
            {node ? `Showing ${txns.length} transactions for the current period` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-auto max-h-[60vh] border border-border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/40">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Doc ref</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead>Journal</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txns.map((t) => (
                <TableRow key={t.id} className="text-sm">
                  <TableCell className="tabular-nums">{t.date}</TableCell>
                  <TableCell className="font-mono text-xs">{t.docRef}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{t.entity}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.branch}</TableCell>
                  <TableCell>{t.counterparty}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-primary text-xs font-mono hover:underline cursor-pointer">
                      {t.journalId}
                      <ExternalLink className="size-3" />
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatAccounting(t.amount, t.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-between items-center px-2 pt-2 text-sm">
          <span className="text-muted-foreground">{txns.length} transactions</span>
          <span className="font-semibold tabular-nums">
            Total: {node ? formatAccounting(node.current) : ""}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}