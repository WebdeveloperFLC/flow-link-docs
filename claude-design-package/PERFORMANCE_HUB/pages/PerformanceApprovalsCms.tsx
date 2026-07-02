import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { PerformanceExecutiveKpiStrip } from "@/components/performance/PerformanceExecutiveKpiStrip";
import { PerformanceApprovalStageStrip } from "@/components/performance/PerformanceApprovalStageStrip";
import { PerformanceApprovalQueueTable } from "@/components/performance/PerformanceApprovalQueueTable";
import { useApprovalQueueData } from "@/hooks/useApprovalQueueData";
import { CheckCircle2, ClipboardCheck, RefreshCw, Settings2 } from "lucide-react";

export default function PerformanceApprovalsCms() {
  const { hasRole, loading: authLoading, isAdmin } = useAuth();
  const { period, branchLabel } = usePerformancePeriod();
  const isDirectorOnly =
    hasRole("director") && !isAdmin && !hasRole(["manager", "administrator"]);
  const readOnly = isDirectorOnly;
  const canReview = hasRole(["admin", "administrator"]) || hasRole("manager");
  const canView = canReview || isDirectorOnly;

  const {
    loading,
    busyId,
    notes,
    setNotes,
    stageFilter,
    setStageFilter,
    queue,
    stages,
    filteredQueue,
    kpis,
    load,
    handleApprove,
    handleDecline,
  } = useApprovalQueueData(period, canView);

  if (authLoading) return null;
  if (!canView) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PerformanceHubHeader
            title="Approvals & governance"
            subtitle={`Auto, manager, director and multi-level routing · ${period} · ${branchLabel}`}
            showModuleLegend={false}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            {isAdmin && (
              <Button asChild size="sm" variant="outline" className="gap-1">
                <Link to="/performance/admin/approvals#floor-policy">
                  <Settings2 className="size-4" /> Margin floors
                </Link>
              </Button>
            )}
          </div>
        </div>

        {readOnly && (
          <div className="flex items-center gap-2 text-sm ph-muted">
            <Badge variant="secondary">Read-only</Badge>
            <span>Director view — approve and decline actions require admin or branch manager.</span>
          </div>
        )}

        <PerformancePeriodBar showBranch={false} compact />

        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/performance/offers/requests" className="hover:underline" style={{ color: "var(--blue)" }}>
            Promotion requests →
          </Link>
          <Link to="/performance/admin" className="hover:underline ml-auto" style={{ color: "var(--blue)" }}>
            Command center →
          </Link>
        </div>

        <PerformanceExecutiveKpiStrip
          loading={loading}
          items={[
            {
              module: "wallet",
              label: "Pending",
              value: String(kpis.totalPending),
              hint: "Discount + wallet exceptions",
            },
            {
              module: "offers",
              label: "High risk",
              value: String(kpis.highRisk),
              hint: "Waiver, floor breach or high value",
            },
            {
              module: "cash",
              label: "Manager queue",
              value: String(kpis.managerQueue),
              hint: "Awaiting branch manager",
            },
            {
              module: "wallet",
              label: "Oldest waiting",
              value: kpis.oldestAge,
              hint: queue.length ? "Longest pending item" : "No queue",
            },
          ]}
        />

        <PerformanceApprovalStageStrip
          stages={stages}
          active={stageFilter}
          onSelect={setStageFilter}
        />

        {!loading && queue.length === 0 ? (
          <Card className="p-6 flex items-center gap-3 ph-module-cash border-l-4">
            <CheckCircle2 className="size-5 shrink-0" style={{ color: "var(--cash)" }} />
            <p className="font-medium ph-heading">No pending approvals for {period}</p>
          </Card>
        ) : (
          <PerformanceApprovalQueueTable
            items={filteredQueue}
            loading={loading}
            readOnly={readOnly}
            busyId={busyId}
            notes={notes}
            onNoteChange={(id, value) => setNotes((n) => ({ ...n, [id]: value }))}
            onApprove={handleApprove}
            onDecline={handleDecline}
          />
        )}

        <Card className="p-4 ph-surface-card space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-4" style={{ color: "var(--blue)" }} />
            <h2 className="font-semibold ph-heading">Depth matrix</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {[
              ["≤ 10% or ≤ ₹5,000", "Counselor — instant"],
              ["11 – 20%", "Branch manager"],
              ["> 20% / below floor", "Admin"],
              ["Scholarship / waiver", "Admin only — counselor submit blocked"],
            ].map(([depth, approver]) => (
              <div key={depth} className="rounded-md border ph-period-bar p-3">
                <p className="font-semibold ph-heading">{depth}</p>
                <p className="ph-muted mt-1">{approver}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
