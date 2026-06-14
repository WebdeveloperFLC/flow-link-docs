import { useEffect, useMemo, useState } from "react";
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
import {
  approvalStageCounts,
  buildApprovalQueue,
  filterApprovalQueue,
  type ApprovalStage,
  type UnifiedApprovalItem,
} from "@/incentives/lib/approvalQueueLogic";
import { CheckCircle2, RefreshCw } from "lucide-react";

interface ApprovalRow {
  id: string;
  period_key: string;
  counselor_id: string;
  client_id: string | null;
  lead_id: string | null;
  discount_amount: number;
  discount_percent: number | null;
  wallet_debit: number;
  approval_level: string;
  status: string;
  request_note: string | null;
  reference_amount: number | null;
  net_after_discount: number | null;
  below_floor: boolean;
  is_waiver: boolean;
  created_at: string;
  counselor?: { full_name: string | null } | null;
  client?: { full_name: string | null } | null;
  offer?: { title: string | null } | null;
}

interface WalletExceptionRow {
  id: string;
  period_key: string;
  counselor_id: string;
  requested_amount: number;
  reason: string;
  status: string;
  created_at: string;
  counselor?: { full_name: string | null } | null;
}

export default function PerformanceApprovals() {
  const { hasRole, loading: authLoading, isAdmin } = useAuth();
  const { toast } = useToast();
  const { period } = usePerformancePeriod();
  const isDirectorOnly =
    hasRole("director") && !isAdmin && !hasRole(["manager", "administrator"]);
  const readOnly = isDirectorOnly;
  const canReview = hasRole(["admin", "administrator"]) || hasRole("manager");
  const canView = canReview || isDirectorOnly;
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [walletRows, setWalletRows] = useState<WalletExceptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [stageFilter, setStageFilter] = useState<ApprovalStage | "all">("all");
  const [floorPct, setFloorPct] = useState("80");
  const [floorSaving, setFloorSaving] = useState(false);
  const [floorPolicies, setFloorPolicies] = useState<
    { scope_key: string; min_net_pct: number }[]
  >([]);
  const [serviceEdits, setServiceEdits] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const [disc, wallet] = await Promise.all([
      supabase
        // @ts-expect-error discount_approval_requests not in generated types yet (PH-R-016)
        .from("discount_approval_requests")
        .select(
          `
        id, period_key, counselor_id, client_id, lead_id,
        discount_amount, discount_percent, wallet_debit, approval_level,
        status, request_note, reference_amount, net_after_discount, below_floor, is_waiver,
        created_at,
        counselor:profiles!discount_approval_requests_counselor_id_fkey(full_name),
        client:clients(full_name),
        offer:offers(title)
      `,
        )
        .eq("status", "pending")
        .eq("period_key", period)
        .order("created_at", { ascending: true }),
      supabase
        // @ts-expect-error wallet_exception_requests not in generated types yet (PH-R-016)
        .from("wallet_exception_requests")
        .select(
          `
          id, period_key, counselor_id, requested_amount, reason, status, created_at,
          counselor:profiles!wallet_exception_requests_counselor_id_fkey(full_name)
        `,
        )
        .eq("status", "pending")
        .eq("period_key", period)
        .order("created_at", { ascending: true }),
    ]);

    if (disc.error) {
      toast({
        title: "Could not load approvals",
        description: formatSupabaseError(disc.error, "Load failed"),
        variant: "destructive",
      });
      setRows([]);
    } else {
      setRows((disc.data ?? []) as ApprovalRow[]);
    }

    if (wallet.error) {
      setWalletRows([]);
    } else {
      setWalletRows((wallet.data ?? []) as WalletExceptionRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!canView) return;
    load();
  }, [period, canView]);

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

  const queue = useMemo(
    () => buildApprovalQueue(rows, walletRows),
    [rows, walletRows],
  );
  const stages = useMemo(() => approvalStageCounts(queue), [queue]);
  const filteredQueue = useMemo(
    () => filterApprovalQueue(queue, stageFilter),
    [queue, stageFilter],
  );

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

  async function reviewDiscount(id: string, action: "approve" | "decline") {
    setBusyId(id);
    try {
      const { data, error } = await supabase.rpc("fn_review_discount_request", {
        _request_id: id,
        _action: action,
        _note: notes[id]?.trim() || null,
      });
      if (error) throw error;
      const result = data as { ok?: boolean; reason?: string };
      if (!result?.ok) {
        throw new Error(typeof result.reason === "string" ? result.reason : "Review failed");
      }
      toast({
        title: action === "approve" ? "Discount approved & applied" : "Request declined",
      });
      await load();
    } catch (e: unknown) {
      toast({
        title: "Action failed",
        description: formatSupabaseError(e, "Could not update request"),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function reviewWallet(id: string, action: "approve" | "decline") {
    setBusyId(id);
    try {
      const { error } = await supabase.rpc("fn_review_wallet_exception_request", {
        _request_id: id,
        _action: action,
        _note: notes[id]?.trim() || null,
      });
      if (error) throw error;
      toast({
        title: action === "approve" ? "Wallet exception approved" : "Request declined",
      });
      await load();
    } catch (e: unknown) {
      toast({
        title: "Action failed",
        description: formatSupabaseError(e, "Could not update request"),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  function handleApprove(item: UnifiedApprovalItem) {
    if (item.kind === "wallet_exception") reviewWallet(item.id, "approve");
    else reviewDiscount(item.id, "approve");
  }

  function handleDecline(item: UnifiedApprovalItem) {
    if (item.kind === "wallet_exception") reviewWallet(item.id, "decline");
    else reviewDiscount(item.id, "decline");
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
          <Link to="/performance/admin" className="text-sm hover:underline ml-auto" style={{ color: "var(--blue)" }}>
            ← Command center
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
          <Card className="p-4 ph-surface-card space-y-3 border-dashed">
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
