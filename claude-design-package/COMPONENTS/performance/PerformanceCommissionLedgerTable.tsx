import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { CommissionLedgerRow } from "@/incentives/lib/commissionTrackingCmsLogic";
import { formatInr } from "@/lib/performanceHubTheme";

interface PerformanceCommissionLedgerTableProps {
  rows: CommissionLedgerRow[];
  loading?: boolean;
}

function money(n: number, currency: string) {
  if (!n) return <span className="ph-muted">—</span>;
  const sym = currency === "INR" ? "₹" : "";
  return (
    <span className="font-mono tabular-nums">
      {sym}
      {n.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      {currency !== "INR" ? ` ${currency}` : ""}
    </span>
  );
}

export function PerformanceCommissionLedgerTable({ rows, loading }: PerformanceCommissionLedgerTableProps) {
  return (
    <Card className="p-5 ph-surface-card">
      <h2 className="text-lg font-semibold ph-heading mb-1">Commission ledger</h2>
      <p className="text-xs ph-muted mb-4">Institution and partner commissions in original currency with INR consolidation</p>
      {loading ? (
        <p className="text-sm ph-muted">Loading ledger…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm ph-muted">No commission students for this year yet — data comes from institution claim cycles.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left ph-muted text-xs uppercase tracking-wide">
                <th className="py-3 pr-3">Partner / source</th>
                <th className="py-3 pr-3">Type</th>
                <th className="py-3 pr-3">Cur</th>
                <th className="py-3 pr-3 text-right">Received</th>
                <th className="py-3 pr-3 text-right">Pending</th>
                <th className="py-3 pr-3 text-right">Reversed</th>
                <th className="py-3 pr-3 text-right">Forecast</th>
                <th className="py-3 pr-3 text-right">In INR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.institutionId} className="border-b last:border-0">
                  <td className="py-3 pr-3 font-semibold ph-heading">{r.partnerName}</td>
                  <td className="py-3 pr-3">
                    <Badge variant="secondary" className="border-0 bg-[var(--blueBg)] text-[var(--blue)]">
                      {r.type}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3 font-mono text-xs ph-muted">{r.currency}</td>
                  <td className="py-3 pr-3 text-right">{money(r.received, r.currency)}</td>
                  <td className="py-3 pr-3 text-right">{money(r.pending, r.currency)}</td>
                  <td className="py-3 pr-3 text-right">
                    {r.reversed ? (
                      <span className="font-mono tabular-nums text-red-700 dark:text-red-400">{money(r.reversed, r.currency)}</span>
                    ) : (
                      money(0, r.currency)
                    )}
                  </td>
                  <td className="py-3 pr-3 text-right ph-muted">{money(r.forecast, r.currency)}</td>
                  <td className="py-3 pr-3 text-right font-mono font-semibold tabular-nums ph-heading">
                    {formatInr(r.inInr)}
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
