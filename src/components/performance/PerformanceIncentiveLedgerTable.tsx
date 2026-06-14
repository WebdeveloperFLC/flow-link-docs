import { Card } from "@/components/ui/card";
import type { IncentiveLedgerCmsRow } from "@/incentives/lib/incentiveLedgerCmsLogic";
import { formatInr } from "@/lib/performanceHubTheme";
import { cn } from "@/lib/utils";

interface PerformanceIncentiveLedgerTableProps {
  rows: IncentiveLedgerCmsRow[];
  loading?: boolean;
}

function cellAmount(n: number, currency: string, tone?: "amber" | "blue" | "green" | "red") {
  if (!n) return <span className="ph-muted">—</span>;
  const toneClass =
    tone === "amber"
      ? "text-amber-700 dark:text-amber-400"
      : tone === "blue"
        ? "text-[var(--blue)]"
        : tone === "green"
          ? "text-emerald-700 dark:text-emerald-400"
          : tone === "red"
            ? "text-red-700 dark:text-red-400"
            : "";
  return (
    <span className={cn("font-mono tabular-nums", toneClass)}>{formatInr(n, currency)}</span>
  );
}

export function PerformanceIncentiveLedgerTable({ rows, loading }: PerformanceIncentiveLedgerTableProps) {
  return (
    <Card className="p-5 ph-surface-card">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-semibold ph-heading">Employee incentive ledger</h2>
          <p className="text-xs ph-muted">Lifecycle states per counselor</p>
        </div>
      </div>
      {loading ? (
        <p className="text-sm ph-muted">Loading ledger…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm ph-muted">No incentive earnings for this period yet — lock a run in Incentives Admin first.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left ph-muted text-xs uppercase tracking-wide">
                <th className="py-3 pr-3">Employee</th>
                <th className="py-3 pr-3">Branch</th>
                <th className="py-3 pr-3 text-right">Earned</th>
                <th className="py-3 pr-3 text-right">Approved</th>
                <th className="py-3 pr-3 text-right">Pending</th>
                <th className="py-3 pr-3 text-right">Eligible</th>
                <th className="py-3 pr-3 text-right">Paid</th>
                <th className="py-3 pr-3 text-right">Reversed</th>
                <th className="py-3 pr-3 text-right">Clawback</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.counselorId} className="border-b last:border-0">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                        {r.employeeName.slice(0, 2)}
                      </span>
                      <span className="font-semibold ph-heading">{r.employeeName}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-xs ph-muted">{r.branchName}</td>
                  <td className="py-3 pr-3 text-right font-semibold">{cellAmount(r.earned, r.currency)}</td>
                  <td className="py-3 pr-3 text-right">{cellAmount(r.approved, r.currency)}</td>
                  <td className="py-3 pr-3 text-right">{cellAmount(r.pending, r.currency, "amber")}</td>
                  <td className="py-3 pr-3 text-right">{cellAmount(r.eligible, r.currency, "blue")}</td>
                  <td className="py-3 pr-3 text-right">{cellAmount(r.paid, r.currency, "green")}</td>
                  <td className="py-3 pr-3 text-right">{cellAmount(r.reversed, r.currency)}</td>
                  <td className="py-3 pr-3 text-right">{cellAmount(r.clawback, r.currency, "red")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
