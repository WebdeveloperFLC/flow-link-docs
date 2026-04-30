import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, Save, Send } from "lucide-react";
import { toast } from "sonner";

type Field = {
  key?: string; id?: string; pdf_field?: string; label: string; type?: string;
  required?: boolean; options?: string[]; placeholder?: string;
};
type Section = { key: string; label: string; fields: Field[] };

const answerKeyFor = (sectionKey: string, field: Field, index: number) => {
  const rawKey = field.key ?? field.id ?? field.pdf_field ?? `field_${index}`;
  const cleanKey = String(rawKey).trim() || `field_${index}`;
  return `${sectionKey}.${cleanKey}`;
};

const Questionnaire = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schemaName, setSchemaName] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [client, setClient] = useState<{ full_name: string; country: string; application_type: string } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("questionnaire-resolve", { body: { token } });
      if (error) throw error;
      if (data?.error) { setError(data.error); return; }
      setSchemaName(data.schema?.name ?? "Questionnaire");
      setSections(((data.schema?.sections ?? []) as Section[]).filter((s) => s.fields?.length));
      setClient(data.client ?? null);
      setAnswers((data.instance?.answers ?? {}) as Record<string, string>);
      setSubmitted(data.instance?.status === "submitted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const setVal = (k: string, v: string) => setAnswers((a) => ({ ...a, [k]: v }));

  const save = async (submit = false) => {
    if (submit) setSubmitting(true); else setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("questionnaire-save", {
        body: { token, answers, submit },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (submit) { setSubmitted(true); toast.success("Submitted — thank you!"); }
      else toast.success("Progress saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="max-w-md p-8 text-center">
        <div className="text-lg font-semibold mb-2">Link unavailable</div>
        <div className="text-sm text-muted-foreground">{error}</div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Visa application</div>
          <h1 className="text-2xl font-bold mt-1">{schemaName}</h1>
          {client && (
            <div className="text-sm text-muted-foreground mt-1">
              {client.full_name} · {client.country} · {client.application_type}
            </div>
          )}
        </div>

        {submitted ? (
          <Card className="p-8 text-center space-y-3">
            <CheckCircle2 className="size-10 text-success mx-auto" />
            <div className="text-lg font-semibold">Submitted</div>
            <div className="text-sm text-muted-foreground">Your responses have been received. The team will be in touch.</div>
          </Card>
        ) : (
          <>
            {sections.length === 0 && (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                This questionnaire has no fields yet. Please contact your counselor.
              </Card>
            )}
            {sections.map((sec) => (
              <Card key={sec.key} className="p-6 space-y-4">
                <div className="font-semibold">{sec.label}</div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {sec.fields.map((f, index) => {
                    const id = answerKeyFor(sec.key, f, index);
                    const val = answers[id] ?? "";
                    const type = (f.type ?? "text").toLowerCase();
                    return (
                      <div key={id} className={type === "textarea" ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
                        <Label htmlFor={id} className="text-xs">
                          {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
                        </Label>
                        {type === "textarea" ? (
                          <Textarea id={id} value={val} placeholder={f.placeholder}
                            onChange={(e) => setVal(id, e.target.value)} />
                        ) : type === "yes/no" || type === "yesno" || type === "boolean" ? (
                          <select id={id} value={val} onChange={(e) => setVal(id, e.target.value)}
                            className="w-full h-9 rounded-md border bg-background px-2 text-sm">
                            <option value="">—</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        ) : type === "dropdown" || type === "select" ? (
                          <select id={id} value={val} onChange={(e) => setVal(id, e.target.value)}
                            className="w-full h-9 rounded-md border bg-background px-2 text-sm">
                            <option value="">—</option>
                            {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <Input id={id}
                            type={type === "date" ? "date" : type === "number" ? "number" : "text"}
                            value={val} placeholder={f.placeholder}
                            onChange={(e) => setVal(id, e.target.value)} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}

            {sections.length > 0 && (
              <div className="flex items-center justify-end gap-2 sticky bottom-4">
                <Button variant="outline" onClick={() => save(false)} disabled={saving}>
                  {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
                  Save & continue later
                </Button>
                <Button onClick={() => save(true)} disabled={submitting} className="gradient-brand text-primary-foreground">
                  {submitting ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Send className="size-4 mr-1.5" />}
                  Submit
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Questionnaire;