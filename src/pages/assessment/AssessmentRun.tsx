import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Send, CheckCircle2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

type Q = {
  id: string; code: string; section: string; q_type: string; label: string;
  help_text: string | null; options: any; required: boolean; conditional_on: any; order_index: number;
};

const sectionLabels: Record<string, string> = {
  personal: "Personal", education: "Education", language: "Language",
  work: "Work experience", canada: "Canadian connections", province: "Province preference",
  funds: "Settlement funds", compliance: "Compliance", documents: "Documents",
};

export default function AssessmentRun() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [status, setStatus] = useState<string>("draft");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [crs, setCrs] = useState<any | null>(null);
  const crsTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    const [qs, ses] = await Promise.all([
      supabase.from("assessment_questions").select("*").eq("is_active", true).order("order_index"),
      supabase.from("assessment_sessions").select("answers, status").eq("id", sessionId).maybeSingle(),
    ]);
    setQuestions((qs.data ?? []) as Q[]);
    setAnswers((ses.data?.answers as any) ?? {});
    setStatus(ses.data?.status ?? "draft");
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  // Live CRS recompute, debounced
  useEffect(() => {
    if (crsTimer.current) window.clearTimeout(crsTimer.current);
    crsTimer.current = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("assessment-crs", { body: { answers } });
        if (!error && !(data as any)?.error) setCrs(data);
      } catch (_) { /* ignore */ }
    }, 400);
    return () => { if (crsTimer.current) window.clearTimeout(crsTimer.current); };
  }, [answers]);

  const bySection = useMemo(() => {
    const out: Record<string, Q[]> = {};
    for (const q of questions) (out[q.section] ??= []).push(q);
    return out;
  }, [questions]);

  const set = (code: string, v: any) => setAnswers((a) => ({ ...a, [code]: v }));

  const showQ = (q: Q) => {
    const c = q.conditional_on as any;
    if (!c) return true;
    // Simple { code: value } check
    for (const k of Object.keys(c)) {
      const expected = c[k];
      const got = answers[k];
      if (Array.isArray(expected)) { if (!expected.includes(got)) return false; }
      else if (got !== expected) return false;
    }
    return true;
  };

  const save = async (submit = false) => {
    if (!sessionId) return;
    if (submit) setSubmitting(true); else setSaving(true);
    try {
      if (submit) {
        const { data, error } = await supabase.functions.invoke("assessment-submit", { body: { sessionId, answers } });
        if (error || (data as any)?.error) throw new Error(error?.message ?? (data as any)?.error);
        toast.success("Submitted! Your report has been emailed to you.");
        setStatus("submitted");
      } else {
        const { error } = await supabase.from("assessment_sessions").update({ answers, status: "in_progress" }).eq("id", sessionId);
        if (error) throw error;
        toast.success("Progress saved");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSaving(false); setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  if (status === "submitted") return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center space-y-3">
        <CheckCircle2 className="size-12 text-success mx-auto" />
        <div className="text-xl font-semibold">Assessment submitted</div>
        <div className="text-sm text-muted-foreground">Your personalised report has been emailed to you. A Futurelink counselor will follow up shortly.</div>
        <Button variant="outline" onClick={() => nav("/portal")}>Go to portal</Button>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
        <div>
          <div className="text-xs uppercase tracking-wider text-primary font-semibold">Canada Immigration</div>
          <h1 className="text-2xl font-bold mt-1">Eligibility Questionnaire</h1>
          <p className="text-sm text-muted-foreground">Answer as accurately as you can — all fields can be updated later.</p>
        </div>
        {Object.entries(bySection).map(([sec, qs]) => (
          <Card key={sec} className="p-5 space-y-3">
            <div className="font-semibold">{sectionLabels[sec] ?? sec}</div>
            <div className="grid sm:grid-cols-2 gap-3">
              {qs.filter(showQ).map((q) => {
                const v = answers[q.code] ?? "";
                const type = q.q_type;
                return (
                  <div key={q.id} className="space-y-1.5 sm:col-span-1">
                    <Label className="text-xs">{q.label}{q.required && <span className="text-destructive ml-0.5">*</span>}</Label>
                    {q.help_text && <div className="text-[11px] text-muted-foreground">{q.help_text}</div>}
                    {type === "boolean" ? (
                      <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={v === true ? "yes" : v === false ? "no" : ""} onChange={(e) => set(q.code, e.target.value === "yes" ? true : e.target.value === "no" ? false : null)}>
                        <option value="">—</option><option value="yes">Yes</option><option value="no">No</option>
                      </select>
                    ) : type === "select" ? (
                      <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={v} onChange={(e) => set(q.code, e.target.value)}>
                        <option value="">—</option>
                        {(q.options as string[] ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : type === "multiselect" ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(q.options as string[] ?? []).map((o) => {
                          const arr: string[] = Array.isArray(v) ? v : [];
                          const on = arr.includes(o);
                          return (
                            <button type="button" key={o}
                              onClick={() => set(q.code, on ? arr.filter((x) => x !== o) : [...arr, o])}
                              className={`px-2 py-1 rounded-md text-xs border ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}>
                              {o}
                            </button>
                          );
                        })}
                      </div>
                    ) : type === "number" ? (
                      <Input type="number" value={v ?? ""} onChange={(e) => set(q.code, e.target.value === "" ? null : Number(e.target.value))} />
                    ) : (
                      <Input value={v ?? ""} onChange={(e) => set(q.code, e.target.value)} />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}

        <div className="flex items-center justify-end gap-2 sticky bottom-4">
          <Button variant="outline" onClick={() => save(false)} disabled={saving}>
            {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
            Save & continue later
          </Button>
          <Button onClick={() => save(true)} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Send className="size-4 mr-1.5" />}
            Submit assessment
          </Button>
        </div>
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-4 space-y-3">
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live CRS estimate</div>
              </div>
              <div className="text-4xl font-bold text-primary">{crs?.total ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{crs?.withSpouse ? "With accompanying spouse" : "Single applicant"}</div>
              {crs && (
                <div className="space-y-2 pt-2 border-t">
                  {[
                    ["Core", crs.sections.core],
                    ["Spouse", crs.sections.spouse],
                    ["Transferability", crs.sections.transferability],
                    ["Additional", crs.sections.additional],
                  ].map(([label, s]: any) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs"><span>{label}</span><span className="font-mono">{s.total}/{s.max}</span></div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-0.5">
                        <div className="h-full bg-primary" style={{ width: `${Math.min(100, (s.total / Math.max(1,s.max)) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 text-[11px] text-muted-foreground">
                    English CLB: <span className="font-mono">{crs.clb.english}</span> · French CLB: <span className="font-mono">{crs.clb.french}</span>
                  </div>
                  {crs.notes?.length > 0 && (
                    <ul className="pt-1 space-y-1">
                      {crs.notes.map((n: string, i: number) => (
                        <li key={i} className="text-[11px] text-amber-600">• {n}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="text-[10px] text-muted-foreground pt-2 border-t">Estimate based on self-reported answers. Final CRS is confirmed by IRCC.</div>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
