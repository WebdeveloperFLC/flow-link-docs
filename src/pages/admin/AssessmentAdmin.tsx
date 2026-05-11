import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, Download, Send, Copy } from "lucide-react";

export default function AssessmentAdmin() {
  return (
    <AppLayout>
      <PageHeader title="Canada Assessment" subtitle="Send invitations, review submissions, and manage the question bank" />
      <div className="p-6 max-w-6xl mx-auto">
        <Tabs defaultValue="invite">
          <TabsList>
            <TabsTrigger value="invite">Send invite</TabsTrigger>
            <TabsTrigger value="sessions">Submissions</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="programs">Programs</TabsTrigger>
          </TabsList>
          <TabsContent value="invite" className="pt-4"><InviteTab /></TabsContent>
          <TabsContent value="sessions" className="pt-4"><SessionsTab /></TabsContent>
          <TabsContent value="questions" className="pt-4"><QuestionsTab /></TabsContent>
          <TabsContent value="programs" className="pt-4"><ProgramsTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
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
    if (error || (data as any)?.error) return toast.error(error?.message ?? (data as any)?.error);
    setLink((data as any).link);
    toast.success((data as any).emailed ? "Invitation emailed" : "Invitation created — email queued");
  };
  return (
    <Card className="p-5 space-y-3 max-w-2xl">
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

function SessionsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("assessment_sessions")
        .select("id, status, submitted_at, created_at, lead:assessment_leads(first_name, last_name, email, phone), output")
        .order("created_at", { ascending: false }).limit(100);
      setRows(data ?? []); setLoading(false);
    })();
  }, []);
  const download = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("assessment-pdf-download", { body: { sessionId: id } });
    if (error || (data as any)?.error) return toast.error(error?.message ?? (data as any)?.error);
    window.open((data as any).url, "_blank");
  };
  const resend = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("assessment-resend-report", { body: { sessionId: id } });
    if (error || (data as any)?.error) return toast.error(error?.message ?? (data as any)?.error);
    toast.success("Report re-sent");
  };
  if (loading) return <Loader2 className="animate-spin" />;
  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>
          <th className="text-left p-2 px-3">Client</th><th className="text-left p-2">Email</th>
          <th className="text-left p-2">Status</th><th className="text-left p-2">Submitted</th><th></th>
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2 px-3">{r.lead?.first_name} {r.lead?.last_name}</td>
              <td className="p-2">{r.lead?.email}</td>
              <td className="p-2"><span className="text-xs">{r.status}</span></td>
              <td className="p-2 text-xs">{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"}</td>
              <td className="p-2 text-right">
                {r.status === "submitted" && (
                  <div className="inline-flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => download(r.id)}><Download className="size-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => resend(r.id)}><Mail className="size-3.5" /></Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No submissions yet</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}

function QuestionsTab() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { supabase.from("assessment_questions").select("*").order("order_index").then((r) => setRows(r.data ?? [])); }, []);
  const toggle = async (id: string, val: boolean) => {
    await supabase.from("assessment_questions").update({ is_active: val }).eq("id", id);
    setRows((r) => r.map((x) => x.id === id ? { ...x, is_active: val } : x));
  };
  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50"><tr><th className="text-left p-2 px-3">Section</th><th className="text-left p-2">Code</th><th className="text-left p-2">Label</th><th className="text-left p-2">Type</th><th className="p-2">Active</th></tr></thead>
        <tbody>{rows.map((q) => (
          <tr key={q.id} className="border-t">
            <td className="p-2 px-3 text-xs">{q.section}</td>
            <td className="p-2 text-xs font-mono">{q.code}</td>
            <td className="p-2">{q.label}</td>
            <td className="p-2 text-xs">{q.q_type}</td>
            <td className="p-2 text-center"><input type="checkbox" checked={q.is_active} onChange={(e) => toggle(q.id, e.target.checked)} /></td>
          </tr>
        ))}</tbody>
      </table>
    </Card>
  );
}

function ProgramsTab() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { supabase.from("assessment_programs").select("*").order("order_index").then((r) => setRows(r.data ?? [])); }, []);
  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50"><tr><th className="text-left p-2 px-3">Code</th><th className="text-left p-2">Label</th><th className="text-left p-2">Rules (JSON)</th></tr></thead>
        <tbody>{rows.map((p) => (
          <tr key={p.id} className="border-t">
            <td className="p-2 px-3 text-xs font-mono">{p.code}</td>
            <td className="p-2">{p.label}</td>
            <td className="p-2 text-xs font-mono text-muted-foreground">{JSON.stringify(p.match_rules)}</td>
          </tr>
        ))}</tbody>
      </table>
    </Card>
  );
}
