import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { PerformanceWalletSummaryStrip } from "@/components/performance/PerformanceWalletSummaryStrip";
import { PerformanceWalletTable } from "@/components/performance/PerformanceWalletTable";
import { PerformanceWalletTypeBreakdown } from "@/components/performance/PerformanceWalletTypeBreakdown";
import { TraceGraph } from "@/components/performance/TraceGraph";
import { usePerformanceWalletsList } from "@/hooks/usePerformanceWalletsList";
import { PerformanceMobileQuickBar } from "@/components/performance/PerformanceMobileQuickBar";
import {
  PerformanceNewWalletDialog,
  PerformanceWalletDetailDialog,
} from "@/components/performance/PerformanceWalletDialogs";
import type { WalletListRow } from "@/incentives/lib/walletListLogic";
import { PERFORMANCE_MOBILE_DESKTOP_ONLY, PERFORMANCE_MOBILE_PAGE } from "@/lib/performanceMobileLayout";
import { formatInr } from "@/lib/performanceHubTheme";
import { cn } from "@/lib/utils";
import { ArrowRight, Plus, Settings2, Wallet } from "lucide-react";

export default function PerformanceWallets() {
  const { user, isAdmin, hasRole } = useAuth();
  const { period, branchId } = usePerformancePeriod();
  const adminView = isAdmin || hasRole(["manager", "administrator"]);
  const { rows, loading, summary, typeBreakdown } = usePerformanceWalletsList({
    period,
    userId: user?.id,
    branchId: branchId || undefined,
    adminView,
  });

  const sample = rows[0];
  const [selectedWallet, setSelectedWallet] = useState<WalletListRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newWalletOpen, setNewWalletOpen] = useState(false);

  function openWalletDetail(row: WalletListRow) {
    setSelectedWallet(row);
    setDetailOpen(true);
  }

  const walletTraceNodes = useMemo(
    () => [
      {
        id: "potential",
        label: "Potential wallet allocation",
        sublabel: formatInr(summary.totalAllocated),
        rule: "Policy + achievement bands at period open",
        to: "/performance/wallet/policy",
      },
      {
        id: "unlocked",
        label: "Active wallets this period",
        sublabel: `${summary.activeCount} wallet(s) · ${summary.expiringSoon} expiring soon`,
        rule: "Unlock threshold met — spend caps apply per client",
      },
      {
        id: "consumed",
        label: "Consumed via discounts",
        sublabel: formatInr(summary.totalConsumed),
        rule: "Pro-rata on verified invoice base after approval",
        to: "/performance/give-discount",
      },
    ],
    [summary],
  );

  return (
    <AppLayout>
      <div className={PERFORMANCE_MOBILE_PAGE} data-testid="performance-mobile-shell">
        <PerformanceHubHeader
          title="Discount wallet management"
          subtitle={`Utilization, scope and lifecycle · ${period}`}
          period={period}
          showModuleLegend={false}
          primaryAction={{ label: "Give discount", to: "/performance/give-discount" }}
        />

        {isAdmin && (
          <div className="flex justify-end">
            <Button size="sm" className="gap-1" onClick={() => setNewWalletOpen(true)}>
              <Plus className="size-4" /> New wallet
            </Button>
          </div>
        )}

        <PerformancePeriodBar compact className="md:hidden" />
        <PerformancePeriodBar className="hidden md:flex" />

        <PerformanceWalletSummaryStrip
          loading={loading}
          totalAllocated={summary.totalAllocated}
          totalConsumed={summary.totalConsumed}
          activeCount={summary.activeCount}
          expiringSoon={summary.expiringSoon}
        />

        <PerformanceWalletTable
          rows={rows}
          loading={loading}
          showCounselor={adminView}
          onSelectWallet={openWalletDetail}
        />

        <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-4", PERFORMANCE_MOBILE_DESKTOP_ONLY)}>
          <Card className="p-5 ph-surface-card">
            <h2 className="text-lg font-semibold ph-heading mb-3 flex items-center gap-2">
              <Wallet className="size-5" style={{ color: "var(--wallet)" }} />
              Wallet lifecycle
            </h2>
            <p className="text-sm ph-muted mb-4">
              Carry-forward, expiry and top-ups use existing wallet policy and admin tools — no duplicate CRM data.
            </p>
            <div className="flex flex-wrap gap-2">
              {isAdmin && (
                <>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/incentives/wallet-topups">Allocate / top-up</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/performance/wallet/policy">
                      <Settings2 className="size-4 mr-1" />
                      Policy
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/incentives/period-close">Carry forward</Link>
                  </Button>
                </>
              )}
              {(hasRole("manager") && !isAdmin) && (
                <Button asChild size="sm" variant="outline">
                  <Link to="/performance/wallet/branch-pool">Branch pool</Link>
                </Button>
              )}
              <Button asChild size="sm" variant="outline">
                <Link to="/performance/how-it-works">How wallets work</Link>
              </Button>
            </div>
            {sample && (
              <div className="mt-4 rounded-lg border ph-period-bar p-3 text-xs ph-muted space-y-1">
                <p className="font-medium ph-heading text-sm">Rule limits (sample wallet)</p>
                <p>Max per client: {sample.max_percent_per_client}%</p>
                {sample.max_amount_per_client != null && (
                  <p>Max amount: ₹{Number(sample.max_amount_per_client).toLocaleString("en-IN")}</p>
                )}
                <p>Rollover: {sample.rollover_policy}</p>
              </div>
            )}
          </Card>

          <PerformanceWalletTypeBreakdown slices={typeBreakdown} loading={loading} />
        </div>

        <TraceGraph
          entryLabel={`Wallet utilization · ${period}`}
          nodes={walletTraceNodes}
          className={PERFORMANCE_MOBILE_DESKTOP_ONLY}
        />

        <div className={cn("flex justify-end", PERFORMANCE_MOBILE_DESKTOP_ONLY)}>
          <Link
            to="/performance"
            className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
            style={{ color: "var(--blue)" }}
          >
            Back to my performance
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <PerformanceMobileQuickBar />

        <PerformanceWalletDetailDialog
          row={selectedWallet}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
        <PerformanceNewWalletDialog open={newWalletOpen} onOpenChange={setNewWalletOpen} />
      </div>
    </AppLayout>
  );
}
