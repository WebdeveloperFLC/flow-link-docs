import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, Mail, Download, Send, Copy, Search, ExternalLink,
  Users, FileCheck2, ClipboardList, TrendingUp, Link2, RefreshCw, Play, PlayCircle,
} from "lucide-react";
import { StartAssessmentDialog } from "@/components/assessment/StartAssessmentDialog";
import { invokeError } from "@/lib/invokeError";
import { useNavigate } from "react-router-dom";
import { downloadAssessmentPdf, openAssessmentPdf } from "@/lib/assessmentPdf";

const GOAL_LABELS: Record<string, string> = {
  permanent_residence: "PR",
  work_permit: "Work",
  study_permit: "Study",
  visitor_visa: "Visitor",
  family_sponsorship: "Family",
  business_investment: "Business",
  unsure: "Eligibility",
};

const PUBLIC_ASSESSMENT_URL = `${window.location.origin}/assessment`;

export default function AssessmentAdmin() {
  const [startOpen, setStartOpen] = useState(false);
  return (
    <AppLayout>
      <PageHeader
        title="Settle Abroad — Assessment Console"
        description="Multi-country immigration assessments: invitations, submissions, scoring, and question/program management"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/noc-admin")}>
              NOC management
            </Button>
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/germany-rules")}>
              Germany rules
            </Button>
          </div>
        }
      />
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        <Card className="p-5 flex flex-wrap items-center gap-4 bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
          <div className="flex-1 min-w-[220px]">
            <div className="font-semibold text-base">Start a new assessment</div>
            <div className="text-sm text-muted-foreground">
              Add a new client or pick an existing one — runs immediately, no email needed.
            </div>
          </div>
          <Button size="lg" onClick={() => setStartOpen(true)}>
            <Play className="size-4 mr-2" /> Start new assessment
          </Button>
        </Card>
        <StartAssessmentDialog open={startOpen} onOpenChange={setStartOpen} />

        <StatsRow />
        <PublicLinkCard />
        <Tabs defaultValue="submissions">
          <TabsList>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
            <TabsTrigger value="invite">Send invite</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="programs">Programs</TabsTrigger>
          </TabsList>
          <TabsContent value="submissions" className="pt-4"><SessionsTab /></TabsContent>
          <TabsContent value="invitations" className="pt-4"><InvitationsTab /></TabsContent>
          <TabsContent value="invite" className="pt-4"><InviteTab /></TabsContent>
          <TabsContent value="questions" className="pt-4"><QuestionsTab /></TabsContent>
          <TabsContent value="programs" className="pt-4"><ProgramsTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function StatCard({ icon: Icon, label, value, tone = "primary" }: any) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`size-9 rounded-md flex items-center justify-center bg-${tone}/10 text-${tone}`}>
        <Icon className="size-4" />
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold leading-tight">{value}</div>
      </div>
    </Card>
  );
}

function StatsRow() {
  const [stats, setStats] = useState<{ invites: number; inProgress: number; submitted: number; avgCrs: number | null }>({
    invites: 0, inProgress: 0, submitted: 0, avgCrs: null,
  });
  const load = async () => {
    const [inv, sess] = await Promise.all([
      supabase.from("assessment_invitations").select("id, status", { count: "exact", head: false }),
      supabase.from("assessment_sessions").select("id, status, output").limit(1000),
    ]);
    const invites = (inv.data ?? []).filter((i: any) => i.status === "pending").length;
    const sessions = (sess.data ?? []) as any[];
    const inProgress = sessions.filter((s) => ["draft", "in_progress"].includes(s.status)).length;
    const submitted = sessions.filter((s) => s.status === "submitted" || s.status === "counselor_reviewed").length;
    const crsScores = sessions.map((s) => s.output?.crs?.total).filter((n) => typeof n === "number");
    const avgCrs = crsScores.length ? Math.round(crsScores.reduce((a, b) => a + b, 0) / crsScores.length) : null;
    setStats({ invites, inProgress, submitted, avgCrs });
  };
  useEffect(() => { load(); }, []);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard icon={Mail} label="Pending invites" value={stats.invites} />
      <StatCard icon={ClipboardList} label="In progress" value={stats.inProgress} />
      <StatCard icon={FileCheck2} label="Submitted" value={stats.submitted} />
      <StatCard icon={TrendingUp} label="Avg CRS" value={stats.avgCrs ?? "—"} />
    </div>
  );
}

