import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { fetchEligibilityQuestions, prefillEligibilityFromClient } from "@/lib/service-eligibility/questions";
import {
  evaluateEligibility,
  questionVisible,
} from "@/lib/service-eligibility/evaluate";
import {
  OUTCOME_LABELS,
  type EligibilityQuestion,
  type PendingItem,
} from "@/lib/service-eligibility/types";
import { cn } from "@/lib/utils";
import { savePublicEligibilitySession } from "@/lib/service-eligibility/sessions";
import {
  buildServiceLibraryUrl,
  buildServiceCode,
  appendServiceLibraryClientContext,
} from "@/lib/service-library/serviceCodes";
import { ServiceLibraryContextActions } from "@/components/service-library/ServiceLibraryContextActions";

type SessionRow = {
  id: string;
  library_id: string | null;
  client_id: string | null;
  answers: Record<string, unknown>;
  status: string;
  prospect_notes: string | null;
  pending_items: PendingItem[] | null;
  output: Record<string, unknown> | null;
  public_token: string | null;
  country: string;
};

function QuestionInput({
  q,
  value,
  onChange,
}: {
  q: EligibilityQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (q.q_type === "yes_no" || q.q_type === "yes_no_na") {
    const opts =
      q.q_type === "yes_no_na"
        ? [
            { v: true, l: "Yes" },
            { v: false, l: "No" },
            { v: "na", l: "N/A" },
          ]
        : [
            { v: true, l: "Yes" },
            { v: false, l: "No" },
          ];
    return (
      <div className="flex flex-wrap gap-2">
        {opts.map((o) => (
          <Button
            key={String(o.v)}
            type="button"
            size="sm"
            variant={value === o.v ? "default" : "outline"}
            onClick={() => onChange(o.v)}
          >
            {o.l}
          </Button>
        ))}
      </div>
    );
  }
  if (q.q_type === "select" && q.options?.length) {
    return (
      <Select value={String(value ?? "")} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {q.options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (q.q_type === "date") {
    return (
      <Input
        type="date"
        value={value ? String(value).slice(0, 10) : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <Input value={value != null ? String(value) : ""} onChange={(e) => onChange(e.target.value)} />
  );
}

export default function ServiceEligibilityRun() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isPublic = searchParams.get("public") === "1";

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [questions, setQuestions] = useState<EligibilityQuestion[]>([]);
  const [serviceTitle, setServiceTitle] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [step, setStep] = useState(0);
  const [notes, setNotes] = useState("");
  const [pendingNote, setPendingNote] = useState("");
  const [pendingExpectedBy, setPendingExpectedBy] = useState("");
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    const { data: ses, error } = await supabase
      .from("assessment_sessions")
      .select(
        "id, library_id, client_id, answers, status, prospect_notes, pending_items, output, public_token, country",
      )
      .eq("id", sessionId)
      .maybeSingle();
    if (error || !ses) {
      toast.error("Session not found");
      setLoading(false);
      return;
    }
    const row = ses as unknown as SessionRow;
    setSession(row);
    setAnswers((row.answers ?? {}) as Record<string, unknown>);
    setNotes(row.prospect_notes ?? "");
    setPendingItems((row.pending_items as PendingItem[]) ?? []);
    if (row.status === "submitted") setSubmitted(true);

    if (row.library_id) {
      const [qs, { data: lib }] = await Promise.all([
        fetchEligibilityQuestions(row.library_id),
        supabase.from("service_library").select("sub_service, service").eq("id", row.library_id).maybeSingle(),
      ]);
      setQuestions(qs);
      setServiceTitle(lib ? `${lib.service} – ${lib.sub_service}` : "Eligibility Assessment");

      if (
        row.client_id &&
        Object.keys(row.answers ?? {}).length === 0 &&
        row.status === "draft"
      ) {
        const pre = await prefillEligibilityFromClient(row.client_id, qs);
        if (Object.keys(pre).length) {
          setAnswers(pre);
        }
      }
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleQuestions = useMemo(
    () => questions.filter((q) => questionVisible(q, answers)),
    [questions, answers],
  );

  const sections = useMemo(() => {
    const map = new Map<string, EligibilityQuestion[]>();
    for (const q of visibleQuestions) {
      (map.get(q.section) ?? map.set(q.section, []).get(q.section)!)!.push(q);
    }
    return [...map.entries()];
  }, [visibleQuestions]);

  const onNotesStep = sections.length > 0 && step >= sections.length;
  const noQuestionsConfigured = questions.length === 0;
  const evaluation = useMemo(
    () => evaluateEligibility(questions, answers, notes, pendingItems),
    [questions, answers, notes, pendingItems],
  );

  const save = async (submit = false) => {
    if (!session) return;
    setBusy(true);
    try {
      const output = evaluation;
      if (isPublic && session.public_token) {
        await savePublicEligibilitySession({
          publicToken: session.public_token,
          answers,
          prospectNotes: notes,
          pendingItems,
          output,
          submit,
        });
      } else {
        const { error } = await supabase
          .from("assessment_sessions")
          .update({
            answers: answers as never,
            prospect_notes: notes,
            pending_items: pendingItems as never,
            output: output as never,
            status: submit ? "submitted" : "in_progress",
            submitted_at: submit ? new Date().toISOString() : null,
          })
          .eq("id", session.id);
        if (error) throw error;
      }
      if (submit) {
        setSubmitted(true);
        toast.success("Eligibility assessment submitted");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const addPendingItem = () => {
    if (!pendingNote.trim()) return;
    setPendingItems((p) => [
      ...p,
      {
        code: `pending_${Date.now()}`,
        label: pendingNote.trim(),
        expected_by: pendingExpectedBy || undefined,
        status: "preparing",
      },
    ]);
    setPendingNote("");
    setPendingExpectedBy("");
  };

  if (!isPublic && !authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return <div className="p-8 text-center text-muted-foreground">Session not found.</div>;
  }

  const content = (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {!isPublic && session.library_id && (
        <ServiceLibraryContextActions
          libraryId={session.library_id}
          country={session.country}
          clientId={session.client_id ?? undefined}
          showEligibility={false}
        />
      )}
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Eligibility Assessment</p>
        <h1 className="text-2xl font-bold">{serviceTitle}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Answer each criterion honestly. Add notes for items you are still preparing.
        </p>
      </div>

      {submitted ? (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <CheckCircle2 className="size-5 text-success" />
            {OUTCOME_LABELS[evaluation.outcome]}
          </div>
          <p className="text-sm text-muted-foreground">{evaluation.summary}</p>
          {evaluation.blockers.length > 0 && (
            <div>
              <p className="text-sm font-medium text-destructive">Blockers</p>
              <ul className="text-sm list-disc pl-5">
                {evaluation.blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          {evaluation.warnings.length > 0 && (
            <div>
              <p className="text-sm font-medium flex items-center gap-1">
                <AlertTriangle className="size-4" /> Warnings
              </p>
              <ul className="text-sm list-disc pl-5">
                {evaluation.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {!isPublic && (
            <div className="flex flex-wrap gap-2 pt-2">
              {session.library_id && (
                <Button variant="outline" asChild>
                  <Link
                    to={buildServiceLibraryUrl({
                      libraryId: session.library_id,
                      country: session.country,
                      tab: "eligibility",
                    })}
                  >
                    <ChevronLeft className="size-4 mr-1" />
                    Service Library
                  </Link>
                </Button>
              )}
              {session.client_id && session.library_id && (
                <Button
                  onClick={() => {
                    const p = appendServiceLibraryClientContext(new URLSearchParams(), {
                      libraryId: session.library_id!,
                      country: session.country,
                    });
                    p.set("service", buildServiceCode(session.library_id!, session.country));
                    navigate(`/clients/${session.client_id}?${p.toString()}`);
                  }}
                >
                  Open client
                </Button>
              )}
            </div>
          )}
        </Card>
      ) : noQuestionsConfigured ? (
        <Card className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold">No eligibility questions yet</h2>
              <p className="text-sm text-muted-foreground mt-1">
                This service does not have interactive eligibility questions configured. An administrator can add them
                in the database, or use the reference criteria on the Service Library eligibility tab.
              </p>
            </div>
          </div>
          {!isPublic && session.library_id && (
            <Button variant="outline" asChild>
              <Link to={buildServiceLibraryUrl({ libraryId: session.library_id, country: session.country, tab: "eligibility" })}>
                <ChevronLeft className="size-4 mr-1" />
                Back to Service Library
              </Link>
            </Button>
          )}
        </Card>
      ) : onNotesStep ? (
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Notes & items in preparation</h2>
          <p className="text-sm text-muted-foreground">
            e.g. IELTS score sheet in preparation — exam booked, will submit within 2 weeks.
          </p>
          <div className="space-y-2">
            <Label>Additional notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
          </div>
          <div className="space-y-2 border-t pt-4">
            <Label>Add pending item</Label>
            <Input
              placeholder="What are you still preparing?"
              value={pendingNote}
              onChange={(e) => setPendingNote(e.target.value)}
            />
            <Input
              type="date"
              value={pendingExpectedBy}
              onChange={(e) => setPendingExpectedBy(e.target.value)}
            />
            <Button type="button" variant="outline" size="sm" onClick={addPendingItem}>
              Add item
            </Button>
            {pendingItems.length > 0 && (
              <ul className="text-sm space-y-1">
                {pendingItems.map((p) => (
                  <li key={p.code} className="text-muted-foreground">
                    {p.label}
                    {p.expected_by ? ` · by ${p.expected_by}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg border p-4 bg-muted/30">
            <p className="text-sm font-medium">Preview outcome</p>
            <p className={cn("text-sm mt-1", evaluation.outcome === "not_yet" && "text-destructive")}>
              {OUTCOME_LABELS[evaluation.outcome]}
            </p>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(Math.max(0, sections.length - 1))}>
              <ChevronLeft className="size-4 mr-1" /> Back
            </Button>
            <Button onClick={() => save(true)} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Submit assessment"}
            </Button>
          </div>
        </Card>
      ) : (
        sections[step] && (
          <Card className="p-6 space-y-5">
            <p className="text-xs uppercase text-muted-foreground">
              Section {step + 1} of {sections.length} · {sections[step][0]}
            </p>
            {sections[step][1].map((q) => (
              <div key={q.code} className="space-y-2">
                <Label>{q.label}</Label>
                {q.help_text && <p className="text-xs text-muted-foreground">{q.help_text}</p>}
                <QuestionInput
                  q={q}
                  value={answers[q.code]}
                  onChange={(v) => setAnswers((a) => ({ ...a, [q.code]: v }))}
                />
              </div>
            ))}
            <div className="flex justify-between pt-2">
              <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="size-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => {
                  if (step >= sections.length - 1) setStep(sections.length);
                  else setStep((s) => s + 1);
                }}
              >
                Next <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </Card>
        )
      )}
    </div>
  );

  if (isPublic) return <div className="min-h-screen bg-background">{content}</div>;
  return <AppLayout>{content}</AppLayout>;
}
