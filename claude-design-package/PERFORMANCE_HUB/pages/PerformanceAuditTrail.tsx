import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { PerformanceExecutiveKpiStrip } from "@/components/performance/PerformanceExecutiveKpiStrip";
import { PerformanceAuditTimeline } from "@/components/performance/PerformanceAuditTimeline";
import { PerformanceAuditTypePanel } from "@/components/performance/PerformanceAuditTypePanel";
import { useAuditTrailCmsData } from "@/hooks/useAuditTrailCmsData";
import { Download, Filter, RefreshCw } from "lucide-react";

export default function PerformanceAuditTrail() {
  const { isAdmin, hasRole, loading: authLoading } = useAuth();
  const { period, branchLabel } = usePerformancePeriod();
  const canView = isAdmin || hasRole(["viewer", "director", "manager", "administrator"]);
  const { events, loading, actionFilter, setActionFilter, kpis, actionCounts, load } =
    useAuditTrailCmsData(period);

  if (authLoading) return null;
  if (!canView) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PerformanceHubHeader
            title="Audit trail"
            subtitle={`Immutable commercial actions — wallets, offers, approvals, FX and promotions · ${period} · ${branchLabel}`}
            showModuleLegend={false}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={loading || events.length === 0}
              onClick={() => {
                const header = "occurredAt,actor,action,object,module,meta\n";
                const body = events
                  .map((e) =>
                    [
                      e.occurredAt,
                      e.actorName,
                      e.actionLabel,
                      e.objectLabel,
                      e.sourceModule,
                      e.meta.replace(/,/g, ";"),
                    ].join(","),
                  )
                  .join("\n");
                const blob = new Blob([header + body], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `commercial-audit-${period}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="size-4" /> Export log
            </Button>
          </div>
        </div>

        <PerformancePeriodBar />

        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/performance/approvals" className="hover:underline" style={{ color: "var(--blue)" }}>
            Approvals →
          </Link>
          <Link to="/performance/client-commercials" className="hover:underline" style={{ color: "var(--blue)" }}>
            Client commercials →
          </Link>
          <Link to="/activity" className="hover:underline ml-auto" style={{ color: "var(--blue)" }}>
            Global activity log →
          </Link>
        </div>

        <PerformanceExecutiveKpiStrip
          loading={loading}
          items={[
            {
              module: "wallet",
              label: "Total events",
              value: String(kpis.totalEvents),
              hint: "All commercial sources",
            },
            {
              module: "cash",
              label: "Created",
              value: String(kpis.created),
              hint: "Submissions & allocations",
            },
            {
              module: "offers",
              label: "Approved",
              value: String(kpis.approved),
              hint: "Discounts, offers, promotions",
            },
            {
              module: "wallet",
              label: "Consumed",
              value: String(kpis.consumed),
              hint: "Wallet debits applied",
            },
          ]}
        />

        {actionFilter !== "all" && (
          <div className="flex items-center gap-2 text-sm ph-muted">
            <Filter className="size-4" />
            <span>
              Filtered to <strong className="ph-heading capitalize">{actionFilter}</strong>
            </span>
            <button
              type="button"
              className="underline"
              style={{ color: "var(--blue)" }}
              onClick={() => setActionFilter("all")}
            >
              Clear
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
          <PerformanceAuditTimeline items={events} loading={loading} />
          <PerformanceAuditTypePanel
            counts={actionCounts}
            active={actionFilter}
            onSelect={setActionFilter}
            loading={loading}
          />
        </div>
      </div>
    </AppLayout>
  );
}