function PublicLinkCard() {
  return (
    <Card className="p-4 flex flex-wrap items-center gap-3">
      <div className="size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
        <Link2 className="size-4" />
      </div>
      <div className="flex-1 min-w-[220px]">
        <div className="text-xs font-semibold">Public assessment link</div>
        <div className="text-xs text-muted-foreground">Share this with leads who have a referral code. They register, verify email, and start the questionnaire.</div>
      </div>
      <code className="text-xs bg-muted rounded-md px-2 py-1 truncate max-w-[340px]">{PUBLIC_ASSESSMENT_URL}</code>
      <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(PUBLIC_ASSESSMENT_URL); toast.success("Public link copied"); }}>
        <Copy className="size-3.5 mr-1.5" />Copy
      </Button>
      <Button size="sm" variant="outline" asChild>
        <a href={PUBLIC_ASSESSMENT_URL} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5 mr-1.5" />Open</a>
      </Button>
    </Card>
  );
}

function InviteTab() {
  const [first, setFirst] = useState(""); const [mid, setMid] = useState(""); const [last, setLast] = useState("");
  const [email, setEmail] = useState(""); const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false); const [link, setLink] = useState<string | null>(null);
  const send = async () => {
    if (!first || !last || !email) return toast.error("First, last and email are required");
    setBusy(true); setLink(null);
    const { data, error } = await supabase.functions.invoke("assessment-invite-create", {
      body: { firstName: first, middleName: mid, lastName: last, email, phone },
    });
    setBusy(false);
    if (error || (data as any)?.error) return toast.error((await invokeError(error, data)) ?? "Failed");
    setLink((data as any).link);
    toast.success((data as any).emailed ? "Invitation emailed" : "Invitation created — email queued");
  };
  return (
    <Card className="p-5 space-y-3 max-w-2xl">
      <div className="text-sm text-muted-foreground">Send a personal invitation. Lead receives an email with a one-click link to register and verify.</div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5"><Label>First *</Label><Input value={first} onChange={(e) => setFirst(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Middle</Label><Input value={mid} onChange={(e) => setMid(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Last *</Label><Input value={last} onChange={(e) => setLast(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      </div>
      <Button onClick={send} disabled={busy}>
        {busy ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Send className="size-4 mr-1.5" />}
        Send invitation
      </Button>
      {link && (
        <div className="text-xs flex items-center gap-2 p-2 bg-muted rounded-md">
          <span className="truncate flex-1">{link}</span>
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success("Copied"); }}>
            <Copy className="size-3.5" />
          </Button>
        </div>
      )}
    </Card>
  );
}

function InvitationsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("assessment_invitations")
      .select("id, first_name, last_name, email, phone, status, token, expires_at, redeemed_at, created_at")
      .order("created_at", { ascending: false }).limit(200);
    setRows(data ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => `${r.first_name ?? ""} ${r.last_name ?? ""} ${r.email}`.toLowerCase().includes(t));
  }, [rows, q]);
  const linkFor = (token: string) => `${window.location.origin}/assessment/invite/${token}`;
  const copy = (token: string) => { navigator.clipboard.writeText(linkFor(token)); toast.success("Invite link copied"); };
  if (loading) return <Loader2 className="animate-spin" />;
  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-3 flex items-center gap-2 border-b">
        <Search className="size-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="h-8 max-w-xs" />
        <div className="ml-auto"><Button size="sm" variant="outline" onClick={load}><RefreshCw className="size-3.5 mr-1.5" />Refresh</Button></div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>
          <th className="text-left p-2 px-3">Name</th><th className="text-left p-2">Email</th>
          <th className="text-left p-2">Status</th><th className="text-left p-2">Expires</th>
          <th className="text-left p-2">Created</th><th></th>
        </tr></thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2 px-3">{[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}</td>
              <td className="p-2">{r.email}</td>
              <td className="p-2"><Badge variant={r.status === "registered" ? "default" : r.status === "expired" || r.status === "revoked" ? "secondary" : "outline"}>{r.status}</Badge></td>
              <td className="p-2 text-xs">{new Date(r.expires_at).toLocaleDateString()}</td>
              <td className="p-2 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
              <td className="p-2 text-right">
                <Button size="sm" variant="outline" onClick={() => copy(r.token)}>
                  <Copy className="size-3.5 mr-1.5" />Copy link
                </Button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
              No invitations yet. Use the <b>Send invite</b> tab to create one.
            </td></tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}

