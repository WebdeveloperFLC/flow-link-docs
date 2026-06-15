import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PerformanceLegacyDeskNav } from "@/components/performance/PerformanceLegacyDeskNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FlaskConical, Play } from "lucide-react";

function currentPeriodKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface Plan {
  id: string;
  name: string;
  period_type: string;
  settlement_currency: string;
}

interface PreviewRow {
  counselor_id: string;
  earned: number;
  settlement_currency: string;
}

const fmt = (n: number, ccy: string) =>
  `${ccy === "INR" ? "₹" : ""}${Number(n ?? 0).toLocaleString()}${ccy !== "INR" ? " " + ccy : ""}`;

export default function IncentiveSimulator() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [planId, setPlanId] = useState("");
  const [periodA, setPeriodA] = useState(currentPeriodKey());
  const [periodB, setPeriodB] = useState("");
  const [branchId, setBranchId] = useState("");
  const [busy, setBusy] = useState(false);
  const [resultA, setResultA] = useState<{ summary: PreviewRow[]; grand_total: number; settlement: string } | null>(null);
  const [resultB, setResultB] = useState<{ summary: PreviewRow[]; grand_total: number; settlement: string } | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("incentive_plans").select("id, name, period_type, settlement_currency").eq("is_active", true),
      supabase.from("branches").select("id, name").order("name"),
      supabase.from("profiles").select("id, full_name"),
    ]).then(([pl, br, pr]) => {
      setPlans((pl.data ?? []) as Plan[]);
      setBranches((br.data ?? []) as { id: string; name: string }[]);
      const map: Record<string, string> = {};
      for (const p of (pr.data ?? []) as any[]) map[p.id] = p.full_name ?? p.id;
      setNames(map);
      if ((pl.data ?? []).length) setPlanId((pl.data as Plan[])[0].id);
    });
  }, []);

  async function preview(period: string): Promise<{ summary: PreviewRow[]; grand_total: number; settlement: string } | null> {
    const body: Record<string, string> = { action: "preview", plan_id: planId, period_key: period };
    if (branchId) body.branch_id = branchId;
    const { data, error } = await supabase.functions.invoke("incentive-calculate-run", { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return {
      summary: data.summary ?? [],
      grand_total: data.grand_total ?? 0,
      settlement: data.settlement ?? "INR",
    };
  }

  async function runSim() {
    if (!planId) {
      toast({ title: "Select a plan", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const a = await preview(periodA);
      setResultA(a);
      if (periodB.trim()) {
        const b = await preview(periodB.trim());
        setResultB(b);
      } else {
        setResultB(null);
      }
      toast({ title: "Simulation complete", description: "Preview only — nothing saved." });
    } catch (e: any) {
      toast({ title: "Simulation failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const delta =
    resultA && resultB ? resultB.grand_total - resultA.grand_total : null;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <PerformanceLegacyDeskNav workspace="incentives-payouts" />
        <div className="flex items-center gap-3">
          <FlaskConical className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">What-if Simulator</h1>
            <p className="text-sm text-muted-foreground">
              Compare incentive previews across periods or branches — uses live data, does not save runs.
            </p>
          </div>
        </div>

        <Card className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Plan</label>
              <select
                className="w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
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
            <div className="flex items-end">
              <Button className="w-full" disabled={busy} onClick={runSim}>
                <Play className="size-4 mr-1" /> {busy ? "Running…" : "Run simulation"}
              </Button>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Scenario A — period</label>
              <Input className="mt-1" value={periodA} onChange={(e) => setPeriodA(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Scenario B — period (optional compare)</label>
              <Input className="mt-1" value={periodB} onChange={(e) => setPeriodB(e.target.value)} placeholder="e.g. 2026-05" />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {resultA && (
            <Card className="p-5">
              <h2 className="text-lg font-semibold mb-1">Scenario A — {periodA}</h2>
              <p className="text-2xl font-semibold mb-4">{fmt(resultA.grand_total, resultA.settlement)}</p>
              <PreviewTable summary={resultA.summary} names={names} settlement={resultA.settlement} />
            </Card>
          )}
          {resultB && (
            <Card className="p-5">
              <h2 className="text-lg font-semibold mb-1">Scenario B — {periodB}</h2>
              <p className="text-2xl font-semibold mb-4">{fmt(resultB.grand_total, resultB.settlement)}</p>
              <PreviewTable summary={resultB.summary} names={names} settlement={resultB.settlement} />
            </Card>
          )}
        </div>

        {delta != null && (
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Delta (B − A)</p>
            <p className={`text-xl font-semibold ${delta >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              {delta >= 0 ? "+" : ""}{fmt(delta, resultA!.settlement)}
            </p>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function PreviewTable({
  summary,
  names,
  settlement,
}: {
  summary: PreviewRow[];
  names: Record<string, string>;
  settlement: string;
}) {
  if (!summary.length) {
    return <p className="text-sm text-muted-foreground">No earnings in this scenario.</p>;
  }
  return (
    <div className="overflow-x-auto max-h-64">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground border-b">
          <tr><th className="py-2">Counselor</th><th className="py-2 text-right">Earned</th></tr>
        </thead>
        <tbody>
          {[...summary].sort((a, b) => b.earned - a.earned).map((r) => (
            <tr key={r.counselor_id} className="border-b">
              <td className="py-2">{names[r.counselor_id] ?? r.counselor_id}</td>
              <td className="py-2 text-right">{fmt(r.earned, settlement)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
