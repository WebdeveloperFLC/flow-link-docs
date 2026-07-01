import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformanceDashboardHero } from "@/components/performance/PerformanceDashboardHero";
import { RankSummaryCard } from "@/components/performance/RankSummaryCard";
import { PerformanceExceptionQueue } from "@/components/performance/PerformanceExceptionQueue";
import { NextActionsCard } from "@/components/performance/NextActionsCard";
import { PendingListCard } from "@/components/performance/PendingListCard";
import { MilestoneCard } from "@/components/performance/MilestoneCard";
import { TraceGraph } from "@/components/performance/TraceGraph";
import { PerformanceWalletAllocationCard } from "@/components/performance/PerformanceWalletAllocationCard";
import { PerformanceIncentiveProgressCard } from "@/components/performance/PerformanceIncentiveProgressCard";
import { PerformanceTelecallerHome } from "@/components/performance/PerformanceTelecallerHome";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { usePerformanceEffectiveUserId } from "@/contexts/PerformanceHubViewAsContext";
import { usePerformanceHomeData } from "@/hooks/usePerformanceHomeData";
import { formatInr } from "@/lib/performanceHubTheme";
import { PerformanceMobileQuickBar } from "@/components/performance/PerformanceMobileQuickBar";
import {
  PERFORMANCE_MOBILE_DESKTOP_ONLY,
  PERFORMANCE_MOBILE_PAGE,
} from "@/lib/performanceMobileLayout";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Megaphone, TrendingUp, Wallet } from "lucide-react";

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
  const effectiveUserId = usePerformanceEffectiveUserId();
  const data = usePerformanceHomeData(effectiveUserId, period);
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
    if (!effectiveUserId) return;
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
  }, [effectiveUserId, period]);

  const isTelecallerOnly =
    hasRole("telecaller") && !roles.some((r) => HIGHER_THAN_TELECALLER.includes(r as (typeof HIGHER_THAN_TELECALLER)[number]));

  const achPct = data.wallet?.achievementPct;
  const target = data.wallet?.assignedTarget;

  const yourRankEntry = data.branchLeaderboard.find((r) => r.isYou);
  const totalRanked = data.branchLeaderboard.length;

  const exceptionItems = useMemo(() => {
    const items: Parameters<typeof PerformanceExceptionQueue>[0]["items"] = [];
    const pendingCount = data.recentDiscounts.filter((d) => d.status === "pending").length;
    if (pendingCount > 0) {
      items.push({
        id: "pending-approvals",
        type: "Approval",
        label: `${pendingCount} discount approval${pendingCount > 1 ? "s" : ""} pending`,
        detail: "Manager review required before wallet debit",
        to: "/performance/approvals",
        priority: 1,
      });
    }
    if (hotClients.length > 0) {
      items.push({
        id: "hot-clients",
        type: "Offer",
        label: `${hotClients.length} hot client${hotClients.length > 1 ? "s" : ""} for offers`,
        detail: "High propensity — open client record to act",
        to: `/clients/${hotClients[0].client_id}`,
        priority: 2,
      });
    }
    if (data.wallet && data.wallet.spendable <= 0 && data.wallet.unlocked > 0) {
      items.push({
        id: "wallet-spent",
        type: "Wallet",
        label: "Wallet unlocked but fully spent",
        detail: "Request exception or wait for period unlock",
        to: "/performance/wallets",
        priority: 3,
      });
    }
    if (!data.hasLockedRun && data.earnedProjected > 0) {
      items.push({
        id: "run-open",
        type: "Incentive",
        label: "Incentive run not locked yet",
        detail: "Projected earnings may change until admin locks the period",
        to: "/performance/how-it-works",
        priority: 4,
      });
    }
    return items;
  }, [data, hotClients]);

  const nextActions = useMemo(() => {
    const actions: Parameters<typeof NextActionsCard>[0]["actions"] = [];
    if (hotClients[0]) {
      actions.push({
        id: "offer-hot",
        label: `Follow up · ${hotClients[0].full_name}`,
        detail: `Propensity ${hotClients[0].propensity_band} (${hotClients[0].propensity_score})`,
        to: `/clients/${hotClients[0].client_id}`,
        primary: true,
      });
    }
    if (data.wallet && data.wallet.spendable > 0) {
      actions.push({
        id: "give-discount",
        label: "Apply wallet discount",
        detail: `${formatInr(data.wallet.spendable, data.wallet.currency)} spendable this period`,
        to: "/performance/give-discount",
      });
    }
    actions.push({
      id: "promotion-request",
      label: "Submit promotion request",
      detail: "Field → MarCom queue for campaign support",
      to: "/performance/offers/requests",
    });
    return actions;
  }, [data, hotClients]);

  const pendingItems = useMemo(
    () =>
      data.recentDiscounts.map((d) => ({
        id: d.id,
        label: d.label,
        status: d.status,
        amount: d.amount,
        currency: d.currency,
        to: d.status === "pending" ? "/performance/approvals" : undefined,
      })),
    [data.recentDiscounts],
  );

  const homeTraceNodes = useMemo(() => {
    const earned = data.hasLockedRun ? data.earnedLocked : data.earnedProjected;
    return [
      {
        id: "revenue",
        label: "Verified qualifying revenue",
        sublabel: formatInr(data.revenueAchieved, data.revenueCurrency),
        rule: "Period-bound events from verified payments",
        to: "/performance/analytics",
      },
      {
        id: "target",
        label: "Achievement target",
        sublabel: target != null ? formatInr(target, data.revenueCurrency) : "No target assigned",
        rule: "Band drives wallet unlock and incentive eligibility",
        to: "/performance/wallets",
      },
      {
        id: "incentive",
        label: data.hasLockedRun ? "Locked incentive earnings" : "Projected incentive",
        sublabel: formatInr(earned, data.revenueCurrency),
        rule: "Active plans · subject to run lock",
        to: "/performance/incentives",
      },
    ];
  }, [data, target]);

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

        <PerformanceDashboardHero
          loading={data.loading}
          period={data.period}
          achievementPct={achPct ?? null}
          assignedTarget={target ?? null}
          revenueAchieved={data.revenueAchieved}
          revenueCurrency={data.revenueCurrency}
          eventCount={data.breakdown?.eventCount}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RankSummaryCard
            loading={data.loading}
            entries={data.branchLeaderboard}
            currency={data.revenueCurrency}
            period={data.period}
            yourRank={yourRankEntry?.rank ?? null}
            totalRanked={totalRanked > 0 ? totalRanked : null}
          />
          <PerformanceExceptionQueue loading={data.loading} items={exceptionItems} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NextActionsCard loading={data.loading} actions={nextActions} />
          <PendingListCard loading={data.loading} items={pendingItems} />
        </div>

        <MilestoneCard
          loading={data.loading}
          period={data.period}
          achievementPct={achPct ?? null}
          assignedTarget={target ?? null}
          achievedAmount={data.revenueAchieved}
          currency={data.revenueCurrency}
        />

        <TraceGraph
          entryLabel={`My performance · ${data.period}`}
          nodes={homeTraceNodes}
          className={PERFORMANCE_MOBILE_DESKTOP_ONLY}
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

        {/* Supplemental mobile context — detail lives in Reports */}
        {data.walletDiscountTotal > 0 && (
          <Card className={cn("p-4 border-l-4 border-l-violet-500 bg-violet-500/5", PERFORMANCE_MOBILE_DESKTOP_ONLY)}>
            <p className="text-sm">
              <span className="font-medium">Discounts reduced your incentive base</span> by{" "}
              {formatInr(data.walletDiscountTotal, data.wallet?.currency ?? "INR")} this period.
              <Link to="/performance/analytics" className="text-primary ml-1 hover:underline">
                Revenue analytics →
              </Link>
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

        <PerformanceMobileQuickBar />
      </div>
    </AppLayout>
  );
}
