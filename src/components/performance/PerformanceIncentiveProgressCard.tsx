import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { formatInr } from "@/lib/performanceHubTheme";
import { noTargetAchievementDetail } from "@/lib/performanceNoTargetCopy";
import { Trophy } from "lucide-react";
import type { PerformanceHomeData } from "@/hooks/usePerformanceHomeData";

interface PerformanceIncentiveProgressCardProps {
  data: PerformanceHomeData;
}

export function PerformanceIncentiveProgressCard({ data }: PerformanceIncentiveProgressCardProps) {
  const target = data.wallet?.assignedTarget;
  const hasNoTarget = !data.loading && target == null;
  const progressPct =
    target && target > 0
      ? Math.min(100, Math.round((data.revenueAchieved / target) * 100))
      : data.wallet?.achievementPct != null
        ? Math.min(100, Math.round(data.wallet.achievementPct))
        : 0;

  const gapToTarget =
    target && target > data.revenueAchieved ? target - data.revenueAchieved : null;

  const earned = data.hasLockedRun ? data.earnedLocked : data.earnedProjected;

  return (
    <Card className="p-5 ph-surface-card border-l-4 ph-module-cash">
      <h2 className="text-lg font-semibold ph-heading flex items-center gap-2 mb-4">
        <Trophy className="size-5" style={{ color: "var(--cash)" }} />
        Incentive progress
      </h2>

      <div className="rounded-lg border ph-period-bar p-4 mb-4">
        <p className="text-xs ph-muted uppercase tracking-wide">
          {hasNoTarget ? "Revenue this period" : "Target achievement · net revenue"}
        </p>
        {hasNoTarget ? (
          <p className="text-sm ph-muted mt-2">{noTargetAchievementDetail(data.period)}</p>
        ) : (
          <>
            <p className="text-sm font-medium mt-2 ph-heading">
              {formatInr(data.revenueAchieved, data.revenueCurrency)} / {formatInr(target!, data.wallet?.currency ?? "INR")}
            </p>
            <div className="ph-tier-bar mt-3">
              <span className="ph-tier-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-xs ph-muted mt-1.5">{progressPct}% of assigned target</p>
          </>
        )}
      </div>

      {gapToTarget != null && gapToTarget > 0 && (
        <div className="rounded-md border border-[var(--blue)]/30 bg-[var(--blueBg)] px-3 py-2 text-sm mb-4">
          <span className="font-medium" style={{ color: "var(--blue)" }}>
            {formatInr(gapToTarget, data.revenueCurrency)}
          </span>{" "}
          to full target — more qualifying revenue unlocks wallet potential.
        </div>
      )}

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="ph-muted">
            {data.hasLockedRun ? "Cash incentive (locked)" : "Cash incentive (projected)"}
          </span>
          <span className="font-semibold tabular-nums" data-testid="kpi-incentive-earned">
            {formatInr(earned, "INR")}
          </span>
        </div>
        {data.planStack.length > 0 &&
          data.planStack.slice(0, 4).map((row) => (
            <div key={`${row.plan_name}-${row.plan_stack_role}`} className="flex justify-between">
              <span className="ph-muted truncate pr-2">
                {row.plan_name}
                <span className="capitalize"> · {row.plan_stack_role}</span>
              </span>
              <span className="tabular-nums shrink-0">{formatInr(row.earned_amount, row.settlement_currency)}</span>
            </div>
          ))}
        {data.planStack.length > 0 && (
          <div className="flex justify-between pt-2 border-t font-semibold">
            <span>Stack total</span>
            <span className="tabular-nums">{formatInr(data.planStackTotal, "INR")}</span>
          </div>
        )}
      </div>

      <Link
        to="/performance/how-it-works"
        className="text-xs font-medium mt-4 inline-block hover:underline"
        style={{ color: "var(--blue)" }}
      >
        How incentives are calculated →
      </Link>
    </Card>
  );
}
