import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { OffersStudioNav } from "@/components/offers/OffersStudioNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermission } from "@/hooks/useModulePermission";
import { toast } from "sonner";
import { GitBranch, Plus, RefreshCw, UserPlus } from "lucide-react";

interface JourneyRow {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  is_active: boolean;
  step_count?: number;
}

interface StepRow {
  id: string;
  day_offset: number;
  channel: string;
  action_type: string;
  title: string | null;
  sort_order: number;
}

interface EnrollmentRow {
  id: string;
  status: string;
  next_step_at: string | null;
  current_step_index: number;
  client_id: string | null;
  lead_id: string | null;
  journey_id: string;
}

const sel = "w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm";

export default function PerformanceOffersJourneys() {
  const { loading, hasRole } = useAuth();
  const { canView, canEdit, loading: permLoading } = useModulePermission("offers");
  const allowed = canView || hasRole(["manager", "administrator"]);
  const canManage = canEdit || hasRole(["manager", "admin", "administrator"]);
  const [journeys, setJourneys] = useState<JourneyRow[]>([]);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [selectedJourney, setSelectedJourney] = useState("");
  const [busy, setBusy] = useState(true);
  const [enrollLeadId, setEnrollLeadId] = useState("");
  const [enrollClientId, setEnrollClientId] = useState("");
  const [newJourney, setNewJourney] = useState({ name: "", description: "", trigger_type: "manual" });

  const load = useCallback(async () => {
    setBusy(true);
    const [j, e] = await Promise.all([
      supabase.from("offer_automation_journeys").select("*").order("name"),
      supabase
        .from("offer_journey_enrollments")
        .select("id, status, next_step_at, current_step_index, client_id, lead_id, journey_id")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    if (j.error) toast.error(j.error.message);
    else {
      const rows = (j.data ?? []) as JourneyRow[];
      const withCounts = await Promise.all(
        rows.map(async (row) => {
          const { count } = await supabase
            .from("offer_journey_steps")
            .select("id", { count: "exact", head: true })
            .eq("journey_id", row.id);
          return { ...row, step_count: count ?? 0 };
        }),
      );
      setJourneys(withCounts);
      setSelectedJourney((prev) => prev || withCounts[0]?.id || "");
    }
    if (!e.error) setEnrollments((e.data ?? []) as EnrollmentRow[]);
    setBusy(false);
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  useEffect(() => {
    if (!selectedJourney) {
      setSteps([]);
      return;
    }
    supabase
      .from("offer_journey_steps")
      .select("id, day_offset, channel, action_type, title, sort_order")
      .eq("journey_id", selectedJourney)
      .order("sort_order")
      .then(({ data }) => setSteps((data ?? []) as StepRow[]));
  }, [selectedJourney]);

  async function createJourney() {
    if (!canManage || !newJourney.name.trim()) return;
    const { data, error } = await supabase
      .from("offer_automation_journeys")
      .insert({
        name: newJourney.name.trim(),
        description: newJourney.description.trim() || null,
        trigger_type: newJourney.trigger_type,
        is_active: false,
      })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Journey created (inactive)");
    setNewJourney({ name: "", description: "", trigger_type: "manual" });
    if (data?.id) setSelectedJourney(data.id);
    load();
  }

  async function toggleJourney(id: string, active: boolean) {
    if (!canManage) return;
    const { error } = await supabase.from("offer_automation_journeys").update({ is_active: !active }).eq("id", id);
    if (error) toast.error(error.message);
    else load();
  }

  async function enroll() {
    if (!canManage || !selectedJourney) return;
    if (!enrollLeadId.trim() && !enrollClientId.trim()) {
      toast.error("Enter a client ID or lead ID");
      return;
    }
    const { data, error } = await supabase.rpc("fn_enroll_offer_journey", {
      _journey_id: selectedJourney,
      _client_id: enrollClientId.trim() || null,
      _lead_id: enrollLeadId.trim() || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Enrolled · ${data}`);
    setEnrollLeadId("");
    setEnrollClientId("");
    load();
  }

  if (loading || permLoading) return null;
  if (!allowed) return <Navigate to="/" replace />;

  const activeJourney = journeys.find((j) => j.id === selectedJourney);

  return (
    <AppLayout>
      <PerformanceHubHeader
        title="Automation journeys"
        subtitle="O7 — win-back day 2/7/15/30 sequences · processed daily via offers-lifecycle-tick"
      />
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <OffersStudioNav />
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={load} disabled={busy}>
            <RefreshCw className={busy ? "size-4 mr-1 animate-spin" : "size-4 mr-1"} />
            Refresh
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <GitBranch className="size-4" /> Journeys
            </h3>
            {journeys.map((j) => (
              <button
                key={j.id}
                type="button"
                onClick={() => setSelectedJourney(j.id)}
                className={`w-full text-left border rounded-lg p-3 transition ${
                  selectedJourney === j.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{j.name}</span>
                  <Badge variant={j.is_active ? "default" : "outline"}>{j.is_active ? "active" : "off"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{j.description ?? j.trigger_type}</p>
                <p className="text-xs text-muted-foreground mt-1">{j.step_count ?? 0} step(s)</p>
                {canManage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      toggleJourney(j.id, j.is_active);
                    }}
                  >
                    {j.is_active ? "Deactivate" : "Activate"}
                  </Button>
                )}
              </button>
            ))}
          </Card>

          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Steps — {activeJourney?.name ?? "…"}</h3>
            {steps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No steps for this journey.</p>
            ) : (
              steps.map((s) => (
                <div key={s.id} className="border rounded-lg p-3 text-sm">
                  <div className="font-medium">
                    Day {s.day_offset} · {s.channel}
                  </div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    {s.title ?? s.action_type} · {s.action_type}
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>

        {canManage && (
          <>
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <UserPlus className="size-4" /> Enroll lead or client
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Client ID (uuid)</Label>
                  <Input className="mt-1" value={enrollClientId} onChange={(e) => setEnrollClientId(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Lead ID (uuid)</Label>
                  <Input className="mt-1" value={enrollLeadId} onChange={(e) => setEnrollLeadId(e.target.value)} />
                </div>
              </div>
              <Button onClick={enroll} disabled={!selectedJourney}>
                Enroll in selected journey
              </Button>
            </Card>

            <Card className="p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Plus className="size-4" /> New journey
              </h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Label className="text-xs">Name</Label>
                  <Input
                    className="mt-1"
                    value={newJourney.name}
                    onChange={(e) => setNewJourney({ ...newJourney, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Trigger</Label>
                  <select
                    className={sel}
                    value={newJourney.trigger_type}
                    onChange={(e) => setNewJourney({ ...newJourney, trigger_type: e.target.value })}
                  >
                    <option value="manual">Manual enroll</option>
                    <option value="cold_lead">Cold lead</option>
                    <option value="lapsed_client">Lapsed client</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <Label className="text-xs">Description</Label>
                  <Input
                    className="mt-1"
                    value={newJourney.description}
                    onChange={(e) => setNewJourney({ ...newJourney, description: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={createJourney} disabled={!newJourney.name.trim()}>
                Create journey
              </Button>
              <p className="text-xs text-muted-foreground">
                Add steps via SQL or a future step editor — seed journey &quot;Cold lead win-back&quot; is included in
                migration 5O.
              </p>
            </Card>
          </>
        )}

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Recent enrollments</h3>
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enrollments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Next step</th>
                    <th className="text-left py-2">Step #</th>
                    <th className="text-left py-2">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-2">{e.status}</td>
                      <td className="py-2">{e.next_step_at ?? "—"}</td>
                      <td className="py-2">{e.current_step_index}</td>
                      <td className="py-2 text-xs font-mono">
                        {e.client_id ? `client:${e.client_id.slice(0, 8)}…` : `lead:${e.lead_id?.slice(0, 8)}…`}
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
