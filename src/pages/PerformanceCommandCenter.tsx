import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformanceKpiGrid, PerformanceMoneyRail } from "@/components/performance/PerformanceMoneyRail";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { usePerformancePeriodMetrics } from "@/hooks/usePerformancePeriodMetrics";
import { usePerformanceQueueCounts } from "@/hooks/usePerformanceQueueCounts";
import { usePerformanceLockReadiness } from "@/hooks/usePerformanceLockReadiness";
import {
  AlertTriangle,
  Banknote,
  Calculator,
  CalendarClock,
  ChevronRight,
  DollarSign,
  FlaskConical,
  Gift,
  Lock,
  Settings2,
  Tag,
  Trophy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CommandCenterSnapshot {
  period_fully_closed?: boolean;
  wallets_open?: number;
  wallets_closed?: number;
  next_period_key?: string;
  next_wallet_total_potential?: number;
  next_wallet_preview_count?: number;
}

const QUEUE_LINKS = [
  {
    to: "/performance/admin/unclassified",
    label: "Unclassified payments",
    hint: "Map service library codes",
    countKey: "unclassified" as const,
  },
  {
    to: "/performance/admin/approvals",
    label: "Discount & wallet approvals",
    hint: "Depth matrix + exceptions",
    countKey: "pendingApprovals" as const,
  },
  {
    to: "/performance/offers/requests",
    label: "Promotion requests",
    hint: "Field → MarCom",
    countKey: "promotionRequests" as const,
  },
] as const;

const ADMIN_LINKS = [
  { to: "/performance/admin/unclassified", label: "Unclassified payments", icon: Calculator },
  { to: "/performance/admin/approvals", label: "Discount approvals", icon: Gift },
  { to: "/performance/offers/requests", label: "Promotion requests", icon: Tag },
  { to: "/performance/executive", label: "Executive dashboard", icon: Calculator },
  { to: "/performance/wallet/policy", label: "Wallet policy", icon: Gift },
  { to: "/incentives/admin", label: "Runs & preview", icon: Calculator },
  { to: "/incentives/plans", label: "Plans & rules", icon: Settings2 },
  { to: "/incentives/fx-rates", label: "FX rates", icon: DollarSign },
  { to: "/incentives/competitions", label: "Competitions", icon: Trophy },
  { to: "/incentives/simulator", label: "Simulator", icon: FlaskConical },
  { to: "/incentives/payouts", label: "Payout desk", icon: Banknote },
  { to: "/incentives/wallet-topups", label: "Wallet top-ups", icon: Gift },
  { to: "/offers-admin", label: "Offers library", icon: Tag },
] as const;

export default function PerformanceCommandCenter() {
  const { period, branchLabel } = usePerformancePeriod();
  const metrics = usePerformancePeriodMetrics(period, branchLabel);
  const queues = usePerformanceQueueCounts(period);
  const lockReadiness = usePerformanceLockReadiness(period);
  const [snapshot, setSnapshot] = useState<CommandCenterSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("fn_period_command_center", {
        _period_key: period,
        _branch_name: branchLabel,
      });
      if (!cancelled) setSnapshot((data ?? null) as CommandCenterSnapshot | null);
    })();
    return () => {
      cancelled = true;
    };
  }, [period, branchLabel]);

  const workflow = [
    { step: 1, label: "Period close (wallets)", to: "/incentives/period-close", icon: CalendarClock, blocked: false },
    { step: 2, label: "Preview & calculate run", to: "/incentives/admin", icon: Calculator, blocked: false },
    {
      step: 3,
      label: metrics.runLocked ? "Run locked" : "Lock run & audit lines",
      to: "/incentives/admin",
      icon: Lock,
      blocked: !lockReadiness.canLock && !metrics.runLocked,
      hint: lockReadiness.canLock ? undefined : lockReadiness.blockers.join(" · "),
    },
    { step: 4, label: "Generate payouts & export", to: "/incentives/payouts", icon: Banknote, blocked: !metrics.runLocked },
  ] as const;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-6xl">
        <PerformanceHubHeader
          title="Command center"
          subtitle="Period-end workflow for finance and admin"
          period={period}
          showModuleLegend={false}
        />

        <PerformancePeriodBar />

        {snapshot && (
          <Card className="p-4 border-l-4 border-l-emerald-500 bg-emerald-500/5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Period close &amp; next-month wallets</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {snapshot.period_fully_closed
                    ? `${period} wallets closed (${snapshot.wallets_closed ?? 0})`
                    : `${snapshot.wallets_open ?? 0} wallet(s) still open for ${period}`}
                  {snapshot.next_period_key && (
                    <>
                      {" · "}
                      Next period <span className="font-medium text-foreground">{snapshot.next_period_key}</span> preview:{" "}
                      <span className="font-medium text-foreground">
                        ₹{Number(snapshot.next_wallet_total_potential ?? 0).toLocaleString("en-IN")} potential
                      </span>{" "}
                      across {snapshot.next_wallet_preview_count ?? 0} counselor(s)
                    </>
                  )}
                </p>
              </div>
              <Link
                to="/incentives/period-close"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Period close
                <ChevronRight className="size-4" />
              </Link>
            </div>
          </Card>
        )}

        {(queues.unclassified > 0 || queues.pendingApprovals > 0 || queues.promotionRequests > 0 || queues.walletExceptions > 0) && (
          <Card className="p-4 border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="size-4 text-amber-600" />
              <h2 className="font-semibold">Action queues</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {QUEUE_LINKS.map((q) => {
                const count =
                  q.countKey === "pendingApprovals"
                    ? queues.pendingApprovals + queues.walletExceptions
                    : queues[q.countKey];
                if (count === 0 && !queues.loading) return null;
                return (
                  <Link
                    key={q.to}
                    to={q.to}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-sm font-semibold">
                      {queues.loading ? "…" : count}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{q.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{q.hint}</p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground ml-auto shrink-0" />
                  </Link>
                );
              })}
            </div>
          </Card>
        )}

        {!lockReadiness.loading && !lockReadiness.canLock && (
          <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-500/5">
            <div className="flex items-start gap-2 text-sm">
              <Lock className="size-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Period {period} is not ready to lock</p>
                <ul className="list-disc ml-4 mt-1 text-muted-foreground">
                  {lockReadiness.blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        <PerformanceKpiGrid
          loading={metrics.loading}
          items={[
            {
              label: "Verified revenue",
              value: metrics.loading ? "…" : `₹${metrics.verifiedRevenue.toLocaleString("en-IN")}`,
              module: "cash",
            },
            {
              label: "Wallet unlocked",
              value: metrics.loading ? "…" : `₹${metrics.walletUnlocked.toLocaleString("en-IN")}`,
              module: "wallet",
            },
            {
              label: "Offers redeemed",
              value: metrics.loading ? "…" : String(metrics.offersRedeemed),
              module: "offers",
            },
            {
              label: "Cash incentive due",
              value: metrics.loading
                ? "…"
                : metrics.runLocked
                  ? `₹${metrics.cashIncentiveDue.toLocaleString("en-IN")}`
                  : metrics.cashIncentiveDue > 0
                    ? `₹${metrics.cashIncentiveDue.toLocaleString("en-IN")} preview`
                    : "—",
              module: "cash",
            },
            {
              label: "Discounts",
              value: metrics.loading ? "…" : `₹${metrics.discountTotal.toLocaleString("en-IN")}`,
              module: "offers",
            },
            {
              label: "Net revenue",
              value: metrics.loading ? "…" : `₹${metrics.netRevenue.toLocaleString("en-IN")}`,
              module: "cash",
            },
          ]}
        />

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Money flow · {period}</h2>
          <PerformanceMoneyRail
            loading={metrics.loading}
            steps={[
              { label: "Verified revenue", value: metrics.verifiedRevenue, module: "cash", hint: "qualifying events" },
              { label: "− Discounts", value: metrics.discountTotal, module: "offers", hint: "wallet allocations" },
              { label: "= Net revenue", value: metrics.netRevenue, module: "cash", hint: "incentive base" },
              {
                label: "Cash due",
                value: metrics.cashIncentiveDue,
                module: "cash",
                hint: metrics.runLocked ? "locked run" : "preview",
              },
            ]}
          />
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Monthly workflow · {period}</h2>
          <ol className="space-y-2">
            {workflow.map((w) => (
              <li key={w.step}>
                <Link
                  to={w.to}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    w.blocked ? "opacity-60 hover:bg-muted/30" : "hover:bg-muted/50"
                  }`}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
                    {w.step}
                  </span>
                  <w.icon className="size-4 text-muted-foreground" />
                  <span className="flex-1 font-medium">{w.label}</span>
                  {w.blocked && w.hint && (
                    <span className="text-xs text-amber-700 dark:text-amber-400 max-w-[12rem] truncate">{w.hint}</span>
                  )}
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Admin tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ADMIN_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="inline-flex items-center justify-start h-auto py-3 px-4 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium"
              >
                <item.icon className="size-4 mr-2 shrink-0" />
                {item.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
