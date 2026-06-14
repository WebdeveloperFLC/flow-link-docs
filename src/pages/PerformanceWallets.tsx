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
import { usePerformanceWalletsList } from "@/hooks/usePerformanceWalletsList";
import { ArrowRight, Settings2, Wallet } from "lucide-react";

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

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl">
        <PerformanceHubHeader
          title="Discount wallet management"
          subtitle={`Utilization, scope and lifecycle · ${period}`}
          period={period}
          showModuleLegend={false}
          primaryAction={{ label: "Give discount", to: "/performance/give-discount" }}
        />

        <PerformancePeriodBar />

        <PerformanceWalletSummaryStrip
          loading={loading}
          totalAllocated={summary.totalAllocated}
          totalConsumed={summary.totalConsumed}
          activeCount={summary.activeCount}
          expiringSoon={summary.expiringSoon}
        />

        <PerformanceWalletTable rows={rows} loading={loading} showCounselor={adminView} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

        <div className="flex justify-end">
          <Link
            to="/performance"
            className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
            style={{ color: "var(--blue)" }}
          >
            Back to my performance
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
