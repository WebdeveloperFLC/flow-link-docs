import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { invokeError } from "@/lib/invokeError";
import { directorReadOnlyMessage, isDirectorReadOnlyError } from "@/lib/performanceDirectorReadOnly";
import { useAuth } from "@/contexts/AuthContext";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { usePerformanceLockReadiness } from "@/hooks/usePerformanceLockReadiness";
import { Calculator, Lock, Unlock, Trash2 } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  period_type: string;
  settlement_currency: string;
  is_active: boolean;
}
interface RunRow {
  id: string;
  plan_id: string;
  period_key: string;
  branch_id: string | null;
  status: string;
  total_settlement: number;
  settlement_currency: string;
  locked: boolean;
  calculated_at: string | null;
}
interface SummaryRow {
  counselor_id: string;
  earned: number;
  settlement_currency: string;
}

const fmt = (n: number, ccy: string) =>
  `${ccy === "INR" ? "₹" : ""}${Number(n ?? 0).toLocaleString()} ${ccy !== "INR" ? ccy : ""}`.trim();

export default function IncentivesAdmin() {
  const { toast } = useToast();
  const { isAdmin, hasRole } = useAuth();
  const isDirectorOnly =
    hasRole("director") && !isAdmin && !hasRole(["manager", "administrator"]);
  const { period, branchId, branches } = usePerformancePeriod();
  const lockReadiness = usePerformanceLockReadiness(period);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [planId, setPlanId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ summary: SummaryRow[]; grand_total: number; settlement: string; fx: Record<string, number> } | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [adminAction, setAdminAction] = useState<{ runId: string; action: "unlock" | "void" } | null>(null);
  const [adminReason, setAdminReason] = useState("");

  const scopeBranchId = branchId.trim() || null;

  async function loadAll() {
    const [pl, rn, prof] = await Promise.all([
      supabase.from("incentive_plans").select("id, name, period_type, settlement_currency, is_active").order("created_at", { ascending: false }),
      supabase.from("incentive_runs").select("id, plan_id, period_key, branch_id, status, total_settlement, settlement_currency, locked, calculated_at").order("calculated_at", { ascending: false }).limit(50),
      supabase.from("profiles").select("id, full_name"),
    ]);
    setPlans((pl.data ?? []) as Plan[]);
    setRuns((rn.data ?? []) as RunRow[]);
    const map: Record<string, string> = {};
    for (const p of (prof.data ?? []) as any[]) map[p.id] = p.full_name ?? p.id;
    setNames(map);
    if (!planId && (pl.data ?? []).length) setPlanId((pl.data as Plan[])[0].id);
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  const lockedRunForSelection = useMemo(
    () =>
      runs.find(
        (r) =>
          r.plan_id === planId &&
          r.period_key === period &&
          (r.branch_id ?? null) === scopeBranchId &&
          r.locked,
      ) ?? null,
    [runs, planId, period, scopeBranchId],
  );
  const calculatedRunForSelection = useMemo(
    () =>
      runs.find(
        (r) =>
          r.plan_id === planId &&
          r.period_key === period &&
          (r.branch_id ?? null) === scopeBranchId &&
          !r.locked &&
          r.status === "calculated",
      ) ?? null,
    [runs, planId, period, scopeBranchId],
  );

  const isSelectionLocked = !!lockedRunForSelection;
  const lockBlockedByQueues = !lockReadiness.loading && !lockReadiness.canLock;

  async function callFn(action: "preview" | "calculate" | "lock") {
    if (!planId) { toast({ title: "Pick a plan first", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const body: any = { action, plan_id: planId, period_key: period };
      if (scopeBranchId) body.branch_id = scopeBranchId;
      const { data, error } = await supabase.functions.invoke("incentive-calculate-run", { body });
      if (error || data?.error) {
        const msg = await invokeError(error, data);
        throw new Error(msg ?? data?.error ?? "Request failed");
      }

      if (action === "preview") {
        setPreview({ summary: data.summary ?? [], grand_total: data.grand_total ?? 0, settlement: data.settlement ?? "INR", fx: data.fx_snapshot ?? {} });
        toast({ title: "Preview ready", description: `Grand total ${fmt(data.grand_total ?? 0, data.settlement ?? "INR")}` });
      } else if (action === "calculate") {
        toast({ title: "Run calculated", description: `Total ${fmt(data.grand_total ?? 0, data.settlement ?? "INR")}` });
        await loadAll();
      } else {
        toast({ title: "Run locked", description: "Run approved and frozen." });
        await loadAll();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({
        title: "Error",
        description: directorReadOnlyMessage(msg),
        variant: isDirectorReadOnlyError(msg) ? "default" : "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function confirmAdminAction() {
    if (!adminAction || !adminReason.trim()) {
      toast({ title: "Reason required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const fn =
        adminAction.action === "unlock" ? "fn_admin_unlock_incentive_run" : "fn_admin_void_incentive_run";
      const { data, error } = await supabase.rpc(fn, {
        _run_id: adminAction.runId,
        _reason: adminReason.trim(),
      });
      if (error) throw error;
      toast({
        title: adminAction.action === "unlock" ? "Run unlocked" : "Run voided",
        description: String((data as { message?: string })?.message ?? "Done"),
      });
      setAdminAction(null);
      setAdminReason("");
      await loadAll();
    } catch (e: unknown) {
      toast({
        title: "Admin action failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Calculator className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold">Incentives — Runs</h1>
        </div>

        <PerformancePeriodBar />

        {isDirectorOnly && (
          <p className="text-sm text-muted-foreground border border-dashed rounded-md px-3 py-2">
            Director accounts are read-only here — use admin/finance workflow to calculate, lock, or pay out.
          </p>
        )}

        {/* Run controls */}
        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-semibold">Calculate a run</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Plan</label>
              <select
                className="w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
              >
                {plans.length === 0 && <option value="">No plans — create one first</option>}
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.period_type}, {p.settlement_currency})</option>
                ))}
              </select>
            </div>
            <div className="text-xs text-muted-foreground flex items-end pb-2">
              Using period <span className="font-semibold text-foreground mx-1">{period}</span>
              · {scopeBranchId ? branches.find((b) => b.id === scopeBranchId)?.name ?? "Branch" : "All branches"}
            </div>
          </div>
          {isSelectionLocked && (
            <p className="text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
              <Lock className="inline size-3.5 mr-1.5 -mt-0.5 shrink-0" />
              This plan and period are already locked
              {scopeBranchId ? " for the selected branch" : ""}. Recalculate is blocked — use{" "}
              <Link to="/incentives/payouts" className="underline font-medium">
                Payout desk
              </Link>{" "}
              adjustments instead (R2).
              {isAdmin && lockedRunForSelection && (
                <span className="block mt-2">
                  Admin: unlock from the Recent runs table below if no payouts are approved yet.
                </span>
              )}
            </p>
          )}
          {!isSelectionLocked && lockBlockedByQueues && (
            <p className="text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
              <Lock className="inline size-3.5 mr-1.5 -mt-0.5 shrink-0" />
              Approve &amp; lock is blocked for {period} until queues are cleared:
              <ul className="list-disc ml-5 mt-1 space-y-0.5">
                {lockReadiness.blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <span className="block mt-2">
                {lockReadiness.unclassifiedCount > 0 && (
                  <Link to="/performance/admin/unclassified" className="underline font-medium mr-3">
                    Unclassified →
                  </Link>
                )}
                {lockReadiness.pendingApprovals > 0 && (
                  <Link to="/performance/admin/approvals" className="underline font-medium">
                    Approvals →
                  </Link>
                )}
              </span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy || isDirectorOnly} onClick={() => callFn("preview")}>
              {busy ? "Working…" : "Preview"}
            </Button>
            <Button disabled={busy || isSelectionLocked || isDirectorOnly} onClick={() => callFn("calculate")}>
              <Calculator className="size-4 mr-1" /> Calculate &amp; save
            </Button>
            <Button
              variant="secondary"
              disabled={busy || isSelectionLocked || lockBlockedByQueues || !calculatedRunForSelection || isDirectorOnly}
              onClick={() => callFn("lock")}
            >
              <Lock className="size-4 mr-1" /> Approve &amp; lock
            </Button>
          </div>
          {!calculatedRunForSelection && !isSelectionLocked && (
            <p className="text-xs text-muted-foreground">
              Run Calculate &amp; save before Approve &amp; lock.
            </p>
          )}
        </Card>

        {/* Preview result */}
        {preview && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Preview — {fmt(preview.grand_total, preview.settlement)}</h2>
              <div className="text-xs text-muted-foreground">
                FX: {Object.entries(preview.fx).map(([k, v]) => `${k}=${v}`).join("  ")}
              </div>
            </div>
            {preview.summary.length === 0 ? (
              <div className="text-sm text-muted-foreground">No earnings found for this plan/period (no verified payments or paid commissions attributed to counselors).</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b">
                    <tr>
                      <th className="py-2 pr-4">Counselor</th>
                      <th className="py-2 pr-4 text-right">Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.summary
                      .slice()
                      .sort((a, b) => b.earned - a.earned)
                      .map((r) => (
                        <tr key={r.counselor_id} className="border-b last:border-0">
                          <td className="py-2 pr-4">{names[r.counselor_id] ?? r.counselor_id}</td>
                          <td className="py-2 pr-4 text-right">{fmt(r.earned, r.settlement_currency)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Existing runs */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Recent runs</h2>
          {runs.length === 0 ? (
            <div className="text-sm text-muted-foreground">No runs calculated yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Plan</th>
                    <th className="py-2 pr-4">Period</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Locked</th>
                    <th className="py-2 pr-4 text-right">Total</th>
                    <th className="py-2 pr-4">Calculated</th>
                    <th className="py-2 pr-4">Audit</th>
                    {isAdmin && <th className="py-2 pr-4">Admin</th>}
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{plans.find((p) => p.id === r.plan_id)?.name ?? r.plan_id.slice(0, 8)}</td>
                      <td className="py-2 pr-4">{r.period_key}</td>
                      <td className="py-2 pr-4 capitalize">{r.status}</td>
                      <td className="py-2 pr-4">{r.locked ? "🔒" : "—"}</td>
                      <td className="py-2 pr-4 text-right">{fmt(r.total_settlement, r.settlement_currency)}</td>
                      <td className="py-2 pr-4">{r.calculated_at ? new Date(r.calculated_at).toLocaleDateString() : "—"}</td>
                      <td className="py-2 pr-4">
                        <Link to={`/incentives/runs/${r.id}`} className="text-primary text-xs underline">
                          Line items
                        </Link>
                      </td>
                      {isAdmin && (
                        <td className="py-2 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {r.locked && r.status !== "void" && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                disabled={busy}
                                onClick={() => {
                                  setAdminReason("");
                                  setAdminAction({ runId: r.id, action: "unlock" });
                                }}
                              >
                                <Unlock className="size-3 mr-1" />
                                Unlock
                              </Button>
                            )}
                            {r.status !== "void" && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs text-destructive"
                                disabled={busy}
                                onClick={() => {
                                  setAdminReason("");
                                  setAdminAction({ runId: r.id, action: "void" });
                                }}
                              >
                                <Trash2 className="size-3 mr-1" />
                                Void
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <AlertDialog open={!!adminAction} onOpenChange={(open) => !open && setAdminAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {adminAction?.action === "unlock" ? "Unlock locked run?" : "Void incentive run?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {adminAction?.action === "unlock"
                  ? "Allows recalculate for this plan/period. Blocked if payouts are already approved or paid."
                  : "Marks the run void and deletes line items. Blocked if any payout rows exist."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea
              placeholder="Reason (required for audit log)"
              value={adminReason}
              onChange={(e) => setAdminReason(e.target.value)}
              rows={3}
            />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <AlertDialogAction disabled={busy || !adminReason.trim()} onClick={confirmAdminAction}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
