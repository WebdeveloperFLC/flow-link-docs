import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { CurrencyConfigRow } from "@/incentives/lib/multiCurrencyCmsLogic";
import { formatInr } from "@/lib/performanceHubTheme";
import { cn } from "@/lib/utils";

interface PerformanceCurrencyConfigTableProps {
  rows: CurrencyConfigRow[];
  loading?: boolean;
}

function statusClass(status: CurrencyConfigRow["status"]) {
  switch (status) {
    case "Base":
      return "bg-[var(--blueBg)] text-[var(--blue)]";
    case "Live":
      return "bg-emerald-100 text-emerald-800";
    case "Configured":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function PerformanceCurrencyConfigTable({ rows, loading }: PerformanceCurrencyConfigTableProps) {
  return (
    <Card className="p-5 ph-surface-card">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-semibold ph-heading">Currency configuration</h2>
          <p className="text-xs ph-muted">Base currency: INR</p>
        </div>
      </div>
      {loading ? (
        <p className="text-sm ph-muted">Loading rates…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm ph-muted">No FX rates configured — add rates in the FX desk.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left ph-muted text-xs uppercase tracking-wide">
                <th className="py-3 pr-3">Currency</th>
                <th className="py-3 pr-3">Code</th>
                <th className="py-3 pr-3 text-right">Rate → INR</th>
                <th className="py-3 pr-3 text-right">Revenue (orig)</th>
                <th className="py-3 pr-3 text-right">Revenue (INR)</th>
                <th className="py-3 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code} className="border-b last:border-0">
                  <td className="py-3 pr-3 font-semibold ph-heading">{r.name}</td>
                  <td className="py-3 pr-3 font-mono text-xs ph-muted">{r.code}</td>
                  <td className="py-3 pr-3 text-right font-mono tabular-nums">
                    {r.rateToInr > 0 ? r.rateToInr.toFixed(4) : "—"}
                    {r.manualOverride && (
                      <span className="block text-[10px] text-amber-700 dark:text-amber-400">manual override</span>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-right font-mono tabular-nums">
                    {r.revenueOriginal > 0
                      ? `${r.code === "INR" ? "₹" : ""}${r.revenueOriginal.toLocaleString()}${r.code !== "INR" ? ` ${r.code}` : ""}`
                      : "—"}
                  </td>
                  <td className="py-3 pr-3 text-right font-mono font-semibold tabular-nums ph-heading">
                    {r.revenueInr > 0 ? formatInr(r.revenueInr) : "—"}
                  </td>
                  <td className="py-3 pr-3">
                    <Badge variant="secondary" className={cn("border-0", statusClass(r.status))}>
                      {r.status}
                    </Badge>
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
