import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Lock, Trophy } from "lucide-react";

function currentPeriodKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [planId, setPlanId] = useState<string>("");
  const [periodKey, setPeriodKey] = useState<string>(currentPeriodKey());
  const [branchId, setBranchId] = useState<string>("");
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ summary: SummaryRow[]; grand_total: number; settlement: string; fx: Record<string, number> } | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  async function loadAll() {
    const [pl, rn, prof, br] = await Promise.all([
      supabase.from("incentive_plans").select("id, name, period_type, settlement_currency, is_active").order("created_at", { ascending: false }),
      supabase.from("incentive_runs").select("id, plan_id, period_key, branch_id, status, total_settlement, settlement_currency, locked, calculated_at").order("calculated_at", { ascending: false }).limit(50),
      supabase.from("profiles").select("id, full_name"),
      supabase.from("branches").select("id, name").order("name"),
    ]);
    setPlans((pl.data ?? []) as Plan[]);
    setRuns((rn.data ?? []) as RunRow[]);
    setBranches((br.data ?? []) as { id: string; name: string }[]);
    const map: Record<string, string> = {};
    for (const p of (prof.data ?? []) as any[]) map[p.id] = p.full_name ?? p.id;
    setNames(map);
    if (!planId && (pl.data ?? []).length) setPlanId((pl.data as Plan[])[0].id);
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  async function callFn(action: "preview" | "calculate" | "lock") {
    if (!planId) { toast({ title: "Pick a plan first", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const body: any = { action, plan_id: planId, period_key: periodKey };
      if (branchId.trim()) body.branch_id = branchId.trim();
      const { data, error } = await supabase.functions.invoke("incentive-calculate-run", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

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
    } catch (e: any) {
      toast({ title: "Error", description: String(e?.message ?? e), variant: "destructive" });
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

        {/* Run controls */}
        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-semibold">Calculate a run</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
            <div>
              <label className="text-xs text-muted-foreground">Period key</label>
              <Input className="mt-1" value={periodKey} onChange={(e) => setPeriodKey(e.target.value)} placeholder="2026-05 / 2026-Q2 / 2026-H1 / 2026" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Branch (optional)</label>
              <select
                className="w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy} onClick={() => callFn("preview")}>
              {busy ? "Working…" : "Preview"}
            </Button>
            <Button disabled={busy} onClick={() => callFn("calculate")}>
              <Calculator className="size-4 mr-1" /> Calculate &amp; save
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => callFn("lock")}>
              <Lock className="size-4 mr-1" /> Approve &amp; lock
            </Button>
          </div>
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
                    <th className="py-2 pr-4">Period</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Locked</th>
                    <th className="py-2 pr-4 text-right">Total</th>
                    <th className="py-2 pr-4">Calculated</th>
                    <th className="py-2 pr-4">Audit</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{r.period_key}</td>
                      <td className="py-2 pr-4 capitalize">{r.status}</td>
                      <td className="py-2 pr-4">{r.locked ? "🔒" : "—"}</td>
                      <td className="py-2 pr-4 text-right">{fmt(r.total_settlement, r.settlement_currency)}</td>
                      <td className="py-2 pr-4">{r.calculated_at ? new Date(r.calculated_at).toLocaleDateString() : "—"}</td>
                      <td className="py-2 pr-4">
                        <a href={`/incentives/runs/${r.id}`} className="text-primary text-xs underline">Line items</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
