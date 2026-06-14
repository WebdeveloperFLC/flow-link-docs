import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ClientCommercialRow } from "@/incentives/lib/clientCommercialsLogic";
import { cn } from "@/lib/utils";
import { ArrowRight, Lock } from "lucide-react";

interface PerformanceClientCommercialsTableProps {
  rows: ClientCommercialRow[];
  loading?: boolean;
  onSelect: (row: ClientCommercialRow) => void;
}

function money(amt: number, cur: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur || "INR", maximumFractionDigits: 0 }).format(
      amt || 0,
    );
  } catch {
    return `${cur} ${(amt || 0).toFixed(0)}`;
  }
}

function stageClass(stage: ClientCommercialRow["stage"], locked: boolean): string {
  if (locked || stage === "partial_paid" || stage === "full_paid") {
    return "bg-muted text-muted-foreground";
  }
  if (stage === "quote") return "bg-amber-100 text-amber-800";
  if (stage === "invoice_draft") return "bg-[var(--blueBg)] text-[var(--blue)]";
  return "bg-muted text-muted-foreground";
}

export function PerformanceClientCommercialsTable({ rows, loading, onSelect }: PerformanceClientCommercialsTableProps) {
  return (
    <Card className="p-5 ph-surface-card">
      <h2 className="text-lg font-semibold ph-heading mb-4">Client commercial records</h2>
      {loading ? (
        <p className="text-sm ph-muted">Loading commercial records…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm ph-muted">No commercial records for this period — invoices appear here once created in the CRM.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left ph-muted text-xs uppercase tracking-wide">
                <th className="py-3 pr-3">Client</th>
                <th className="py-3 pr-3">Lead</th>
                <th className="py-3 pr-3">Service</th>
                <th className="py-3 pr-3">Stage</th>
                <th className="py-3 pr-3 text-right">Original</th>
                <th className="py-3 pr-3 text-right">Discount</th>
                <th className="py-3 pr-3 text-right">Final</th>
                <th className="py-3 pr-3 text-right">Paid</th>
                <th className="py-3 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                  onClick={() => onSelect(r)}
                >
                  <td className="py-3 pr-3">
                    <div className="font-mono text-xs ph-muted">{r.applicationId || r.clientId.slice(0, 8)}</div>
                    <div className="font-semibold ph-heading">{r.clientName}</div>
                    <div className="text-xs ph-muted">
                      {r.counselorName} · {r.branchName}
                    </div>
                  </td>
                  <td className="py-3 pr-3 font-mono text-xs ph-muted">{r.leadLabel}</td>
                  <td className="py-3 pr-3 text-xs ph-muted max-w-[140px]">{r.serviceLabel}</td>
                  <td className="py-3 pr-3">
                    <Badge variant="secondary" className={cn("border-0 gap-1", stageClass(r.stage, r.locked))}>
                      {r.locked && <Lock className="size-3" />}
                      {r.stageLabel}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3 text-right font-mono tabular-nums">{money(r.original, r.currency)}</td>
                  <td className="py-3 pr-3 text-right">
                    {r.discountTotal > 0 ? (
                      <>
                        <span className="font-semibold text-emerald-700">−{money(r.discountTotal, r.currency)}</span>
                        <div className="text-xs ph-muted">{r.discountSource}</div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 pr-3 text-right font-semibold font-mono tabular-nums">{money(r.final, r.currency)}</td>
                  <td className={cn("py-3 pr-3 text-right font-mono tabular-nums", !r.paid && "ph-muted")}>
                    {r.paid ? money(r.paid, r.currency) : "—"}
                  </td>
                  <td className="py-3 pr-3 text-right ph-muted">
                    <ArrowRight className="size-4 inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
