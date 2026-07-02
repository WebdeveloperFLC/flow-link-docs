import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { ArrowLeftRight, Loader2, PiggyBank, RefreshCw } from "lucide-react";
import { formatInr } from "@/lib/performanceHubTheme";

interface PoolWallet {
  id: string;
  balance: number;
  currency: string;
}

interface CounselorOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface AllocationRow {
  id: string;
  amount: number;
  reason: string | null;
  created_at: string;
  counselor_id: string;
  counselor_name: string;
}

export default function PerformanceBranchPool() {
  const { isAdmin, hasRole, loading: authLoading } = useAuth();
  const allowed = isAdmin || hasRole(["manager", "administrator"]);
  const { toast } = useToast();
  const { period, branchId, branchLabel, branches } = usePerformancePeriod();
  const [pool, setPool] = useState<PoolWallet | null>(null);
  const [counselors, setCounselors] = useState<CounselorOption[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fundAmount, setFundAmount] = useState("25000");
  const [allocateForm, setAllocateForm] = useState({
    counselor_id: "",
    amount: "5000",
    reason: "",
  });

  const load = useCallback(async () => {
    if (!branchId) {
      setPool(null);
      setCounselors([]);
      setAllocations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await supabase.rpc("fn_get_or_create_branch_pool_wallet", {
        _branch_id: branchId,
        _period_key: period,
        _currency: "INR",
      });

      const [w, c] = await Promise.all([
        supabase
          .from("discount_wallets")
          .select("id, balance, currency")
          .eq("branch_id", branchId)
          .eq("period_key", period)
          .eq("budget_kind", "branch_pool")
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("branch_id", branchId)
          .order("full_name"),
      ]);

      setPool((w.data as PoolWallet | null) ?? null);
      setCounselors((c.data ?? []) as CounselorOption[]);

      if (w.data?.id) {
        const { data: rows } = await supabase
          .from("branch_pool_allocations")
          .select("id, amount, reason, created_at, counselor_id, profiles!branch_pool_allocations_counselor_id_fkey(full_name, email)")
          .eq("pool_wallet_id", w.data.id)
          .order("created_at", { ascending: false })
          .limit(20);
        setAllocations(
          ((rows ?? []) as any[]).map((r) => ({
            id: r.id,
            amount: Number(r.amount),
            reason: r.reason,
            created_at: r.created_at,
            counselor_id: r.counselor_id,
            counselor_name:
              r.profiles?.full_name ?? r.profiles?.email ?? r.counselor_id,
          })),
        );
      } else {
        setAllocations([]);
      }
    } catch (e) {
      toast({
        title: "Could not load branch pool",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [branchId, period, toast]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  async function fundPool() {
    if (!pool?.id || !isAdmin) return;
    const amt = Number(fundAmount);
    if (!amt || amt <= 0) {
      toast({ title: "Enter a positive amount", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("wallet_topups").insert([
        {
          wallet_id: pool.id,
          amount: amt,
          currency: pool.currency,
          topup_type: "manual",
          reason: `Branch pool fund — ${branchLabel} ${period}`,
        },
      ]);
      if (error) throw error;
      toast({ title: "Pool funded", description: formatInr(amt) });
      await load();
    } catch (e) {
      toast({
        title: "Fund failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function allocate() {
    if (!branchId) return;
    const amt = Number(allocateForm.amount);
    if (!allocateForm.counselor_id || !amt || amt <= 0) {
      toast({ title: "Counselor and amount required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("fn_allocate_from_branch_pool", {
        _branch_id: branchId,
        _counselor_id: allocateForm.counselor_id,
        _amount: amt,
        _period_key: period,
        _reason: allocateForm.reason.trim() || null,
      });
      if (error) throw error;
      const remaining = (data as { pool_remaining?: number })?.pool_remaining;
      toast({
        title: "Allocated to counselor wallet",
        description:
          remaining != null
            ? `${formatInr(amt)} moved · pool remaining ${formatInr(remaining)}`
            : formatInr(amt),
      });
      setAllocateForm((f) => ({ ...f, amount: "5000", reason: "" }));
      await load();
    } catch (e) {
      toast({
        title: "Allocation failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return null;
  if (!allowed) return <Navigate to="/performance" replace />;

  return (
    <AppLayout>
      <PerformanceHubHeader
        title="Branch pool wallet"
        subtitle="W2 — shared branch budget allocated to counselor discount wallets"
      />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <PerformancePeriodBar />

        {!branchId ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Select a branch in the period bar to manage its pool wallet.
          </Card>
        ) : loading ? (
          <Card className="p-10 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin mr-2" /> Loading pool…
          </Card>
        ) : (
          <>
            <Card className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <PiggyBank className="size-8 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">{branchLabel} · {period}</p>
                  <p className="text-3xl font-bold tabular-nums mt-1">
                    {formatInr(Number(pool?.balance ?? 0))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Available in branch pool</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={load} disabled={busy}>
                <RefreshCw className="size-4 mr-1" /> Refresh
              </Button>
            </Card>

            {isAdmin && (
              <Card className="p-5 space-y-3">
                <h2 className="font-semibold">Fund pool (admin)</h2>
                <p className="text-sm text-muted-foreground">
                  Add INR to the branch pool before managers allocate to counselors.
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <Label htmlFor="fund-amt">Amount (INR)</Label>
                    <Input
                      id="fund-amt"
                      className="w-40 mt-1"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                    />
                  </div>
                  <Button onClick={fundPool} disabled={busy || !pool?.id}>
                    Add to pool
                  </Button>
                </div>
              </Card>
            )}

            <Card className="p-5 space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <ArrowLeftRight className="size-4" /> Allocate to counselor
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label>Counselor</Label>
                  <select
                    className="w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm"
                    value={allocateForm.counselor_id}
                    onChange={(e) =>
                      setAllocateForm({ ...allocateForm, counselor_id: e.target.value })
                    }
                  >
                    <option value="">Select counselor…</option>
                    {counselors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name ?? c.email ?? c.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Amount (INR)</Label>
                  <Input
                    className="mt-1"
                    value={allocateForm.amount}
                    onChange={(e) =>
                      setAllocateForm({ ...allocateForm, amount: e.target.value })
                    }
                  />
                </div>
                <div className="md:col-span-3">
                  <Label>Reason (optional)</Label>
                  <Input
                    className="mt-1"
                    value={allocateForm.reason}
                    onChange={(e) =>
                      setAllocateForm({ ...allocateForm, reason: e.target.value })
                    }
                    placeholder="e.g. Q2 stretch bonus"
                  />
                </div>
              </div>
              <Button onClick={allocate} disabled={busy}>
                Allocate from pool
              </Button>
            </Card>

            <Card className="p-5">
              <h2 className="font-semibold mb-3">Recent allocations</h2>
              {allocations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No allocations yet this period.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-2">When</th>
                      <th className="text-left py-2">Counselor</th>
                      <th className="text-right py-2">Amount</th>
                      <th className="text-left py-2 pl-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((a) => (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="py-2 text-muted-foreground">
                          {new Date(a.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2">{a.counselor_name}</td>
                        <td className="py-2 text-right tabular-nums font-medium">
                          {formatInr(a.amount)}
                        </td>
                        <td className="py-2 pl-3 text-muted-foreground">{a.reason ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <p className="text-xs text-muted-foreground">
              Counselors need an open personal wallet for {period}. See{" "}
              <Link to="/incentives/wallet-topups" className="text-primary underline">
                wallet top-ups
              </Link>{" "}
              if allocation fails.
            </p>
          </>
        )}
      </div>
    </AppLayout>
  );
}
