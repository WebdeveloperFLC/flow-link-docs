import { useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformanceKpiGrid, PerformanceMoneyRail } from "@/components/performance/PerformanceMoneyRail";
import { usePerformancePeriodMetrics } from "@/hooks/usePerformancePeriodMetrics";
import { usePerformanceQueueCounts } from "@/hooks/usePerformanceQueueCounts";
import { currentPeriodKey } from "@/lib/performanceHubTheme";
import {
  AlertTriangle,
  Banknote,
  Calculator,
  CalendarClock,
  ChevronRight,
  DollarSign,
  FlaskConical,
  Gift,
  Settings2,
  Tag,
  Trophy,
} from "lucide-react";

const QUEUE_LINKS = [
  {
    to: "/performance/admin/unclassified",
    label: "Unclassified payments",
    hint: "Map service library codes",
    countKey: "unclassified" as const,
  },
  {
    to: "/performance/admin/approvals",
    label: "Discount approvals",
    hint: "Depth-matrix queue",
    countKey: "pendingApprovals" as const,
  },
  {
    to: "/performance/offers/requests",
    label: "Promotion requests",
    hint: "Field → MarCom",
    countKey: "promotionRequests" as const,
  },
] as const;

const WORKFLOW = [
  { step: 1, label: "Period close (wallets)", to: "/incentives/period-close", icon: CalendarClock },
  { step: 2, label: "Preview & calculate run", to: "/incentives/admin", icon: Calculator },
  { step: 3, label: "Lock run & audit lines", to: "/incentives/admin", icon: Calculator },
  { step: 4, label: "Generate payouts & export", to: "/incentives/payouts", icon: Banknote },
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
  const [period, setPeriod] = useState(currentPeriodKey());
  const metrics = usePerformancePeriodMetrics(period, "All branches");
  const queues = usePerformanceQueueCounts(period);

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-6xl">
        <PerformanceHubHeader
          title="Command center"
          subtitle="Period-end workflow for finance and admin"
          period={period}
          showModuleLegend={false}
        />

        <div>
          <label className="text-xs text-muted-foreground">Period</label>
          <Input className="w-32 mt-1" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </div>

        {(queues.unclassified > 0 || queues.pendingApprovals > 0 || queues.promotionRequests > 0) && (
          <Card className="p-4 border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="size-4 text-amber-600" />
              <h2 className="font-semibold">Action queues</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {QUEUE_LINKS.map((q) => {
                const count = queues[q.countKey];
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
          <h2 className="text-lg font-semibold mb-4">June money flow · {period}</h2>
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
            {WORKFLOW.map((w) => (
              <li key={w.step}>
                <Link
                  to={w.to}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
                    {w.step}
                  </span>
                  <w.icon className="size-4 text-muted-foreground" />
                  <span className="flex-1 font-medium">{w.label}</span>
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
              <Button key={item.to} variant="outline" className="justify-start h-auto py-3" asChild>
                <Link to={item.to}>
                  <item.icon className="size-4 mr-2 shrink-0" />
                  {item.label}
                </Link>
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
