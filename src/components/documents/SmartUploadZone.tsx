import { useCallback, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, AlertTriangle, Sparkles, Wand2, UserX, ArrowRightLeft, Users } from "lucide-react";
import { DOCUMENT_TYPES, sanitizeName, buildPersonDocumentName, buildDocumentName } from "@/lib/constants";
import { processToPdf } from "@/lib/processFile";
import { classifyDocument } from "@/lib/classifyDocument";
import { matchPersonRoster } from "@/lib/matchPersonRoster";
import { extractFirstPageText } from "@/lib/extractFirstPageText";
import { mergeExtractedFields } from "@/lib/extractedFields";
import { logActivity } from "@/lib/activity";
import { ROLE_SHORT, type CasePerson } from "@/lib/casePeople";
import { toast } from "sonner";

interface Client { id: string; full_name: string; }

type ItemStatus =
  | "queued" | "identifying" | "needs_owner" | "name_mismatch"
  | "processing" | "uploading" | "done" | "error" | "skipped";

interface ClientLite { id: string; full_name: string; application_id: string; }

/** Special owner id meaning "shared by everyone on the case". */
const SHARED_ID = "__shared__";

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
  // Multi-person:
  ownerId?: string | null;     // case_people.id, or SHARED_ID, or null until chosen
  alternatives?: { person: CasePerson; score: number }[];
}

const CONCURRENCY = 3;

