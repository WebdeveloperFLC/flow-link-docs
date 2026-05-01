import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Sparkles, Plus, Trash2, GripVertical, Eye, CheckCircle2,
  Upload, FileDown, ChevronRight, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useMasterItems } from "@/lib/masters";
import { logActivity } from "@/lib/activity";

type FieldType =
  | "text" | "textarea" | "date" | "number"
  | "dropdown" | "yes_no" | "multi_entry";

interface Field {
  id: string;
  pdf_field?: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  mapping_key?: string;
}
interface Section {
  key: string;
  label: string;
  fields: Field[];
}
interface VisaFormRow {
  id: string;
  name: string;
  code: string | null;
  country: string;
  category: string;
  version: number;
  file_path: string;
  source_pdf_path: string | null;
  published_pdf_path: string | null;
  published_schema_id: string | null;
  email_template_id: string | null;
  auto_questionnaire: boolean;
  requires_validation: boolean;
  is_active: boolean;
}

type ParseResponse = {
  error?: string;
  acro_fields_detected?: number;
  total_fields_detected?: number;
  source?: "acroform" | "xfa" | "text" | "ai" | "none";
};

const TYPE_LABELS: Record<FieldType, string> = {
  text: "Short text",
  textarea: "Long text",
  date: "Date",
  number: "Number",
  dropdown: "Dropdown",
  yes_no: "Yes / No",
  multi_entry: "Repeating list",
};

const STEPS = [
  { id: "upload",   label: "1. Upload" },
  { id: "build",    label: "2. Build" },
  { id: "settings", label: "3. Settings" },
  { id: "publish",  label: "4. Publish" },
] as const;
type StepId = typeof STEPS[number]["id"];

const GENERIC_DEFAULT_FIELD_IDS = new Set([
  "full_name", "date_of_birth", "gender", "nationality", "passport_number", "passport_expiry",
  "marital_status", "address_line1", "address_city", "address_country", "phone_alt", "email_alt",
  "travel_history", "highest_qualification", "institution_name", "graduation_year", "employer_name",
  "job_title", "annual_income", "bank_name", "account_balance", "family_members",
]);

const isGenericDefaultSchema = (sections: Section[] | null | undefined) => {
  const fields = (sections ?? []).flatMap((s) => s.fields ?? []);
  return fields.length === GENERIC_DEFAULT_FIELD_IDS.size && fields.every((f) => GENERIC_DEFAULT_FIELD_IDS.has(f.id));
};

