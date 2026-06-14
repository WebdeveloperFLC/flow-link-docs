import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { OfferCodeRow } from "@/incentives/lib/offerCodesLogic";
import { redemptionUtilPct } from "@/incentives/lib/offerManagementLogic";
import { cn } from "@/lib/utils";
import { Copy } from "lucide-react";

interface PerformanceOfferCodesTableProps {
  rows: OfferCodeRow[];
  loading?: boolean;
  onCopy: (code: string) => void;
}

function RedemptionMeter({ used, cap }: { used: number; cap: number | null }) {
  const pct = redemptionUtilPct(used, cap);
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full", pct > 90 ? "bg-destructive" : pct > 70 ? "bg-amber-500" : "bg-[var(--blue)]")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums ph-muted whitespace-nowrap">
        {used}/{cap ?? "∞"}
      </span>
    </div>
  );
}

export function PerformanceOfferCodesTable({ rows, loading, onCopy }: PerformanceOfferCodesTableProps) {
  return (
    <Card className="p-5 ph-surface-card">
      <h2 className="text-lg font-semibold ph-heading mb-4">Offer codes</h2>
      {loading ? (
        <p className="text-sm ph-muted">Loading codes…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm ph-muted">No offer codes yet — set a promo code on an offer or generate counselor tracking codes.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left ph-muted text-xs uppercase tracking-wide">
                <th className="py-3 pr-3">Code</th>
                <th className="py-3 pr-3">Linked offer</th>
                <th className="py-3 pr-3">Type</th>
                <th className="py-3 pr-3">Scope</th>
                <th className="py-3 pr-3">Branch</th>
                <th className="py-3 pr-3">Redemptions</th>
                <th className="py-3 pr-3">Expiry</th>
                <th className="py-3 pr-3">Status</th>
                <th className="py-3 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 pr-3 font-mono font-semibold ph-heading">{r.code}</td>
                  <td className="py-3 pr-3">{r.offerTitle}</td>
                  <td className="py-3 pr-3">
                    <Badge variant="secondary" className="border-0 bg-[var(--blueBg)] text-[var(--blue)]">
                      {r.typeLabel}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3 text-xs ph-muted max-w-[160px]">{r.scopeLabel}</td>
                  <td className="py-3 pr-3 text-xs ph-muted">{r.branchLabel}</td>
                  <td className="py-3 pr-3">
                    <RedemptionMeter used={r.used} cap={r.cap} />
                  </td>
                  <td className="py-3 pr-3 text-xs ph-muted whitespace-nowrap">
                    {r.expiry ? new Date(r.expiry).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-3 pr-3">
                    <Badge variant="secondary" className={cn("border-0", r.statusClass)}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => onCopy(r.code)} title="Copy code">
                      <Copy className="size-4" />
                    </Button>
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
