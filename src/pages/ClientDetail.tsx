import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download, FileText, FileCheck2, Eye, Trash2, Loader2, AlertCircle, Link2, Sparkles } from "lucide-react";
import { UploadZone } from "@/components/documents/UploadZone";
import { useAuth } from "@/contexts/AuthContext";
import { generateBinder } from "@/lib/binder";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";
import type { Template, TemplateItem } from "@/pages/Templates";
import { ShareLinkDialog } from "@/components/documents/ShareLinkDialog";

interface Client {
  id: string; full_name: string; application_id: string; country: string;
  application_type: string; template_id: string | null; status: string;
}

interface Doc {
  id: string; client_id: string; document_type: string; custom_type: string | null;
  file_name: string; storage_path: string; mime_type: string | null;
  size_bytes: number | null; version: number; uploaded_at: string;
}

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { canUpload, isAdmin } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [generating, setGenerating] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ type: "document" | "binder"; id: string; label: string } | null>(null);
  const [optimizing, setOptimizing] = useState<string | null>(null);
  const [binders, setBinders] = useState<{ id: string; file_name: string; storage_path: string; generated_at: string }[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    const { data: c } = await supabase.from("clients").select("*").eq("id", id).single();
    setClient(c as Client | null);
    if (c?.template_id) {
      const { data: t } = await supabase.from("workflow_templates").select("*").eq("id", c.template_id).single();
      setTemplate(t as unknown as Template | null);
    } else { setTemplate(null); }
    const { data: d } = await supabase.from("client_documents").select("*").eq("client_id", id).order("uploaded_at", { ascending: false });
    setDocs((d ?? []) as Doc[]);
    const { data: b } = await supabase.from("binders").select("id,file_name,storage_path,generated_at").eq("client_id", id).order("generated_at", { ascending: false });
    setBinders((b ?? []) as typeof binders);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const docByType = (typeName: string): Doc | undefined => {
    const matches = docs.filter((d) => (d.document_type === "Other" ? d.custom_type : d.document_type) === typeName);
    return matches.sort((a, b) => b.version - a.version)[0];
  };

  const checklistItems: TemplateItem[] = template?.items ?? [];
  const completed = checklistItems.filter((it) => docByType(it.name)).length;
  const requiredMissing = checklistItems.filter((it) => it.mandatory && !docByType(it.name));

  const onDelete = async (d: Doc) => {
    if (!confirm(`Delete ${d.file_name}?`)) return;
    await supabase.storage.from("client-documents").remove([d.storage_path]);
    await supabase.from("client_documents").delete().eq("id", d.id);
    await logActivity("document.deleted", "document", d.id, { file_name: d.file_name });
    load();
  };

  const onView = async (d: Doc) => {
    const { data, error } = await supabase.storage.from("client-documents").createSignedUrl(d.storage_path, 60 * 5);
    if (error || !data) { toast.error("Failed to open"); return; }
    window.open(data.signedUrl, "_blank");
    await logActivity("document.viewed", "document", d.id);
  };

  const onDownload = async (d: Doc) => {
    const { data, error } = await supabase.storage.from("client-documents").download(d.storage_path);
    if (error || !data) { toast.error("Failed to download"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a"); a.href = url; a.download = d.file_name; a.click();
    URL.revokeObjectURL(url);
    await logActivity("document.downloaded", "document", d.id);
  };

  const onOptimize = async (d: Doc) => {
    setOptimizing(d.id);
    try {
      const { data, error } = await supabase.functions.invoke("process-large-file", {
        body: { document_id: d.id },
      });
      if (error) throw error;
      const saved = (data?.saved as number) ?? 0;
      if (saved > 0) toast.success(`Optimized · saved ${(saved / 1024).toFixed(0)} KB`);
      else toast.info("Already optimized");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Optimization failed");
    } finally {
      setOptimizing(null);
    }
  };

  const onGenerateBinder = async () => {
    if (!client) return;
    if (!template) { toast.error("Assign a workflow template first"); return; }
    setGenerating(true);
    try {
      const bytes = await generateBinder({
        clientName: client.full_name,
        applicationId: client.application_id,
        country: client.country,
        applicationType: client.application_type,
        templateName: template.name,
        items: template.items,
        documents: docs,
      });
      const cleanName = client.full_name.replace(/[^a-zA-Z0-9]/g, "");
      const fileName = `FinalBinder_${cleanName}_${client.country.replace(/\s+/g,"")}.pdf`;
      const path = `${client.id}/binders/${Date.now()}_${fileName}`;
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      const { error: upErr } = await supabase.storage.from("client-documents").upload(path, blob, { contentType: "application/pdf" });
      if (upErr) throw upErr;
      await supabase.from("binders").insert({
        client_id: client.id, file_name: fileName, storage_path: path, size_bytes: blob.size,
      });
      await logActivity("binder.generated", "client", client.id, { file_name: fileName });
      // trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      toast.success("Binder generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate binder");
    } finally { setGenerating(false); }
  };

  if (!client) return <AppLayout><div className="p-12 text-center text-muted-foreground">Loading…</div></AppLayout>;

  return (
    <AppLayout>
      <PageHeader
        title={client.full_name}
        description={`${client.application_id} · ${client.country} · ${client.application_type}`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/clients"><ChevronLeft className="size-4" />All clients</Link></Button>
            {canUpload && (
              <Button onClick={onGenerateBinder} disabled={generating || !template} className="gradient-accent text-white">
                {generating ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <FileCheck2 className="size-4 mr-1.5" />}
                Generate binder
              </Button>
            )}
          </div>
        }
      />

      <div className="p-8 grid lg:grid-cols-3 gap-6">
        {/* Left: checklist */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden shadow-elev-sm">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <div className="font-semibold">Document checklist</div>
                <div className="text-xs text-muted-foreground">
                  {template ? `${template.name} · ${completed}/${checklistItems.length} ready` : "No template assigned"}
                </div>
              </div>
              {requiredMissing.length > 0 && (
                <div className="text-xs text-secondary flex items-center gap-1.5 font-medium">
                  <AlertCircle className="size-3.5" /> {requiredMissing.length} required missing
                </div>
              )}
            </div>
            {!template && (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                No workflow template assigned. Edit this client to assign one, or create templates first.
              </div>
            )}
            <div className="divide-y">
              {checklistItems.map((it, i) => {
                const d = docByType(it.name);
                return (
                  <div key={it.id} className="px-6 py-3.5 flex items-center gap-4">
                    <div className="text-xs font-mono tabular-nums text-muted-foreground w-6">{String(i+1).padStart(2,"0")}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        {it.name}
                        {it.mandatory && <span className="text-secondary text-[10px]">REQUIRED</span>}
                      </div>
                      {it.notes && <div className="text-xs text-muted-foreground">{it.notes}</div>}
                      {d && <div className="text-xs text-muted-foreground mt-0.5">{d.file_name}{d.version>1?` · v${d.version}`:""}</div>}
                    </div>
                    {d ? (
                      <span className="text-xs px-2 py-1 rounded bg-success/10 text-success font-semibold uppercase tracking-wide">Ready</span>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded font-semibold uppercase tracking-wide ${it.mandatory ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>
                        {it.mandatory ? "Pending" : "Optional"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* All documents (incl. ad-hoc) */}
          <Card className="overflow-hidden shadow-elev-sm">
            <div className="px-6 py-4 border-b">
              <div className="font-semibold">All uploaded documents</div>
              <div className="text-xs text-muted-foreground">{docs.length} file{docs.length===1?"":"s"} · auto-renamed and PDF-converted</div>
            </div>
            <div className="divide-y">
              {docs.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">No documents uploaded yet.</div>
              )}
              {docs.map((d) => (
                <div key={d.id} className="px-6 py-3 flex items-center gap-3">
                  <FileText className="size-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.file_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.custom_type ?? d.document_type} · {d.size_bytes ? `${(d.size_bytes/1024).toFixed(0)} KB` : ""}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => onView(d)}><Eye className="size-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => onDownload(d)}><Download className="size-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="size-7" title="Create share link"
                    onClick={() => setShareTarget({ type: "document", id: d.id, label: d.file_name })}>
                    <Link2 className="size-3.5" />
                  </Button>
                  {(d.size_bytes ?? 0) > 1.5 * 1024 * 1024 && (
                    <Button size="icon" variant="ghost" className="size-7" title="Optimize on server"
                      onClick={() => onOptimize(d)} disabled={optimizing === d.id}>
                      {optimizing === d.id ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                    </Button>
                  )}
                  {isAdmin && (
                    <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => onDelete(d)}><Trash2 className="size-3.5" /></Button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {binders.length > 0 && (
            <Card className="overflow-hidden shadow-elev-sm">
              <div className="px-6 py-4 border-b">
                <div className="font-semibold">Generated binders</div>
                <div className="text-xs text-muted-foreground">{binders.length} binder{binders.length === 1 ? "" : "s"}</div>
              </div>
              <div className="divide-y">
                {binders.map((b) => (
                  <div key={b.id} className="px-6 py-3 flex items-center gap-3">
                    <FileCheck2 className="size-4 text-secondary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{b.file_name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(b.generated_at).toLocaleString()}</div>
                    </div>
                    <Button size="icon" variant="ghost" className="size-7" title="Create share link"
                      onClick={() => setShareTarget({ type: "binder", id: b.id, label: b.file_name })}>
                      <Link2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right: upload */}
        <div className="space-y-4">
          {canUpload ? (
            <UploadZone client={client} onUploaded={load} />
          ) : (
            <Card className="p-6 text-center text-sm text-muted-foreground">Read-only access.</Card>
          )}
        </div>
      </div>
      <ShareLinkDialog open={!!shareTarget} onOpenChange={(o) => !o && setShareTarget(null)} target={shareTarget} />
    </AppLayout>
  );
};

export default ClientDetail;