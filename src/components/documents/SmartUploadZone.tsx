import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, AlertTriangle, Sparkles, Wand2, UserX, ArrowRightLeft } from "lucide-react";
import { DOCUMENT_TYPES, buildDocumentName, sanitizeName } from "@/lib/constants";
import { processToPdf } from "@/lib/processFile";
import { classifyDocument, matchPersonName } from "@/lib/classifyDocument";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";

interface Client { id: string; full_name: string; }

type ItemStatus = "queued" | "identifying" | "name_mismatch" | "processing" | "uploading" | "done" | "error" | "skipped";

interface ClientLite { id: string; full_name: string; application_id: string; }

interface QueueItem {
  file: File;
  status: ItemStatus;
  predictedType?: string;
  customType?: string;
  confidence?: number;
  source?: "filename" | "ai" | "fallback";
  finalName?: string;
  error?: string;
  ownerName?: string | null;
  ownerConfidence?: number;
  matchScore?: number;
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
  const [reassignFor, setReassignFor] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ClientLite[]>([]);
  const [searching, setSearching] = useState(false);

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
          ownerName: c.ownerName ?? null,
          ownerConfidence: c.ownerConfidence ?? 0,
        });
        return c;
      } catch (e) {
        patch(idx, { status: "error", error: e instanceof Error ? e.message : "Classify failed" });
        return null;
      }
    },
    [templateTypes]
  );

  const uploadOne = async (
    idx: number,
    item: QueueItem,
    type: string,
    customType?: string,
    targetClient: { id: string; full_name: string } = client,
    overrideOwner = false,
  ) => {
    try {
      const effectiveType = type === "Other" ? (customType?.trim() || "Other") : type;

      // Get next version for this type
      const { data: existing } = await supabase
        .from("client_documents")
        .select("version,document_type,custom_type")
        .eq("client_id", targetClient.id);
      const sameType = (existing ?? []).filter(
        (d) => (d.document_type === "Other" ? d.custom_type : d.document_type) === effectiveType
      );
      const nextVersion = (sameType.reduce((m, d) => Math.max(m, d.version), 0) || 0) + 1;

      patch(idx, { status: "processing" });
      const baseName = buildDocumentName(effectiveType, targetClient.full_name, nextVersion, "pdf").replace(/\.pdf$/, "");
      const processed = await processToPdf(item.file, baseName);

      patch(idx, { status: "uploading", finalName: processed.name });
      const path = `${targetClient.id}/${sanitizeName(effectiveType)}/${Date.now()}_${processed.name}`;
      const { error: upErr } = await supabase.storage
        .from("client-documents")
        .upload(path, processed, { contentType: "application/pdf" });
      if (upErr) throw upErr;

      const { data: ins, error: insErr } = await supabase
        .from("client_documents")
        .insert({
          client_id: targetClient.id,
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
      await logActivity(overrideOwner ? "document.uploaded_with_override" : "document.uploaded", "document", ins.id, {
        file_name: processed.name,
        type: effectiveType,
        auto_classified: item.source ?? "manual",
        confidence: item.confidence ?? null,
        owner_name_detected: item.ownerName ?? null,
        owner_confidence: item.ownerConfidence ?? null,
        client_id: targetClient.id,
        client_name: targetClient.full_name,
        owner_match_score: item.matchScore ?? null,
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
        // Owner name check
        const m = matchPersonName(c.ownerName, client.full_name);
        patch(idx, { matchScore: m.score });
        if (!m.match && c.ownerName && (c.ownerConfidence ?? 0) >= 0.5) {
          patch(idx, { status: "name_mismatch" });
          await logActivity("document.owner_mismatch_warned", "client", client.id, {
            file_name: it.file.name,
            detected_owner: c.ownerName,
            expected_client: client.full_name,
            score: m.score,
          });
          return; // wait for user decision
        }
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

  const uploadAnyway = async (idx: number) => {
    const item = queue[idx];
    if (!item || !item.predictedType) return;
    await uploadOne(idx, item, item.predictedType, item.customType, client, true);
    onUploaded();
  };

  const skipItem = async (idx: number) => {
    patch(idx, { status: "skipped" });
    await logActivity("document.skipped_owner_mismatch", "client", client.id, {
      file_name: queue[idx]?.file.name,
      detected_owner: queue[idx]?.ownerName,
    });
  };

  const openReassign = async (idx: number) => {
    setReassignFor(idx);
    const seed = queue[idx]?.ownerName ?? "";
    setSearchTerm(seed);
    if (seed) await runSearch(seed);
    else setSearchResults([]);
  };

  const runSearch = async (term: string) => {
    setSearching(true);
    try {
      const { data } = await supabase
        .from("clients")
        .select("id,full_name,application_id")
        .ilike("full_name", `%${term}%`)
        .limit(8);
      setSearchResults((data ?? []) as ClientLite[]);
    } finally {
      setSearching(false);
    }
  };

  const reassignTo = async (target: ClientLite) => {
    if (reassignFor === null) return;
    const idx = reassignFor;
    const item = queue[idx];
    setReassignFor(null);
    if (!item || !item.predictedType) return;
    await logActivity("document.reassigned", "client", target.id, {
      file_name: item.file.name,
      from_client: client.full_name,
      to_client: target.full_name,
      detected_owner: item.ownerName,
    });
    await uploadOne(idx, item, item.predictedType, item.customType, target, false);
    toast.success(`Saved to ${target.full_name}`);
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
              <div
                key={i}
                className={`flex flex-col gap-1.5 text-xs p-2 rounded ${
                  it.status === "name_mismatch" ? "bg-amber-50 border border-amber-300" : "bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2">
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
                {it.status === "name_mismatch" && (
                  <div className="ml-5 mt-1 p-2 rounded bg-amber-100/60 border border-amber-300 space-y-1.5">
                    <div className="flex items-start gap-1.5 text-amber-900">
                      <UserX className="size-3.5 mt-0.5 shrink-0" />
                      <div className="text-[11px] leading-snug">
                        This document looks like it belongs to{" "}
                        <span className="font-semibold">{it.ownerName}</span>, not{" "}
                        <span className="font-semibold">{client.full_name}</span>.
                      </div>
                    </div>
                    {reassignFor === i ? (
                      <div className="space-y-1.5">
                        <input
                          autoFocus
                          className="w-full h-7 px-2 rounded border bg-background text-[11px]"
                          placeholder="Search clients by name…"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if (e.target.value.length >= 2) runSearch(e.target.value);
                            else setSearchResults([]);
                          }}
                        />
                        <div className="max-h-32 overflow-auto rounded border bg-background">
                          {searching && <div className="p-2 text-[11px] text-muted-foreground">Searching…</div>}
                          {!searching && searchResults.length === 0 && (
                            <div className="p-2 text-[11px] text-muted-foreground">Type to search clients</div>
                          )}
                          {searchResults.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => reassignTo(c)}
                              className="w-full text-left px-2 py-1.5 text-[11px] hover:bg-accent border-b last:border-0"
                            >
                              <div className="font-medium">{c.full_name}</div>
                              <div className="text-muted-foreground text-[10px]">{c.application_id}</div>
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-end">
                          <Button size="sm" variant="ghost" className="h-6 text-[11px]"
                            onClick={() => setReassignFor(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" variant="default" className="h-7 text-[11px]"
                          onClick={() => openReassign(i)}>
                          <ArrowRightLeft className="size-3 mr-1" /> Reassign
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-[11px]"
                          onClick={() => uploadAnyway(i)}>
                          Upload anyway
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px]"
                          onClick={() => skipItem(i)}>
                          Skip
                        </Button>
                      </div>
                    )}
                  </div>
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
  if (status === "name_mismatch") return <UserX className="size-3.5 text-amber-600 shrink-0" />;
  if (status === "skipped") return <div className="size-3.5 rounded-full bg-muted shrink-0" />;
  if (status === "queued") return <div className="size-3.5 rounded-full border border-muted-foreground shrink-0" />;
  return <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />;
}

export default SmartUploadZone;