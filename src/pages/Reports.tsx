import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Phone, PhoneOff, Flame, Users as UsersIcon, Workflow } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { EmptyState } from "@/components/crm/EmptyState";

type CallDaily = { day: string; answered: number; unanswered: number; total_calls: number; avg_duration: number };
type Funnel = { temperature: string | null; stage: string | null; leads: number };
type Telecaller = { user_id: string; name: string | null; calls: number; talk_seconds: number; answered: number; callbacks_pending: number };
type Counselor = { user_id: string; name: string | null; handoffs_accepted: number; tasks_done: number; enrollments: number };
type Campaign = { campaign_id: string; name: string; leads: number; hot: number; warm: number; cold: number; callbacks_pending: number; converted: number };
type Country = { country: string | null; intake: string | null; leads: number };
type StageDist = {
  pipeline_id: string; pipeline_name: string; country: string; service_category: string;
  stage_id: string; stage_key: string; stage_label: string; sort_order: number; client_count: number;
};

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted-foreground))"];
const TEMP_COLORS: Record<string, string> = { hot: "#ef4444", warm: "#f59e0b", cold: "#3b82f6" };

function toCSV(rows: any[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map(r => cols.map(c => esc(r[c])).join(","))].join("\n");
}

function downloadCSV(name: string, rows: any[]) {
  const blob = new Blob([toCSV(rows)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${name}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [windowDays, setWindowDays] = useState(30);
  const [calls, setCalls] = useState<CallDaily[]>([]);
  const [funnel, setFunnel] = useState<Funnel[]>([]);
  const [tcs, setTcs] = useState<Telecaller[]>([]);
  const [cns, setCns] = useState<Counselor[]>([]);
  const [camps, setCamps] = useState<Campaign[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [stageDist, setStageDist] = useState<StageDist[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - windowDays * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const [c, f, t, cn, cp, co, sd] = await Promise.all([
        (supabase as any).from("vw_call_stats_daily").select("*").gte("day", since).order("day"),
        (supabase as any).from("vw_lead_funnel").select("*"),
        (supabase as any).from("vw_telecaller_productivity").select("*").order("calls", { ascending: false }).limit(50),
        (supabase as any).from("vw_counselor_productivity").select("*").order("enrollments", { ascending: false }).limit(50),
        (supabase as any).from("vw_campaign_performance").select("*").order("leads", { ascending: false }).limit(50),
        (supabase as any).from("vw_country_intake_trends").select("*").order("leads", { ascending: false }).limit(20),
        (supabase as any).from("vw_stage_distribution").select("*").order("pipeline_name").order("sort_order"),
      ]);
      setCalls((c.data as any) || []);
      setFunnel((f.data as any) || []);
      setTcs((t.data as any) || []);
      setCns((cn.data as any) || []);
      setCamps((cp.data as any) || []);
      setCountries((co.data as any) || []);
      const rows = (sd.data as StageDist[]) || [];
      setStageDist(rows);
      if (!selectedPipeline && rows.length) setSelectedPipeline(rows[0].pipeline_id);
      setLoading(false);
    })();
  }, [windowDays]);

  // KPIs
  const totalCalls = calls.reduce((s, r) => s + (r.total_calls || 0), 0);
  const totalAnswered = calls.reduce((s, r) => s + (r.answered || 0), 0);
  const totalUnanswered = calls.reduce((s, r) => s + (r.unanswered || 0), 0);
  const answerRate = totalCalls ? Math.round((totalAnswered / totalCalls) * 100) : 0;
  const totalLeads = funnel.reduce((s, r) => s + (r.leads || 0), 0);
  const hotLeads = funnel.filter(f => f.temperature === "hot").reduce((s, r) => s + r.leads, 0);

  // Aggregate calls by day (sum across agents)
  const callsByDay = Object.values(
    calls.reduce((acc: Record<string, CallDaily>, r) => {
      const k = r.day;
      if (!acc[k]) acc[k] = { day: k, answered: 0, unanswered: 0, total_calls: 0, avg_duration: 0 };
      acc[k].answered += r.answered || 0;
      acc[k].unanswered += r.unanswered || 0;
      acc[k].total_calls += r.total_calls || 0;
      return acc;
    }, {})
  );

  const tempData = ["hot", "warm", "cold"].map(t => ({
    name: t,
    value: funnel.filter(f => f.temperature === t).reduce((s, r) => s + r.leads, 0),
  }));

  return (
    <AppLayout>
        <PageHeader
          title="Reports & Analytics"
          description={`Operational and conversion metrics — last ${windowDays} days`}
          actions={
            <Select value={String(windowDays)} onValueChange={(v) => setWindowDays(Number(v))}>
              <SelectTrigger className="w-[130px] h-8" aria-label="Reporting time window">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      <div className="p-6 space-y-6">
        {/* KPI tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI icon={<Phone className="size-4" />} label="Total Calls" value={totalCalls} />
          <KPI icon={<Phone className="size-4" />} label="Answered" value={`${totalAnswered} (${answerRate}%)`} />
          <KPI icon={<PhoneOff className="size-4" />} label="Unanswered" value={totalUnanswered} />
          <Link to="/leads?segment=hot" className="block rounded-lg border bg-card p-4 hover:border-primary/40 transition-colors">
            <KPI icon={<Flame className="size-4" />} label="Hot Leads" value={`${hotLeads} / ${totalLeads}`} />
          </Link>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Calls (last {windowDays} days)</CardTitle></CardHeader>
            <CardContent style={{ height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={callsByDay}>
                  <XAxis dataKey="day" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="answered" stackId="a" fill="hsl(var(--primary))" />
                  <Bar dataKey="unanswered" stackId="a" fill="hsl(var(--muted))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Lead temperature</CardTitle></CardHeader>
            <CardContent style={{ height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={tempData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {tempData.map((d) => <Cell key={d.name} fill={TEMP_COLORS[d.name]} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 pt-2 justify-center">
                {tempData.map((d) => (
                  <Link
                    key={d.name}
                    to={`/leads?segment=${d.name}`}
                    className="text-xs font-medium px-2.5 py-1 rounded-full border hover:border-primary/50 capitalize"
                  >
                    {d.name} ({d.value})
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Telecaller productivity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Telecaller productivity</CardTitle>
            <Button variant="outline" size="sm" onClick={() => downloadCSV("telecaller_productivity", tcs)}>
              <Download className="size-4 mr-1" aria-hidden="true" /> CSV
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Agent</TableHead><TableHead>Calls</TableHead>
                <TableHead>Answered</TableHead><TableHead>Talk (min)</TableHead>
                <TableHead>Pending callbacks</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {tcs.map(r => (
                  <TableRow key={r.user_id}>
                    <TableCell>{r.name || "—"}</TableCell>
                    <TableCell>{r.calls}</TableCell>
                    <TableCell>{r.answered}</TableCell>
                    <TableCell>{Math.round((r.talk_seconds || 0) / 60)}</TableCell>
                    <TableCell>{r.callbacks_pending}</TableCell>
                  </TableRow>
                ))}
                {loading && <TableRow><TableCell colSpan={5} className="text-muted-foreground text-center py-6">Loading…</TableCell></TableRow>}
                {!tcs.length && !loading && <TableRow><TableCell colSpan={5} className="text-muted-foreground text-center py-6">No telecaller activity in this period.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Counselor productivity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Counselor productivity</CardTitle>
            <Button variant="outline" size="sm" onClick={() => downloadCSV("counselor_productivity", cns)}>
              <Download className="size-4 mr-1" aria-hidden="true" /> CSV
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Counselor</TableHead><TableHead>Handoffs accepted</TableHead>
                <TableHead>Tasks done</TableHead><TableHead>Enrollments</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {cns.map(r => (
                  <TableRow key={r.user_id}>
                    <TableCell>{r.name || "—"}</TableCell>
                    <TableCell>{r.handoffs_accepted}</TableCell>
                    <TableCell>{r.tasks_done}</TableCell>
                    <TableCell>{r.enrollments}</TableCell>
                  </TableRow>
                ))}
                {loading && <TableRow><TableCell colSpan={4} className="text-muted-foreground text-center py-6">Loading…</TableCell></TableRow>}
                {!cns.length && !loading && <TableRow><TableCell colSpan={4} className="text-muted-foreground text-center py-6">No counselor activity in this period.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Campaign performance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Campaign performance</CardTitle>
            <Button variant="outline" size="sm" onClick={() => downloadCSV("campaign_performance", camps)}>
              <Download className="size-4 mr-1" aria-hidden="true" /> CSV
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Campaign</TableHead><TableHead>Leads</TableHead>
                <TableHead>Hot</TableHead><TableHead>Warm</TableHead><TableHead>Cold</TableHead>
                <TableHead>Callbacks</TableHead><TableHead>Converted</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {camps.map(r => (
                  <TableRow key={r.campaign_id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.leads}</TableCell>
                    <TableCell className="text-red-600">{r.hot}</TableCell>
                    <TableCell className="text-amber-600">{r.warm}</TableCell>
                    <TableCell className="text-blue-600">{r.cold}</TableCell>
                    <TableCell>{r.callbacks_pending}</TableCell>
                    <TableCell className="font-semibold">{r.converted}</TableCell>
                  </TableRow>
                ))}
                {loading && <TableRow><TableCell colSpan={7} className="text-muted-foreground text-center py-6">Loading…</TableCell></TableRow>}
                {!camps.length && !loading && <TableRow><TableCell colSpan={7} className="text-muted-foreground text-center py-6">No campaign data in this period.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Country/intake */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Country / intake demand</CardTitle>
            <Button variant="outline" size="sm" onClick={() => downloadCSV("country_intake", countries)}>
              <Download className="size-4 mr-1" aria-hidden="true" /> CSV
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Country</TableHead><TableHead>Intake</TableHead><TableHead>Leads</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {countries.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.country || "—"}</TableCell>
                    <TableCell>{r.intake || "—"}</TableCell>
                    <TableCell>{r.leads}</TableCell>
                  </TableRow>
                ))}
                {loading && <TableRow><TableCell colSpan={3} className="text-muted-foreground text-center py-6">Loading…</TableCell></TableRow>}
                {!countries.length && !loading && <TableRow><TableCell colSpan={3} className="text-muted-foreground text-center py-6">No country demand data in this period.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Stage distribution */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2"><Workflow className="size-4" /> Stage distribution</CardTitle>
            <div className="flex items-center gap-2">
              {stageDist.length > 0 && (
                <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                  <SelectTrigger className="w-[280px]" aria-label="Select pipeline"><SelectValue placeholder="Pipeline" /></SelectTrigger>
                  <SelectContent>
                    {Array.from(new Map(stageDist.map((r) => [r.pipeline_id, r])).values()).map((p) => (
                      <SelectItem key={p.pipeline_id} value={p.pipeline_id}>
                        {p.pipeline_name} <span className="text-muted-foreground">— {p.country}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="outline" size="sm" onClick={() => downloadCSV("stage_distribution", stageDist)}>
                <Download className="size-4 mr-1" aria-hidden="true" /> CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent style={{ height: 320 }}>
            {(() => {
              const filtered = stageDist.filter((r) => r.pipeline_id === selectedPipeline);
              if (!filtered.length) {
                return (
                  <EmptyState
                    icon={Workflow}
                    title={loading ? "Loading pipeline data…" : "No pipeline data yet"}
                    description={loading ? undefined : "Stage distribution appears once clients are active in this pipeline."}
                  />
                );
              }
              return (
                <>
                  <ResponsiveContainer>
                    <BarChart data={filtered}>
                      <XAxis dataKey="stage_label" fontSize={11} angle={-15} textAnchor="end" height={60} interval={0} />
                      <YAxis fontSize={11} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="client_count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="pt-3 text-center">
                    <Link to="/clients" className="text-sm text-primary hover:underline">
                      View all clients →
                    </Link>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function KPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}