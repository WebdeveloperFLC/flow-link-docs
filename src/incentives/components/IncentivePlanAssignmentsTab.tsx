import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Layers, Trash2 } from "lucide-react";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";

const sel = "w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm";

interface Plan {
  id: string;
  name: string;
  plan_stack_role?: string;
  is_active: boolean;
}

interface AssignmentRow {
  id: string;
  counselor_id: string;
  plan_id: string;
  period_key: string;
  assignment_role: string;
  notes: string | null;
  incentive_plans?: { name: string; plan_stack_role: string } | null;
}

interface Props {
  plans: Plan[];
  profiles: { id: string; full_name: string }[];
}

export function IncentivePlanAssignmentsTab({ plans, profiles }: Props) {
  const { toast } = useToast();
  const { period: periodKey } = usePerformancePeriod();
  const [counselorId, setCounselorId] = useState("");
  const [planId, setPlanId] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? id;
  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? id;

  async function loadAssignments() {
    if (!periodKey.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("incentive_counselor_plan_assignments")
        .select("id, counselor_id, plan_id, period_key, assignment_role, notes, incentive_plans(name, plan_stack_role)")
        .eq("period_key", periodKey.trim())
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as AssignmentRow[]);
    } catch (e: unknown) {
      toast({ title: "Load failed", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey]);

  async function assignPlan() {
    if (!counselorId || !planId || !periodKey.trim()) {
      toast({ title: "Counselor, plan, and period required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("fn_set_counselor_plan_assignment", {
        _counselor_id: counselorId,
        _plan_id: planId,
        _period_key: periodKey.trim(),
        _notes: notes.trim() || null,
      });
      if (error) throw error;
      toast({
        title: "Assignment saved",
        description: `${nameOf(counselorId)} → ${planName(planId)}`,
      });
      setNotes("");
      await loadAssignments();
    } catch (e: unknown) {
      toast({ title: "Assign failed", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function removeAssignment(row: AssignmentRow) {
    setSaving(true);
    try {
      const { error } = await supabase.rpc("fn_remove_counselor_plan_assignment", {
        _counselor_id: row.counselor_id,
        _plan_id: row.plan_id,
        _period_key: row.period_key,
      });
      if (error) throw error;
      await loadAssignments();
    } catch (e: unknown) {
      toast({ title: "Remove failed", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const activePlans = plans.filter((p) => p.is_active);

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Multi-plan stacking (I7)</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Enroll a counselor on a <strong>base</strong> plan plus <strong>overlay</strong> campaigns in the same period.
          One primary base plan per counselor; overlay plans stack additively.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Counselor</label>
            <select className={sel} value={counselorId} onChange={(e) => setCounselorId(e.target.value)}>
              <option value="">—</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Plan</label>
            <select className={sel} value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">—</option>
              {activePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.plan_stack_role ?? "base"})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Notes</label>
            <Input className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <Button onClick={assignPlan} disabled={saving}>{saving ? "Saving…" : "Assign plan"}</Button>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">Active assignments — {periodKey}</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignments — all counselors eligible on every plan (legacy behavior).</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2 pr-4">Counselor</th>
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Stack</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{nameOf(r.counselor_id)}</td>
                    <td className="py-2 pr-4">{r.incentive_plans?.name ?? planName(r.plan_id)}</td>
                    <td className="py-2 pr-4 capitalize">{r.assignment_role}</td>
                    <td className="py-2 pr-4 capitalize">{r.incentive_plans?.plan_stack_role ?? "base"}</td>
                    <td className="py-2 pr-4">
                      <Button variant="ghost" size="sm" onClick={() => removeAssignment(r)} disabled={saving}>
                        <Trash2 className="size-4" />
                      </Button>
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
