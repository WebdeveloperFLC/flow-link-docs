import { Card } from "@/components/ui/card";
import { formatInr } from "@/lib/performanceHubTheme";

interface BranchRow {
  name: string;
  revenue: number;
  achievementPct: number | null;
}

interface CounselorRow {
  name: string;
  branchName: string | null;
  netRevenue: number;
  targetPct: number | null;
}

export function PerformanceExecutiveLeaderboards({
  branchRows,
  counselorRows,
  loading,
}: {
  branchRows: BranchRow[];
  counselorRows: CounselorRow[];
  loading?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-5 ph-surface-card">
        <h2 className="text-lg font-semibold ph-heading mb-4">Branch leaderboard</h2>
        {loading ? (
          <p className="text-sm ph-muted">Loading…</p>
        ) : branchRows.length === 0 ? (
          <p className="text-sm ph-muted">No branch data.</p>
        ) : (
          <ol className="space-y-2">
            {branchRows.slice(0, 5).map((b, i) => (
              <li key={b.name} className="flex items-center justify-between text-sm gap-2">
                <span>
                  <span className="ph-muted mr-2">#{i + 1}</span>
                  {b.name}
                </span>
                <span className="tabular-nums font-medium">
                  {formatInr(b.revenue)}
                  {b.achievementPct != null && (
                    <span className="text-xs ph-muted ml-2">{b.achievementPct}% avg</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card className="p-5 ph-surface-card">
        <h2 className="text-lg font-semibold ph-heading mb-4">Counselor ranking</h2>
        {loading ? (
          <p className="text-sm ph-muted">Loading…</p>
        ) : counselorRows.length === 0 ? (
          <p className="text-sm ph-muted">No counselor data.</p>
        ) : (
          <ol className="space-y-2">
            {counselorRows.slice(0, 5).map((c, i) => (
              <li key={`${c.name}-${i}`} className="flex items-center justify-between text-sm gap-2">
                <span>
                  <span className="ph-muted mr-2">#{i + 1}</span>
                  {c.name}
                  {c.branchName && <span className="text-xs ph-muted ml-1">· {c.branchName}</span>}
                </span>
                <span className="tabular-nums font-medium">{formatInr(c.netRevenue)}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
