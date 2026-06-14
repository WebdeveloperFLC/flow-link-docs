import { Card } from "@/components/ui/card";
import type { CurrencyMixSlice } from "@/incentives/lib/multiCurrencyCmsLogic";
import { formatInr } from "@/lib/performanceHubTheme";

interface PerformanceCurrencyMixPanelProps {
  mix: CurrencyMixSlice[];
  loading?: boolean;
}

const COLORS = ["var(--blue)", "#2284C5", "#6D4AC9", "#C97A06", "#0E8F62"];

export function PerformanceCurrencyMixPanel({ mix, loading }: PerformanceCurrencyMixPanelProps) {
  const total = mix.reduce((s, m) => s + m.revenueInr, 0);

  return (
    <Card className="p-5 ph-surface-card h-full">
      <h2 className="text-lg font-semibold ph-heading mb-4">Revenue by currency (INR equiv.)</h2>
      {loading ? (
        <p className="text-sm ph-muted">Loading mix…</p>
      ) : mix.length === 0 || total <= 0 ? (
        <p className="text-sm ph-muted">No invoiced revenue in this period yet.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex h-4 rounded-full overflow-hidden bg-muted">
            {mix.map((m, i) => (
              <div
                key={m.code}
                style={{
                  width: `${Math.max(m.sharePct, 1)}%`,
                  background: COLORS[i % COLORS.length],
                }}
                title={`${m.code} ${m.sharePct}%`}
              />
            ))}
          </div>
          <div className="space-y-2">
            {mix.map((m, i) => (
              <div key={m.code} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 ph-muted">
                  <span className="size-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {m.code}
                </span>
                <span className="font-mono tabular-nums ph-heading">
                  {m.sharePct}% · {formatInr(m.revenueInr)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
