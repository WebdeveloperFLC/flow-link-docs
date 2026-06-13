import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformancePeriodBar } from "@/components/performance/PerformancePeriodBar";
import { OffersStudioNav } from "@/components/offers/OffersStudioNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermission } from "@/hooks/useModulePermission";
import { toast } from "sonner";
import { FlaskConical, Play, Trophy } from "lucide-react";

interface ExperimentRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  min_conversions: number;
  started_at: string | null;
  completed_at: string | null;
}

interface VariantStat {
  variant_id: string;
  variant_code: string;
  offer_id: string;
  title: string;
  assignments: number;
  sent: number;
  conversions: number;
  redeemed_revenue: number;
}

const sel = "w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm";

export default function PerformanceOffersAbTests() {
  const { loading, hasRole } = useAuth();
  const { canView, canEdit, loading: permLoading } = useModulePermission("offers");
  const allowed = canView || hasRole(["manager", "administrator"]);
  const canManage = canEdit || hasRole(["manager", "admin", "administrator"]);

  const [experiments, setExperiments] = useState<ExperimentRow[]>([]);
  const [offers, setOffers] = useState<{ id: string; title: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [stats, setStats] = useState<VariantStat[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    offer_a: "",
    offer_b: "",
    min_conversions: "5",
  });

  const load = useCallback(async () => {
    const [exp, off] = await Promise.all([
      supabase.from("offer_ab_experiments").select("*").order("created_at", { ascending: false }),
      supabase.from("offers").select("id, title").in("status", ["active", "expiring_soon", "draft"]).order("title"),
    ]);
    if (exp.error) toast.error(exp.error.message);
    else {
      const rows = (exp.data ?? []) as ExperimentRow[];
      setExperiments(rows);
      setSelected((prev) => prev || rows[0]?.id || "");
    }
    if (!off.error) setOffers((off.data ?? []) as { id: string; title: string }[]);
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  useEffect(() => {
    if (!selected) {
      setStats([]);
      return;
    }
    supabase.rpc("fn_offer_ab_experiment_stats", { _experiment_id: selected }).then(({ data, error }) => {
      if (error) {
        toast.error(error.message);
        return;
      }
      const payload = data as { variants?: VariantStat[] } | null;
      setStats((payload?.variants ?? []) as VariantStat[]);
    });
  }, [selected, experiments]);

  async function createExperiment() {
    if (!canManage || !form.name.trim() || !form.offer_a || !form.offer_b) {
      toast.error("Name and both offer variants required");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("fn_create_offer_ab_experiment", {
        _name: form.name.trim(),
        _offer_id_a: form.offer_a,
        _offer_id_b: form.offer_b,
        _description: form.description.trim() || null,
        _min_conversions: Number(form.min_conversions) || 5,
      });
      if (error) throw error;
      toast.success("Experiment created (draft)");
      setForm({ name: "", description: "", offer_a: "", offer_b: "", min_conversions: "5" });
      if (data) setSelected(data as string);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function startExperiment(id: string) {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("fn_start_offer_ab_experiment", { _experiment_id: id });
      if (error) throw error;
      toast.success("Experiment running — counselors see assigned variant on client strip");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function promoteWinner(id: string) {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("fn_promote_offer_ab_winner", { _experiment_id: id });
      if (error) throw error;
      const winner = (data as { winner_variant_code?: string })?.winner_variant_code ?? "?";
      toast.success(`Winner promoted: variant ${winner}`);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading || permLoading) return null;
  if (!allowed) return <Navigate to="/" replace />;

  const active = experiments.find((e) => e.id === selected);

  return (
    <AppLayout>
      <PerformanceHubHeader
        title="Offer A/B tests"
        subtitle="O11 — two variants · stable assignment per client · promote winner to catalogue"
        showModuleLegend={false}
      />
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <PerformancePeriodBar compact showBranch={false} />
        <OffersStudioNav />

        {canManage && (
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <FlaskConical className="size-4" /> New experiment
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="June enrolment A/B" />
              </div>
              <div>
                <Label className="text-xs">Min conversions to promote</Label>
                <Input className="mt-1" value={form.min_conversions} onChange={(e) => setForm({ ...form, min_conversions: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Variant A offer</Label>
                <select className={sel} value={form.offer_a} onChange={(e) => setForm({ ...form, offer_a: e.target.value })}>
                  <option value="">—</option>
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>{o.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Variant B offer</Label>
                <select className={sel} value={form.offer_b} onChange={(e) => setForm({ ...form, offer_b: e.target.value })}>
                  <option value="">—</option>
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>{o.title}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Description</Label>
                <Input className="mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <Button onClick={createExperiment} disabled={busy}>Create draft</Button>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-4 space-y-2">
            <h3 className="font-semibold">Experiments</h3>
            {experiments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No experiments yet.</p>
            ) : (
              experiments.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelected(e.id)}
                  className={`w-full text-left border rounded-lg p-3 ${selected === e.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{e.name}</span>
                    <Badge variant={e.status === "running" ? "default" : "outline"}>{e.status}</Badge>
                  </div>
                  {e.description && <p className="text-xs text-muted-foreground mt-1">{e.description}</p>}
                </button>
              ))
            )}
          </Card>

          <Card className="p-4 space-y-4">
            <h3 className="font-semibold">Results</h3>
            {!active ? (
              <p className="text-sm text-muted-foreground">Select an experiment.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {canManage && active.status === "draft" && (
                    <Button size="sm" disabled={busy} onClick={() => startExperiment(active.id)}>
                      <Play className="size-3.5 mr-1" /> Start
                    </Button>
                  )}
                  {canManage && active.status === "running" && (
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => promoteWinner(active.id)}>
                      <Trophy className="size-3.5 mr-1" /> Promote winner
                    </Button>
                  )}
                </div>
                {stats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No stats yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-muted-foreground border-b">
                        <tr>
                          <th className="py-2 pr-3">Var</th>
                          <th className="py-2 pr-3">Offer</th>
                          <th className="py-2 pr-3 text-right">Assigned</th>
                          <th className="py-2 pr-3 text-right">Sent</th>
                          <th className="py-2 pr-3 text-right">Conv.</th>
                          <th className="py-2 pr-3 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.map((s) => (
                          <tr key={s.variant_id} className="border-b last:border-0">
                            <td className="py-2 pr-3 font-medium">{s.variant_code}</td>
                            <td className="py-2 pr-3">{s.title}</td>
                            <td className="py-2 pr-3 text-right">{s.assignments}</td>
                            <td className="py-2 pr-3 text-right">{s.sent}</td>
                            <td className="py-2 pr-3 text-right">{s.conversions}</td>
                            <td className="py-2 pr-3 text-right">{Number(s.redeemed_revenue).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Promote requires min {active.min_conversions} conversion(s) on the winning variant. Loser offer is archived.
                </p>
              </>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
