import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AssessmentHeader } from "@/components/assessment/AssessmentHeader";
import { Loader2, Send, CheckCircle2, ArrowLeft, ArrowRight, Save, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadAssessmentPdf } from "@/lib/assessmentPdf";
import { OccupationSearch, type OccupationValue } from "@/components/assessment/OccupationSearch";
import { PathwayEligibilityPanel } from "@/components/assessment/PathwayEligibilityPanel";
import { ChancenkartePanel } from "@/components/assessment/ChancenkartePanel";
import { CountryPicker } from "@/components/assessment/CountryPicker";

type Q = {
  id: string; code: string; section: string; q_type: string; label: string;
  help_text: string | null; options: any; required: boolean; conditional_on: any; order_index: number;
};

const SECTION_LABELS: Record<string, string> = {
  personal: "Personal",
  education: "Education",
  language: "Language",
  work: "Work experience",
  canada: "Family & location",
  province: "Province preference",
  funds: "Settlement funds",
  compliance: "Compliance",
  documents: "Documents",
};
const SECTION_ORDER = ["personal","education","language","work","canada","province","funds","compliance","documents"];
const isGermany = (c: string) => c === "Germany" || c === "DE";
const isCanada = (c: string) => c === "Canada" || c === "CA";

// Language gate: CRS / FSW / pathway verdicts only after all 4 modules entered.
function hasFullLanguage(a: Record<string, any>): boolean {
  if (!a.english_test) return false;
  return ["english_listening","english_reading","english_writing","english_speaking"]
    .every((k) => {
      const n = Number(a[k]);
      return Number.isFinite(n) && n > 0;
    });
}

// Premium section subtitles shown only for the Germany pack.
const GERMANY_SECTION_LABELS: Record<string, string> = {
  personal: "Personal Profile & Germany Eligibility",
  education: "Education & Qualification Recognition",
  language: "Language Skills & Communication Readiness",
  work: "Professional Experience & Germany Employability",
  funds: "Financial Readiness & Settlement Support",
  compliance: "Immigration History & Compliance Review",
  documents: "Document Readiness & Upload Preparation",
};

// Auto-CEFR derivation from a test score.
function deriveCefr(test: string, raw: number): string | null {
  if (!Number.isFinite(raw)) return null;
  const score = Number(raw);
  if (test === "IELTS") {
    if (score >= 7.5) return "C2";
    if (score >= 6.5) return "C1";
    if (score >= 5.5) return "B2";
    if (score >= 5.0) return "B1";
    if (score >= 4.0) return "A2";
    return "A1";
  }
  if (test === "PTE") {
    if (score >= 85) return "C2";
    if (score >= 76) return "C1";
    if (score >= 59) return "B2";
    if (score >= 43) return "B1";
    if (score >= 30) return "A2";
    return "A1";
  }
  if (test === "TOEFL") {
    if (score >= 110) return "C2";
    if (score >= 95) return "C1";
    if (score >= 72) return "B2";
    if (score >= 57) return "B1";
    if (score >= 31) return "A2";
    return "A1";
  }
  if (test === "Duolingo") {
    if (score >= 135) return "C1";
    if (score >= 115) return "B2";
    if (score >= 85) return "B1";
    if (score >= 60) return "A2";
    return "A1";
  }
  return null;
}

// Map experience band code → representative years for the engine.
const EXP_BAND_TO_YEARS: Record<string, number> = {
  lt_1: 0.5, "1_2": 1.5, "3_5": 4, gt_5: 6,
};

const GOAL_LABELS: Record<string, string> = {
  permanent_residence: "Permanent Residence",
  work_permit: "Work Permit",
  study_permit: "Study Permit",
  visitor_visa: "Visitor Visa",
  family_sponsorship: "Family Sponsorship",
  business_investment: "Business / Investment",
  unsure: "Eligibility Check",
  pnp: "Provincial Nominee Program",
  de_chancenkarte: "Opportunity Card (Chancenkarte)",
  de_job_seeker: "Job Seeker Visa",
  de_ausbildung: "Ausbildung",
  de_skilled_worker: "Skilled Worker (Germany)",
  de_blue_card: "EU Blue Card",
};

