import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { IncentiveScopeFields, type ScopeFormState } from "@/incentives/components/IncentiveScopeFields";
import { Trophy, Plus, Trash2 } from "lucide-react";

function currentPeriodKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const sel = "w-full mt-1 border rounded-md h-9 px-2 bg-background text-sm";

interface Campaign {
  id: string;
  name: string;
  period_key: string;
  bonus_type: string;
  bonus_value: number;
  is_active: boolean;
}

interface Contest {
  id: string;
  name: string;
  period_key: string;
  pool_amount: number;
  metric: string;
  status: string;
  is_active: boolean;
}

interface Standing {
  branch_id: string;
  branch_name: string;
  total_amount: number;
  event_count: number;
  rank: number;
}

export default function IncentiveCompetitions() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [standings, setStandings] = useState<Record<string, Standing[]>>({});
  const [selectedContest, setSelectedContest] = useState("");

  const [campForm, setCampForm] = useState({
    name: "",
    period_key: currentPeriodKey(),
    bonus_type: "flat_per_event",
    bonus_value: "1500",
    country_code: "",
    intake: "",
    scope: { scope_preset: "all_services", scope_json: {} } as ScopeFormState,
  });

  const [contestForm, setContestForm] = useState({
    name: "",
    period_key: currentPeriodKey(),
    pool_amount: "50000",
    metric: "net_revenue",
    min_branch_total: "0",
    branch_ids: [] as string[],
  });

  async function load() {
    const [ca, co, br] = await Promise.all([
      supabase.from("incentive_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("incentive_branch_contests").select("*").order("created_at", { ascending: false }),
      supabase.from("branches").select("id, name").order("name"),
    ]);
    setCampaigns((ca.data ?? []) as Campaign[]);
    setContests((co.data ?? []) as Contest[]);
    setBranches((br.data ?? []) as { id: string; name: string }[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function loadStandings(contestId: string) {
    const { data, error } = await supabase.rpc("fn_incentive_branch_contest_standings", { _contest_id: contestId });
    if (error) {
      toast({ title: "Standings error", description: error.message, variant: "destructive" });
      return;
    }
    setStandings((prev) => ({ ...prev, [contestId]: (data ?? []) as Standing[] }));
  }

  async function addCampaign() {
    if (!campForm.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("incentive_campaigns").insert([
      {
        name: campForm.name.trim(),
        period_key: campForm.period_key,
        scope_preset: campForm.scope.scope_preset || null,
        scope_json: campForm.scope.scope_json,
        bonus_type: campForm.bonus_type,
        bonus_value: Number(campForm.bonus_value) || 0,
        country_code: campForm.country_code.trim() || null,
        intake: campForm.intake.trim() || null,
      },
    ]);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Campaign created" });
    await load();
  }

  async function addContest() {
    if (!contestForm.name.trim() || contestForm.branch_ids.length < 2) {
      toast({ title: "Name and at least 2 branches required", variant: "destructive" });
      return;
    }
    const { data: ins, error } = await supabase
      .from("incentive_branch_contests")
      .insert([
        {
          name: contestForm.name.trim(),
          period_key: contestForm.period_key,
          pool_amount: Number(contestForm.pool_amount) || 0,
          metric: contestForm.metric,
          min_branch_total: Number(contestForm.min_branch_total) || 0,
          status: "active",
        },
      ])
      .select("id")
      .single();
    if (error || !ins) {
      toast({ title: "Error", description: error?.message, variant: "destructive" });
      return;
    }
    await supabase.from("incentive_contest_branches").insert(
      contestForm.branch_ids.map((branch_id) => ({ contest_id: ins.id, branch_id })),
    );
    toast({ title: "Contest created" });
    setContestForm({ ...contestForm, name: "", branch_ids: [] });
    await load();
  }

  async function deleteCampaign(id: string) {
    await supabase.from("incentive_campaigns").delete().eq("id", id);
    await load();
  }

  async function deleteContest(id: string) {
    await supabase.from("incentive_branch_contests").delete().eq("id", id);
    await load();
  }

  function toggleContestBranch(id: string) {
    setContestForm((f) => ({
      ...f,
      branch_ids: f.branch_ids.includes(id) ? f.branch_ids.filter((x) => x !== id) : [...f.branch_ids, id],
    }));
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Trophy className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Competitions &amp; Campaigns</h1>
            <p className="text-sm text-muted-foreground">Phase 3 — branch contests and additive campaign overlays</p>
          </div>
        </div>

        <Tabs defaultValue="campaigns">
          <TabsList>
            <TabsTrigger value="campaigns">Campaign overlays</TabsTrigger>
            <TabsTrigger value="contests">Branch contests</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-4">
            <Card className="p-5 space-y-4">
              <h2 className="text-lg font-semibold">New campaign overlay</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input className="mt-1" value={campForm.name} onChange={(e) => setCampForm({ ...campForm, name: e.target.value })} placeholder="Canada Sep push" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Period</label>
                  <Input className="mt-1" value={campForm.period_key} onChange={(e) => setCampForm({ ...campForm, period_key: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Bonus type</label>
                  <select className={sel} value={campForm.bonus_type} onChange={(e) => setCampForm({ ...campForm, bonus_type: e.target.value })}>
                    <option value="flat_per_event">Flat per qualifying event</option>
                    <option value="percent_revenue">% of matching revenue</option>
                    <option value="pool_fixed">Fixed pool (per counselor match batch)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Bonus value</label>
                  <Input className="mt-1" value={campForm.bonus_value} onChange={(e) => setCampForm({ ...campForm, bonus_value: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Quick country code</label>
                  <Input className="mt-1" value={campForm.country_code} onChange={(e) => setCampForm({ ...campForm, country_code: e.target.value })} placeholder="CA" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Quick intake</label>
                  <Input className="mt-1" value={campForm.intake} onChange={(e) => setCampForm({ ...campForm, intake: e.target.value })} placeholder="Sep-2026" />
                </div>
              </div>
              <IncentiveScopeFields value={campForm.scope} onChange={(scope) => setCampForm({ ...campForm, scope })} />
              <Button onClick={addCampaign}><Plus className="size-4 mr-1" /> Add campaign</Button>
            </Card>

            <Card className="p-5">
              <h2 className="text-lg font-semibold mb-4">Active campaigns</h2>
              {campaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground">None yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b">
                    <tr><th className="py-2">Name</th><th className="py-2">Period</th><th className="py-2">Bonus</th><th></th></tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => (
                      <tr key={c.id} className="border-b">
                        <td className="py-2">{c.name}</td>
                        <td className="py-2">{c.period_key}</td>
                        <td className="py-2">{c.bonus_type} · {c.bonus_value}</td>
                        <td className="py-2 text-right">
                          <Button variant="ghost" size="sm" onClick={() => deleteCampaign(c.id)}><Trash2 className="size-4" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="contests" className="space-y-4">
            <Card className="p-5 space-y-4">
              <h2 className="text-lg font-semibold">New branch contest</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input className="mt-1" value={contestForm.name} onChange={(e) => setContestForm({ ...contestForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Period</label>
                  <Input className="mt-1" value={contestForm.period_key} onChange={(e) => setContestForm({ ...contestForm, period_key: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Pool (INR)</label>
                  <Input className="mt-1" value={contestForm.pool_amount} onChange={(e) => setContestForm({ ...contestForm, pool_amount: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Metric</label>
                  <select className={sel} value={contestForm.metric} onChange={(e) => setContestForm({ ...contestForm, metric: e.target.value })}>
                    <option value="net_revenue">net revenue</option>
                    <option value="enrolment_count">enrolment count</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Min branch total to qualify</label>
                  <Input className="mt-1" value={contestForm.min_branch_total} onChange={(e) => setContestForm({ ...contestForm, min_branch_total: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Participating branches (pick 2+)</label>
                <div className="flex flex-wrap gap-2">
                  {branches.map((b) => (
                    <label key={b.id} className="text-xs flex items-center gap-1 border rounded px-2 py-1 bg-background">
                      <input type="checkbox" checked={contestForm.branch_ids.includes(b.id)} onChange={() => toggleContestBranch(b.id)} />
                      {b.name}
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={addContest}><Plus className="size-4 mr-1" /> Create contest</Button>
            </Card>

            <Card className="p-5 space-y-4">
              <h2 className="text-lg font-semibold">Contests &amp; live standings</h2>
              {contests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contests.</p>
              ) : (
                contests.map((c) => (
                  <div key={c.id} className="border rounded-md p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.period_key} · pool ₹{Number(c.pool_amount).toLocaleString()} · {c.metric}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedContest(c.id); loadStandings(c.id); }}>Refresh standings</Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteContest(c.id)}><Trash2 className="size-4" /></Button>
                      </div>
                    </div>
                    {(standings[c.id] ?? []).length > 0 && (
                      <table className="w-full text-sm mt-2">
                        <thead className="text-muted-foreground"><tr><th className="text-left py-1">#</th><th className="text-left py-1">Branch</th><th className="text-right py-1">Total</th></tr></thead>
                        <tbody>
                          {(standings[c.id] ?? []).map((s) => (
                            <tr key={s.branch_id} className={s.rank === 1 ? "font-medium text-primary" : ""}>
                              <td className="py-1">{s.rank}</td>
                              <td className="py-1">{s.branch_name}</td>
                              <td className="py-1 text-right">{Number(s.total_amount).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {selectedContest === c.id && !(standings[c.id]?.length) && (
                      <p className="text-xs text-muted-foreground">Click Refresh standings (needs qualifying events in period).</p>
                    )}
                  </div>
                ))
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
