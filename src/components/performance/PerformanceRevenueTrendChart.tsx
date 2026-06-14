import { Card } from "@/components/ui/card";
import type { RevenueTrendPoint } from "@/hooks/useRevenueAnalyticsData";
import { formatInr } from "@/lib/performanceHubTheme";

export function PerformanceRevenueTrendChart({
  points,
  loading,
}: {
  points: RevenueTrendPoint[];
  loading?: boolean;
}) {
  const max = points.reduce((m, p) => Math.max(m, p.revenue), 0) || 1;

  return (
    <Card className="p-5 ph-surface-card h-full">
      <h2 className="text-lg font-semibold ph-heading mb-4">6-month revenue trend</h2>
      {loading ? (
        <p className="text-sm ph-muted">Loading trend…</p>
      ) : points.length === 0 ? (
        <p className="text-sm ph-muted">No qualifying revenue in range.</p>
      ) : (
        <>
          <div className="flex items-end gap-2 h-40">
            {points.map((p) => {
              const h = Math.max(4, Math.round((p.revenue / max) * 100));
              return (
                <div key={p.period} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className="text-[10px] tabular-nums ph-muted truncate w-full text-center">
                    {p.revenue > 0 ? formatInr(p.revenue) : "—"}
                  </span>
                  <div
                    className="w-full rounded-t bg-[var(--blue)]"
                    style={{ height: `${h}%`, minHeight: 4 }}
                    title={`${p.label}: ${formatInr(p.revenue)}`}
                  />
                  <span className="text-xs ph-muted">{p.label}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs ph-muted mt-3">Qualifying revenue from incentive events · INR base</p>
        </>
      )}
    </Card>
  );
}
