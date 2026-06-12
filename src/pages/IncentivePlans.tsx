import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Settings2, Plus, Trash2 } from "lucide-react";

const PERIOD_TYPES = ["monthly", "quarterly", "half_yearly", "yearly"];
const SOURCE_TYPES = ["service_revenue", "ancillary", "direct_visa_commission", "b2b_admission_commission"];
const RATE_TYPES = ["flat", "per_unit", "percent", "slab"];
const METRICS = ["count", "gross_revenue", "net_revenue", "commission_received"];
const CURRENCIES = ["INR", "CAD", "USD", "GBP", "AUD"];

type PeriodType = "monthly" | "quarterly" | "half_yearly" | "yearly";
type SourceType = "service_revenue" | "ancillary" | "direct_visa_commission" | "b2b_admission_commission";
type RateType = "flat" | "per_unit" | "percent" | "slab";
type Metric = "count" | "gross_revenue" | "net_revenue" | "commission_received";

const sel = "w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm";

interface Plan {
  id: string; name: string; description: string | null; scope_type: string;
  branch_id: string | null; role_key: string | null; period_type: string;
  settlement_currency: string; revenue_basis: string; active_from: string;
  active_to: string | null; is_active: boolean;
}
interface Slab {
  id: string; plan_id: string; source_type: string; service_filter: string | null;
  metric: string; rate_type: string; min_threshold: number; max_threshold: number | null;
  rate_value: number; sort_order: number;
}
interface Target {
  id: string; plan_id: string | null; counselor_id: string; branch_id: string | null;
  period_type: string; period_key: string; target_metric: string; target_value: number;
  target_currency: string; bonus_rate_type: string | null; bonus_value: number | null;
  bonus_trigger_pct: number | null;
}

