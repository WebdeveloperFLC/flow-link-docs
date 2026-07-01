import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/performance/PerformanceAchievementStatus";
import { formatInr } from "@/lib/performanceHubTheme";
import { ChevronRight } from "lucide-react";

export type RankSummaryEntry = {
  rank: number;
  label: string;
  amount: number;
  isYou?: boolean;
};

interface RankSummaryCardProps {
  loading?: boolean;
  entries: RankSummaryEntry[];
  currency?: string;
  period: string;
  yourRank?: number | null;
  totalRanked?: number;
}

/** Dashboard Q2 — rank summary only; full leaderboard lives in Reports. */
export function RankSummaryCard({
  loading,
  entries,
  currency = "INR",
  period,
  yourRank,
  totalRanked,
}: RankSummaryCardProps) {
  const you = entries.find((e) => e.isYou);
  const ahead = you ? entries.filter((e) => e.rank < you.rank).slice(-1)[0] : null;
  const behind = you ? entries.find((e) => e.rank === you.rank + 1) : null;

  return (
    <Card className="p-5 ph-surface-card">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide ph-muted font-medium">Where do I rank?</p>
          {loading ? (
            <p className="text-2xl font-semibold ph-heading mt-1 tabular-nums">…</p>
          ) : yourRank != null && totalRanked != null ? (
            <p className="text-2xl font-semibold ph-heading mt-1 tabular-nums">
              #{yourRank} <span className="text-base font-normal ph-muted">of {totalRanked}</span>
            </p>
          ) : you ? (
            <p className="text-2xl font-semibold ph-heading mt-1 tabular-nums">
              #{you.rank} <span className="text-base font-normal ph-muted">this period</span>
            </p>
          ) : (
            <p className="text-sm ph-muted mt-2">No rank yet — qualifying revenue unlocks leaderboard position.</p>
          )}
        </div>
        <Link
          to="/performance/compare"
          className="text-xs text-primary inline-flex items-center gap-0.5 shrink-0 hover:underline"
        >
          Full comparison
          <ChevronRight className="size-3.5" />
        </Link>
      </div>

      {!loading && you && (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center rounded-md px-2 py-1.5 bg-primary/5">
            <span className="font-medium">You · #{you.rank}</span>
            <span className="tabular-nums">{formatInr(you.amount, currency)}</span>
          </div>
          {ahead && (
            <p className="text-xs ph-muted">
              <span className="font-medium text-foreground">{ahead.label}</span> is #{ahead.rank} (
              {formatInr(ahead.amount - you.amount, currency)} ahead)
            </p>
          )}
          {behind && (
            <p className="text-xs ph-muted">
              <span className="font-medium text-foreground">{behind.label}</span> is #{behind.rank} (
              {formatInr(you.amount - behind.amount, currency)} behind you)
            </p>
          )}
        </div>
      )}

      <p className="text-[11px] ph-muted mt-3">Revenue rank · {period} · detailed leaderboard in Reports</p>
    </Card>
  );
}
