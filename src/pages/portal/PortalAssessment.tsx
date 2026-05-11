import { useEffect, useState } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Loader2, Mail, Play } from "lucide-react";
import { toast } from "sonner";

type Sess = { id: string; status: string; submitted_at: string | null; created_at: string; output: any };

export default function PortalAssessment() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Sess[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: leads } = await supabase.from("assessment_leads").select("id").eq("auth_user_id", user.id);
      const ids = (leads ?? []).map((l: any) => l.id);
      if (ids.length === 0) { setSessions([]); setLoading(false); return; }
      const { data } = await supabase.from("assessment_sessions")
        .select("id, status, submitted_at, created_at, output").in("lead_id", ids).order("created_at", { ascending: false });
      setSessions((data ?? []) as Sess[]);
      setLoading(false);
    })();
  }, [user]);

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
          <h1 className="text-2xl font-bold">Canada Assessment</h1>
          <p className="text-sm text-muted-foreground">Your eligibility assessments and reports.</p>
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
              {s.status === "submitted" ? (
                <Button variant="outline" size="sm" disabled={busy === s.id} onClick={() => resend(s.id)}>
                  {busy === s.id ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Mail className="size-3.5 mr-1.5" />}
                  Email me a copy
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link to={`/assessment/run/${s.id}`}><Play className="size-3.5 mr-1.5" />Continue</Link>
                </Button>
              )}
            </div>
            {s.status === "submitted" && s.output?.matches && (
              <div className="space-y-1.5 pt-2 border-t">
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