function SessionsTab() {
  const nav = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("assessment_sessions")
      .select("id, status, goal, answers, submitted_at, created_at, pdf_path, lead:assessment_leads(first_name, last_name, email, phone), client:clients(full_name, email, phone), output")
      .order("created_at", { ascending: false }).limit(200);
    setRows(data ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!t) return true;
      const p = r.client ?? r.lead ?? {};
      const hay = `${p.full_name ?? ""} ${p.first_name ?? ""} ${p.last_name ?? ""} ${p.email ?? ""}`.toLowerCase();
      return hay.includes(t);
    });
  }, [rows, q, statusFilter]);
  const downloadServer = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("assessment-pdf-download", { body: { sessionId: id } });
    if (error || (data as any)?.error) return toast.error((await invokeError(error, data)) ?? "Download failed");
    window.open((data as any).url, "_blank");
  };
  const pdfInput = async (r: any) => {
    const qs = await supabase.from("assessment_questions").select("id, code, section, label, q_type").eq("is_active", true).order("order_index");
    const p = r.client ?? r.lead ?? {};
    const name = p.full_name ?? ([p.first_name, p.last_name].filter(Boolean).join(" ") || "");
    return {
      sessionId: r.id,
      clientName: name,
      clientEmail: p.email,
      goal: r.goal,
      answers: r.answers ?? {},
      questions: (qs.data ?? []) as any[],
      crs: r.output?.crs,
    };
  };
  const downloadClient = async (r: any) => {
    try { await downloadAssessmentPdf(await pdfInput(r)); }
    catch (e) { toast.error(e instanceof Error ? e.message : "PDF failed"); }
  };
  const viewClient = async (r: any) => {
    try { await openAssessmentPdf(await pdfInput(r)); }
    catch (e) { toast.error(e instanceof Error ? e.message : "PDF failed"); }
  };
  const resend = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("assessment-resend-report", { body: { sessionId: id } });
    if (error || (data as any)?.error) return toast.error((await invokeError(error, data)) ?? "Resend failed");
    toast.success("Report re-sent");
  };
  if (loading) return <Loader2 className="animate-spin" />;
  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-3 flex items-center gap-2 border-b flex-wrap">
        <Search className="size-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client" className="h-8 max-w-xs" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="in_progress">In progress</option>
          <option value="submitted">Submitted</option>
          <option value="counselor_reviewed">Counselor reviewed</option>
        </select>
        <div className="ml-auto"><Button size="sm" variant="outline" onClick={load}><RefreshCw className="size-3.5 mr-1.5" />Refresh</Button></div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>
          <th className="text-left p-2 px-3">Client</th><th className="text-left p-2">Email</th>
          <th className="text-left p-2">Goal</th><th className="text-left p-2">Status</th>
          <th className="text-left p-2">CRS</th><th className="text-left p-2">Updated</th><th></th>
        </tr></thead>
        <tbody>
          {filtered.map((r) => {
            const p = r.client ?? r.lead ?? {};
            const name = p.full_name ?? ([p.first_name, p.last_name].filter(Boolean).join(" ") || "—");
            const isOpen = r.status === "draft" || r.status === "in_progress";
            const isDone = r.status === "submitted" || r.status === "counselor_reviewed";
            const hasPdf = !!r.pdf_path;
            const hasEmail = !!p.email;
            return (
            <tr key={r.id} className="border-t">
              <td className="p-2 px-3">{name}</td>
              <td className="p-2">{p.email ?? "—"}</td>
              <td className="p-2 text-xs">{GOAL_LABELS[r.goal] ?? "—"}</td>
              <td className="p-2"><Badge variant={r.status === "submitted" ? "default" : "outline"}>{r.status}</Badge></td>
              <td className="p-2 text-xs font-mono">{r.output?.crs?.total ?? "—"}</td>
              <td className="p-2 text-xs">{new Date(r.submitted_at ?? r.created_at).toLocaleString()}</td>
              <td className="p-2 text-right">
                <div className="inline-flex gap-1">
                  {isOpen && (
                    <>
                      <Button size="sm" variant="default" onClick={() => nav(`/assessment/run/${r.id}`)} title="Open / Resume">
                        <PlayCircle className="size-3.5 mr-1" />Resume
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => downloadClient(r)} title="Download PDF"><Download className="size-3.5" /></Button>
                    </>
                  )}
                  {isDone && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => viewClient(r)} title="View report"><ExternalLink className="size-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => downloadClient(r)} title="Download PDF"><Download className="size-3.5" /></Button>
                      {hasPdf && hasEmail && (
                        <Button size="sm" variant="outline" onClick={() => resend(r.id)} title="Re-email report"><Mail className="size-3.5" /></Button>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          );})}
          {filtered.length === 0 && (
            <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
              <div className="space-y-1">
                <div className="font-medium text-foreground">No assessments yet</div>
                <div>Click <b>Start new assessment</b> above to add a client and begin.</div>
              </div>
            </td></tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}

function QuestionsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => { supabase.from("assessment_questions").select("*").order("order_index").then((r) => setRows(r.data ?? [])); }, []);
  const toggle = async (id: string, val: boolean) => {
    await supabase.from("assessment_questions").update({ is_active: val }).eq("id", id);
    setRows((r) => r.map((x) => x.id === id ? { ...x, is_active: val } : x));
  };
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((x) => `${x.code} ${x.label} ${x.section}`.toLowerCase().includes(t));
  }, [rows, q]);
  const counts = useMemo(() => {
    const by: Record<string, number> = {};
    rows.forEach((r) => { by[r.section] = (by[r.section] ?? 0) + 1; });
    return by;
  }, [rows]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {Object.entries(counts).map(([sec, n]) => (
          <Badge key={sec} variant="secondary" className="capitalize">{sec}: {n}</Badge>
        ))}
        <Badge>Total: {rows.length}</Badge>
        <Badge variant="outline">Active: {rows.filter((r) => r.is_active).length}</Badge>
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="p-3 border-b flex items-center gap-2">
          <Search className="size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions" className="h-8 max-w-xs" />
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-2 px-3">Section</th><th className="text-left p-2">Code</th>
            <th className="text-left p-2">Label</th><th className="text-left p-2">Type</th><th className="p-2">Active</th>
          </tr></thead>
          <tbody>{filtered.map((qq) => (
            <tr key={qq.id} className="border-t">
              <td className="p-2 px-3 text-xs capitalize">{qq.section}</td>
              <td className="p-2 text-xs font-mono">{qq.code}</td>
              <td className="p-2">{qq.label}</td>
              <td className="p-2 text-xs">{qq.q_type}</td>
              <td className="p-2 text-center"><input type="checkbox" checked={qq.is_active} onChange={(e) => toggle(qq.id, e.target.checked)} /></td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No questions match your search.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ProgramsTab() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { supabase.from("assessment_programs").select("*").order("order_index").then((r) => setRows(r.data ?? [])); }, []);
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">Programs are the destinations that the rule engine matches a lead against. Rules are admin-editable JSON.</div>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-2 px-3">Code</th><th className="text-left p-2">Label</th>
            <th className="text-left p-2">Rules (JSON)</th>
          </tr></thead>
          <tbody>{rows.map((p) => (
            <tr key={p.id} className="border-t align-top">
              <td className="p-2 px-3 text-xs font-mono">{p.code}</td>
              <td className="p-2">{p.label}</td>
              <td className="p-2 text-xs font-mono text-muted-foreground max-w-xl truncate">{JSON.stringify(p.match_rules)}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No programs configured.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
