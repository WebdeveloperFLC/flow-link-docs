import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Trash2 } from "lucide-react";
import { RunLineDisputePanel } from "@/incentives/components/RunLineDisputePanel";

interface DisputeRow {
  dispute_id: string;
  line_item_id: string;
  counselor_id: string;
  counselor_name: string;
  subject: string | null;
  status: string;
  messages: Array<{
    id: string;
    author_id: string;
    author_name: string;
    body: string;
    created_at: string;
  }>;
}

interface LineItem {
  id: string;
  counselor_id: string;
  source_type: string;
  client_id: string | null;
  base_amount: number;
  earned_amount: number;
  settlement_currency: string;
  note: string | null;
  rule_id: string | null;
}

interface RunInfo {
  id: string;
  period_key: string;
  status: string;
  locked: boolean;
  total_settlement: number;
  settlement_currency: string;
}

interface Adjustment {
  id: string;
  counselor_id: string;
  amount: number;
  currency: string;
  reason: string;
  adjustment_type: string;
}

export default function IncentiveRunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const { toast } = useToast();
  const [run, setRun] = useState<RunInfo | null>(null);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [adjForm, setAdjForm] = useState({ counselor_id: "", amount: "", reason: "" });

  async function load() {
    if (!runId) return;
    const [rn, li, adj, prof, disp] = await Promise.all([
      supabase.from("incentive_runs").select("id, period_key, status, locked, total_settlement, settlement_currency").eq("id", runId).single(),
      supabase.from("incentive_line_items").select("*").eq("run_id", runId).order("created_at"),
      supabase.from("incentive_adjustments").select("*").eq("run_id", runId).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name"),
      supabase.rpc("fn_list_run_disputes", { _run_id: runId }),
    ]);
    setRun((rn.data ?? null) as RunInfo | null);
    setLines((li.data ?? []) as LineItem[]);
    setAdjustments((adj.data ?? []) as Adjustment[]);
    setDisputes(((disp.data ?? []) as DisputeRow[]) ?? []);
    const map: Record<string, string> = {};
    for (const p of (prof.data ?? []) as any[]) map[p.id] = p.full_name ?? p.id;
    setNames(map);
  }

  useEffect(() => {
    load();
    /* eslint-disable-next-line */
  }, [runId]);

  async function addAdjustment() {
    if (!runId || !adjForm.counselor_id || !adjForm.reason.trim()) {
      toast({ title: "Counselor and reason required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("incentive_adjustments").insert([
      {
        run_id: runId,
        counselor_id: adjForm.counselor_id,
        amount: Number(adjForm.amount) || 0,
        currency: run?.settlement_currency ?? "INR",
        reason: adjForm.reason.trim(),
        adjustment_type: "manual",
      },
    ]);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Adjustment added" });
    setAdjForm({ counselor_id: "", amount: "", reason: "" });
    await load();
  }

  async function deleteAdjustment(id: string) {
    const { error } = await supabase.from("incentive_adjustments").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await load();
  }

  const counselors = [...new Set(lines.map((l) => l.counselor_id))];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="size-6 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Run audit</h1>
              {run && (
                <p className="text-sm text-muted-foreground">
                  {run.period_key} · {run.status} · {run.locked ? "locked" : "open"} · ₹{Number(run.total_settlement).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <Link to="/incentives/admin">
            <Button variant="outline">← Admin</Button>
          </Link>
        </div>

        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Line items ({lines.length})</h2>
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No line items.</p>
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b sticky top-0 bg-card">
                  <tr>
                    <th className="py-2 pr-4">Counselor</th>
                    <th className="py-2 pr-4">Source</th>
                    <th className="py-2 pr-4 text-right">Base</th>
                    <th className="py-2 pr-4 text-right">Earned</th>
                    <th className="py-2 pr-4">Note</th>
                    <th className="py-2 pr-4">Dispute (I6)</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-4">{names[l.counselor_id] ?? l.counselor_id}</td>
                      <td className="py-2 pr-4">{l.source_type.replace(/_/g, " ")}</td>
                      <td className="py-2 pr-4 text-right">{Number(l.base_amount).toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right font-medium">{Number(l.earned_amount).toLocaleString()}</td>
                      <td className="py-2 pr-4 text-muted-foreground text-xs">{l.note ?? "—"}</td>
                      <td className="py-2 pr-4">
                        <RunLineDisputePanel
                          lineItemId={l.id}
                          counselorId={l.counselor_id}
                          counselorName={names[l.counselor_id] ?? l.counselor_id}
                          disputes={disputes}
                          onReload={load}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="text-lg font-semibold">Manual adjustments</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Counselor</label>
              <select
                className="w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm"
                value={adjForm.counselor_id}
                onChange={(e) => setAdjForm({ ...adjForm, counselor_id: e.target.value })}
              >
                <option value="">Select…</option>
                {counselors.map((id) => (
                  <option key={id} value={id}>{names[id] ?? id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Amount (+ / −)</label>
              <Input className="mt-1" value={adjForm.amount} onChange={(e) => setAdjForm({ ...adjForm, amount: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Reason</label>
              <Input className="mt-1" value={adjForm.reason} onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })} />
            </div>
          </div>
          <Button onClick={addAdjustment}><Plus className="size-4 mr-1" /> Add adjustment</Button>

          {adjustments.length > 0 && (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr><th className="py-2 pr-4">Counselor</th><th className="py-2 pr-4 text-right">Amount</th><th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Reason</th><th></th></tr>
                </thead>
                <tbody>
                  {adjustments.map((a) => (
                    <tr key={a.id} className="border-b">
                      <td className="py-2 pr-4">{names[a.counselor_id] ?? a.counselor_id}</td>
                      <td className="py-2 pr-4 text-right">{Number(a.amount).toLocaleString()} {a.currency}</td>
                      <td className="py-2 pr-4">{a.adjustment_type}</td>
                      <td className="py-2 pr-4">{a.reason}</td>
                      <td className="py-2 pr-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => deleteAdjustment(a.id)}><Trash2 className="size-4" /></Button>
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
