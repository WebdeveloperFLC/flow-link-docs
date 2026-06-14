import { Card } from "@/components/ui/card";
import type { ProfitabilityDimension, ProfitabilityRow } from "@/incentives/lib/commercialProfitabilityLogic";
import { dimensionLabel, marginHeatClass } from "@/incentives/lib/commercialProfitabilityLogic";
import { formatInr } from "@/lib/performanceHubTheme";
import { cn } from "@/lib/utils";

interface PerformanceProfitabilityMatrixProps {
  rows: ProfitabilityRow[];
  dimension: ProfitabilityDimension;
  loading?: boolean;
}

export function PerformanceProfitabilityMatrix({ rows, dimension, loading }: PerformanceProfitabilityMatrixProps) {
  return (
    <Card className="p-5 ph-surface-card">
      <h2 className="text-lg font-semibold ph-heading mb-1">Profitability matrix</h2>
      <p className="text-xs ph-muted mb-4">
        After discounts, wallet, incentives & commissions · {dimensionLabel(dimension)}
      </p>
      {loading ? (
        <p className="text-sm ph-muted">Loading profitability…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm ph-muted">
          No profitability data for this period — apply migration 20260718120002 and ensure invoices / incentive runs exist.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left ph-muted text-xs uppercase tracking-wide">
                <th className="py-3 pr-3">Dimension</th>
                <th className="py-3 pr-3">Entity</th>
                <th className="py-3 pr-3 text-right">Revenue</th>
                <th className="py-3 pr-3 text-right">Discount / wallet</th>
                <th className="py-3 pr-3 text-right">Incentive</th>
                <th className="py-3 pr-3 text-right">Net margin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.groupKey}-${r.dimension}`} className="border-b last:border-0">
                  <td className="py-3 pr-3 text-xs ph-muted font-semibold">{dimensionLabel(r.dimension)}</td>
                  <td className="py-3 pr-3 font-semibold ph-heading">{r.groupLabel}</td>
                  <td className="py-3 pr-3 text-right font-mono tabular-nums">{formatInr(r.revenueInr)}</td>
                  <td className="py-3 pr-3 text-right font-mono tabular-nums text-amber-700">
                    −{formatInr(r.discountInr)}
                  </td>
                  <td className="py-3 pr-3 text-right font-mono tabular-nums text-amber-700">
                    −{formatInr(r.incentiveInr + r.commissionInr)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <span
                      className={cn(
                        "inline-flex rounded px-2 py-0.5 font-mono text-xs font-semibold tabular-nums",
                        marginHeatClass(r.netMarginPct),
                      )}
                    >
                      {r.netMarginPct != null ? `${r.netMarginPct}%` : "—"}
                    </span>
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
