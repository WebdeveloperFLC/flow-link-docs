import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { IncentiveScopeFields, type ScopeFormState } from "@/incentives/components/IncentiveScopeFields";
import type { ScopeJson } from "@/incentives/lib/incentiveScopeLogic";

const SOURCE_TYPES = ["service_revenue", "ancillary", "direct_visa_commission", "b2b_admission_commission"];
const METRICS = ["count", "gross_revenue", "net_revenue", "commission_received", "enrolment_count"];
const RATE_TYPES = ["flat", "per_unit", "percent", "slab"];
const sel = "w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm";

export interface IncentiveRule {
  id: string;
  plan_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  scope_preset: string | null;
  scope_json: ScopeJson;
  source_type: string;
  metric: string;
  rate_type: string;
  rate_value: number;
  stacking_mode: string;
  cap_amount: number | null;
  settlement_currency: string | null;
  milestone: string | null;
}

interface Props {
  activePlan: string;
  plans: { id: string; name: string }[];
  rules: IncentiveRule[];
  onReload: () => Promise<void>;
}

const emptyScope: ScopeFormState = { scope_preset: "all_services", scope_json: {} };

export function IncentiveRulesTab({ activePlan, plans, rules, onReload }: Props) {
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    source_type: "service_revenue",
    metric: "net_revenue",
    rate_type: "percent",
    rate_value: "5",
    milestone: "",
    settlement_currency: "",
    scope: emptyScope,
  });

  const planRules = rules.filter((r) => r.plan_id === activePlan).sort((a, b) => a.sort_order - b.sort_order);

  async function addRule() {
    if (!activePlan) {
      toast({ title: "Select a plan", variant: "destructive" });
      return;
    }
    if (!form.name.trim()) {
      toast({ title: "Rule name required", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from("incentive_rules").insert([
        {
          plan_id: activePlan,
          name: form.name.trim(),
          sort_order: planRules.length,
          scope_preset: form.scope.scope_preset || null,
          scope_json: form.scope.scope_json,
          source_type: form.source_type,
          metric: form.metric,
          rate_type: form.rate_type,
          rate_value: Number(form.rate_value) || 0,
          milestone: form.milestone.trim() || null,
          settlement_currency: form.settlement_currency.trim() || null,
        },
      ]);
      if (error) throw error;
      toast({ title: "Rule created" });
      setForm({
        name: "",
        source_type: "service_revenue",
        metric: "net_revenue",
        rate_type: "percent",
        rate_value: "5",
        milestone: "",
        settlement_currency: "",
        scope: emptyScope,
      });
      await onReload();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  }

  async function deleteRule(id: string) {
    const { error } = await supabase.from("incentive_rules").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await onReload();
  }

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Rules for plan</h2>
          <span className="text-sm text-muted-foreground">
            {plans.find((p) => p.id === activePlan)?.name ?? "—"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Rules define <strong>what</strong> counts (service, country, institution, intake) and <strong>how</strong> to pay.
          Use slabs tab for tier ranges linked to a rule with rate type &quot;slab&quot;.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Rule name</label>
            <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Canada Sep intake kicker" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Milestone (optional)</label>
            <select className={sel} value={form.milestone} onChange={(e) => setForm({ ...form, milestone: e.target.value })}>
              <option value="">Any verified payment</option>
              <option value="first_payment">First verified payment only</option>
              <option value="commission_paid">Commission paid</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Source</label>
            <select className={sel} value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value })}>
              {SOURCE_TYPES.map((x) => <option key={x} value={x}>{x.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Metric</label>
            <select className={sel} value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
              {METRICS.map((x) => <option key={x} value={x}>{x.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Rate type</label>
            <select className={sel} value={form.rate_type} onChange={(e) => setForm({ ...form, rate_type: e.target.value })}>
              {RATE_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Rate value</label>
            <Input className="mt-1" value={form.rate_value} onChange={(e) => setForm({ ...form, rate_value: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Settlement currency override (Phase 2)</label>
            <Input className="mt-1" value={form.settlement_currency} onChange={(e) => setForm({ ...form, settlement_currency: e.target.value })} placeholder="blank = plan default" />
          </div>
        </div>
        <IncentiveScopeFields value={form.scope} onChange={(scope) => setForm({ ...form, scope })} />
        <Button onClick={addRule} disabled={adding}>
          <Plus className="size-4 mr-1" /> {adding ? "Saving…" : "Add rule"}
        </Button>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-4">Current rules</h2>
        {planRules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rules — plan uses legacy slabs only (all services).</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Scope</th>
                  <th className="py-2 pr-4">Metric</th>
                  <th className="py-2 pr-4">Pay</th>
                  <th className="py-2 pr-4">CCY</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {planRules.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{r.name}{r.milestone ? ` · ${r.milestone}` : ""}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{r.scope_preset ?? "custom"}</td>
                    <td className="py-2 pr-4">{r.metric.replace(/_/g, " ")}</td>
                    <td className="py-2 pr-4">{r.rate_type} {r.rate_value}{r.rate_type === "percent" ? "%" : ""}</td>
                    <td className="py-2 pr-4">{r.settlement_currency ?? "plan"}</td>
                    <td className="py-2 pr-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => deleteRule(r.id)}><Trash2 className="size-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
