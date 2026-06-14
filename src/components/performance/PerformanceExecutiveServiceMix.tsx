import { Card } from "@/components/ui/card";
import type { MixSlice } from "@/incentives/lib/executiveDashboardLogic";

const COLORS = ["var(--cash)", "var(--blue)", "var(--wallet)", "var(--offer)", "var(--violet)", "var(--faint)"];

export function PerformanceExecutiveServiceMix({
  slices,
  loading,
}: {
  slices: MixSlice[];
  loading?: boolean;
}) {
  return (
    <Card className="p-5 ph-surface-card h-full">
      <h2 className="text-lg font-semibold ph-heading mb-4">Revenue by service line</h2>
      {loading ? (
        <p className="text-sm ph-muted">Loading…</p>
      ) : slices.length === 0 ? (
        <p className="text-sm ph-muted">No service mix data.</p>
      ) : (
        <ul className="space-y-3">
          {slices.map((slice, i) => (
            <li key={slice.label}>
              <div className="flex justify-between text-sm mb-1">
                <span>{slice.label}</span>
                <span className="tabular-nums font-medium">{slice.pct}%</span>
              </div>
              <div className="ph-tier-bar">
                <span
                  className="ph-tier-fill"
                  style={{ width: `${slice.pct}%`, background: COLORS[i % COLORS.length] }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