const FormBuilder = () => {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<VisaFormRow | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [step, setStep] = useState<StepId>("upload");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Settings local state (mirrors form row, edited in step 3)
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [emailTemplateId, setEmailTemplateId] = useState<string>("__default");
  const [autoQ, setAutoQ] = useState(true);
  const [requiresVal, setRequiresVal] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<Array<{ id: string; name: string }>>([]);

  const countries = useMasterItems("countries");
  const categories = useMasterItems("application_types");

  const load = useCallback(async () => {
    if (!formId) return;
    setLoading(true);
    const [{ data: f }, { data: t }] = await Promise.all([
      supabase.from("visa_forms").select("*").eq("id", formId).maybeSingle(),
      supabase.from("questionnaire_email_templates").select("id, name"),
    ]);
    if (!f) { toast.error("Form not found"); navigate("/forms-library"); return; }
    const row = f as VisaFormRow;
    setForm(row);
    setCountry(row.country);
    setCategory(row.category);
    setEmailTemplateId(row.email_template_id ?? "__default");
    setAutoQ(row.auto_questionnaire);
    setRequiresVal(row.requires_validation);
    setEmailTemplates((t ?? []) as Array<{ id: string; name: string }>);

    const { data: schemas } = await supabase
      .from("questionnaire_schemas")
      .select("sections")
      .eq("form_id", formId)
      .order("version", { ascending: false })
      .limit(10);
    const schema = (schemas ?? []).find((s) => !isGenericDefaultSchema(s.sections as unknown as Section[]));
    if (schema?.sections) setSections(schema.sections as unknown as Section[]);
    else setSections([]);

    // Pick starting step based on state
    if (!schema?.sections) setStep("upload");
    else if (!row.published_pdf_path) setStep("build");
    else setStep("publish");

    setLoading(false);
  }, [formId, navigate]);

  useEffect(() => { load(); }, [load]);

  const totalFields = useMemo(
    () => sections.reduce((n, s) => n + s.fields.length, 0),
    [sections],
  );

  // ---------- Step 1: parse PDF ----------
  const runParse = async () => {
    if (!formId) return;
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-form-fields", {
        body: { form_id: formId },
      });
      if (error) throw error;
      const result = data as ParseResponse;
      await load();
      const detected = result?.total_fields_detected ?? result?.acro_fields_detected ?? 0;
      if (result?.source === "none" || detected === 0) {
        toast.info(result?.error || "No fields were detected automatically. Add sections and fields manually in step 2.");
        setStep("build");
        return;
      }
      if (result?.error) throw new Error(result.error);
      const sourceLabel =
        result?.source === "xfa" ? "XFA"
        : result?.source === "text" ? "PDF text"
        : result?.source === "ai" ? "AI-detected"
        : "AcroForm";
      toast.success(`Detected ${detected} ${sourceLabel} field(s) — review them in step 2.`);
      setStep("build");
    } catch (e) {
      toast.info("This PDF could not be auto-detected. Continue in step 2 to create the fields manually.");
      setStep("build");
    } finally {
      setParsing(false);
    }
  };

  // ---------- Step 2: edit ----------
  const updateField = (sIdx: number, fIdx: number, patch: Partial<Field>) => {
    setSections((prev) => {
      const next = prev.map((s) => ({ ...s, fields: s.fields.map((f) => ({ ...f })) }));
      next[sIdx].fields[fIdx] = { ...next[sIdx].fields[fIdx], ...patch };
      return next;
    });
  };
  const deleteField = (sIdx: number, fIdx: number) => {
    setSections((prev) => {
      const next = prev.map((s, i) => i === sIdx
        ? { ...s, fields: s.fields.filter((_, j) => j !== fIdx) }
        : s);
      return next;
    });
  };
  const moveField = (sIdx: number, fIdx: number, dir: -1 | 1) => {
    setSections((prev) => {
      const next = prev.map((s) => ({ ...s, fields: [...s.fields] }));
      const arr = next[sIdx].fields;
      const ni = fIdx + dir;
      if (ni < 0 || ni >= arr.length) return prev;
      [arr[fIdx], arr[ni]] = [arr[ni], arr[fIdx]];
      return next;
    });
  };
  const addField = (sIdx: number) => {
    setSections((prev) => {
      const next = prev.map((s) => ({ ...s, fields: [...s.fields] }));
      const id = `custom_${Date.now().toString(36)}`;
      next[sIdx].fields.push({ id, pdf_field: id, label: "New field", type: "text" });
      return next;
    });
  };
  const addSection = () => {
    const key = `section_${Date.now().toString(36)}`;
    setSections((prev) => [...prev, { key, label: "New section", fields: [] }]);
    setStep("build");
  };
  const updateSection = (sIdx: number, label: string) => {
    setSections((prev) => prev.map((s, i) => i === sIdx ? { ...s, label } : s));
  };
  const deleteSection = (sIdx: number) => {
    if (!confirm("Delete this section and all its fields?")) return;
    setSections((prev) => prev.filter((_, i) => i !== sIdx));
  };

  const saveDraft = async () => {
    if (!formId) return;
    setSaving(true);
    try {
      // Save as draft schema (don't activate)
      const { data: prev } = await supabase.from("questionnaire_schemas")
        .select("version").eq("form_id", formId).order("version", { ascending: false }).limit(1).maybeSingle();
      const v = (prev?.version ?? 0) + 1;
      const payload: Record<string, unknown> = {
        form_id: formId,
        name: `${form?.name ?? "Form"} questionnaire`,
        country: form?.country,
        category: form?.category,
        version: v,
        sections: sections as unknown,
        mappings: {},
        is_active: false,
        is_draft: true,
        generated_by_ai: false,
      };
      const { error } = await supabase.from("questionnaire_schemas").insert(payload as never);
      if (error) throw error;
      toast.success("Draft saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ---------- Step 4: publish ----------
  const publish = async () => {
    if (!formId) return;
    if (totalFields === 0) { toast.error("Add at least one field before publishing"); return; }
    setPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke("build-published-form", {
        body: {
          form_id: formId,
          sections,
          country, category,
          email_template_id: emailTemplateId === "__default" ? null : emailTemplateId,
          auto_questionnaire: autoQ,
          requires_validation: requiresVal,
        },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      await logActivity("form.published", "visa_form", formId, { fields: totalFields });
      toast.success("Form published — fillable PDF generated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const previewSourcePdf = async () => {
    if (!form) return;
    const path = form.source_pdf_path ?? form.file_path;
    const { data } = await supabase.storage.from("visa-forms").createSignedUrl(path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  };
  const previewPublishedPdf = async () => {
    if (!form?.published_pdf_path) { toast.error("Not published yet"); return; }
    const { data } = await supabase.storage.from("visa-forms").createSignedUrl(form.published_pdf_path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  };

  if (loading || !form) {
    return (
      <AppLayout>
        <div className="p-12 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading form…
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title={form.name}
        description={`${form.country} · ${form.category} · v${form.version}${form.code ? " · " + form.code : ""}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={previewSourcePdf}>
              <Eye className="size-3.5 mr-1.5" /> Source PDF
            </Button>
            {form.published_pdf_path && (
              <Button variant="outline" size="sm" onClick={previewPublishedPdf}>
                <FileDown className="size-3.5 mr-1.5" /> Published PDF
              </Button>
            )}
          </div>
        }
      />

      <div className="p-8">
        <Tabs value={step} onValueChange={(v) => setStep(v as StepId)}>
          <TabsList className="mb-6">
            {STEPS.map((s, i) => (
              <TabsTrigger key={s.id} value={s.id} className="gap-2">
                {s.label}
                {i < STEPS.length - 1 && <ChevronRight className="size-3 opacity-40" />}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ---------- Step 1 ---------- */}
          <TabsContent value="upload">
            <Card className="p-6 space-y-4 max-w-2xl">
              <div className="font-semibold text-lg">Source PDF</div>
              <p className="text-sm text-muted-foreground">
                The original visa form PDF that fields will be extracted from. This is kept as a reference;
                the published PDF generated in step 4 is what the CRM actually fills.
              </p>
              <div className="rounded-md border bg-muted/30 px-4 py-3 flex items-center gap-3">
                <Upload className="size-5 text-primary" />
                <div className="flex-1 text-sm">
                  <div className="font-medium">{form.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {(form.source_pdf_path ?? form.file_path).split("/").pop()}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={previewSourcePdf}>
                  <Eye className="size-3.5 mr-1.5" /> Open
                </Button>
              </div>
              <div className="border-t pt-4 space-y-3">
                <div className="text-sm font-medium">Detect fields automatically</div>
                <p className="text-xs text-muted-foreground">
                  Reads AcroForm fields; if the PDF is XFA (e.g. IRCC IMM forms), parses the XFA template
                  to recover field names, types, captions, and dropdown options.
                </p>
                <Button onClick={runParse} disabled={parsing}>
                  {parsing ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
                  {sections.length ? "Re-detect fields" : "Detect fields"}
                </Button>
                {sections.length > 0 && (
                  <div className="text-xs text-success flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5" />
                    {totalFields} field{totalFields === 1 ? "" : "s"} ready in step 2
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => setStep("build")} disabled={sections.length === 0}>
                  Continue <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* ---------- Step 2 ---------- */}
          <TabsContent value="build" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {totalFields} field{totalFields === 1 ? "" : "s"} across {sections.length} section{sections.length === 1 ? "" : "s"} ·
                rename, reorder, change type, or delete anything you don't want to ask the client.
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={addSection}>
                  <Plus className="size-3.5 mr-1" /> Add section
                </Button>
                <Button size="sm" variant="outline" onClick={saveDraft} disabled={saving}>
                  {saving ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : null}
                  Save draft
                </Button>
              </div>
            </div>

            {sections.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground space-y-4">
                <AlertTriangle className="size-8 mx-auto text-warning" />
                <div>No fields yet. Auto-detection can fail on protected/scanned PDFs; create the field structure manually here.</div>
                <Button size="sm" onClick={addSection}>
                  <Plus className="size-3.5 mr-1" /> Add first section
                </Button>
              </Card>
            ) : sections.map((sec, sIdx) => (
              <Card key={sec.key} className="overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-3">
                  <Input
                    value={sec.label}
                    onChange={(e) => updateSection(sIdx, e.target.value)}
                    className="h-8 max-w-md font-semibold"
                  />
                  <div className="text-xs text-muted-foreground flex-1">
                    {sec.fields.length} field{sec.fields.length === 1 ? "" : "s"}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => addField(sIdx)}>
                    <Plus className="size-3.5 mr-1" /> Add field
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteSection(sIdx)}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>

                {sec.fields.length === 0 ? (
                  <div className="px-4 py-6 text-xs text-muted-foreground italic">No fields in this section.</div>
                ) : (
                  <div className="divide-y">
                    {sec.fields.map((f, fIdx) => (
                      <div key={f.id + fIdx} className="px-4 py-2 grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-1 flex items-center gap-1">
                          <button
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                            onClick={() => moveField(sIdx, fIdx, -1)} disabled={fIdx === 0}
                            title="Move up"
                          ><GripVertical className="size-3.5 rotate-90" /></button>
                          <button
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                            onClick={() => moveField(sIdx, fIdx, 1)} disabled={fIdx === sec.fields.length - 1}
                            title="Move down"
                          ><GripVertical className="size-3.5 -rotate-90" /></button>
                        </div>
                        <div className="col-span-4">
                          <Input
                            value={f.label}
                            onChange={(e) => updateField(sIdx, fIdx, { label: e.target.value })}
                            placeholder="Label shown to client"
                            className="h-8"
                          />
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                            {f.pdf_field ?? f.id}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Select
                            value={f.type}
                            onValueChange={(v) => updateField(sIdx, fIdx, { type: v as FieldType })}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3">
                          {f.type === "dropdown" ? (
                            <Input
                              value={(f.options ?? []).join(", ")}
                              onChange={(e) => updateField(sIdx, fIdx, {
                                options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                              })}
                              placeholder="Option A, Option B…"
                              className="h-8 text-xs"
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                        <div className="col-span-1 flex items-center gap-1.5 justify-center">
                          <Switch
                            checked={Boolean(f.required)}
                            onCheckedChange={(v) => updateField(sIdx, fIdx, { required: v })}
                          />
                          <span className="text-[10px] text-muted-foreground">Req</span>
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button size="icon" variant="ghost" className="size-7"
                            onClick={() => deleteField(sIdx, fIdx)}>
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              <Button onClick={() => setStep("settings")}>
                Continue <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </TabsContent>

          {/* ---------- Step 3 ---------- */}
          <TabsContent value="settings">
            <Card className="p-6 space-y-5 max-w-2xl">
              <div>
                <Label className="text-xs">Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Visa category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Email template (used when sharing the questionnaire)</Label>
                <Select value={emailTemplateId} onValueChange={setEmailTemplateId}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default">Default</SelectItem>
                    {emailTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <div className="text-sm font-medium">Auto-create questionnaire</div>
                  <div className="text-xs text-muted-foreground">
                    When a new client matches this country + category, prepare the questionnaire automatically.
                  </div>
                </div>
                <Switch checked={autoQ} onCheckedChange={setAutoQ} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Requires counselor validation</div>
                  <div className="text-xs text-muted-foreground">
                    Submitted answers go to a counselor for review before generating filled PDFs.
                  </div>
                </div>
                <Switch checked={requiresVal} onCheckedChange={setRequiresVal} />
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep("build")}>Back</Button>
                <Button onClick={() => setStep("publish")}>
                  Continue <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* ---------- Step 4 ---------- */}
          <TabsContent value="publish">
            <Card className="p-6 space-y-4 max-w-2xl">
              <div className="font-semibold text-lg">Publish</div>
              <p className="text-sm text-muted-foreground">
                Generates a clean, fillable AcroForm PDF using the schema from step 2 and the settings from
                step 3. Marks this version as the active one. Clients will receive questionnaire links that
                fill this PDF reliably.
              </p>
              <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm space-y-1.5">
                <div><b>{totalFields}</b> field{totalFields === 1 ? "" : "s"} in <b>{sections.length}</b> section{sections.length === 1 ? "" : "s"}</div>
                <div className="text-muted-foreground text-xs">
                  {country} · {category} · auto-questionnaire {autoQ ? "on" : "off"} · validation {requiresVal ? "required" : "off"}
                </div>
              </div>
              {form.published_pdf_path && (
                <div className="text-xs text-success flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" /> Currently published. Re-publishing creates a new version.
                </div>
              )}
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep("settings")}>Back</Button>
                <Button onClick={publish} disabled={publishing} className="gradient-brand text-primary-foreground">
                  {publishing ? <Loader2 className="size-4 mr-2 animate-spin" /> : <FileDown className="size-4 mr-2" />}
                  {form.published_pdf_path ? "Re-publish" : "Publish form"}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default FormBuilder;