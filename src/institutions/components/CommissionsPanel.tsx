import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCommissions, useCommissionRules } from "../hooks/useInstitutionData";
import { simulateCommission } from "../lib/commissionEngine";
import { detectRuleConflicts } from "../lib/claimEngine";
import { AlertTriangle, Trash2, Send } from "lucide-react";
import { ALLOW_TEST_DELETIONS } from "../config";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function CommissionsPanel({ institutionId }: { institutionId: string }) {
  const { data: commissions, loading, reload } = useCommissions(institutionId) as any;
  const ids = useMemo(() => commissions.map((c: any) => c.id), [commissions]);
  const { data: rules } = useCommissionRules(ids);
  const [sim, setSim] = useState({ tuition: 18000, currency: "CAD", country: "India", intake: "May", program_level: "PG Diploma", student_count: 1 });

  const deleteCommission = async (c: any) => {
    if (!confirm(`Delete commission "${c.name}" and its rules?`)) return;
    await supabase.from("upi_commission_rules").delete().eq("commission_id", c.id);
    const { error } = await supabase.from("upi_commissions").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Commission deleted");
    reload?.();
  };

  const publishCommission = async (c: any, cRules: any[]) => {
    const conflicts = detectRuleConflicts(cRules as any[]);
    if (conflicts.length > 0) {
      toast.error("Resolve rule conflicts before publishing");
      return;
    }
    const { error } = await supabase.rpc("fn_publish_commission_rules" as any, {
      p_commission_id: c.id,
    });
    if (error) return toast.error(error.message);
    toast.success(`Published "${c.name}"`);
    reload?.();
  };

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading commissions…</div>;
  if (commissions.length === 0)
    return <div className="text-sm text-muted-foreground py-8 text-center">No commissions yet. Upload a Commission sheet to auto-create rules.</div>;

  return (
    <div className="space-y-4">
      {commissions.map((c: any) => {
        const cRules = rules.filter((r: any) => r.commission_id === c.id);
        const conflicts = detectRuleConflicts(cRules as any[]);
        const meta = c.metadata ?? {};
        const base = { base_rate_percent: c.base_rate_percent ?? meta.base_rate_percent ?? 0, currency: c.currency ?? "CAD" };
        const breakdown = simulateCommission(base, cRules as any, sim);
        return (
          <Card key={c.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.model_type} · {c.currency} · base {base.base_rate_percent}% · {meta.payment_timing ?? c.payment_timing ?? "—"}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {c.is_proposed && <Badge variant="secondary">Proposed</Badge>}
                <Badge variant={c.is_active ? "default" : "outline"}>{c.is_active ? "Active" : "Inactive"}</Badge>
                {(c.is_proposed || !c.is_active) && (
                  <Button size="sm" variant="secondary" onClick={() => publishCommission(c, cRules)}>
                    <Send className="size-3 mr-1" /> Publish
                  </Button>
                )}
                {ALLOW_TEST_DELETIONS && (
                  <Button size="sm" variant="ghost" onClick={() => deleteCommission(c)} className="text-destructive hover:text-destructive">
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>

            {cRules.length > 0 && (
              <div className="border rounded p-2 bg-muted/30">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Rules</div>
                <ul className="text-sm space-y-1">
                  {cRules.map((r: any) => (
                    <li key={r.id} className="flex justify-between gap-2">
                      <span>
                        <Badge variant="outline" className="mr-2">{r.rule_type}</Badge>
                        {r.rule_name || "(unnamed)"}{" "}
                        {r.condition_field && <span className="text-muted-foreground">— {r.condition_field} {r.condition_operator} {r.condition_value}</span>}
                      </span>
                      <span className="font-mono text-xs">
                        {r.payout_amount}{r.payout_type === "percentage" ? "%" : r.payout_type === "fixed" ? ` ${r.payout_currency}` : "×"}
                      </span>
                    </li>
                  ))}
                </ul>
                {conflicts.length > 0 && (
                  <div className="mt-2 text-xs text-destructive flex items-start gap-2">
                    <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium">Rule conflicts detected</div>
                      <ul className="list-disc pl-4">
                        {conflicts.map((cf, i) => <li key={i}>{cf.reason}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border rounded p-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Commission simulator</div>
              {(() => {
                const unconditionalBase = cRules.filter(
                  (r: any) => r.rule_type === "base" && (r.condition_field == null || r.condition_field === ""),
                );
                if (unconditionalBase.length === 0) return null;
                return (
                  <div className="mb-2 flex items-start gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                    <div>
                      <strong>Warning:</strong> {unconditionalBase.length} base rule(s) have no conditions set and will apply to ALL students regardless of program, country, or intake. Review rules before running Recalculate All.
                    </div>
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
                <LabelInput label="Tuition" value={sim.tuition} onChange={(v) => setSim({ ...sim, tuition: Number(v) || 0 })} />
                <LabelInput label="Country" value={sim.country} onChange={(v) => setSim({ ...sim, country: v })} />
                <LabelInput label="Intake" value={sim.intake} onChange={(v) => setSim({ ...sim, intake: v })} />
                <LabelInput label="Program level" value={sim.program_level} onChange={(v) => setSim({ ...sim, program_level: v })} />
                <LabelInput label="# students" value={sim.student_count} onChange={(v) => setSim({ ...sim, student_count: Number(v) || 1 })} />
              </div>
              <ul className="text-sm space-y-1">
                {breakdown.lines.map((l, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{l.label}</span>
                    <span className="font-mono">{l.amount.toFixed(2)} {l.currency}</span>
                  </li>
                ))}
                <li className="flex justify-between font-semibold pt-1 border-t">
                  <span>Total payout</span>
                  <span className="font-mono">{breakdown.total.toFixed(2)} {breakdown.currency}</span>
                </li>
              </ul>
              <div className="text-[11px] text-muted-foreground mt-2">
                Why these lines: base rate plus any rule whose condition matches the simulator inputs above.
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function LabelInput({ label, value, onChange }: { label: string; value: string | number; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input value={String(value)} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
    </div>
  );
}