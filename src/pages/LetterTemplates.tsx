import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { LETTER_KINDS, type LetterKind } from "@/lib/letterKinds";
import { logActivity } from "@/lib/activity";

interface TemplateRow {
  id: string;
  kind: LetterKind;
  version: number;
  file_path: string | null;
  style_text: string;
  is_active: boolean;
  created_at: string;
}

const LetterTemplatesPage = () => {
  const { isAdmin, loading } = useAuth();
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [busyKind, setBusyKind] = useState<LetterKind | null>(null);
  const [editingStyle, setEditingStyle] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase
      .from("letter_templates")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as TemplateRow[]);
  };
  useEffect(() => { load(); }, []);

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const activeFor = (kind: LetterKind) => rows.find((r) => r.kind === kind && r.is_active);

  const onUpload = async (kind: LetterKind, file: File) => {
    if (!file.name.toLowerCase().endsWith(".docx")) {
      toast.error("Please upload a .docx file"); return;
    }
    setBusyKind(kind);
    try {
      const path = `${kind}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("letter-templates").upload(path, file, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      if (upErr) throw upErr;

      // Parse to style_text
      const { data, error: pErr } = await supabase.functions.invoke("parse-letter-template", {
        body: { file_path: path },
      });
      if (pErr) throw pErr;
      const style_text = String(data?.style_text ?? "");
      if (!style_text) throw new Error("Could not extract any text from the .docx");

      // Deactivate previous active template of this kind
      await supabase.from("letter_templates").update({ is_active: false }).eq("kind", kind).eq("is_active", true);

      const prev = rows.filter((r) => r.kind === kind);
      const nextVersion = (prev[0]?.version ?? 0) + 1;
      const { error: insErr } = await supabase.from("letter_templates").insert({
        kind, version: nextVersion, file_path: path, style_text, is_active: true,
      } as never);
      if (insErr) throw insErr;
      await logActivity("letter_template.uploaded", "letter_template", undefined, { kind, version: nextVersion });
      toast.success(`${kind.toUpperCase()} template v${nextVersion} uploaded`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusyKind(null);
    }
  };

  const onSaveStyle = async (id: string) => {
    const text = editingStyle[id];
    if (text === undefined) return;
    const { error } = await supabase.from("letter_templates").update({ style_text: text }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Style updated");
    setEditingStyle((s) => { const c = { ...s }; delete c[id]; return c; });
    load();
  };

  return (
    <AppLayout>
      <PageHeader
        title="Letter templates"
        description="Upload sample .docx letters. The system mirrors their structure and tone when generating per-client letters."
      />
      <div className="p-8 space-y-6 max-w-5xl">
        {LETTER_KINDS.map((lk) => {
          const active = activeFor(lk.kind);
          const versions = rows.filter((r) => r.kind === lk.kind);
          const editing = active ? editingStyle[active.id] : undefined;
          return (
            <Card key={lk.kind} className="p-5 shadow-elev-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    <FileText className="size-4 text-primary" />{lk.label}
                    {active && <span className="text-[10px] uppercase font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"><Check className="size-3" />Active v{active.version}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{lk.description}</p>
                </div>
                <label className="cursor-pointer">
                  <input type="file" accept=".docx" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(lk.kind, f); e.target.value = ""; }} />
                  <span className="inline-flex items-center gap-1.5 rounded-md border bg-background hover:bg-muted px-3 py-1.5 text-sm">
                    {busyKind === lk.kind ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                    {active ? "Replace sample" : "Upload .docx sample"}
                  </span>
                </label>
              </div>

              {active ? (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Detected style ({active.style_text.length} chars). You can fine-tune the wording the AI sees as the reference. Edits don't affect previously generated letters.
                  </div>
                  <Textarea
                    value={editing ?? active.style_text}
                    onChange={(e) => setEditingStyle((s) => ({ ...s, [active.id]: e.target.value }))}
                    rows={10}
                    className="font-mono text-xs"
                  />
                  {editing !== undefined && editing !== active.style_text && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => onSaveStyle(active.id)}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingStyle((s) => { const c = { ...s }; delete c[active.id]; return c; })}>Cancel</Button>
                    </div>
                  )}
                  {versions.length > 1 && (
                    <div className="text-[11px] text-muted-foreground">{versions.length} version{versions.length===1?"":"s"} on file.</div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic">No template uploaded yet.</div>
              )}
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
};

export default LetterTemplatesPage;