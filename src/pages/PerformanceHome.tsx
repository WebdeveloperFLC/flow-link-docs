import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformanceMetricCard } from "@/components/performance/PerformanceMetricCard";
import { usePerformanceHomeData } from "@/hooks/usePerformanceHomeData";
import { formatInr } from "@/lib/performanceHubTheme";
import { Trophy, TrendingUp } from "lucide-react";

export default function PerformanceHome() {
  const { user } = useAuth();
  const data = usePerformanceHomeData(user?.id);

  const achPct = data.wallet?.achievementPct;
  const target = data.wallet?.assignedTarget;
  const targetLabel =
    target != null
      ? `${formatInr(data.revenueAchieved, data.revenueCurrency)} of ${formatInr(target, data.wallet?.currency ?? "INR")} · net revenue`
      : "No target assigned — contact admin";

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-6xl">
        <PerformanceHubHeader
          title="My performance"
          subtitle={`Incentives, wallet and offers in one home — ${data.period}`}
          profileName={data.profileName}
          branchName={data.branchName}
          period={data.period}
          primaryAction={{ label: "Give discount", to: "/incentives/give-discount" }}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PerformanceMetricCard
            module="cash"
            label="Target achievement"
            value={data.loading ? "…" : achPct != null ? `${achPct}%` : "—"}
            detail={data.loading ? null : targetLabel}
          />
          <PerformanceMetricCard
            module="wallet"
            label="Discount wallet"
            value={
              data.loading
                ? "…"
                : data.wallet
                  ? formatInr(data.wallet.spendable, data.wallet.currency)
                  : "—"
            }
            detail={
              data.wallet ? (
                <>
                  <span className="font-medium text-foreground">Spendable now</span>
                  {" · "}
                  {formatInr(data.wallet.unlocked, data.wallet.currency)} unlocked of{" "}
                  {formatInr(data.wallet.potential, data.wallet.currency)} potential
                  {" · "}
                  {formatInr(data.wallet.spent, data.wallet.currency)} spent
                </>
              ) : (
                "No wallet this period"
              )
            }
          />
          <PerformanceMetricCard
            module="cash"
            label={data.hasLockedRun ? "Cash incentive (locked)" : "Cash incentive (projected)"}
            value={
              data.loading
                ? "…"
                : formatInr(data.hasLockedRun ? data.earnedLocked : data.earnedProjected, "INR")
            }
            footer={
              data.hasLockedRun
                ? `Locked run total ${formatInr(data.earnedLocked, "INR")} · projected month-end ${formatInr(data.earnedProjected, "INR")}`
                : "Pays after finance locks the period run"
            }
          />
        </div>

        {data.walletDiscountTotal > 0 && (
          <Card className="p-4 border-l-4 border-l-violet-500 bg-violet-500/5">
            <p className="text-sm">
              <span className="font-medium">Discounts reduced your incentive base</span> by{" "}
              {formatInr(data.walletDiscountTotal, data.wallet?.currency ?? "INR")} this period (wallet allocations
              subtract pro-rata from net revenue).
            </p>
          </Card>
        )}

        {data.breakdown && (
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="size-5 text-emerald-600" />
              Revenue mix · qualifying events
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase">Core (coaching · visa · admissions)</p>
                <p className="text-xl font-semibold mt-1">{formatInr(data.breakdown.core, data.revenueCurrency)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Allied (docs · SIM · loan assist)</p>
                <p className="text-xl font-semibold mt-1">{formatInr(data.breakdown.allied, data.revenueCurrency)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Travel &amp; financial</p>
                <p className="text-xl font-semibold mt-1">{formatInr(data.breakdown.travel, data.revenueCurrency)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{data.breakdown.eventCount} qualifying events</p>
          </Card>
        )}

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="size-5 text-amber-500" />
            Leaderboard · revenue · {data.period}
          </h2>
          {data.branchLeaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground">No qualifying revenue yet this period.</p>
          ) : (
            <ul className="space-y-2">
              {data.branchLeaderboard.map((r) => (
                <li
                  key={r.rank}
                  className={`flex items-center justify-between text-sm py-1.5 px-2 rounded-md ${r.isYou ? "bg-emerald-500/10 font-medium" : ""}`}
                >
                  <span>
                    {r.rank}. {r.label}
                    {r.isYou ? " (you)" : ""}
                  </span>
                  <span className="tabular-nums">{formatInr(r.amount, data.revenueCurrency)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Branch contests use the same qualifying-event stream — see Competitions (admin).
          </p>
        </Card>

        {data.payouts.length > 0 && (
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-3">Recent payouts</h2>
            <ul className="text-sm space-y-2">
              {data.payouts.map((p, i) => (
                <li key={i} className="flex justify-between border-b last:border-0 pb-2">
                  <span className="capitalize">{p.status}</span>
                  <span>{formatInr(p.net, p.currency)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/guides/incentives-module">Incentives guide</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/guides/offers-wallet-staff">Offers &amp; wallet guide</Link>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
