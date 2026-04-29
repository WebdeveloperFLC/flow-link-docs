import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { UploadCloud, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { DOCUMENT_TYPES, buildDocumentName, sanitizeName } from "@/lib/constants";
import { processToPdf } from "@/lib/processFile";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";

interface Client { id: string; full_name: string; }
interface QueueItem { name: string; size: number; status: "pending"|"processing"|"uploading"|"done"|"error"; error?: string; finalName?: string; }

export const UploadZone = ({ client, onUploaded }: { client: Client; onUploaded: () => void; }) => {
  const [docType, setDocType] = useState<string>("");
  const [customType, setCustomType] = useState<string>("");
  const [drag, setDrag] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);

  const effectiveType = docType === "Other" ? customType.trim() : docType;

  const updateItem = (i: number, patch: Partial<QueueItem>) =>
    setQueue((q) => q.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (!effectiveType) { toast.error("Select a document type first"); return; }
    const arr = Array.from(files);
    if (!arr.length) return;

    // Determine starting version for this type
    const { data: existing } = await supabase
      .from("client_documents")
      .select("version,document_type,custom_type")
      .eq("client_id", client.id);
    const sameType = (existing ?? []).filter((d) =>
      (d.document_type === "Other" ? d.custom_type : d.document_type) === effectiveType
    );
    let nextVersion = (sameType.reduce((m, d) => Math.max(m, d.version), 0) || 0) + 1;

    const initial: QueueItem[] = arr.map((f) => ({ name: f.name, size: f.size, status: "pending" }));
    setQueue(initial);
    setBusy(true);

    for (let i = 0; i < arr.length; i++) {
      const f = arr[i];
      try {
        updateItem(i, { status: "processing" });
        const baseName = buildDocumentName(effectiveType, client.full_name, nextVersion, "pdf").replace(/\.pdf$/, "");
        const processed = await processToPdf(f, baseName);
        updateItem(i, { status: "uploading", finalName: processed.name });
        const path = `${client.id}/${sanitizeName(effectiveType)}/${Date.now()}_${processed.name}`;
        const { error: upErr } = await supabase.storage.from("client-documents").upload(path, processed, { contentType: "application/pdf" });
        if (upErr) throw upErr;
        const { data: ins, error: insErr } = await supabase.from("client_documents").insert({
          client_id: client.id,
          document_type: docType,
          custom_type: docType === "Other" ? customType.trim() : null,
          file_name: processed.name,
          storage_path: path,
          mime_type: "application/pdf",
          size_bytes: processed.size,
          version: nextVersion,
          status: "processed",
        }).select().single();
        if (insErr) throw insErr;
        await logActivity("document.uploaded", "document", ins.id, { file_name: processed.name, type: effectiveType });
        updateItem(i, { status: "done" });
        nextVersion += 1;
      } catch (e) {
        updateItem(i, { status: "error", error: e instanceof Error ? e.message : "Failed" });
      }
    }
    setBusy(false);
    onUploaded();
  }, [client.id, client.full_name, customType, docType, effectiveType, onUploaded]);

  return (
    <Card className="p-5 shadow-elev-sm">
      <div className="font-semibold mb-1">Upload documents</div>
      <p className="text-xs text-muted-foreground mb-4">Auto-converted to PDF, compressed, and renamed as <code className="text-[10px]">[Type]_[Client]</code>.</p>

      <div className="space-y-3 mb-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Document type</label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>{DOCUMENT_TYPES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {docType === "Other" && (
          <Input value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Custom type name" maxLength={60} />
        )}
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${drag ? "border-primary bg-accent/40" : "border-border hover:border-primary/50"}
          ${!effectiveType ? "opacity-60 pointer-events-none" : ""}`}
      >
        <input type="file" multiple className="hidden"
          accept="image/*,application/pdf"
          onChange={(e) => e.target.files && handleFiles(e.target.files)} />
        <UploadCloud className="size-8 mx-auto text-primary mb-2" />
        <div className="text-sm font-medium">Drop files or click to browse</div>
        <div className="text-xs text-muted-foreground mt-1">PDF or images · auto-compressed to ~2MB</div>
      </label>

      {queue.length > 0 && (
        <div className="mt-4 space-y-1.5 max-h-48 overflow-auto">
          {queue.map((it, i) => (
            <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50">
              {it.status === "done" && <CheckCircle2 className="size-3.5 text-success shrink-0" />}
              {it.status === "error" && <AlertTriangle className="size-3.5 text-destructive shrink-0" />}
              {(it.status === "processing" || it.status === "uploading") && <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />}
              {it.status === "pending" && <div className="size-3.5 rounded-full border border-muted-foreground shrink-0" />}
              <div className="flex-1 truncate">
                <div className="truncate font-medium">{it.finalName ?? it.name}</div>
                {it.error && <div className="text-destructive truncate">{it.error}</div>}
              </div>
              <div className="text-muted-foreground capitalize">{it.status}</div>
            </div>
          ))}
        </div>
      )}

      {busy && <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" /> Processing…</div>}
    </Card>
  );
};