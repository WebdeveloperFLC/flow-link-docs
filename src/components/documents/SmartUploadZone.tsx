import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, AlertTriangle, Sparkles, Wand2 } from "lucide-react";
import { DOCUMENT_TYPES, buildDocumentName, sanitizeName } from "@/lib/constants";
import { processToPdf } from "@/lib/processFile";
import { classifyDocument } from "@/lib/classifyDocument";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";

interface Client { id: string; full_name: string; }

type ItemStatus = "queued" | "identifying" | "processing" | "uploading" | "done" | "error";

interface QueueItem {
  file: File;
  status: ItemStatus;
  predictedType?: string;
  customType?: string;
  confidence?: number;
  source?: "filename" | "ai" | "fallback";
  finalName?: string;
  error?: string;
}

const CONCURRENCY = 3;

export const SmartUploadZone = ({
  client,
  templateTypes,
  onUploaded,
}: {
  client: Client;
  templateTypes?: string[];
  onUploaded: () => void;
}) => {
  const [drag, setDrag] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);

  const patch = (idx: number, p: Partial<QueueItem>) =>
    setQueue((q) => q.map((it, i) => (i === idx ? { ...it, ...p } : it)));

  const runOne = useCallback(
    async (idx: number, item: QueueItem) => {
      try {
        // Classify
        patch(idx, { status: "identifying" });
        const c = await classifyDocument(item.file, templateTypes);
        patch(idx, {
          predictedType: c.type,
          customType: c.customType,
          confidence: c.confidence,
          source: c.source,
        });
        return c;
      } catch (e) {
        patch(idx, { status: "error", error: e instanceof Error ? e.message : "Classify failed" });
        return null;
      }
    },
    [templateTypes]
  );

  const uploadOne = async (idx: number, item: QueueItem, type: string, customType?: string) => {
    try {
      const effectiveType = type === "Other" ? (customType?.trim() || "Other") : type;

      // Get next version for this type
      const { data: existing } = await supabase
        .from("client_documents")
        .select("version,document_type,custom_type")
        .eq("client_id", client.id);
      const sameType = (existing ?? []).filter(
        (d) => (d.document_type === "Other" ? d.custom_type : d.document_type) === effectiveType
      );
      const nextVersion = (sameType.reduce((m, d) => Math.max(m, d.version), 0) || 0) + 1;

      patch(idx, { status: "processing" });
      const baseName = buildDocumentName(effectiveType, client.full_name, nextVersion, "pdf").replace(/\.pdf$/, "");
      const processed = await processToPdf(item.file, baseName);

      patch(idx, { status: "uploading", finalName: processed.name });
      const path = `${client.id}/${sanitizeName(effectiveType)}/${Date.now()}_${processed.name}`;
      const { error: upErr } = await supabase.storage
        .from("client-documents")
        .upload(path, processed, { contentType: "application/pdf" });
      if (upErr) throw upErr;

      const { data: ins, error: insErr } = await supabase
        .from("client_documents")
        .insert({
          client_id: client.id,
          document_type: type,
          custom_type: type === "Other" ? customType?.trim() || null : null,
          file_name: processed.name,
          storage_path: path,
          mime_type: "application/pdf",
          size_bytes: processed.size,
          version: nextVersion,
          status: "processed",
        })
        .select()
        .single();
      if (insErr) throw insErr;
      await logActivity("document.uploaded", "document", ins.id, {
        file_name: processed.name,
        type: effectiveType,
        auto_classified: item.source ?? "manual",
        confidence: item.confidence ?? null,
      });
      patch(idx, { status: "done" });
    } catch (e) {
      patch(idx, { status: "error", error: e instanceof Error ? e.message : "Upload failed" });
    }
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (!arr.length) return;
      const startIdx = queue.length;
      const initial: QueueItem[] = arr.map((f) => ({ file: f, status: "queued" as const }));
      setQueue((q) => [...q, ...initial]);
      setBusy(true);

      // Classify in parallel batches
      const tasks = initial.map((it, i) => async () => {
        const idx = startIdx + i;
        const c = await runOne(idx, it);
        if (!c) return;
        await uploadOne(idx, { ...it, ...c }, c.type, c.customType);
      });

      const queues: Array<() => Promise<void>> = [...tasks];
      const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (queues.length) {
          const t = queues.shift();
          if (t) await t();
        }
      });
      await Promise.all(workers);

      setBusy(false);
      onUploaded();
    },
    [queue.length, runOne, onUploaded] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const overrideType = async (idx: number, newType: string) => {
    const item = queue[idx];
    if (!item || item.status === "done" || item.status === "uploading") return;
    patch(idx, { predictedType: newType, status: "queued" });
    await uploadOne(idx, item, newType, item.customType);
    onUploaded();
  };

  const clearQueue = () => setQueue([]);

  return (
    <Card className="p-5 shadow-elev-sm">
      <div className="flex items-center justify-between mb-1">
        <div className="font-semibold flex items-center gap-1.5">
          <Wand2 className="size-4 text-secondary" /> Smart upload
        </div>
        <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-secondary/10 text-secondary">
          IRCC ≤ 4MB
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Drop any documents — we auto-detect type, rename, convert to PDF, and compress for IRCC submission.
      </p>

      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${drag ? "border-primary bg-accent/40" : "border-border hover:border-primary/50"}`}
      >
        <input
          type="file"
          multiple
          className="hidden"
          accept="image/*,application/pdf"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <Sparkles className="size-7 mx-auto text-secondary mb-2" />
        <div className="text-sm font-medium">Drop files or click to browse</div>
        <div className="text-xs text-muted-foreground mt-1">
          PDF or images · auto-classified & renamed
        </div>
      </label>

      {queue.length > 0 && (
        <>
          <div className="mt-4 space-y-1.5 max-h-72 overflow-auto">
            {queue.map((it, i) => (
              <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50">
                <StatusIcon status={it.status} />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{it.finalName ?? it.file.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {it.predictedType ? (
                      <>
                        Detected: <span className="font-semibold text-foreground">{it.predictedType}</span>
                        {typeof it.confidence === "number" && (
                          <span className="ml-1">· {(it.confidence * 100).toFixed(0)}%</span>
                        )}
                        {it.source && <span className="ml-1">· {it.source}</span>}
                      </>
                    ) : (
                      <>Awaiting…</>
                    )}
                    {it.error && <span className="text-destructive ml-1">· {it.error}</span>}
                  </div>
                </div>
                {(it.status === "done" || it.status === "error") && it.predictedType && (
                  <Select
                    value={it.predictedType}
                    onValueChange={(v) => overrideType(i, v)}
                  >
                    <SelectTrigger className="h-7 w-[140px] text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
          {!busy && (
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearQueue} className="h-7 text-xs">Clear list</Button>
            </div>
          )}
        </>
      )}

      {busy && (
        <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="size-3 animate-spin" /> Identifying & processing…
        </div>
      )}
    </Card>
  );
};

function StatusIcon({ status }: { status: ItemStatus }) {
  if (status === "done") return <CheckCircle2 className="size-3.5 text-success shrink-0" />;
  if (status === "error") return <AlertTriangle className="size-3.5 text-destructive shrink-0" />;
  if (status === "queued") return <div className="size-3.5 rounded-full border border-muted-foreground shrink-0" />;
  return <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />;
}

export default SmartUploadZone;