export const SmartUploadZone = ({
  client,
  templateTypes,
  people,
  onUploaded,
}: {
  client: Client;
  templateTypes?: string[];
  /** Roster of people on this case. Must include the applicant. */
  people: CasePerson[];
  onUploaded: () => void;
}) => {
  const [drag, setDrag] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [reassignFor, setReassignFor] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ClientLite[]>([]);
  const [searching, setSearching] = useState(false);

  const applicant = useMemo(() => people.find((p) => p.role === "applicant"), [people]);
  const isMulti = people.length >= 2;

  const patch = (idx: number, p: Partial<QueueItem>) =>
    setQueue((q) => q.map((it, i) => (i === idx ? { ...it, ...p } : it)));

  const personById = useCallback(
    (id: string | null | undefined): CasePerson | undefined =>
      id && id !== SHARED_ID ? people.find((p) => p.id === id) : undefined,
    [people],
  );

  const ownerLabel = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return "Unassigned";
      if (id === SHARED_ID) return "Shared (all)";
      const p = personById(id);
      return p ? `${p.full_name} · ${p.role === "applicant" ? "Applicant" : p.role === "co_applicant" ? "Co-applicant" : "Dependant"}` : "Unknown";
    },
    [personById],
  );

  const classifyAndAssign = useCallback(
    async (idx: number, item: QueueItem) => {
      try {
        patch(idx, { status: "identifying" });
        const c = await classifyDocument(item.file, templateTypes);
        const match = matchPersonRoster(c.ownerName ?? null, people);

        const baseUpdate: Partial<QueueItem> = {
          predictedType: c.type,
          customType: c.customType,
          confidence: c.confidence,
          source: c.source,
          ownerName: c.ownerName ?? null,
          ownerConfidence: c.ownerConfidence ?? 0,
          matchScore: match.score,
          alternatives: match.results.slice(0, 4).map((r) => ({ person: r.person, score: r.result.score })),
        };

        // Single-person case → always applicant
        if (!isMulti) {
          if (applicant && c.ownerName && (c.ownerConfidence ?? 0) >= 0.5) {
            // Legacy mismatch UX: detected someone else for a solo case
            const m = match.best;
            if (!m && match.score < 0.6) {
              patch(idx, { ...baseUpdate, status: "name_mismatch", ownerId: applicant.id });
              await logActivity("document.owner_mismatch_warned", "client", client.id, {
                file_name: item.file.name, detected_owner: c.ownerName, expected_client: client.full_name, score: match.score,
              });
              return null;
            }
          }
          patch(idx, { ...baseUpdate, ownerId: applicant?.id ?? null });
          return { classification: c, ownerId: applicant?.id ?? null };
        }

        // Multi-person case → require explicit confirmation when ambiguous / no name
        if (match.noNameDetected || !match.best || match.ambiguous) {
          // Default suggestion: best candidate if any, otherwise applicant
          const suggested = match.best?.id ?? applicant?.id ?? null;
          patch(idx, { ...baseUpdate, status: "needs_owner", ownerId: suggested });
          return null;
        }

        // High confidence: still show chip for reconfirmation, but proceed
        patch(idx, { ...baseUpdate, ownerId: match.best.id });
        return { classification: c, ownerId: match.best.id };
      } catch (e) {
        patch(idx, { status: "error", error: e instanceof Error ? e.message : "Classify failed" });
        return null;
      }
    },
    [templateTypes, people, isMulti, applicant, client.id, client.full_name],
  );

  const uploadOne = async (
    idx: number,
    item: QueueItem,
    type: string,
    customType: string | undefined,
    ownerId: string | null,
    targetClient: { id: string; full_name: string } = client,
    overrideOwner = false,
  ) => {
    try {
      const effectiveType = type === "Other" ? (customType?.trim() || "Other") : type;
      const isShared = ownerId === SHARED_ID;
      const ownerPerson = !isShared ? personById(ownerId ?? undefined) : undefined;

      // Get next version (scoped to this person + type, or shared + type)
      const { data: existing } = await supabase
        .from("client_documents")
        .select("version,document_type,custom_type,person_id,is_shared")
        .eq("client_id", targetClient.id);
      const sameSlot = (existing ?? []).filter((d) => {
        const sameType = (d.document_type === "Other" ? d.custom_type : d.document_type) === effectiveType;
        if (!sameType) return false;
        if (isShared) return d.is_shared === true;
        return d.person_id === (ownerPerson?.id ?? null);
      });
      const nextVersion = (sameSlot.reduce((m, d) => Math.max(m, d.version), 0) || 0) + 1;

      patch(idx, { status: "processing" });

      const baseName = ownerPerson
        ? buildPersonDocumentName(effectiveType, ROLE_SHORT[ownerPerson.role], ownerPerson.full_name, nextVersion, "pdf").replace(/\.pdf$/, "")
        : isShared
        ? buildPersonDocumentName(effectiveType, "Shared", "", nextVersion, "pdf").replace(/\.pdf$/, "")
        : buildDocumentName(effectiveType, targetClient.full_name, nextVersion, "pdf").replace(/\.pdf$/, "");

      const processed = await processToPdf(item.file, baseName);

      patch(idx, { status: "uploading", finalName: processed.name });
      const personFolder = isShared ? "shared" : (ownerPerson?.id ?? "unassigned");
      const path = `${targetClient.id}/${personFolder}/${sanitizeName(effectiveType)}/${Date.now()}_${processed.name}`;
      const { error: upErr } = await supabase.storage
        .from("client-documents")
        .upload(path, processed, { contentType: "application/pdf" });
      if (upErr) throw upErr;

      const { data: ins, error: insErr } = await supabase
        .from("client_documents")
        .insert({
          client_id: targetClient.id,
          person_id: ownerPerson?.id ?? null,
          is_shared: isShared,
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
        person_id: ownerPerson?.id ?? null,
        person_name: ownerPerson?.full_name ?? (isShared ? "Shared" : null),
        person_role: ownerPerson?.role ?? (isShared ? "shared" : null),
      });
      patch(idx, { status: "done" });

      // Background field extraction (per-person where possible)
      try {
        const isPdf = item.file.type === "application/pdf" || item.file.name.toLowerCase().endsWith(".pdf");
        const snippet = isPdf ? await extractFirstPageText(item.file, 6000) : "";
        if (snippet) {
          const { data } = await supabase.functions.invoke("extract-document-data", {
            body: { document_type: effectiveType, file_name: processed.name, snippet },
          });
          const fields = (data?.fields ?? {}) as Record<string, string | number | null>;
          if (fields && Object.keys(fields).length > 0) {
            const { written, conflicts } = await mergeExtractedFields(
              targetClient.id, ins.id, processed.name, fields,
            );
            if (written.length > 0) {
              toast.success(`Extracted ${written.length} field${written.length === 1 ? "" : "s"} from ${processed.name}`);
            }
            if (conflicts.length > 0) {
              toast.message(`${conflicts.length} field conflict${conflicts.length === 1 ? "" : "s"} flagged on profile`);
            }
          }
        }
      } catch (e) {
        console.warn("extract-document-data failed:", e);
      }
    } catch (e) {
      patch(idx, { status: "error", error: e instanceof Error ? e.message : "Upload failed" });
    }
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!applicant) {
        toast.error("This case has no applicant on file. Add a person first.");
        return;
      }
      const arr = Array.from(files);
      if (!arr.length) return;
      const startIdx = queue.length;
      const initial: QueueItem[] = arr.map((f) => ({ file: f, status: "queued" as const }));
      setQueue((q) => [...q, ...initial]);
      setBusy(true);

      const tasks = initial.map((it, i) => async () => {
        const idx = startIdx + i;
        const result = await classifyAndAssign(idx, it);
        if (!result) return; // paused for user input
        await uploadOne(idx, { ...it } as QueueItem, result.classification.type, result.classification.customType, result.ownerId);
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
    [queue.length, classifyAndAssign, applicant, onUploaded] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const overrideType = async (idx: number, newType: string) => {
    const item = queue[idx];
    if (!item || item.status === "uploading" || item.status === "processing") return;
    patch(idx, { predictedType: newType, status: "queued" });
    await uploadOne(idx, item, newType, item.customType, item.ownerId ?? null);
    onUploaded();
  };

  const setOwner = (idx: number, ownerId: string) => {
    patch(idx, { ownerId });
  };

  const confirmOwner = async (idx: number) => {
    const item = queue[idx];
    if (!item || !item.predictedType || !item.ownerId) return;
    await uploadOne(idx, item, item.predictedType, item.customType, item.ownerId);
    onUploaded();
  };

  const uploadAnyway = async (idx: number) => {
    const item = queue[idx];
    if (!item || !item.predictedType) return;
    await uploadOne(idx, item, item.predictedType, item.customType, item.ownerId ?? applicant?.id ?? null, client, true);
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
      file_name: item.file.name, from_client: client.full_name, to_client: target.full_name,
      detected_owner: item.ownerName,
    });
    // When reassigning to a different case, default ownership to that case's applicant (handled by null → caller side fallback)
    await uploadOne(idx, item, item.predictedType, item.customType, null, target, false);
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
      <p className="text-xs text-muted-foreground mb-3">
        Drop any documents — we auto-detect type, rename, convert to PDF, and compress for IRCC submission.
      </p>

      {isMulti && (
        <div className="mb-3 px-3 py-2 rounded-md bg-primary/5 border border-primary/20 flex items-start gap-2">
          <Users className="size-3.5 text-primary mt-0.5 shrink-0" />
          <div className="text-[11px] leading-snug text-primary">
            <span className="font-semibold">Multi-person case ({people.length} people).</span>{" "}
            Confirm who each document belongs to. Use <span className="font-semibold">Shared</span> for documents covering multiple people (e.g. marriage certificate).
          </div>
        </div>
      )}

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
          <div className="mt-4 space-y-1.5 max-h-96 overflow-auto">
            {queue.map((it, i) => (
              <div
                key={i}
                className={`flex flex-col gap-1.5 text-xs p-2 rounded ${
                  it.status === "name_mismatch" || it.status === "needs_owner"
                    ? "bg-amber-50 border border-amber-300"
                    : "bg-muted/50"
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
                          {isMulti && it.ownerId && it.status !== "needs_owner" && (
                            <span className="ml-1">· for <span className="font-semibold text-foreground">{ownerLabel(it.ownerId)}</span></span>
                          )}
                        </>
                      ) : (
                        <>Awaiting…</>
                      )}
                      {it.error && <span className="text-destructive ml-1">· {it.error}</span>}
                    </div>
                  </div>
                  {(it.status === "done" || it.status === "error") && it.predictedType && (
                    <Select value={it.predictedType} onValueChange={(v) => overrideType(i, v)}>
                      <SelectTrigger className="h-7 w-[140px] text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Roster picker for multi-person cases needing confirmation */}
                {it.status === "needs_owner" && (
                  <div className="ml-5 mt-1 p-2 rounded bg-amber-100/60 border border-amber-300 space-y-2">
                    <div className="flex items-start gap-1.5 text-amber-900">
                      <Users className="size-3.5 mt-0.5 shrink-0" />
                      <div className="text-[11px] leading-snug">
                        {it.ownerName
                          ? <>Detected name <span className="font-semibold">{it.ownerName}</span> — please confirm who this is for.</>
                          : <>No name detected on the document. Choose who this is for.</>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={it.ownerId ?? ""} onValueChange={(v) => setOwner(i, v)}>
                        <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="Select person…" /></SelectTrigger>
                        <SelectContent>
                          {people.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                              {p.full_name} · {p.role === "applicant" ? "Applicant" : p.role === "co_applicant" ? "Co-applicant" : "Dependant"}
                              {p.date_of_birth ? ` (DOB ${p.date_of_birth})` : ""}
                            </SelectItem>
                          ))}
                          <SelectItem value={SHARED_ID} className="text-xs">Shared (all)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" className="h-7 text-[11px]" onClick={() => confirmOwner(i)} disabled={!it.ownerId}>
                        Confirm & upload
                      </Button>
                    </div>
                  </div>
                )}

                {/* Single-person case mismatch (legacy) */}
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
                          <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => setReassignFor(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" variant="default" className="h-7 text-[11px]" onClick={() => openReassign(i)}>
                          <ArrowRightLeft className="size-3 mr-1" /> Reassign
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => uploadAnyway(i)}>
                          Upload anyway
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => skipItem(i)}>
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
  if (status === "needs_owner") return <Users className="size-3.5 text-amber-600 shrink-0" />;
  if (status === "skipped") return <div className="size-3.5 rounded-full bg-muted shrink-0" />;
  if (status === "queued") return <div className="size-3.5 rounded-full border border-muted-foreground shrink-0" />;
  return <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />;
}

export default SmartUploadZone;