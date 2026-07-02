import { Card } from "@/components/ui/card";
import type { DimensionRow } from "@/incentives/lib/revenueAnalyticsLogic";
import { firmMarginProxy } from "@/incentives/lib/revenueAnalyticsLogic";
import { formatInr } from "@/lib/performanceHubTheme";

export function PerformanceRevenueServiceTable({
  rows,
  loading,
  netRevenue,
  verifiedRevenue,
}: {
  rows: DimensionRow[];
  loading?: boolean;
  netRevenue: number;
  verifiedRevenue: number;
}) {
  const firmMargin = firmMarginProxy(netRevenue, verifiedRevenue);

  return (
    <Card className="p-5 ph-surface-card h-full">
      <h2 className="text-lg font-semibold ph-heading mb-4">Revenue by service line</h2>
      {loading ? (
        <p className="text-sm ph-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm ph-muted">No service dimension data for this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left ph-muted text-xs uppercase tracking-wide">
                <th className="py-3 pr-3">Service</th>
                <th className="py-3 pr-3 text-right">Revenue</th>
                <th className="py-3 pr-3 text-right">Events</th>
                <th className="py-3 pr-3 text-right">Margin*</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b last:border-0">
                  <td className="py-3 pr-3 font-medium ph-heading capitalize">{r.label}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{formatInr(r.amount)}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{r.eventCount}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">
                    {firmMargin != null ? `${firmMargin}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {firmMargin != null && (
            <p className="text-xs ph-muted mt-3">* Firm net margin proxy applied — per-service cost not in schema yet.</p>
          )}
        </div>
      )}
    </Card>
  );
}
