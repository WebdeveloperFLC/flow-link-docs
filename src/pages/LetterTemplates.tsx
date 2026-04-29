import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Loader2, Check, Trash2, Globe } from "lucide-react";
import { toast } from "sonner";
import { LETTER_KINDS, type LetterKind } from "@/lib/letterKinds";
import { logActivity } from "@/lib/activity";
import { useMasterLabels } from "@/lib/masters";

interface TemplateRow {
  id: string;
  kind: LetterKind;
  version: number;
  file_path: string | null;
  style_text: string;
  is_active: boolean;
  created_at: string;
  country: string | null;
  category: string | null;
}

const LetterTemplatesPage = () => {
  const { isAdmin, loading } = useAuth();
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editingStyle, setEditingStyle] = useState<Record<string, string>>({});
  const COUNTRIES = useMasterLabels("countries");
  const APPLICATION_TYPES = useMasterLabels("application_types");
  // pending "Add variant" pickers per kind
  const [pendingScope, setPendingScope] = useState<Record<LetterKind, { country: string; category: string }>>({
    cover: { country: "", category: "" },
    rcic: { country: "", category: "" },
    statdec: { country: "", category: "" },
  });

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

  const activeFor = (kind: LetterKind, country: string | null, category: string | null) =>
    rows.find((r) => r.kind === kind && r.is_active && (r.country ?? null) === country && (r.category ?? null) === category);
  const variantsFor = (kind: LetterKind) =>
    rows.filter((r) => r.kind === kind && r.is_active && (r.country !== null || r.category !== null))
        .sort((a, b) => (a.country ?? "").localeCompare(b.country ?? "") || (a.category ?? "").localeCompare(b.category ?? ""));

  const scopeKey = (kind: LetterKind, country: string | null, category: string | null) =>
    `${kind}|${country ?? ""}|${category ?? ""}`;

  const onUpload = async (kind: LetterKind, country: string | null, category: string | null, file: File) => {
    if (!file.name.toLowerCase().endsWith(".docx")) {
      toast.error("Please upload a .docx file"); return;
    }
    const bk = scopeKey(kind, country, category);
    setBusyKey(bk);
    try {
      const safe = (s: string | null) => (s ? s.replace(/[^a-zA-Z0-9]+/g, "_") : "_any");
      const path = `${kind}/${safe(country)}/${safe(category)}/${Date.now()}_${file.name}`;
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

      // Deactivate previous active template for this exact (kind, country, category)
      let deact = supabase.from("letter_templates").update({ is_active: false }).eq("kind", kind).eq("is_active", true);
      deact = country === null ? deact.is("country", null) : deact.eq("country", country);
      deact = category === null ? deact.is("category", null) : deact.eq("category", category);
      await deact;

      const prev = rows.filter((r) => r.kind === kind && (r.country ?? null) === country && (r.category ?? null) === category);
      const nextVersion = (prev[0]?.version ?? 0) + 1;
      const { error: insErr } = await supabase.from("letter_templates").insert({
        kind, version: nextVersion, file_path: path, style_text, is_active: true,
        country, category,
      } as never);
      if (insErr) throw insErr;
      await logActivity("letter_template.uploaded", "letter_template", undefined, { kind, version: nextVersion, country, category });
      const scopeLabel = country || category ? `${country ?? "Any country"} · ${category ?? "Any category"}` : "Global default";
      toast.success(`${kind.toUpperCase()} (${scopeLabel}) v${nextVersion} uploaded`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusyKey(null);
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

  const onDeleteVariant = async (id: string) => {
    if (!confirm("Delete this variant? Generation will fall back to a less-specific template.")) return;
    const { error } = await supabase.from("letter_templates").update({ is_active: false }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Variant deleted");
    load();
  };

  const renderTemplateBody = (active: TemplateRow) => {
    const editing = editingStyle[active.id];
    return (
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Detected style ({active.style_text.length} chars). Edits don't affect previously generated letters.
        </div>
        <Textarea
          value={editing ?? active.style_text}
          onChange={(e) => setEditingStyle((s) => ({ ...s, [active.id]: e.target.value }))}
          rows={6}
          className="font-mono text-xs"
        />
        {editing !== undefined && editing !== active.style_text && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onSaveStyle(active.id)}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setEditingStyle((s) => { const c = { ...s }; delete c[active.id]; return c; })}>Cancel</Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <PageHeader
        title="Letter templates"
        description="Upload sample .docx letters per country and visa category. The generator picks the most specific template available, falling back to the global default."
      />
      <div className="p-8 space-y-6 max-w-5xl">
        {LETTER_KINDS.map((lk) => {
          const globalActive = activeFor(lk.kind, null, null);
          const variants = variantsFor(lk.kind);
          const pending = pendingScope[lk.kind];
          return (
            <Card key={lk.kind} className="p-5 shadow-elev-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    <FileText className="size-4 text-primary" />{lk.label}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{lk.description}</p>
                </div>
              </div>

              {/* Global default */}
              <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <Globe className="size-3.5 text-muted-foreground" />
                    Global default
                    {globalActive && <span className="text-[10px] uppercase font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"><Check className="size-3" />v{globalActive.version}</span>}
                    <span className="text-[11px] text-muted-foreground">Used when no country/category-specific template matches.</span>
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" accept=".docx" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(lk.kind, null, null, f); e.target.value = ""; }} />
                    <span className="inline-flex items-center gap-1.5 rounded-md border bg-background hover:bg-muted px-3 py-1.5 text-xs">
                      {busyKey === scopeKey(lk.kind, null, null) ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                      {globalActive ? "Replace" : "Upload .docx"}
                    </span>
                  </label>
                </div>
                {globalActive ? renderTemplateBody(globalActive) : <div className="text-xs text-muted-foreground italic">No global default uploaded yet.</div>}
              </div>

              {/* Scoped variants */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Scoped variants</div>
                {variants.length === 0 && <div className="text-xs text-muted-foreground italic">No country/category variants. Add one below to override the global default.</div>}
                {variants.map((v) => (
                  <div key={v.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                        <span className="rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[11px]">{v.country ?? "Any country"}</span>
                        <span className="rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[11px]">{v.category ?? "Any category"}</span>
                        <span className="text-[10px] uppercase font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"><Check className="size-3" />v{v.version}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer">
                          <input type="file" accept=".docx" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(lk.kind, v.country, v.category, f); e.target.value = ""; }} />
                          <span className="inline-flex items-center gap-1.5 rounded-md border bg-background hover:bg-muted px-2.5 py-1 text-xs">
                            {busyKey === scopeKey(lk.kind, v.country, v.category) ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                            Replace
                          </span>
                        </label>
                        <Button size="sm" variant="ghost" onClick={() => onDeleteVariant(v.id)} className="h-7 px-2 text-destructive hover:text-destructive">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    {renderTemplateBody(v)}
                  </div>
                ))}

                {/* Add variant row */}
                <div className="rounded-md border border-dashed p-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Add variant:</span>
                  <Select value={pending.country} onValueChange={(v) => setPendingScope((s) => ({ ...s, [lk.kind]: { ...s[lk.kind], country: v } }))}>
                    <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Country" /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={pending.category} onValueChange={(v) => setPendingScope((s) => ({ ...s, [lk.kind]: { ...s[lk.kind], category: v } }))}>
                    <SelectTrigger className="h-8 w-[220px] text-xs"><SelectValue placeholder="Visa category" /></SelectTrigger>
                    <SelectContent>
                      {APPLICATION_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <label className={`cursor-pointer ${(!pending.country || !pending.category) ? "opacity-50 pointer-events-none" : ""}`}>
                    <input type="file" accept=".docx" className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f && pending.country && pending.category) {
                          onUpload(lk.kind, pending.country, pending.category, f);
                          setPendingScope((s) => ({ ...s, [lk.kind]: { country: "", category: "" } }));
                        }
                        e.target.value = "";
                      }} />
                    <span className="inline-flex items-center gap-1.5 rounded-md border bg-background hover:bg-muted px-2.5 py-1 text-xs">
                      <Upload className="size-3.5" /> Upload .docx
                    </span>
                  </label>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
};

export default LetterTemplatesPage;