export default function AssessmentRun() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [status, setStatus] = useState<string>("draft");
  const [goal, setGoal] = useState<string>("permanent_residence");
  const [country, setCountry] = useState<string>("Canada");
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [crs, setCrs] = useState<any | null>(null);
  const crsTimer = useRef<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [subject, setSubject] = useState<{ name?: string; email?: string }>({});

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    const [qs, ses] = await Promise.all([
      supabase.from("assessment_questions").select("*").eq("is_active", true).order("order_index"),
      supabase.from("assessment_sessions")
        .select("answers, status, goal, country, client:clients(full_name, email), lead:assessment_leads(first_name, last_name, email)")
        .eq("id", sessionId).maybeSingle(),
    ]);
    const all = (qs.data ?? []) as any[];
    const sCountry = (ses.data as any)?.country ?? "Canada";
    const sGoal = (ses.data as any)?.goal ?? "permanent_residence";
    // Country-pack question filter:
    // - Canada: keep all rows where country='Canada' (current behaviour).
    // - Germany: include rows where country='Germany' AND (goal matches the chosen pathway OR goal='de_chancenkarte' shared base).
    const filtered = all.filter((q) => {
      if (q.country !== sCountry) return false;
      if (sCountry !== "Germany") return true;
      return q.goal === sGoal || q.goal === "de_chancenkarte";
    });
    setQuestions(filtered as Q[]);
    setAnswers((ses.data?.answers as any) ?? {});
    setStatus(ses.data?.status ?? "draft");
    setGoal(sGoal);
    setCountry(sCountry);
    const c: any = (ses.data as any)?.client;
    const l: any = (ses.data as any)?.lead;
    setSubject({
      name: c?.full_name ?? ([l?.first_name, l?.last_name].filter(Boolean).join(" ") || undefined),
      email: c?.email ?? l?.email ?? undefined,
    });
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isGermany(country)) { setCrs(null); return; }
    if (isCanada(country) && !hasFullLanguage(answers)) { setCrs(null); return; }
    if (crsTimer.current) window.clearTimeout(crsTimer.current);
    crsTimer.current = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("assessment-crs", { body: { answers } });
        if (!error && !(data as any)?.error) setCrs(data);
      } catch { /* ignore */ }
    }, 350);
    return () => { if (crsTimer.current) window.clearTimeout(crsTimer.current); };
  }, [answers, country]);

  const bySection = useMemo(() => {
    const out: Record<string, Q[]> = {};
    for (const q of questions) (out[q.section] ??= []).push(q);
    return out;
  }, [questions]);

  const sections = useMemo(() => {
    const keys = SECTION_ORDER.filter((k) => (bySection[k]?.length ?? 0) > 0);
    return keys.map((k) => ({ key: k, label: SECTION_LABELS[k] ?? k }));
  }, [bySection]);

  const set = (code: string, v: any) => setAnswers((a) => ({ ...a, [code]: v }));

  // Auto-derive age from de_dob for Germany scoring.
  const setWithDerived = (code: string, v: any) => {
    setAnswers((a) => {
      const next: Record<string, any> = { ...a, [code]: v };
      if (code === "de_dob" && typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const dob = new Date(v);
        if (!isNaN(dob.getTime())) {
          const now = new Date();
          let age = now.getFullYear() - dob.getFullYear();
          const m = now.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
          if (age >= 0 && age < 120) next.de_age = age;
        }
      }
      // Mirror skilled experience band → years for the engine.
      if (code === "de_skilled_experience_band" && typeof v === "string" && EXP_BAND_TO_YEARS[v] != null) {
        next.de_skilled_experience_years = EXP_BAND_TO_YEARS[v];
      }
      // Auto-CEFR from English test score.
      const test = code === "de_english_test" ? v : next.de_english_test;
      const score = code === "de_english_score" ? v : next.de_english_score;
      if ((code === "de_english_test" || code === "de_english_score") && test && score != null && score !== "") {
        const cefr = deriveCefr(String(test), Number(score));
        if (cefr) next.de_english_cefr = cefr;
      }
      return next;
    });
  };

  const setOccupation = (v: OccupationValue) => {
    setAnswers((a) => ({
      ...a,
      noc_teer: v ? `TEER ${v.teer}` : null,
      occupation: v,
    }));
  };
  const currentOccupation: OccupationValue = answers.occupation ?? null;

  const showQ = (q: Q) => {
    const c = q.conditional_on as any;
    if (!c) return true;
    for (const k of Object.keys(c)) {
      const expected = c[k]; const got = answers[k];
      if (Array.isArray(expected)) { if (!expected.includes(got)) return false; }
      else if (got !== expected) return false;
    }
    return true;
  };

  const currentSection = sections[step] ?? sections[0];
  const currentQuestions = (bySection[currentSection?.key] ?? []).filter(showQ);
  const isLast = step >= sections.length - 1;

  const save = async (silent = false) => {
    if (!sessionId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("assessment_sessions").update({ answers, status: "in_progress" }).eq("id", sessionId);
      if (error) throw error;
      if (!silent) toast.success("Progress saved — find it under Submissions in the admin console");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const next = async () => {
    await save(true);
    if (!isLast) setStep((s) => s + 1);
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadAssessmentPdf({
        clientName: subject.name,
        clientEmail: subject.email,
        goal,
        country,
        answers,
        questions,
        crs,
        sessionId,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF failed");
    } finally { setDownloading(false); }
  };

  const submit = async () => {
    if (!sessionId) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("assessment-submit", { body: { sessionId, answers } });
      if (error || (data as any)?.error) throw new Error(error?.message ?? (data as any)?.error);
      toast.success("Assessment submitted");
      setStatus("submitted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="flc-shell min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-[hsl(220_18%_11%)]" />
    </div>
  );

  if (status === "submitted") {
    const total = crs?.total ?? 0;
    const fsw = crs?.fsw67;
    const eePass = isCanada(country) && total > 0;
    const fswPass = fsw?.pass;
    return (
      <div className="flc-shell min-h-screen p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="flc-card p-8 text-center space-y-3">
            <CheckCircle2 className="size-12 text-[hsl(8_75%_60%)] mx-auto" />
            <h2 className="flc-display text-3xl">Assessment submitted</h2>
            <p className="text-sm text-[hsl(220_14%_28%)]">A Future Link counselor will follow up shortly.</p>
          </div>

          {isCanada(country) && crs && (
            <>
              <div className="flc-card p-6 space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_14%_28%)]">Eligibility summary</div>
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  <SummaryChip ok={eePass} label="Express Entry — CRS pool" />
                  <SummaryChip ok={!!fswPass} label={`FSW 67-point grid (${fsw?.total ?? 0}/100)`} />
                  <SummaryChip ok={Number(answers.canadian_work_experience ?? 0) >= 1} label="CEC potential (1+ yr Canadian work)" />
                  <SummaryChip ok={!!answers.provincial_nomination} label="Provincial Nomination (+600 CRS)" />
                </div>
              </div>

              <div className="flc-card p-6 space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_14%_28%)]">CRS breakdown</div>
                <div className="flex items-baseline gap-2">
                  <span className="flc-display text-5xl">{total}</span>
                  <span className="text-xs text-[hsl(220_14%_45%)]">/ 1200 max</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-x-6 text-sm pt-2">
                  <RowItem label="Age" v={crs?.sections?.core?.items?.age} />
                  <RowItem label="Education" v={crs?.sections?.core?.items?.education} />
                  <RowItem label="First language" v={crs?.sections?.core?.items?.first_language} />
                  <RowItem label="Second language" v={crs?.sections?.core?.items?.second_language} />
                  <RowItem label="Canadian work" v={crs?.sections?.core?.items?.canadian_work} />
                  <RowItem label="Spouse" v={crs?.sections?.spouse?.total} />
                  <RowItem label="Transferability" v={crs?.sections?.transferability?.total} />
                  <RowItem label="Additional" v={crs?.sections?.additional?.total} />
                </div>
              </div>

              {fsw && (
                <div className="flc-card p-6 space-y-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_14%_28%)]">FSW 67-point grid</div>
                  <div className="flex items-baseline gap-2">
                    <span className="flc-display text-4xl">{fsw.total}</span>
                    <span className="text-xs text-[hsl(220_14%_45%)]">/ 100 · pass at 67</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-x-6 text-sm pt-2">
                    <RowItem label={`Language (max ${fsw.sections.language.max})`} v={fsw.sections.language.total} />
                    <RowItem label={`Education (max ${fsw.sections.education.max})`} v={fsw.sections.education.total} />
                    <RowItem label={`Experience (max ${fsw.sections.experience.max})`} v={fsw.sections.experience.total} />
                    <RowItem label={`Age (max ${fsw.sections.age.max})`} v={fsw.sections.age.total} />
                    <RowItem label={`Arranged employment (max ${fsw.sections.arranged_employment.max})`} v={fsw.sections.arranged_employment.total} />
                    <RowItem label={`Adaptability (max ${fsw.sections.adaptability.max})`} v={fsw.sections.adaptability.total} />
                  </div>
                  {fsw.notes?.length > 0 && (
                    <ul className="text-[11px] text-[hsl(220_14%_45%)] list-disc pl-5 pt-2 space-y-0.5">
                      {fsw.notes.map((n: string, i: number) => <li key={i}>{n}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}

          <div className="text-center">
            <button onClick={() => nav("/assessment-admin")} className="flc-cta mx-auto">Back to console</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flc-shell min-h-screen">
      <AssessmentHeader
        mode="client"
        right={<button onClick={() => nav("/assessment-admin")} className="text-sm text-[hsl(220_14%_28%)] hover:text-[hsl(220_18%_11%)]">Start over</button>}
      />

      <main className="max-w-6xl mx-auto px-4 pb-16 pt-2 grid lg:grid-cols-[220px_1fr_300px] gap-6">
        {/* Left rail */}
        <aside className="space-y-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_14%_28%)]">Step 2 of 3</div>
            <div className="font-semibold mt-1">{GOAL_LABELS[goal] ?? "Assessment"}</div>
          </div>
          <ol className="space-y-1">
            {sections.map((s, i) => {
              const active = i === step;
              const done = i < step;
              return (
                <li key={s.key}>
                  <button
                    onClick={() => setStep(i)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left transition ${
                      active ? "bg-[hsl(220_18%_11%)] text-white" : done ? "text-[hsl(220_18%_11%)]" : "text-[hsl(220_14%_45%)]"
                    }`}
                  >
                    <span className={`size-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                      active ? "bg-white text-[hsl(220_18%_11%)]" : done ? "bg-[hsl(8_75%_60%)] text-white" : "border border-[hsl(30_12%_82%)]"
                    }`}>
                      {done ? "✓" : i + 1}
                    </span>
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        {/* Center card */}
        <section className="flc-card p-8 space-y-6 min-h-[480px]">
          <div>
            <h2 className="flc-display text-3xl">{currentSection?.label}</h2>
            <p className="text-sm text-[hsl(220_14%_28%)] mt-1">
              Section {step + 1} of {sections.length} · {
                isGermany(country)
                  ? (GERMANY_SECTION_LABELS[currentSection?.key ?? ""] ?? currentSection?.label ?? "")
                  : (currentSection?.label ?? "")
              }
            </p>
          </div>

          <div className="space-y-5">
            {currentQuestions.length === 0 ? (
              <div className="text-sm text-[hsl(220_14%_28%)] py-6">No questions in this section.</div>
            ) : currentQuestions.map((q) => (
              <div key={q.id} className="space-y-2">
                <label className="text-sm font-medium text-[hsl(220_18%_11%)]">
                  {q.label}{q.required && <span className="text-[hsl(8_75%_60%)] ml-0.5">*</span>}
                </label>
                {q.help_text && <div className="text-xs text-[hsl(220_14%_45%)]">{q.help_text}</div>}
                {q.q_type === "occupation_search" ? (
                  <>
                    <OccupationSearch value={currentOccupation} onChange={setOccupation} />
                    {currentOccupation && (
                      <div className="pt-3">
                        <PathwayEligibilityPanel noc={currentOccupation as any} answers={answers} />
                      </div>
                    )}
                  </>
                ) : (
                  renderInput(q, answers[q.code], (v) => setWithDerived(q.code, v))
                )}
              </div>
            ))}
          </div>

          <div className="flc-divider" />

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-1.5 text-sm text-[hsl(220_18%_11%)] disabled:opacity-40"
            >
              <ArrowLeft className="size-4" /> Back
            </button>
            <div className="flex items-center gap-2">
              <button onClick={downloadPdf} disabled={downloading} className="px-4 py-2 rounded-full border border-[hsl(30_12%_82%)] text-sm font-medium hover:bg-[hsl(36_20%_94%)]">
                {downloading ? <Loader2 className="size-3.5 inline mr-1.5 animate-spin" /> : <Download className="size-3.5 inline mr-1.5" />}
                PDF
              </button>
              <button onClick={() => save(false)} disabled={saving} className="px-4 py-2 rounded-full border border-[hsl(30_12%_82%)] text-sm font-medium hover:bg-[hsl(36_20%_94%)]">
                {saving ? <Loader2 className="size-3.5 inline mr-1.5 animate-spin" /> : <Save className="size-3.5 inline mr-1.5" />}
                Save
              </button>
              {isLast ? (
                <button onClick={submit} disabled={submitting} className="flc-cta">
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Submit
                </button>
              ) : (
                <button onClick={next} className="flc-cta">
                  Next <ArrowRight className="size-4" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* CRS aside */}
        <aside className="space-y-3">
          {isGermany(country) ? (
            <ChancenkartePanel answers={answers} />
          ) : (
          <div className="flc-card p-5 sticky top-4 space-y-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_14%_28%)]">
              Estimated CRS — Advisory
            </div>
            <div className="flex items-baseline gap-2">
              <span className="flc-display text-5xl">{crs?.total ?? "—"}</span>
              <span className="text-xs text-[hsl(220_14%_45%)]">/ 520 target</span>
            </div>
            <div className="flc-progress">
              <div style={{ width: `${Math.min(100, ((crs?.total ?? 0) / 520) * 100)}%` }} />
            </div>
            <div className="space-y-2 pt-1 text-sm">
              <RowItem label="Age" v={crs?.sections?.core?.items?.age} />
              <RowItem label="Education" v={crs?.sections?.core?.items?.education} />
              <RowItem label="First language" v={crs?.sections?.core?.items?.first_language} />
              <RowItem label="Second language" v={crs?.sections?.core?.items?.second_language} />
              <RowItem label="Canadian experience" v={crs?.sections?.core?.items?.canadian_experience} />
              <RowItem label="Spouse" v={crs?.sections?.spouse?.total} />
              <RowItem label="Transferability" v={crs?.sections?.transferability?.total} />
              <RowItem label="Additional" v={crs?.sections?.additional?.total} />
            </div>
            <div className="text-[10px] text-[hsl(220_14%_45%)] pt-2 border-t border-[hsl(30_12%_88%)]">
              Estimate based on self-reported answers. Final CRS is confirmed by IRCC.
            </div>
          </div>
          )}
        </aside>
      </main>
    </div>
  );
}

function RowItem({ label, v }: { label: string; v: any }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[hsl(220_14%_28%)]">{label}</span>
      <span className="font-mono text-[hsl(220_18%_11%)]">{typeof v === "number" ? v : 0}</span>
    </div>
  );
}

function renderInput(q: Q, v: any, set: (v: any) => void) {
  const baseCls = "flc-input";
  if (q.q_type === "boolean") {
    return (
      <div className="flex gap-2">
        {[["yes", true], ["no", false]].map(([lbl, val]) => (
          <button key={String(lbl)} type="button"
            onClick={() => set(val)}
            className={`px-4 py-2 rounded-full border text-sm ${
              v === val ? "bg-[hsl(220_18%_11%)] text-white border-[hsl(220_18%_11%)]" : "border-[hsl(30_12%_82%)] bg-white"
            }`}>{String(lbl)[0].toUpperCase() + String(lbl).slice(1)}</button>
        ))}
      </div>
    );
  }
  if (q.q_type === "select") {
    const opts = normaliseOptions(q.options);
    return (
      <div className="flex flex-wrap gap-2">
        {opts.map((o) => (
          <button key={o.value} type="button"
            onClick={() => set(o.value)}
            className={`px-4 py-2 rounded-full border text-sm ${
              v === o.value ? "bg-[hsl(220_18%_11%)] text-white border-[hsl(220_18%_11%)]" : "border-[hsl(30_12%_82%)] bg-white"
            }`}>
            <span className="inline-flex items-center gap-2">
              <span className={`size-3 rounded-full border ${v === o.value ? "bg-white border-white" : "border-[hsl(30_12%_70%)]"}`} />
              {o.label}
            </span>
          </button>
        ))}
      </div>
    );
  }
  if (q.q_type === "multiselect") {
    const arr: string[] = Array.isArray(v) ? v : [];
    const opts = normaliseOptions(q.options);
    return (
      <div className="flex flex-wrap gap-2">
        {opts.map((o) => {
          const on = arr.includes(o.value);
          return (
            <button key={o.value} type="button"
              onClick={() => set(on ? arr.filter((x) => x !== o.value) : [...arr, o.value])}
              className={`px-3 py-1.5 rounded-full border text-sm ${
                on ? "bg-[hsl(220_18%_11%)] text-white border-[hsl(220_18%_11%)]" : "border-[hsl(30_12%_82%)] bg-white"
              }`}>{o.label}</button>
          );
        })}
      </div>
    );
  }
  if (q.q_type === "number") {
    return <input type="number" className={baseCls} value={v ?? ""} onChange={(e) => set(e.target.value === "" ? null : Number(e.target.value))} />;
  }
  if (q.q_type === "date") {
    return <input type="date" className={baseCls} value={v ?? ""} onChange={(e) => set(e.target.value || null)} />;
  }
  if (q.q_type === "country") {
    return <CountryPicker value={v} onChange={(name) => set(name)} />;
  }
  return <input className={baseCls} value={v ?? ""} onChange={(e) => set(e.target.value)} />;
}

// Normalise legacy `string[]` options to `{value,label}[]` with a defensive prettifier
// so even un-migrated rows render with a readable label.
function normaliseOptions(opts: any): { value: string; label: string }[] {
  if (!Array.isArray(opts)) return [];
  return opts.map((o) => {
    if (o && typeof o === "object" && "value" in o) {
      return { value: String(o.value), label: String(o.label ?? prettify(String(o.value))) };
    }
    const s = String(o);
    return { value: s, label: prettify(s) };
  });
}

function prettify(s: string): string {
  if (/^[A-C][1-2]$/.test(s)) return s; // CEFR codes stay uppercase
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}