import { Card } from "@/components/ui/card";
import type { OfferCodeRow } from "@/incentives/lib/offerCodesLogic";
import { topRedemptionBars } from "@/incentives/lib/offerCodesLogic";

export function PerformanceOfferCodeRedemptionPanel({
  rows,
  loading,
}: {
  rows: OfferCodeRow[];
  loading?: boolean;
}) {
  const bars = topRedemptionBars(rows);
  const max = bars.reduce((m, b) => Math.max(m, b.value), 0) || 1;

  return (
    <Card className="p-5 ph-surface-card h-full">
      <h2 className="text-lg font-semibold ph-heading mb-4">Redemption performance</h2>
      {loading ? (
        <p className="text-sm ph-muted">Loading…</p>
      ) : bars.length === 0 ? (
        <p className="text-sm ph-muted">No redemptions recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {bars.map((b) => (
            <div key={b.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-mono ph-heading">{b.label}</span>
                <span className="tabular-nums ph-muted">{b.value}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--blue)]"
                  style={{ width: `${Math.max(4, Math.round((b.value / max) * 100))}%` }}
                />
              </div>
            </div>
          ))}
          <p className="text-xs ph-muted pt-2">Redemptions by code (top performers)</p>
        </div>
      )}
    </Card>
  );
}
