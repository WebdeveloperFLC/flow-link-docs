import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import {
  ArrowRight,
  Banknote,
  Calculator,
  Gift,
  Megaphone,
  Sparkles,
  Tag,
  Trophy,
  Users,
} from "lucide-react";

const STEPS = [
  {
    icon: Tag,
    title: "Offers & discounts",
    body: "Counselors claim offers and apply wallet-funded discounts on invoices. Redemptions feed offer analytics and wallet usage.",
    links: [
      { to: "/performance/offers", label: "Offers studio" },
      { to: "/performance/give-discount", label: "Give discount" },
      { to: "/performance/offers/analytics", label: "Offer analytics" },
    ],
  },
  {
    icon: Gift,
    title: "Wallet sizing & branch pool",
    body: "Each period, wallets are sized from achievement bands. Admins fund branch pools; managers allocate pool balance to counselor wallets.",
    links: [
      { to: "/performance/wallet/policy", label: "Wallet policy" },
      { to: "/performance/wallet/branch-pool", label: "Branch pool" },
      { to: "/incentives/wallet-topups", label: "Wallet top-ups" },
    ],
  },
  {
    icon: Calculator,
    title: "Qualifying events → incentive runs",
    body: "Verified payments and enrolments emit qualifying events. Preview or calculate runs per plan/branch/period; lock freezes FX and totals.",
    links: [
      { to: "/incentives/admin", label: "Runs & preview" },
      { to: "/performance/admin", label: "Command center" },
      { to: "/incentives/simulator", label: "Simulator" },
    ],
  },
  {
    icon: Trophy,
    title: "Campaigns & contests",
    body: "Campaign overlays add per-event bonuses. Branch contests rank branches; prizes settle as cash (incentive lines) or wallet top-ups.",
    links: [{ to: "/incentives/competitions", label: "Competitions" }],
  },
  {
    icon: Banknote,
    title: "Payout & period close",
    body: "Lock runs, export payout batches, and close wallets to reseed the next period.",
    links: [
      { to: "/incentives/payouts", label: "Payout desk" },
      { to: "/incentives/period-close", label: "Period close" },
    ],
  },
  {
    icon: Users,
    title: "Approvals & governance",
    body: "Discount depth matrix, promotion requests, wallet exceptions, and unclassified payment mapping gate period lock.",
    links: [
      { to: "/performance/admin/approvals", label: "Approvals" },
      { to: "/performance/admin/unclassified", label: "Unclassified payments" },
      { to: "/performance/offers/requests", label: "Promotion requests" },
    ],
  },
] as const;

const INTELLIGENCE_LINKS = [
  {
    icon: Sparkles,
    title: "Smart suggestions (5Q · O13 · I5)",
    body: "Cross-sell journeys auto-enroll on the daily tick. Client record shows rule-based suggestions with propensity score, A/B variant badge, and dismiss for 7 days.",
    links: [
      { to: "/performance/offers/journeys", label: "Automation journeys" },
      { to: "/performance", label: "My performance home" },
    ],
  },
  {
    icon: Megaphone,
    title: "Experiments & governance (5R · 5S · 5U)",
    body: "Run two-variant offer A/B tests. Margin floor (O16) blocks below-floor discounts; per-service floors tighten admission vs coaching. Depth matrix routes deep discounts to managers and admins.",
    links: [
      { to: "/performance/offers/ab-tests", label: "A/B tests" },
      { to: "/performance/admin/approvals", label: "Approvals & floors" },
      { to: "/performance/give-discount", label: "Give discount" },
    ],
  },
  {
    icon: Calculator,
    title: "Attribution & live earnings (5T · 5V · I8)",
    body: "Counselors see live cash ticker, wallet impact ROI, and personal offer influence (direct / assisted / multi-service). Branch analytics share the global period selector.",
    links: [
      { to: "/performance/offers/analytics", label: "Offer analytics" },
      { to: "/performance/admin", label: "Command center readiness" },
    ],
  },
] as const;

export default function PerformanceHowItWorks() {
  return (
    <AppLayout>
      <PerformanceHubHeader
        title="How Performance Hub works"
        subtitle="Money rail — offers, wallets, incentives, and settlement"
      />
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <Card className="p-5 bg-muted/30 border-dashed">
          <p className="text-sm leading-relaxed">
            Performance Hub connects three modules:{" "}
            <span className="text-emerald-700 font-medium">cash incentives</span>,{" "}
            <span className="text-amber-700 font-medium">discount wallets</span>, and{" "}
            <span className="text-red-700 font-medium">offers</span>. Use the global period
            selector on admin screens; counselors see their own achievement on Home.
          </p>
        </Card>

        <div className="space-y-4">
          {STEPS.map((step, i) => (
            <Card key={step.title} className="p-5">
              <div className="flex gap-4">
                <div className="flex flex-col items-center shrink-0">
                  <div className="rounded-full bg-primary/10 p-2.5">
                    <step.icon className="size-5 text-primary" />
                  </div>
                  {i < STEPS.length - 1 && (
                    <ArrowRight className="size-4 text-muted-foreground rotate-90 my-2" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold">{step.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.body}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {step.links.map((l) => (
                      <Link
                        key={l.to}
                        to={l.to}
                        className="text-xs border rounded-md px-2.5 py-1 bg-background hover:bg-muted transition-colors"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div id="intelligence" className="space-y-3 pt-2">
          <h2 className="text-lg font-semibold">Intelligence layer · phases 5Q–5V</h2>
          <p className="text-sm text-muted-foreground">
            Shipped after core wallet + incentive rails. Use batch UAT in{" "}
            <code className="text-xs bg-muted px-1 rounded">docs/INCENTIVE_PHASE5_BATCH_UAT.md</code> before go-live.
          </p>
          {INTELLIGENCE_LINKS.map((block) => (
            <Card key={block.title} className="p-5 border-dashed">
              <div className="flex gap-4">
                <div className="rounded-full bg-violet-500/10 p-2.5 shrink-0 h-fit">
                  <block.icon className="size-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{block.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{block.body}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {block.links.map((l) => (
                      <Link
                        key={l.to}
                        to={l.to}
                        className="text-xs border rounded-md px-2.5 py-1 bg-background hover:bg-muted transition-colors"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
