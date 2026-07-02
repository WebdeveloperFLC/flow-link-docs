import { Card } from "@/components/ui/card";

export interface DualTrendPoint {
  period: string;
  label: string;
  valueA: number;
  valueB: number;
}

export function PerformanceComparisonTrendOverlay({
  points,
  labelA,
  labelB,
  loading,
}: {
  points: DualTrendPoint[];
  labelA: string;
  labelB: string;
  loading?: boolean;
}) {
  const max = points.reduce((m, p) => Math.max(m, p.valueA, p.valueB), 0) || 1;

  return (
    <Card className="p-5 ph-surface-card">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold ph-heading">Revenue trend overlay</h2>
        <div className="flex gap-3 text-xs ph-muted">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-[var(--blue)]" /> {labelA}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-[var(--blue)]/40" /> {labelB}
          </span>
        </div>
      </div>
      {loading ? (
        <p className="text-sm ph-muted">Loading trend…</p>
      ) : points.length === 0 ? (
        <p className="text-sm ph-muted">No trend data for selected entities.</p>
      ) : (
        <div className="flex items-end gap-2 h-36">
          {points.map((p) => (
            <div key={p.period} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div className="flex items-end gap-0.5 w-full h-24">
                <div
                  className="flex-1 rounded-t bg-[var(--blue)]"
                  style={{ height: `${Math.max(4, Math.round((p.valueA / max) * 100))}%` }}
                />
                <div
                  className="flex-1 rounded-t bg-[var(--blue)]/40"
                  style={{ height: `${Math.max(4, Math.round((p.valueB / max) * 100))}%` }}
                />
              </div>
              <span className="text-xs ph-muted">{p.label}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs ph-muted mt-3">Qualifying revenue · INR base</p>
    </Card>
  );
}
