import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { PerformanceApprovalStageStrip } from "@/components/performance/PerformanceApprovalStageStrip";
import { PerformanceApprovalQueueTable } from "@/components/performance/PerformanceApprovalQueueTable";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { useToast } from "@/hooks/use-toast";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import { useApprovalQueueData } from "@/hooks/useApprovalQueueData";
import { CheckCircle2, RefreshCw } from "lucide-react";

export default function PerformanceApprovals() {
  const { hasRole, loading: authLoading, isAdmin } = useAuth();
  const { toast } = useToast();
  const { period } = usePerformancePeriod();
  const isDirectorOnly =
    hasRole("director") && !isAdmin && !hasRole(["manager", "administrator"]);
  const readOnly = isDirectorOnly;
  const canReview = hasRole(["admin", "administrator"]) || hasRole("manager");
  const canView = canReview || isDirectorOnly;
  const [floorPct, setFloorPct] = useState("80");
  const [floorSaving, setFloorSaving] = useState(false);
  const [floorPolicies, setFloorPolicies] = useState<
    { scope_key: string; min_net_pct: number }[]
  >([]);
  const [serviceEdits, setServiceEdits] = useState<Record<string, string>>({});

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
    load,
    handleApprove,
    handleDecline,
  } = useApprovalQueueData(period, canView);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.rpc("fn_list_discount_margin_floor_policies").then(({ data }) => {
      const policies = (data ?? []) as { scope_key: string; min_net_pct: number }[];
      setFloorPolicies(policies);
      const global = policies.find((r) => r.scope_key === "global");
      if (global?.min_net_pct != null) setFloorPct(String(global.min_net_pct));
      const edits: Record<string, string> = {};
      policies.forEach((r) => {
        if (r.scope_key !== "global") edits[r.scope_key] = String(r.min_net_pct);
      });
      setServiceEdits(edits);
    });
  }, [isAdmin]);

  async function saveFloorPolicy() {
    const pct = Number(floorPct);
    if (!pct || pct <= 0 || pct > 100) {
      toast({ title: "Enter min net % between 1 and 100", variant: "destructive" });
      return;
    }
    setFloorSaving(true);
    try {
      const { error } = await supabase.rpc("fn_set_discount_margin_floor_policy", {
        _min_net_pct: pct,
        _block_counselor_waiver: true,
      });
      if (error) throw error;
      toast({ title: "Global floor saved", description: `Min net ${pct}% of invoice base` });
    } catch (e: unknown) {
      toast({
        title: "Save failed",
        description: formatSupabaseError(e, "Could not save policy"),
        variant: "destructive",
      });
    } finally {
      setFloorSaving(false);
    }
  }

  async function saveServiceFloor(scopeKey: string) {
    const pct = Number(serviceEdits[scopeKey]);
    if (!pct || pct <= 0 || pct > 100) {
      toast({ title: "Enter min net % between 1 and 100", variant: "destructive" });
      return;
    }
    setFloorSaving(true);
    try {
      const { error } = await supabase.rpc("fn_upsert_discount_margin_floor_policy", {
        _scope_key: scopeKey,
        _min_net_pct: pct,
        _block_counselor_waiver: true,
      });
      if (error) throw error;
      toast({ title: "Service floor saved", description: `${scopeKey} → min net ${pct}%` });
    } catch (e: unknown) {
      toast({
        title: "Save failed",
        description: formatSupabaseError(e, "Could not save policy"),
        variant: "destructive",
      });
    } finally {
      setFloorSaving(false);
    }
  }

  if (authLoading) return null;
  if (!canView) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl">
        <PerformanceHubHeader
          title="Commercial approval workflows"
          subtitle="Auto, manager, director and multi-level routing for wallets, discounts and exceptions"
          period={period}
          showModuleLegend={false}
        />

        {readOnly && (
          <div className="flex items-center gap-2 text-sm ph-muted">
            <Badge variant="secondary">Read-only</Badge>
            <span>Director view — approve and decline actions require admin or branch manager.</span>
          </div>
        )}

        <PerformancePeriodBar showBranch={false} compact />

        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Link to="/performance/approvals" className="text-sm hover:underline ml-auto" style={{ color: "var(--blue)" }}>
            ← Approvals CMS
          </Link>
        </div>

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
          <h2 className="font-semibold ph-heading">Depth matrix</h2>
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

        {isAdmin && (
          <Card id="floor-policy" className="p-4 ph-surface-card space-y-3 border-dashed">
            <h2 className="font-semibold text-sm ph-heading">Margin floor policy (O16 / O16b)</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs ph-muted">Global min net %</label>
                <Input className="w-24 mt-1" value={floorPct} onChange={(e) => setFloorPct(e.target.value)} />
              </div>
              <Button size="sm" disabled={floorSaving} onClick={saveFloorPolicy}>
                Save global
              </Button>
            </div>
            {floorPolicies.filter((p) => p.scope_key !== "global").length > 0 && (
              <div className="pt-2 border-t space-y-2">
                <p className="text-xs ph-muted">Per-service overrides</p>
                {floorPolicies
                  .filter((p) => p.scope_key !== "global")
                  .map((p) => (
                    <div key={p.scope_key} className="flex flex-wrap items-end gap-2">
                      <span className="text-sm font-medium w-40">{p.scope_key.replace(/_/g, " ")}</span>
                      <Input
                        className="w-20 h-8"
                        value={serviceEdits[p.scope_key] ?? String(p.min_net_pct)}
                        onChange={(e) =>
                          setServiceEdits((prev) => ({ ...prev, [p.scope_key]: e.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={floorSaving}
                        onClick={() => saveServiceFloor(p.scope_key)}
                      >
                        Save
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
