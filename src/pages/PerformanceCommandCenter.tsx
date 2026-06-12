import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { currentPeriodKey } from "@/lib/performanceHubTheme";
import {
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

const WORKFLOW = [
  { step: 1, label: "Period close (wallets)", to: "/incentives/period-close", icon: CalendarClock },
  { step: 2, label: "Preview & calculate run", to: "/incentives/admin", icon: Calculator },
  { step: 3, label: "Lock run & audit lines", to: "/incentives/admin", icon: Calculator },
  { step: 4, label: "Generate payouts & export", to: "/incentives/payouts", icon: Banknote },
] as const;

const ADMIN_LINKS = [
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
  const period = currentPeriodKey();

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-6xl">
        <PerformanceHubHeader
          title="Command center"
          subtitle="Period-end workflow for finance and admin"
          period={period}
          showModuleLegend={false}
        />

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
          <p className="text-xs text-muted-foreground mt-4">
            Full KPI tiles (revenue, wallet unlocked, offers redeemed, cash due) — Phase 5B. Admin screens below remain
            unchanged until unified tabs ship.
          </p>
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