export default function IncentivePlans() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);
  const [activePlan, setActivePlan] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // form state
  const [newPlan, setNewPlan] = useState<{
    name: string;
    period_type: PeriodType;
    settlement_currency: string;
    revenue_basis: string;
    scope_type: string;
    branch_id: string;
  }>({
    name: "",
    period_type: "monthly",
    settlement_currency: "INR",
    revenue_basis: "net",
    scope_type: "global",
    branch_id: "",
  });
  const [newSlab, setNewSlab] = useState<{ source_type: SourceType; metric: Metric; rate_type: RateType; min_threshold: string; max_threshold: string; rate_value: string; service_filter: string }>({ source_type: "service_revenue", metric: "net_revenue", rate_type: "percent", min_threshold: "0", max_threshold: "", rate_value: "5", service_filter: "" });
  const [newTarget, setNewTarget] = useState<{ counselor_id: string; period_type: PeriodType; period_key: string; target_metric: Metric; target_value: string; target_currency: string; bonus_rate_type: "" | "flat" | "percent"; bonus_value: string; bonus_trigger_pct: string }>({ counselor_id: "", period_type: "monthly", period_key: "", target_metric: "net_revenue", target_value: "0", target_currency: "INR", bonus_rate_type: "", bonus_value: "", bonus_trigger_pct: "100" });

  async function loadAll() {
    setLoading(true);
    const [pl, sl, tg, br, pr] = await Promise.all([
      supabase.from("incentive_plans").select("*").order("created_at", { ascending: false }),
      supabase.from("incentive_slabs").select("*").order("sort_order", { ascending: true }),
      supabase.from("incentive_targets").select("*").order("period_key", { ascending: false }),
      supabase.from("branches").select("id, name").order("name"),
      supabase.from("profiles").select("id, full_name").order("full_name"),
    ]);
    const planRows = (pl.data ?? []) as Plan[];
    setPlans(planRows);
    setSlabs((sl.data ?? []) as Slab[]);
    setTargets((tg.data ?? []) as Target[]);
    setBranches((br.data ?? []) as any[]);
    setProfiles((pr.data ?? []) as any[]);
    if (!activePlan && planRows.length) setActivePlan(planRows[0].id);
    setLoading(false);
  }
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? id;
  const planName = (id: string | null) => plans.find((p) => p.id === id)?.name ?? "—";

  async function createPlan() {
    if (!newPlan.name.trim()) { toast({ title: "Plan name required", variant: "destructive" }); return; }
    const { error } = await supabase.from("incentive_plans").insert([{
      name: newPlan.name.trim(),
      period_type: newPlan.period_type,
      settlement_currency: newPlan.settlement_currency,
      revenue_basis: newPlan.revenue_basis,
      scope_type: newPlan.scope_type,
      branch_id: newPlan.branch_id.trim() || null,
    }]);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Plan created" });
    setNewPlan({
      name: "",
      period_type: "monthly",
      settlement_currency: "INR",
      revenue_basis: "net",
      scope_type: "global",
      branch_id: "",
    });
    await loadAll();
  }

  async function togglePlan(p: Plan) {
    const { error } = await supabase.from("incentive_plans").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await loadAll();
  }

  async function addSlab() {
    if (!activePlan) { toast({ title: "Select a plan first", variant: "destructive" }); return; }
    const { error } = await supabase.from("incentive_slabs").insert([{
      plan_id: activePlan, source_type: newSlab.source_type, metric: newSlab.metric,
      rate_type: newSlab.rate_type, min_threshold: Number(newSlab.min_threshold) || 0,
      max_threshold: newSlab.max_threshold.trim() === "" ? null : Number(newSlab.max_threshold),
      rate_value: Number(newSlab.rate_value) || 0,
      service_filter: newSlab.service_filter.trim() || null,
      sort_order: slabs.filter((s) => s.plan_id === activePlan).length,
    }]);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Slab added" });
    await loadAll();
  }

  async function deleteSlab(id: string) {
    const { error } = await supabase.from("incentive_slabs").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await loadAll();
  }

  async function addTarget() {
    if (!newTarget.counselor_id) { toast({ title: "Pick a counselor", variant: "destructive" }); return; }
    if (!newTarget.period_key.trim()) { toast({ title: "Period key required", variant: "destructive" }); return; }
    const { error } = await supabase.from("incentive_targets").insert([{
      plan_id: activePlan || null, counselor_id: newTarget.counselor_id,
      period_type: newTarget.period_type, period_key: newTarget.period_key.trim(),
      target_metric: newTarget.target_metric, target_value: Number(newTarget.target_value) || 0,
      target_currency: newTarget.target_currency,
      bonus_rate_type: newTarget.bonus_rate_type || null,
      bonus_value: newTarget.bonus_value.trim() === "" ? null : Number(newTarget.bonus_value),
      bonus_trigger_pct: Number(newTarget.bonus_trigger_pct) || 100,
    }]);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Target set" });
    await loadAll();
  }

  async function deleteTarget(id: string) {
    const { error } = await supabase.from("incentive_targets").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await loadAll();
  }

  const planSlabs = slabs.filter((s) => s.plan_id === activePlan);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Settings2 className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold">Incentive Plans &amp; Rules</h1>
        </div>

        <Tabs defaultValue="plans">
          <TabsList>
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="slabs">Slabs</TabsTrigger>
            <TabsTrigger value="targets">Targets</TabsTrigger>
          </TabsList>

          {/* ---------- PLANS ---------- */}
          <TabsContent value="plans" className="space-y-4">
            <Card className="p-5 space-y-3">
              <h2 className="text-lg font-semibold">Create plan</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input className="mt-1" value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} placeholder="e.g. Q2 Counselor Plan" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Period type</label>
                  <select className={sel} value={newPlan.period_type} onChange={(e) => setNewPlan({ ...newPlan, period_type: e.target.value as PeriodType })}>
                    {PERIOD_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Settlement currency</label>
                  <select className={sel} value={newPlan.settlement_currency} onChange={(e) => setNewPlan({ ...newPlan, settlement_currency: e.target.value })}>
                    {CURRENCIES.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Revenue basis</label>
                  <select className={sel} value={newPlan.revenue_basis} onChange={(e) => setNewPlan({ ...newPlan, revenue_basis: e.target.value })}>
                    <option value="net">net (after discounts)</option>
                    <option value="gross">gross</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Scope</label>
                  <select className={sel} value={newPlan.scope_type} onChange={(e) => setNewPlan({ ...newPlan, scope_type: e.target.value })}>
                    <option value="global">Organization-wide</option>
                    <option value="branch">Branch-specific</option>
                  </select>
                </div>
                {newPlan.scope_type === "branch" && (
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground">Branch</label>
                    <select className={sel} value={newPlan.branch_id} onChange={(e) => setNewPlan({ ...newPlan, branch_id: e.target.value })}>
                      <option value="">Select branch…</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <Button onClick={createPlan}><Plus className="size-4 mr-1" /> Create plan</Button>
            </Card>

            <Card className="p-5">
              <h2 className="text-lg font-semibold mb-4">Plans</h2>
              {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : plans.length === 0 ? (
                <div className="text-sm text-muted-foreground">No plans yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground border-b">
                      <tr><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Period</th><th className="py-2 pr-4">Scope</th><th className="py-2 pr-4">Currency</th><th className="py-2 pr-4">Basis</th><th className="py-2 pr-4">Active</th></tr>
                    </thead>
                    <tbody>
                      {plans.map((p) => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">{p.name}</td>
                          <td className="py-2 pr-4">{p.period_type}</td>
                          <td className="py-2 pr-4">{p.scope_type ?? "global"}{p.branch_id ? ` · ${branches.find((b) => b.id === p.branch_id)?.name ?? "branch"}` : ""}</td>
                          <td className="py-2 pr-4">{p.settlement_currency}</td>
                          <td className="py-2 pr-4">{p.revenue_basis}</td>
                          <td className="py-2 pr-4">
                            <Button variant={p.is_active ? "secondary" : "outline"} size="sm" onClick={() => togglePlan(p)}>
                              {p.is_active ? "Active" : "Inactive"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ---------- SLABS ---------- */}
          <TabsContent value="slabs" className="space-y-4">
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Slabs for plan</h2>
                <select className="border rounded-md h-9 px-2 bg-background text-sm" value={activePlan} onChange={(e) => setActivePlan(e.target.value)}>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Source</label>
                  <select className={sel} value={newSlab.source_type} onChange={(e) => setNewSlab({ ...newSlab, source_type: e.target.value as SourceType })}>
                    {SOURCE_TYPES.map((x) => <option key={x} value={x}>{x.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Metric</label>
                  <select className={sel} value={newSlab.metric} onChange={(e) => setNewSlab({ ...newSlab, metric: e.target.value as Metric })}>
                    {METRICS.map((x) => <option key={x} value={x}>{x.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Rate type</label>
                  <select className={sel} value={newSlab.rate_type} onChange={(e) => setNewSlab({ ...newSlab, rate_type: e.target.value as RateType })}>
                    {RATE_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Rate value (₹ or %)</label>
                  <Input className="mt-1" value={newSlab.rate_value} onChange={(e) => setNewSlab({ ...newSlab, rate_value: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Min threshold</label>
                  <Input className="mt-1" value={newSlab.min_threshold} onChange={(e) => setNewSlab({ ...newSlab, min_threshold: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Max threshold (blank = ∞)</label>
                  <Input className="mt-1" value={newSlab.max_threshold} onChange={(e) => setNewSlab({ ...newSlab, max_threshold: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">Service filter (optional master_key/code)</label>
                  <Input className="mt-1" value={newSlab.service_filter} onChange={(e) => setNewSlab({ ...newSlab, service_filter: e.target.value })} placeholder="blank = all services" />
                </div>
              </div>
              <Button onClick={addSlab}><Plus className="size-4 mr-1" /> Add slab</Button>
            </Card>

            <Card className="p-5">
              <h2 className="text-lg font-semibold mb-4">Current slabs</h2>
              {planSlabs.length === 0 ? <div className="text-sm text-muted-foreground">No slabs for this plan.</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground border-b">
                      <tr><th className="py-2 pr-4">Source</th><th className="py-2 pr-4">Metric</th><th className="py-2 pr-4">Rate</th><th className="py-2 pr-4 text-right">Min</th><th className="py-2 pr-4 text-right">Max</th><th className="py-2 pr-4 text-right">Value</th><th className="py-2 pr-4"></th></tr>
                    </thead>
                    <tbody>
                      {planSlabs.map((s) => (
                        <tr key={s.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">{s.source_type.replace(/_/g, " ")}</td>
                          <td className="py-2 pr-4">{s.metric.replace(/_/g, " ")}</td>
                          <td className="py-2 pr-4">{s.rate_type}</td>
                          <td className="py-2 pr-4 text-right">{s.min_threshold}</td>
                          <td className="py-2 pr-4 text-right">{s.max_threshold ?? "∞"}</td>
                          <td className="py-2 pr-4 text-right">{s.rate_value}{s.rate_type === "percent" || s.rate_type === "slab" ? "%" : ""}</td>
                          <td className="py-2 pr-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => deleteSlab(s.id)}><Trash2 className="size-4" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ---------- TARGETS ---------- */}
          <TabsContent value="targets" className="space-y-4">
            <Card className="p-5 space-y-3">
              <h2 className="text-lg font-semibold">Set target</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">Counselor</label>
                  <select className={sel} value={newTarget.counselor_id} onChange={(e) => setNewTarget({ ...newTarget, counselor_id: e.target.value })}>
                    <option value="">Select…</option>
                    {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name ?? p.id}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Period type</label>
                  <select className={sel} value={newTarget.period_type} onChange={(e) => setNewTarget({ ...newTarget, period_type: e.target.value as PeriodType })}>
                    {PERIOD_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Period key</label>
                  <Input className="mt-1" value={newTarget.period_key} onChange={(e) => setNewTarget({ ...newTarget, period_key: e.target.value })} placeholder="2026-05 / 2026-Q2" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Target metric</label>
                  <select className={sel} value={newTarget.target_metric} onChange={(e) => setNewTarget({ ...newTarget, target_metric: e.target.value as Metric })}>
                    {METRICS.map((x) => <option key={x} value={x}>{x.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Target value</label>
                  <Input className="mt-1" value={newTarget.target_value} onChange={(e) => setNewTarget({ ...newTarget, target_value: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Currency</label>
                  <select className={sel} value={newTarget.target_currency} onChange={(e) => setNewTarget({ ...newTarget, target_currency: e.target.value })}>
                    {CURRENCIES.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Bonus type (optional)</label>
                  <select className={sel} value={newTarget.bonus_rate_type} onChange={(e) => setNewTarget({ ...newTarget, bonus_rate_type: e.target.value as "" | "flat" | "percent" })}>
                    <option value="">none</option>
                    <option value="flat">flat</option>
                    <option value="percent">percent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Bonus value</label>
                  <Input className="mt-1" value={newTarget.bonus_value} onChange={(e) => setNewTarget({ ...newTarget, bonus_value: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Bonus trigger %</label>
                  <Input className="mt-1" value={newTarget.bonus_trigger_pct} onChange={(e) => setNewTarget({ ...newTarget, bonus_trigger_pct: e.target.value })} />
                </div>
              </div>
              <Button onClick={addTarget}><Plus className="size-4 mr-1" /> Set target</Button>
            </Card>

            <Card className="p-5">
              <h2 className="text-lg font-semibold mb-4">Targets</h2>
              {targets.length === 0 ? <div className="text-sm text-muted-foreground">No targets set.</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground border-b">
                      <tr><th className="py-2 pr-4">Counselor</th><th className="py-2 pr-4">Plan</th><th className="py-2 pr-4">Period</th><th className="py-2 pr-4 text-right">Target</th><th className="py-2 pr-4">Bonus</th><th className="py-2 pr-4"></th></tr>
                    </thead>
                    <tbody>
                      {targets.map((t) => (
                        <tr key={t.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">{nameOf(t.counselor_id)}</td>
                          <td className="py-2 pr-4">{planName(t.plan_id)}</td>
                          <td className="py-2 pr-4">{t.period_key} ({t.period_type})</td>
                          <td className="py-2 pr-4 text-right">{Number(t.target_value).toLocaleString()} {t.target_currency}</td>
                          <td className="py-2 pr-4">{t.bonus_rate_type ? `${t.bonus_value}${t.bonus_rate_type === "percent" ? "%" : ""} @ ${t.bonus_trigger_pct}%` : "—"}</td>
                          <td className="py-2 pr-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => deleteTarget(t.id)}><Trash2 className="size-4" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
