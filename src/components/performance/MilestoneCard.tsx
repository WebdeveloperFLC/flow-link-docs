import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { StatusBar } from "@/components/performance/PerformanceAchievementStatus";
import { formatInr, formatAchievementPct } from "@/lib/performanceHubTheme";
import { noTargetAchievementDetail } from "@/lib/performanceNoTargetCopy";
import { Target, ChevronRight } from "lucide-react";

interface MilestoneCardProps {
  loading?: boolean;
  period: string;
  achievementPct: number | null;
  assignedTarget: number | null;
  achievedAmount: number;
  currency?: string;
}

/** Dashboard Q6 — next target and gap framed as a path. */
export function MilestoneCard({
  loading,
  period,
  achievementPct,
  assignedTarget,
  achievedAmount,
  currency = "INR",
}: MilestoneCardProps) {
  const hasNoTarget = !loading && assignedTarget == null;
  const gap =
    assignedTarget != null && assignedTarget > achievedAmount ? assignedTarget - achievedAmount : 0;

  return (
    <Card className="p-5 ph-surface-card">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Target className="size-4 ph-muted" />
          <p className="text-[11px] uppercase tracking-wide ph-muted font-medium">Next milestone</p>
        </div>
        <Link to="/performance/analytics" className="text-xs text-primary inline-flex items-center gap-0.5 hover:underline">
          Revenue report
          <ChevronRight className="size-3.5" />
        </Link>
      </div>

      {loading ? (
        <p className="text-sm ph-muted">…</p>
      ) : hasNoTarget ? (
        <p className="text-sm ph-muted">{noTargetAchievementDetail(period)}</p>
      ) : (
        <>
          <p className="text-2xl font-semibold ph-heading tabular-nums">
            {formatAchievementPct(achievementPct)}{" "}
            <span className="text-base font-normal ph-muted">toward 100% target</span>
          </p>
          <p className="text-sm ph-muted mt-2">
            {formatInr(achievedAmount, currency)} of {formatInr(assignedTarget ?? 0, currency)} net revenue · {period}
          </p>
          {gap > 0 && (
            <p className="text-sm mt-2">
              <span className="font-medium">{formatInr(gap, currency)}</span> to unlock full wallet potential
            </p>
          )}
          {achievementPct != null && (
            <div className="mt-4">
              <StatusBar pct={achievementPct} maxPct={120} showPct={false} />
            </div>
          )}
        </>
      )}
    </Card>
  );
}
