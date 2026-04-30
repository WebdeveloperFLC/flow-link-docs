import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Plus, Upload, Trash2, Archive, Sparkles, Loader2, RefreshCw,
  CheckCircle2, AlertTriangle, Eye,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { COUNTRIES, APPLICATION_TYPES } from "@/lib/constants";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";

interface VisaForm {
  id: string;
  country: string;
  category: string;
  name: string;
  code: string | null;
  version: number;
  file_path: string;
  file_name: string;
  size_bytes: number | null;
  is_active: boolean;
  is_archived: boolean;
  requires_validation: boolean;
  auto_questionnaire: boolean;
  send_mode: string;
  email_template_id: string | null;
  notes: string | null;
  created_at: string;
}

interface Schema {
  id: string;
  form_id: string;
  version: number;
  is_active: boolean;
  is_draft: boolean;
  sections: Array<{ key: string; label: string; fields: unknown[] }>;
}

interface EmailTemplate { id: string; name: string; is_default: boolean }

const FormsLibrary = () => {
  const { isAdmin } = useAuth();
  const [forms, setForms] = useState<VisaForm[]>([]);
  const [schemasByForm, setSchemasByForm] = useState<Record<string, Schema[]>>({});
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [parsing, setParsing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: f }, { data: s }, { data: t }] = await Promise.all([
      supabase.from("visa_forms").select("*").order("country").order("category").order("name"),
      supabase.from("questionnaire_schemas").select("id, form_id, version, is_active, is_draft, sections"),
      supabase.from("questionnaire_email_templates").select("id, name, is_default"),
    ]);
    setForms((f ?? []) as VisaForm[]);
    const map: Record<string, Schema[]> = {};
    for (const sc of (s ?? []) as Schema[]) {
      if (!sc.form_id) continue;
      (map[sc.form_id] ??= []).push(sc);
    }
    setSchemasByForm(map);
    setEmailTemplates((t ?? []) as EmailTemplate[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = forms.filter((f) => showArchived || !f.is_archived);
  const grouped = visible.reduce<Record<string, Record<string, VisaForm[]>>>((acc, f) => {
    (acc[f.country] ??= {});
    (acc[f.country][f.category] ??= []).push(f);
    return acc;
  }, {});

  const toggleField = async (id: string, field: keyof VisaForm, value: boolean | string) => {
    const { error } = await supabase.from("visa_forms").update({ [field]: value } as never).eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  const archiveForm = async (f: VisaForm) => {
    if (!confirm(`Archive "${f.name}"? Existing cases keep working; new cases won't see it.`)) return;
    const { error } = await supabase.from("visa_forms")
      .update({ is_archived: true, is_active: false } as never).eq("id", f.id);
    if (error) toast.error(error.message);
    else { toast.success("Form archived"); await logActivity("form.archived","visa_form",f.id,{name:f.name}); load(); }
  };

  const restoreForm = async (f: VisaForm) => {
    const { error } = await supabase.from("visa_forms")
      .update({ is_archived: false, is_active: true } as never).eq("id", f.id);
    if (error) toast.error(error.message);
    else { toast.success("Form restored"); load(); }
  };

  const deleteForm = async (f: VisaForm) => {
    if (!confirm(`Permanently delete "${f.name}"? This cannot be undone.`)) return;
    await supabase.storage.from("visa-forms").remove([f.file_path]);
    const { error } = await supabase.from("visa_forms").delete().eq("id", f.id);
    if (error) toast.error(error.message);
    else { toast.success("Form deleted"); load(); }
  };

  const generateSchema = async (f: VisaForm) => {
    setParsing(f.id);
    try {
      const { data, error } = await supabase.functions.invoke("parse-form-fields", {
        body: { form_id: f.id },
      });
      if (error) throw error;
      if ((data as { error?: string }).error) throw new Error((data as { error: string }).error);
      const detected = (data as { acro_fields_detected: number }).acro_fields_detected;
      toast.success(`Questionnaire generated · ${detected} field${detected===1?"":"s"} detected`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to parse form");
    } finally {
      setParsing(null);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Forms Library"
        description="Upload visa form PDFs by country and category. Each form generates an editable questionnaire."
        actions={isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? "Hide archived" : "Show archived"}
            </Button>
            <Button onClick={() => setUploadOpen(true)} className="gradient-brand text-primary-foreground">
              <Plus className="size-4 mr-1.5" /> Add form
            </Button>
          </div>
        )}
      />

      <div className="p-8 space-y-8">
        {loading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="size-10 mx-auto text-muted-foreground mb-3" />
            <div className="font-medium">No visa forms uploaded yet</div>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? "Click \"Add form\" to upload your first visa form PDF." : "Ask an admin to upload visa forms."}
            </p>
          </Card>
        ) : (
          Object.entries(grouped).map(([country, byCat]) => (
            <div key={country}>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">{country}</div>
              <div className="space-y-5">
                {Object.entries(byCat).map(([cat, list]) => (
                  <div key={cat}>
                    <div className="text-sm font-semibold mb-2">{cat}</div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {list.map((f) => {
                        const schemas = schemasByForm[f.id] ?? [];
                        const activeSchema = schemas.find((s) => s.is_active);
                        const latestSchema = schemas.sort((a, b) => b.version - a.version)[0];
                        return (
                          <Card key={f.id} className={`p-4 shadow-elev-sm space-y-3 ${f.is_archived ? "opacity-60" : ""}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-semibold truncate flex items-center gap-2">
                                  {f.name}
                                  {f.is_archived && <Badge variant="outline" className="text-[10px]">Archived</Badge>}
                                </div>
                                {f.code && <div className="text-xs text-muted-foreground">{f.code} · v{f.version}</div>}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                              <a
                                href="#"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  const { data } = await supabase.storage.from("visa-forms")
                                    .createSignedUrl(f.file_path, 60);
                                  if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                                }}
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                <Eye className="size-3" /> Preview PDF
                              </a>
                            </div>

                            {isAdmin && (
                              <div className="space-y-2 text-xs border-t pt-3">
                                <div className="flex items-center justify-between">
                                  <span>Active</span>
                                  <Switch checked={f.is_active} disabled={f.is_archived}
                                    onCheckedChange={(v) => toggleField(f.id, "is_active", v)} />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Requires validation</span>
                                  <Switch checked={f.requires_validation}
                                    onCheckedChange={(v) => toggleField(f.id, "requires_validation", v)} />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Auto-questionnaire</span>
                                  <Switch checked={f.auto_questionnaire}
                                    onCheckedChange={(v) => toggleField(f.id, "auto_questionnaire", v)} />
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span>Email send mode</span>
                                  <Select value={f.send_mode}
                                    onValueChange={(v) => toggleField(f.id, "send_mode", v)}>
                                    <SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="manual">Manual</SelectItem>
                                      <SelectItem value="auto">Auto-send</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span>Email template</span>
                                  <Select value={f.email_template_id ?? "__default"}
                                    onValueChange={(v) => toggleField(f.id, "email_template_id", v === "__default" ? null as unknown as string : v)}>
                                    <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue placeholder="Default" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__default">Default</SelectItem>
                                      {emailTemplates.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}

                            <div className="border-t pt-3">
                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                Questionnaire
                              </div>
                              {latestSchema ? (
                                <div className="text-xs space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    {activeSchema ? (
                                      <CheckCircle2 className="size-3.5 text-success" />
                                    ) : (
                                      <AlertTriangle className="size-3.5 text-warning" />
                                    )}
                                    <span>
                                      {activeSchema ? "Active" : "Draft"} · v{latestSchema.version} ·{" "}
                                      {latestSchema.sections.reduce((n, s) => n + (s.fields?.length ?? 0), 0)} fields
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground italic">Not generated yet</div>
                              )}
                              {isAdmin && !f.is_archived && (
                                <div className="flex gap-1.5 mt-2">
                                  <Button size="sm" variant="outline" className="h-7 text-xs"
                                    onClick={() => generateSchema(f)} disabled={parsing === f.id}>
                                    {parsing === f.id ? (
                                      <Loader2 className="size-3 mr-1 animate-spin" />
                                    ) : (
                                      <Sparkles className="size-3 mr-1" />
                                    )}
                                    {latestSchema ? "Re-generate" : "Generate"}
                                  </Button>
                                </div>
                              )}
                            </div>

                            {isAdmin && (
                              <div className="border-t pt-3 flex gap-1.5">
                                {f.is_archived ? (
                                  <>
                                    <Button size="sm" variant="outline" className="h-7 text-xs flex-1"
                                      onClick={() => restoreForm(f)}>
                                      <RefreshCw className="size-3 mr-1" /> Restore
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs"
                                      onClick={() => deleteForm(f)}>
                                      <Trash2 className="size-3 text-destructive" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button size="sm" variant="ghost" className="h-7 text-xs flex-1"
                                    onClick={() => archiveForm(f)}>
                                    <Archive className="size-3 mr-1" /> Archive
                                  </Button>
                                )}
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {uploadOpen && (
        <UploadFormDialog open={uploadOpen} onOpenChange={setUploadOpen} onSaved={load} />
      )}
    </AppLayout>
  );
};

// ----- Upload dialog -----
function UploadFormDialog({
  open, onOpenChange, onSaved,
}: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [country, setCountry] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [requiresValidation, setRequiresValidation] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!country || !category || !name || !file) {
      toast.error("All fields and a PDF are required"); return;
    }
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are supported"); return;
    }
    setBusy(true);
    try {
      const path = `${country}/${category}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("visa-forms")
        .upload(path, file, { contentType: "application/pdf" });
      if (upErr) throw upErr;

      const { data: ins, error: insErr } = await supabase.from("visa_forms").insert({
        country, category, name, code: code || null,
        file_path: path, file_name: file.name, size_bytes: file.size,
        requires_validation: requiresValidation,
      }).select().single();
      if (insErr) throw insErr;

      await logActivity("form.uploaded", "visa_form", ins.id, { name, country, category });
      toast.success("Form uploaded · generating questionnaire…");

      // Auto-generate questionnaire
      try {
        await supabase.functions.invoke("parse-form-fields", { body: { form_id: ins.id } });
      } catch (e) {
        console.warn("auto-parse failed", e);
      }

      onSaved();
      onOpenChange(false);
      setCountry(""); setCategory(""); setName(""); setCode(""); setFile(null);
      setRequiresValidation(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload visa form</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {APPLICATION_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Form name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Application for Study Permit" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Form code (optional)</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. IMM5645" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">PDF file</Label>
            <Input type="file" accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex items-center justify-between text-sm pt-1">
            <Label className="text-xs">This form requires validation</Label>
            <Switch checked={requiresValidation} onCheckedChange={setRequiresValidation} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="gradient-brand text-primary-foreground">
            {busy ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Upload className="size-3.5 mr-1.5" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FormsLibrary;