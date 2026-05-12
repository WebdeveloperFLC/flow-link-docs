import { useEffect, useState } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Loader2, Mail, Play, Eye } from "lucide-react";
import { toast } from "sonner";
import { getMyPortalClientId } from "@/lib/portal";
import { openAssessmentPdf } from "@/lib/assessmentPdf";

type Sess = { id: string; status: string; goal: string | null; answers: any; submitted_at: string | null; created_at: string; output: any };

export default function PortalAssessment() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Sess[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: leads }, clientId] = await Promise.all([
        supabase.from("assessment_leads").select("id").eq("auth_user_id", user.id),
        getMyPortalClientId(user.id),
      ]);
      const leadIds = (leads ?? []).map((l: any) => l.id);
      const cols = "id, status, goal, answers, submitted_at, created_at, output";
      const queries: any[] = [];
      if (leadIds.length) queries.push(supabase.from("assessment_sessions").select(cols).in("lead_id", leadIds));
      if (clientId) queries.push(supabase.from("assessment_sessions").select(cols).eq("client_id", clientId));
      const results = await Promise.all(queries);
      const merged = new Map<string, Sess>();
      for (const r of results) for (const row of (r.data ?? []) as Sess[]) merged.set(row.id, row);
      const list = Array.from(merged.values()).sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setSessions(list);
      setLoading(false);
    })();
  }, [user]);

  const viewReport = async (s: Sess) => {
    try {
      const qs = await supabase.from("assessment_questions").select("id, code, section, label, q_type").eq("is_active", true).order("order_index");
      await openAssessmentPdf({
        sessionId: s.id,
        goal: s.goal ?? undefined,
        answers: s.answers ?? {},
        questions: (qs.data ?? []) as any[],
        crs: s.output?.crs,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open report");
    }
  };

  const resend = async (id: string) => {
    setBusy(id);
    const { error, data } = await supabase.functions.invoke("assessment-resend-report", { body: { sessionId: id } });
    setBusy(null);
    if (error || (data as any)?.error) toast.error(error?.message ?? (data as any)?.error ?? "Failed");
    else toast.success("We've emailed your report copy.");
  };

  return (
    <PortalLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Settle Abroad — Assessments</h1>
          <p className="text-sm text-muted-foreground">Your multi-country eligibility assessments and reports.</p>
        </div>

        {loading ? <Loader2 className="animate-spin" /> : sessions.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No assessment yet. Ask your counselor for a referral code or invitation.
          </Card>
        ) : sessions.map((s) => (
          <Card key={s.id} className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Canada — Permanent Residence</div>
                <div className="text-xs text-muted-foreground">{s.status} · {new Date(s.submitted_at ?? s.created_at).toLocaleString()}</div>
              </div>
              {(s.status === "submitted" || s.status === "counselor_reviewed") ? (
                <div className="flex gap-2">
                  <Button variant="default" size="sm" onClick={() => viewReport(s)}>
                    <Eye className="size-3.5 mr-1.5" /> View report
                  </Button>
                  <Button variant="outline" size="sm" disabled={busy === s.id} onClick={() => resend(s.id)}>
                    {busy === s.id ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Mail className="size-3.5 mr-1.5" />}
                    Email me a copy
                  </Button>
                </div>
              ) : (
                <Button asChild size="sm">
                  <Link to={`/assessment/run/${s.id}`}><Play className="size-3.5 mr-1.5" />Continue</Link>
                </Button>
              )}
            </div>
            {s.status === "submitted" && s.output?.matches && (
              <div className="space-y-1.5 pt-2 border-t">
                {s.output?.crs && (
                  <div className="flex items-baseline gap-2 mb-2">
                    <div className="text-3xl font-bold text-primary">{s.output.crs.total}</div>
                    <div className="text-xs text-muted-foreground">Estimated CRS score</div>
                  </div>
                )}
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Matched programs</div>
                {s.output.matches.slice(0, 5).map((m: any) => (
                  <div key={m.code} className="flex items-center justify-between text-sm">
                    <span>{m.label}</span>
                    <span className={`text-xs font-semibold ${m.status === "eligible" ? "text-success" : m.status === "review" ? "text-amber-600" : "text-muted-foreground"}`}>
                      {m.status.replace("_"," ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </PortalLayout>
  );
}
