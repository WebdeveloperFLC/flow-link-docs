import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { OfferRow } from "@/incentives/lib/offerManagementLogic";
import {
  applicabilitySummary,
  offerValueLabel,
  redemptionUtilPct,
} from "@/incentives/lib/offerManagementLogic";
import {
  offerStatusActions,
  offerStatusClass,
  offerStatusLabel,
  type OfferStatus,
} from "@/lib/offers/lifecycle";
import { cn } from "@/lib/utils";
import { Copy, History, Loader2, Pencil, Trash2 } from "lucide-react";

interface PerformanceOfferManagementTableProps {
  offers: OfferRow[];
  loading?: boolean;
  canEdit?: boolean;
  statusBusyId?: string | null;
  onEdit: (offer: OfferRow) => void;
  onClone: (id: string) => void;
  onRemove: (id: string) => void;
  onHistory: (offer: OfferRow) => void;
  onSetStatus: (id: string, status: OfferStatus) => void;
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

export function PerformanceOfferManagementTable({
  offers,
  loading,
  canEdit,
  statusBusyId,
  onEdit,
  onClone,
  onRemove,
  onHistory,
  onSetStatus,
}: PerformanceOfferManagementTableProps) {
  return (
    <Card className="p-5 ph-surface-card">
      <h2 className="text-lg font-semibold ph-heading mb-4">Offers</h2>
      {loading ? (
        <p className="text-sm ph-muted">Loading offers…</p>
      ) : offers.length === 0 ? (
        <p className="text-sm ph-muted">No offers match this filter.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left ph-muted text-xs uppercase tracking-wide">
                <th className="py-3 pr-3">Offer</th>
                <th className="py-3 pr-3">Type</th>
                <th className="py-3 pr-3 text-right">Value</th>
                <th className="py-3 pr-3">Applicability</th>
                <th className="py-3 pr-3">Redemptions</th>
                <th className="py-3 pr-3">Ends</th>
                <th className="py-3 pr-3">Status</th>
                {canEdit && <th className="py-3 pr-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30 align-top">
                  <td className="py-3 pr-3">
                    <p className="font-medium ph-heading">{o.title}</p>
                    <p className="text-xs ph-muted font-mono">{o.id.slice(0, 8)}…</p>
                    {o.promo_code && <p className="text-xs ph-muted mt-0.5">Code: {o.promo_code}</p>}
                  </td>
                  <td className="py-3 pr-3 capitalize">{o.discount_type.replace(/_/g, " ")}</td>
                  <td className="py-3 pr-3 text-right tabular-nums font-medium">{offerValueLabel(o)}</td>
                  <td className="py-3 pr-3 text-xs ph-muted max-w-[180px]">{applicabilitySummary(o)}</td>
                  <td className="py-3 pr-3">
                    <RedemptionMeter used={o.redemption_count ?? 0} cap={o.max_redemptions} />
                  </td>
                  <td className="py-3 pr-3 text-xs ph-muted whitespace-nowrap">
                    {o.valid_to ? new Date(o.valid_to).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-3 pr-3">
                    <Badge variant="secondary" className={cn("border-0", offerStatusClass(o.status))}>
                      {offerStatusLabel(o.status)}
                    </Badge>
                  </td>
                  {canEdit && (
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap justify-end gap-1">
                        {offerStatusActions(o.status).map((a) => (
                          <Button
                            key={a.key}
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={!!statusBusyId}
                            onClick={() => onSetStatus(o.id, a.key)}
                          >
                            {statusBusyId === o.id ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                            {a.label}
                          </Button>
                        ))}
                        <Button size="icon" variant="ghost" className="size-8" title="History" onClick={() => onHistory(o)}>
                          <History className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8" title="Clone" onClick={() => onClone(o.id)}>
                          <Copy className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8" title="Edit" onClick={() => onEdit(o)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8" title="Delete" onClick={() => onRemove(o.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
