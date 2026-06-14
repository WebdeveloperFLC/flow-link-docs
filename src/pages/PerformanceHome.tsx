import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformanceHomeKpiStrip } from "@/components/performance/PerformanceHomeKpiStrip";
import { PerformanceWalletAllocationCard } from "@/components/performance/PerformanceWalletAllocationCard";
import { PerformanceIncentiveProgressCard } from "@/components/performance/PerformanceIncentiveProgressCard";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { PerformanceTelecallerHome } from "@/components/performance/PerformanceTelecallerHome";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { usePerformanceHomeData } from "@/hooks/usePerformanceHomeData";
import { formatInr } from "@/lib/performanceHubTheme";
import { noTargetAchievementDetail } from "@/lib/performanceNoTargetCopy";
import { PerformanceMobileQuickBar } from "@/components/performance/PerformanceMobileQuickBar";
import {
  PERFORMANCE_MOBILE_DESKTOP_ONLY,
  PERFORMANCE_MOBILE_PAGE,
} from "@/lib/performanceMobileLayout";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Trophy, TrendingUp, Wallet, Megaphone } from "lucide-react";

const HIGHER_THAN_TELECALLER = [
  "admin",
  "administrator",
  "counselor",
  "manager",
  "documentation",
  "commission_admin",
] as const;

