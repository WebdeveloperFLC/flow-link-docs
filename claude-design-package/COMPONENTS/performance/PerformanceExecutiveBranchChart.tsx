import { Card } from "@/components/ui/card";
import { branchAttainmentPct } from "@/incentives/lib/executiveDashboardLogic";
import { formatInr } from "@/lib/performanceHubTheme";

interface BranchRow {
  name: string;
  revenue: number;
  achievementPct: number | null;
}

export function PerformanceExecutiveBranchChart({
  rows,
  loading,
  title = "Revenue vs target by branch",
}: {
  rows: BranchRow[];
  loading?: boolean;
  title?: string;
}) {
  const maxRevenue = rows.reduce((m, r) => Math.max(m, r.revenue), 0);

  return (
    <Card className="p-5 ph-surface-card h-full">
      <h2 className="text-lg font-semibold ph-heading mb-4">{title}</h2>
      {loading ? (
        <p className="text-sm ph-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm ph-muted">No branch data this period.</p>
      ) : (
        <ul className="space-y-3">
          {rows.slice(0, 8).map((row) => {
            const pct = row.achievementPct ?? branchAttainmentPct(row.revenue, maxRevenue);
            return (
              <li key={row.name}>
                <div className="flex justify-between text-sm mb-1 gap-2">
                  <span className="truncate">{row.name}</span>
                  <span className="tabular-nums font-medium shrink-0">{formatInr(row.revenue)}</span>
                </div>
                <div className="ph-tier-bar">
                  <span className="ph-tier-fill" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] ph-muted mt-1">{pct}% attainment</p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
