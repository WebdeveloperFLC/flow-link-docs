import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { StatusBadge, StatusBar } from "@/components/performance/PerformanceAchievementStatus";
import { formatInr, formatAchievementPct } from "@/lib/performanceHubTheme";
import { noTargetAchievementDetail } from "@/lib/performanceNoTargetCopy";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceDashboardHeroProps {
  loading?: boolean;
  period: string;
  achievementPct: number | null;
  assignedTarget: number | null;
  revenueAchieved: number;
  revenueCurrency: string;
  eventCount?: number;
  className?: string;
}

/** Dashboard Q1 — hero metric with achievement band and trace entry. */
export function PerformanceDashboardHero({
  loading,
  period,
  achievementPct,
  assignedTarget,
  revenueAchieved,
  revenueCurrency,
  eventCount,
  className,
}: PerformanceDashboardHeroProps) {
  const hasNoTarget = !loading && assignedTarget == null;

  return (
    <Card className={cn("p-5 ph-surface-card", className)}>
      <p className="text-[11px] uppercase tracking-wide ph-muted font-medium">How am I performing?</p>

      {loading ? (
        <p className="text-4xl font-semibold ph-heading mt-2 tabular-nums">…</p>
      ) : hasNoTarget ? (
        <>
          <p className="text-3xl font-semibold ph-heading mt-2 tabular-nums">{formatInr(revenueAchieved, revenueCurrency)}</p>
          <p className="text-sm ph-muted mt-2">{noTargetAchievementDetail(period)}</p>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3 mt-2">
            <p className="text-4xl font-semibold ph-heading tabular-nums">{formatAchievementPct(achievementPct)}</p>
            {achievementPct != null && <StatusBadge pct={achievementPct} />}
          </div>
          <p className="text-sm ph-muted mt-2">
            {formatInr(revenueAchieved, revenueCurrency)} net qualifying revenue
            {assignedTarget != null && (
              <>
                {" "}
                · target {formatInr(assignedTarget, revenueCurrency)}
              </>
            )}
            {eventCount != null && eventCount > 0 && <> · {eventCount} verified events</>}
          </p>
          {achievementPct != null && (
            <div className="mt-4 max-w-md">
              <StatusBar pct={achievementPct} maxPct={120} />
            </div>
          )}
        </>
      )}

      <Link
        to="/performance/analytics"
        className="inline-flex items-center gap-1 text-xs text-primary mt-4 hover:underline"
      >
        Open revenue analytics
        <ChevronRight className="size-3.5" />
      </Link>
    </Card>
  );
}