export default function PerformanceHome() {
  const { user, roles, hasRole } = useAuth();
  const { period } = usePerformancePeriod();
  const data = usePerformanceHomeData(user?.id, period);
  const [exceptionAmount, setExceptionAmount] = useState("");
  const [exceptionReason, setExceptionReason] = useState("");
  const [submittingException, setSubmittingException] = useState(false);
  const [hotClients, setHotClients] = useState<
    { client_id: string; full_name: string; propensity_score: number; propensity_band: string }[]
  >([]);
  const [walletImpact, setWalletImpact] = useState<{
    wallet_impact_revenue: number;
    wallet_used: number;
    roi: number | null;
  } | null>(null);
  const [offerInfluence, setOfferInfluence] = useState<{
    direct_revenue: number;
    assisted_revenue: number;
    multi_service_revenue: number;
    total_influenced: number;
    wallet_discount_spent: number;
    offers_sent: number;
    redemptions: number;
  } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase.rpc("fn_counselor_offer_propensity_queue", { _limit: 5 }).then(({ data }) => {
      setHotClients(
        ((data ?? []) as {
          client_id: string;
          full_name: string;
          propensity_score: number;
          propensity_band: string;
        }[]).filter((r) => r.propensity_band === "hot" || r.propensity_score >= 35),
      );
    });
    supabase.rpc("fn_counselor_wallet_impact", { _period_key: period }).then(({ data }) => {
      const row = data as {
        found?: boolean;
        wallet_impact_revenue?: number;
        wallet_used?: number;
        roi?: number | null;
      } | null;
      if (row?.found) {
        setWalletImpact({
          wallet_impact_revenue: Number(row.wallet_impact_revenue ?? 0),
          wallet_used: Number(row.wallet_used ?? 0),
          roi: row.roi ?? null,
        });
      } else {
        setWalletImpact(null);
      }
    });
    supabase.rpc("fn_counselor_offer_influence", { _period_key: period }).then(({ data }) => {
      const row = data as {
        found?: boolean;
        direct_revenue?: number;
        assisted_revenue?: number;
        multi_service_revenue?: number;
        total_influenced?: number;
        wallet_discount_spent?: number;
        offers_sent?: number;
        redemptions?: number;
      } | null;
      if (
        row?.found &&
        (Number(row.total_influenced ?? 0) > 0 ||
          Number(row.offers_sent ?? 0) > 0 ||
          Number(row.wallet_discount_spent ?? 0) > 0)
      ) {
        setOfferInfluence({
          direct_revenue: Number(row.direct_revenue ?? 0),
          assisted_revenue: Number(row.assisted_revenue ?? 0),
          multi_service_revenue: Number(row.multi_service_revenue ?? 0),
          total_influenced: Number(row.total_influenced ?? 0),
          wallet_discount_spent: Number(row.wallet_discount_spent ?? 0),
          offers_sent: Number(row.offers_sent ?? 0),
          redemptions: Number(row.redemptions ?? 0),
        });
      } else {
        setOfferInfluence(null);
      }
    });
  }, [user?.id, period]);

  const isTelecallerOnly =
    hasRole("telecaller") && !roles.some((r) => HIGHER_THAN_TELECALLER.includes(r as (typeof HIGHER_THAN_TELECALLER)[number]));

  if (isTelecallerOnly && user) {
    return (
      <AppLayout>
        <PerformanceTelecallerHome
          userId={user.id}
          profileName={data.profileName}
          branchName={data.branchName}
        />
      </AppLayout>
    );
  }

  const achPct = data.wallet?.achievementPct;
  const target = data.wallet?.assignedTarget;
  const hasNoTarget = !data.loading && target == null;
  const targetLabel = hasNoTarget
    ? noTargetAchievementDetail(data.period)
    : target != null
      ? `${formatInr(data.revenueAchieved, data.revenueCurrency)} of ${formatInr(target, data.wallet?.currency ?? "INR")} · net revenue`
      : null;

  async function submitWalletException() {
    const amount = Number(exceptionAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!exceptionReason.trim()) {
      toast.error("Reason required");
      return;
    }
    setSubmittingException(true);
    try {
      const { data: res, error } = await supabase.rpc("fn_submit_wallet_exception_request", {
        _amount: amount,
        _reason: exceptionReason.trim(),
        _period_key: data.period,
      });
      if (error) throw error;
      toast.success(String((res as { message?: string })?.message ?? "Submitted for manager approval"));
      setExceptionAmount("");
      setExceptionReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmittingException(false);
    }
  }

  return (
    <AppLayout>
      <div className={PERFORMANCE_MOBILE_PAGE} data-testid="performance-mobile-shell">
        <PerformanceHubHeader
          title="My commercial performance"
          subtitle={`Revenue, wallet and incentives — ${data.period}`}
          profileName={data.profileName}
          branchName={data.branchName}
          period={data.period}
          primaryAction={{ label: "Give discount", to: "/performance/give-discount" }}
        />

        <PerformancePeriodBar compact className="md:hidden" />
        <PerformancePeriodBar className="hidden md:flex" />

        <PerformanceHomeKpiStrip
          loading={data.loading}
          items={[
            {
              module: "cash",
              label: "Revenue booked",
              value: formatInr(data.revenueAchieved, data.revenueCurrency),
              hint: data.breakdown
                ? `${data.breakdown.eventCount} qualifying events this period`
                : "Net qualifying revenue",
              testId: "kpi-revenue",
            },
            {
              module: "offers",
              label: "Qualifying events",
              value: data.breakdown ? String(data.breakdown.eventCount) : "—",
              hint: "Coaching · visa · admissions · allied",
            },
            {
              module: "wallet",
              label: "Target achievement",
              value: hasNoTarget ? "—" : achPct != null ? `${achPct}%` : "—",
              hint: hasNoTarget ? noTargetAchievementDetail(data.period) : targetLabel,
            },
            {
              module: "cash",
              label: data.hasLockedRun ? "Incentive earned" : "Incentive projected",
              value: formatInr(data.hasLockedRun ? data.earnedLocked : data.earnedProjected, "INR"),
              hint: data.hasLockedRun ? "Locked run total" : "Month-end projection",
              testId: "kpi-incentive-earned",
            },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PerformanceWalletAllocationCard data={data} />
          <PerformanceIncentiveProgressCard data={data} />
        </div>

        {offerInfluence && (
          <Card className={cn("p-5 border-l-4 border-l-emerald-500", PERFORMANCE_MOBILE_DESKTOP_ONLY)}>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Megaphone className="size-5 text-emerald-600" />
              Your offer influence (O10) · {period}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Direct</p>
                <p className="font-semibold tabular-nums">{formatInr(offerInfluence.direct_revenue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assisted</p>
                <p className="font-semibold tabular-nums">{formatInr(offerInfluence.assisted_revenue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Multi-service</p>
                <p className="font-semibold tabular-nums">{formatInr(offerInfluence.multi_service_revenue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total influenced</p>
                <p className="font-semibold tabular-nums">{formatInr(offerInfluence.total_influenced)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {offerInfluence.offers_sent} sent · {offerInfluence.redemptions} redeemed ·{" "}
              {formatInr(offerInfluence.wallet_discount_spent)} wallet discounts applied
            </p>
            <Link to="/performance/offers/analytics" className="text-xs text-primary hover:underline mt-2 inline-block">
              Branch-wide analytics →
            </Link>
          </Card>
        )}

        {walletImpact && (walletImpact.wallet_impact_revenue > 0 || walletImpact.wallet_used > 0) && (
          <Card className={cn("p-4 border-l-4 border-l-violet-500 bg-violet-500/5", PERFORMANCE_MOBILE_DESKTOP_ONLY)}>
            <p className="text-sm">
              <span className="font-medium">Wallet impact revenue (WIR)</span> —{" "}
              {formatInr(walletImpact.wallet_impact_revenue)} influenced via wallet discounts ·{" "}
              {formatInr(walletImpact.wallet_used)} wallet spent
              {walletImpact.roi != null && (
                <>
                  {" "}
                  · ROI{" "}
                  <span className="font-semibold">{walletImpact.roi.toFixed(1)}×</span>
                </>
              )}
            </p>
            <Link to="/performance/offers/analytics" className="text-xs text-primary hover:underline mt-2 inline-block">
              Full offer analytics →
            </Link>
          </Card>
        )}

        {hotClients.length > 0 && (
          <Card className={cn("p-5 border-l-4 border-l-red-500", PERFORMANCE_MOBILE_DESKTOP_ONLY)}>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="size-5 text-red-600" />
              Hot clients for offers (I5)
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              Rule-based propensity — open a client record to see the full suggestion card.
            </p>
            <div className="flex flex-wrap gap-2">
              {hotClients.map((c) => (
                <Link
                  key={c.client_id}
                  to={`/clients/${c.client_id}`}
                  className="text-sm rounded-md border px-3 py-1.5 hover:bg-muted/50"
                >
                  {c.full_name}{" "}
                  <span className="text-muted-foreground capitalize">
                    · {c.propensity_band} {c.propensity_score}
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        )}

        {data.planStack.length > 0 && data.planStack.length > 4 && (
          <Card className={cn("p-5 ph-surface-card", PERFORMANCE_MOBILE_DESKTOP_ONLY)}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              Stacked plans (I7)
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Combined earnings across your assigned base + overlay plans this period.
            </p>
            <div className="space-y-2 text-sm">
              {data.planStack.map((row) => (
                <div key={`${row.plan_name}-${row.plan_stack_role}`} className="flex justify-between border-b pb-2 last:border-0">
                  <span>
                    {row.plan_name}
                    <span className="text-muted-foreground ml-2 capitalize">({row.plan_stack_role})</span>
                    {row.run_locked ? " · locked" : ""}
                  </span>
                  <span className="font-medium">{formatInr(row.earned_amount, row.settlement_currency)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 font-semibold">
                <span>Stack total</span>
                <span>{formatInr(data.planStackTotal, "INR")}</span>
              </div>
            </div>
          </Card>
        )}

        {data.walletDiscountTotal > 0 && (
          <Card className={cn("p-4 border-l-4 border-l-violet-500 bg-violet-500/5", PERFORMANCE_MOBILE_DESKTOP_ONLY)}>
            <p className="text-sm">
              <span className="font-medium">Discounts reduced your incentive base</span> by{" "}
              {formatInr(data.walletDiscountTotal, data.wallet?.currency ?? "INR")} this period (wallet allocations
              subtract pro-rata from net revenue).
            </p>
          </Card>
        )}

        {data.wallet && (
          <Card className={cn("p-4 border-l-4 border-l-amber-500 bg-amber-500/5", PERFORMANCE_MOBILE_DESKTOP_ONLY)}>
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="size-4 text-amber-600" />
              <h2 className="font-semibold text-sm">Request wallet exception</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Need extra budget this period? Submit to your branch manager — approved requests add an exception top-up.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="text-xs">Amount (₹)</Label>
                <Input
                  type="number"
                  value={exceptionAmount}
                  onChange={(e) => setExceptionAmount(e.target.value)}
                  placeholder="5000"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Reason</Label>
                <Textarea
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                  placeholder="Key deal closing this week…"
                  rows={2}
                />
              </div>
            </div>
            <Button size="sm" disabled={submittingException} onClick={submitWalletException}>
              Submit to manager
            </Button>
          </Card>
        )}

        {data.breakdown && (
          <Card className={cn("p-5", PERFORMANCE_MOBILE_DESKTOP_ONLY)}>
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

        <Card className={cn("p-5", PERFORMANCE_MOBILE_DESKTOP_ONLY)}>
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
          <Card className={cn("p-5", PERFORMANCE_MOBILE_DESKTOP_ONLY)}>
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

        <div className={cn("flex flex-wrap gap-2", PERFORMANCE_MOBILE_DESKTOP_ONLY)}>
          <Button variant="outline" asChild>
            <Link to="/guides/incentives-module">Incentives guide</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/guides/offers-wallet-staff">Offers &amp; wallet guide</Link>
          </Button>
        </div>

        <PerformanceMobileQuickBar />
      </div>
    </AppLayout>
  );
}
