import { useCallback, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, AlertTriangle, Sparkles, Wand2, UserX, ArrowRightLeft, Users, Combine, Scissors, Trash2, Upload, Eye } from "lucide-react";
import { sanitizeName, buildPersonDocumentName, buildDocumentName } from "@/lib/constants";
import { useMasterLabels } from "@/lib/masters";
import { processToPdf } from "@/lib/processFile";
import { classifyDocument } from "@/lib/classifyDocument";
import { matchPersonRoster } from "@/lib/matchPersonRoster";
import { extractFirstPageText, renderPdfPagesToJpegDataUrls, imageFileToJpegDataUrl } from "@/lib/extractFirstPageText";
import { mergeExtractedFields } from "@/lib/extractedFields";
import { logActivity } from "@/lib/activity";
import { ROLE_SHORT, ROLE_LABEL, type CasePerson } from "@/lib/casePeople";
import { inferSectionId } from "@/lib/sections";
import {
  isPdfFile, getPdfPageCount, extractPerPageText, extractPagesAsPdfFile, getBinderPageImages,
  getAllowedDocumentTypes, shouldFallbackToPageRanges, inferTypeFromPageText, looksLikeBinderName,
  type BinderSegment,
} from "@/lib/binderSplit";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { previewLocalFile } from "@/lib/documentPreview";

interface Client { id: string; full_name: string; }

type ItemStatus =
  | "queued" | "identifying" | "needs_owner" | "needs_type" | "name_mismatch" | "awaiting_review"
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
  ownerEvidence?: string | null;
  ownerSource?: "document_text" | "document_image" | null;
  verificationIssue?: "owner_not_on_case" | "owner_not_readable";
  matchScore?: number;
  // Multi-person:
  ownerId?: string | null;     // case_people.id, or SHARED_ID, or null until chosen
  alternatives?: { person: CasePerson; score: number }[];
  // Binder lineage: set only for items produced by binder splitting.
  binderId?: string;           // shared id across all segments of one source PDF
  binderSource?: File;         // original PDF File, used for re-slicing on edit
  binderSourceName?: string;   // pretty name of source binder
  segIndex?: number;           // 0-based segment index within the binder
  startPage?: number;          // 1-based inclusive
  endPage?: number;            // 1-based inclusive
  totalSourcePages?: number;
}

const CONCURRENCY = 3;

function isOneFullDocumentSegment(pageCount: number, segments: BinderSegment[]): boolean {
  if (pageCount < 3 || segments.length !== 1) return false;
  const only = segments[0];
  return (only.start_page ?? 1) <= 1 && (only.end_page ?? 0) >= pageCount;
}

function buildPageReviewSegments(pageCount: number, pageSnippets: string[], allowedTypes: string[], reason: string): BinderSegment[] {
  return Array.from({ length: pageCount }, (_, i) => ({
    start_page: i + 1,
    end_page: i + 1,
    ...inferTypeFromPageText(pageSnippets[i] ?? "", allowedTypes),
    confidence: 0.35,
    reason,
  }));
}

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
  const DOCUMENT_TYPES = useMasterLabels("document_types");
  const allowedDocumentTypes = useMemo(
    () => getAllowedDocumentTypes([...(templateTypes ?? []), ...DOCUMENT_TYPES]),
    [templateTypes, DOCUMENT_TYPES],
  );

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
      return p ? `${p.full_name} · ${ROLE_LABEL[p.role]}` : "Unknown";
    },
    [personById],
  );

  const classifyAndAssign = useCallback(
    async (idx: number, item: QueueItem) => {
      try {
        patch(idx, { status: "identifying" });
        const c = await classifyDocument(
          item.file,
          allowedDocumentTypes,
          people.map((p) => p.full_name),
        );
        const match = matchPersonRoster(c.ownerName ?? null, people);

        const baseUpdate: Partial<QueueItem> = {
          predictedType: c.type,
          customType: c.customType,
          confidence: c.confidence,
          source: c.source,
          ownerName: c.ownerName ?? null,
          ownerConfidence: c.ownerConfidence ?? 0,
          ownerEvidence: c.ownerEvidence ?? null,
          ownerSource: c.ownerSource ?? null,
          matchScore: match.score,
          alternatives: match.results.slice(0, 4).map((r) => ({ person: r.person, score: r.result.score })),
        };

        // No hard block on "Other": yesterday's working behavior was to always
        // auto-upload with the best classification we have. The card UI keeps a
        // dropdown for the user to correct the type post-upload if needed.
        if (c.type === "Other") {
          await logActivity("document.classified_other", "client", client.id, {
            file_name: item.file.name,
            is_scanned: c.isScanned ?? null,
            ai_confidence: c.confidence,
            suggested_label: c.customType ?? null,
          });
        }

        // HARD BLOCK: owner must be verified from document content/image, never filename.
        const detectedName = c.ownerName?.trim() ?? "";
        const ownerConf = c.ownerConfidence ?? 0;
        const ownerVerifiedFromContent =
          !!detectedName &&
          ownerConf >= 0.65 &&
          !!c.ownerEvidence?.trim() &&
          (c.ownerSource === "document_text" || c.ownerSource === "document_image");

        // Owner not readable from document content/image.
        if (!ownerVerifiedFromContent) {
          if (isMulti) {
            // Multi-person: let user pick the right person.
            const suggested = match.best?.id ?? applicant?.id ?? null;
            patch(idx, { ...baseUpdate, status: "needs_owner", ownerId: suggested });
            await logActivity("document.owner_needs_pick", "client", client.id, {
              file_name: item.file.name,
              detected_owner: detectedName || null,
              owner_confidence: ownerConf,
              owner_source: c.ownerSource ?? null,
            });
            return null;
          }
          // Single-person + no readable name: only one possible owner — auto-assign.
          patch(idx, { ...baseUpdate, ownerId: applicant?.id ?? null });
          await logActivity("document.owner_assumed_applicant", "client", client.id, {
            file_name: item.file.name,
            detected_owner: detectedName || null,
            owner_confidence: ownerConf,
            owner_source: c.ownerSource ?? null,
          });
          return { classification: c, ownerId: applicant?.id ?? null };
        }

        // Owner WAS readable from document content. If they don't match anyone
        // on the case, ALWAYS hard-block — for both single- and multi-person
        // cases. This is the guarantee that prevents cross-case uploads.
        const noRosterMatch = !match.best && match.score < 0.6;

        if (noRosterMatch) {
          patch(idx, {
            ...baseUpdate,
            status: "name_mismatch",
            ownerId: applicant?.id ?? null,
            verificationIssue: "owner_not_on_case",
          });
          await logActivity("document.owner_mismatch_blocked", "client", client.id, {
            file_name: item.file.name,
            detected_owner: detectedName,
            owner_evidence: c.ownerEvidence ?? null,
            owner_source: c.ownerSource ?? null,
            owner_confidence: ownerConf,
            case_people: people.map((p) => p.full_name),
            score: match.score,
            is_multi_person: isMulti,
          });
          return null;
        }

        // Single-person case (no mismatch) → always applicant
        if (!isMulti) {
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
    [allowedDocumentTypes, people, isMulti, applicant, client.id],
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
      // Defensive guard: never let a name-mismatched item upload silently.
      // Only the explicit "Upload anyway" / "Reassign" actions (which pass
      // overrideOwner=true or a different targetClient) may proceed.
      if (item.status === "name_mismatch" && !overrideOwner && targetClient.id === client.id) {
        return;
      }
      if (type === "Other" && !customType?.trim()) {
        patch(idx, {
          status: "error",
          predictedType: "Other",
          error: "Choose the document type before upload",
        });
        return;
      }
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

      const inferredSectionId = await inferSectionId(effectiveType).catch(() => null);

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
          section_id: inferredSectionId,
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
        const isImage = item.file.type.startsWith("image/");
        // Scan up to 8 pages and ~28k chars so multi-page resumes / transcripts /
        // bank statements get fully read instead of just the first page.
        const snippet = isPdf ? await extractFirstPageText(item.file, 28000, 8) : "";
        const imageDataUrls: string[] = isPdf
          ? await renderPdfPagesToJpegDataUrls(item.file, 6)
          : isImage
            ? [await imageFileToJpegDataUrl(item.file)].filter(Boolean)
            : [];
        if (snippet || imageDataUrls.length > 0) {
          const { data } = await supabase.functions.invoke("extract-document-data", {
            body: {
              document_type: effectiveType,
              custom_type: type === "Other" ? customType?.trim() || null : null,
              file_name: processed.name,
              snippet,
              image_data_urls: imageDataUrls,
            },
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

      // Background authenticity check ("synergy gate"): produce a verification
      // record so reviewers can see fraud signals on the document. Best-effort
      // — never block the upload UX.
      try {
        const isPdf = item.file.type === "application/pdf" || item.file.name.toLowerCase().endsWith(".pdf");
        const isImage = item.file.type.startsWith("image/");
        const pageImages: string[] = isPdf
          ? await renderPdfPagesToJpegDataUrls(item.file, 4)
          : isImage
            ? [await imageFileToJpegDataUrl(item.file)].filter(Boolean)
            : [];
        const embeddedText = isPdf ? await extractFirstPageText(item.file, 12000, 4) : "";
        if (pageImages.length > 0 || embeddedText) {
          await supabase.functions.invoke("verify-document", {
            body: {
              document_id: ins.id,
              doc_type: effectiveType,
              page_image_data_urls: pageImages,
              embedded_text: embeddedText,
              ocr_text: "",
            },
          });
        }
      } catch (e) {
        console.warn("verify-document failed:", e);
      }
    } catch (e) {
      patch(idx, { status: "error", error: e instanceof Error ? e.message : "Upload failed" });
    }
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!applicant) {
        toast.error("Add the applicant on the People card before uploading documents.");
        return;
      }
      const arr = Array.from(files);
      if (!arr.length) return;

      setBusy(true);
      // Step 1: expand binders. Any multi-page PDF (≥3 pages) is sent to the
      // AI binder splitter; if multiple segments come back, each segment
      // becomes its own queue item with binder lineage so the user can merge
      // or edit ranges before upload. Single (non-binder) files keep the
      // legacy auto-upload flow.
      const expanded = await expandBinders(arr, people.map((p) => p.full_name), allowedDocumentTypes);

      const startIdx = queue.length;
      const initial: QueueItem[] = expanded.map((e) =>
        e.binderId
          ? {
              file: e.file,
              status: "awaiting_review" as const,
              predictedType: e.type,
              customType: e.customType,
              binderId: e.binderId,
              binderSource: e.binderSource,
              binderSourceName: e.binderSourceName,
              segIndex: e.segIndex,
              startPage: e.startPage,
              endPage: e.endPage,
              totalSourcePages: e.totalSourcePages,
              ownerId: applicant?.id ?? null,
            }
          : { file: e.file, status: "queued" as const },
      );
      setQueue((q) => [...q, ...initial]);

      // Only auto-process non-binder items. Binder segments wait for the user
      // to review (merge / adjust ranges / confirm owner) and click "Upload all".
      const tasks = initial
        .map((it, i) => ({ it, i }))
        .filter((x) => x.it.status === "queued")
        .map(({ it, i }) => async () => {
          const idx = startIdx + i;
          const result = await classifyAndAssign(idx, it);
          if (!result) return;
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
    [queue.length, classifyAndAssign, applicant, onUploaded, people, allowedDocumentTypes] // eslint-disable-line react-hooks/exhaustive-deps
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

  /** Open the local file in a new tab so the user can sanity-check it before
   *  confirming a label / owner. */
  const previewFile = (file: File) => previewLocalFile(file);

  /** User picked a document type for an item that came back as "Other". Upload immediately. */
  const confirmType = async (idx: number, newType: string) => {
    const item = queue[idx];
    if (!item) return;
    const customType = newType === "Other" ? (item.customType?.trim() || "") : undefined;
    if (newType === "Other" && !customType) {
      patch(idx, { error: "Please type a label for this Other document or choose a known type." });
      return;
    }
    const ownerId = item.ownerId ?? applicant?.id ?? null;
    patch(idx, { predictedType: newType, customType, status: "queued", error: undefined });
    await uploadOne(idx, { ...item, predictedType: newType, customType }, newType, customType, ownerId);
    onUploaded();
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

  // ---------- Binder review controls ----------------------------------------

  /** Re-slice the source PDF for an item using its current startPage/endPage. */
  const rebuildSegmentFile = useCallback(async (item: QueueItem): Promise<File | null> => {
    if (!item.binderSource || !item.startPage || !item.endPage) return null;
    const stem = (item.binderSourceName ?? item.binderSource.name).replace(/\.pdf$/i, "");
    const label = item.predictedType === "Other" ? (item.customType || "Segment") : (item.predictedType || "Segment");
    const safe = String(label).replace(/[^\w\- ]+/g, "").slice(0, 40) || "Segment";
    const segName = `${stem}__${String((item.segIndex ?? 0) + 1).padStart(2, "0")}_${safe}_p${item.startPage}-${item.endPage}.pdf`;
    try {
      return await extractPagesAsPdfFile(item.binderSource, item.startPage, item.endPage, segName);
    } catch (e) {
      console.warn("rebuildSegmentFile failed", e);
      return null;
    }
  }, []);

  /** Merge segment at idx with the next segment in the same binder. */
  const mergeWithNext = useCallback(
    async (idx: number) => {
      const cur = queue[idx];
      if (!cur || !cur.binderId) return;
      // Find next segment of the same binder (by segIndex order)
      const peers = queue
        .map((it, i) => ({ it, i }))
        .filter(({ it }) => it.binderId === cur.binderId && it.status !== "skipped" && it.status !== "done")
        .sort((a, b) => (a.it.segIndex ?? 0) - (b.it.segIndex ?? 0));
      const pos = peers.findIndex((p) => p.i === idx);
      const next = peers[pos + 1];
      if (!next) {
        toast.message("No segment after this one to merge with.");
        return;
      }
      const newStart = Math.min(cur.startPage ?? 1, next.it.startPage ?? 1);
      const newEnd = Math.max(cur.endPage ?? 1, next.it.endPage ?? 1);
      const merged: QueueItem = {
        ...cur,
        startPage: newStart,
        endPage: newEnd,
        // Keep the type with the broader confidence — use cur by default.
        predictedType: cur.predictedType ?? next.it.predictedType,
        customType: cur.customType ?? next.it.customType,
        ownerId: cur.ownerId ?? next.it.ownerId,
      };
      const rebuiltFile = await rebuildSegmentFile(merged);
      if (rebuiltFile) merged.file = rebuiltFile;
      setQueue((q) => q.filter((_, i) => i !== next.i).map((it, i) => (i === idx ? merged : it)));
      toast.success(`Merged segments → pages ${newStart}-${newEnd}`);
    },
    [queue, rebuildSegmentFile],
  );

  /** Update start/end page of a binder segment and re-slice the source PDF. */
  const setSegmentRange = useCallback(
    async (idx: number, startPage: number, endPage: number) => {
      const cur = queue[idx];
      if (!cur || !cur.binderId || !cur.totalSourcePages) return;
      const total = cur.totalSourcePages;
      const start = Math.max(1, Math.min(total, Math.floor(startPage)));
      const end = Math.max(start, Math.min(total, Math.floor(endPage)));
      const next: QueueItem = { ...cur, startPage: start, endPage: end };
      const rebuiltFile = await rebuildSegmentFile(next);
      if (rebuiltFile) next.file = rebuiltFile;
      patch(idx, { startPage: start, endPage: end, file: next.file });
    },
    [queue, rebuildSegmentFile],
  );

  /** Set the predicted document type of a segment (without re-uploading yet). */
  const setSegmentType = useCallback((idx: number, type: string) => {
    patch(idx, { predictedType: type, customType: type === "Other" ? queue[idx]?.customType : undefined });
  }, [queue]);

  /** Remove a segment from the queue without uploading it. */
  const dropSegment = useCallback((idx: number) => {
    setQueue((q) => q.filter((_, i) => i !== idx));
  }, []);

  /** Upload every awaiting_review segment in this binder using the current settings. */
  const uploadBinder = useCallback(
    async (binderId: string) => {
      const segs = queue
        .map((it, i) => ({ it, i }))
        .filter(({ it }) => it.binderId === binderId && it.status === "awaiting_review");
      if (!segs.length) return;
      // Hard guard: a likely binder must never upload as one full-range segment.
      // If that's the only thing in the queue for this binder, explode it into
      // page-level segments first so each page can be classified individually.
      if (segs.length === 1) {
        const only = segs[0].it;
        const total = only.totalSourcePages ?? 0;
        const coversAll =
          (only.startPage ?? 1) <= 1 && (only.endPage ?? 0) >= total && total > 1;
        const isBinder = looksLikeBinderName(only.binderSourceName ?? only.file.name);
        if (isBinder && coversAll && only.binderSource) {
          toast.message("This still covers the whole binder — splitting page-by-page for review. Merge pages that belong together, then upload.");
          const baseStem = (only.binderSourceName ?? only.binderSource.name).replace(/\.pdf$/i, "");
          const newItems: QueueItem[] = [];
          for (let p = 1; p <= total; p++) {
            try {
              const segName = `${baseStem}__${String(p).padStart(2, "0")}_Page_p${p}-${p}.pdf`;
              const segFile = await extractPagesAsPdfFile(only.binderSource, p, p, segName);
              newItems.push({
                file: segFile,
                status: "awaiting_review",
                predictedType: "Other",
                binderId,
                binderSource: only.binderSource,
                binderSourceName: only.binderSourceName,
                segIndex: p - 1,
                startPage: p,
                endPage: p,
                totalSourcePages: total,
                ownerId: only.ownerId ?? applicant?.id ?? null,
              });
            } catch (e) { console.warn("forced page split failed", p, e); }
          }
          if (newItems.length) {
            setQueue((q) => {
              const without = q.filter((it) => !(it.binderId === binderId && it.status === "awaiting_review"));
              return [...without, ...newItems];
            });
          }
          return;
        }
      }
      setBusy(true);
      try {
        for (const { it, i } of segs) {
          const type = it.predictedType || "Other";
          const ownerId = it.ownerId ?? applicant?.id ?? null;
          await uploadOne(i, it, type, it.customType, ownerId);
        }
      } finally {
        setBusy(false);
        onUploaded();
      }
    },
    [queue, applicant, onUploaded], // eslint-disable-line react-hooks/exhaustive-deps
  );

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

      {/* Binder review groups: any awaiting_review items grouped by binder. */}
      {(() => {
        const groups = new Map<string, { idx: number; it: QueueItem }[]>();
        queue.forEach((it, idx) => {
          if (it.status === "awaiting_review" && it.binderId) {
            const arr = groups.get(it.binderId) ?? [];
            arr.push({ idx, it });
            groups.set(it.binderId, arr);
          }
        });
        if (groups.size === 0) return null;
        return (
          <div className="mt-4 space-y-3">
            {Array.from(groups.entries()).map(([binderId, segs]) => {
              const sorted = [...segs].sort((a, b) => (a.it.segIndex ?? 0) - (b.it.segIndex ?? 0));
              const first = sorted[0]?.it;
              const total = first?.totalSourcePages ?? 0;
              return (
                <div key={binderId} className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Scissors className="size-3.5 text-primary" />
                    <div className="text-xs font-semibold text-primary truncate">
                      Binder split: {first?.binderSourceName ?? "PDF"} · {total || "?"} pages → {sorted.length} document{sorted.length === 1 ? "" : "s"}
                    </div>
                    <div className="flex-1" />
                    <Button size="sm" className="h-7 text-[11px]" onClick={() => uploadBinder(binderId)} disabled={busy}>
                      <Upload className="size-3 mr-1" /> Upload all ({sorted.length})
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Review each segment before uploading. Adjust the page range, change the type or person, merge with the next segment, or remove a segment.
                  </p>
                  <div className="space-y-1.5">
                    {sorted.map(({ idx, it }, segPos) => {
                      const isLast = segPos === sorted.length - 1;
                      return (
                        <div key={idx} className="rounded-md border border-border bg-background/60 p-2 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center size-5 rounded bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                              {segPos + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="truncate text-xs font-medium">{it.file.name}</div>
                              <div className="text-[10px] text-muted-foreground">
                                Pages {it.startPage}–{it.endPage} of {total || "?"}
                                {it.predictedType && (
                                  <> · <span className="font-semibold text-foreground">{it.predictedType === "Other" ? (it.customType || "Other") : it.predictedType}</span></>
                                )}
                              </div>
                            </div>
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => previewFile(it.file)}
                              title="Preview this segment"
                            >
                              <Eye className="size-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => dropSegment(idx)}
                              title="Remove segment"
                            >
                              <Trash2 className="size-3.5 text-muted-foreground" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground shrink-0">Pages</span>
                              <Input
                                type="number" min={1} max={total || undefined}
                                value={it.startPage ?? 1}
                                className="h-7 w-14 text-[11px] px-1.5"
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  if (!Number.isFinite(v)) return;
                                  setSegmentRange(idx, v, it.endPage ?? v);
                                }}
                              />
                              <span className="text-[10px] text-muted-foreground">–</span>
                              <Input
                                type="number" min={1} max={total || undefined}
                                value={it.endPage ?? 1}
                                className="h-7 w-14 text-[11px] px-1.5"
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  if (!Number.isFinite(v)) return;
                                  setSegmentRange(idx, it.startPage ?? v, v);
                                }}
                              />
                            </div>
                            <Select value={it.predictedType ?? "Other"} onValueChange={(v) => setSegmentType(idx, v)}>
                              <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="Type" /></SelectTrigger>
                              <SelectContent>
                                {DOCUMENT_TYPES.map((t) => (
                                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Select value={it.ownerId ?? applicant?.id ?? ""} onValueChange={(v) => setOwner(idx, v)}>
                              <SelectTrigger className="h-7 text-[11px]">
                                <SelectValue placeholder="Assign to…" />
                              </SelectTrigger>
                              <SelectContent>
                                {people.map((p) => (
                                  <SelectItem key={p.id} value={p.id} className="text-xs">
                                    {p.full_name} · {ROLE_LABEL[p.role]}
                                  </SelectItem>
                                ))}
                                <SelectItem value={SHARED_ID} className="text-xs">Shared (all)</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm" variant="outline" className="h-7 text-[11px]"
                              disabled={isLast}
                              onClick={() => mergeWithNext(idx)}
                              title={isLast ? "No segment after this" : "Merge with the next segment"}
                            >
                              <Combine className="size-3 mr-1" /> Merge with next
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {queue.some((it) => it.status !== "awaiting_review") && (
        <>
          <div className="mt-4 space-y-1.5 max-h-96 overflow-auto">
            {queue.map((it, i) => it.status === "awaiting_review" ? null : (
              <div
                key={i}
                className={`flex flex-col gap-1.5 text-xs p-2 rounded ${
                  it.status === "name_mismatch" || it.status === "needs_owner" || it.status === "needs_type"
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
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7 shrink-0"
                    onClick={() => previewFile(it.file)}
                    title="Preview file"
                  >
                    <Eye className="size-3.5 text-muted-foreground" />
                  </Button>
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

                {/* AI couldn't identify the document — require user to pick a type before upload */}
                {it.status === "needs_type" && (
                  <div className="ml-5 mt-1 p-2 rounded bg-amber-100/60 border border-amber-300 space-y-2">
                    <div className="flex items-start gap-1.5 text-amber-900">
                      <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                      <div className="text-[11px] leading-snug">
                        Couldn't confidently identify this document
                        {it.customType ? <> (looks like <span className="font-semibold">{it.customType}</span>)</> : null}
                        . Please pick the correct type — it won't be uploaded as "Other" automatically.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select onValueChange={(v) => confirmType(i, v)}>
                        <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="Choose document type…" /></SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_TYPES.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => skipItem(i)}>
                        Skip
                      </Button>
                    </div>
                  </div>
                )}

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
                              {p.full_name} · {ROLE_LABEL[p.role]}
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
                        {it.verificationIssue === "owner_not_readable" ? (
                          <>
                            Could not verify the candidate from document content. Filename is not used for candidate matching. Reassign to another case, skip, or upload anyway.
                          </>
                        ) : (
                          <>
                            <span className="font-semibold">"{it.ownerName}"</span> isn't on this case.{" "}
                            People on file:{" "}
                            <span className="font-semibold">
                              {people.map((p) => p.full_name).join(", ") || client.full_name}
                            </span>
                            . Reassign to another case, skip, or upload anyway.
                          </>
                        )}
                        {it.ownerEvidence && (
                          <span className="block mt-1">Read from document: <span className="font-semibold">{it.ownerEvidence}</span></span>
                        )}
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
  if (status === "needs_type") return <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />;
  if (status === "awaiting_review") return <Scissors className="size-3.5 text-primary shrink-0" />;
  if (status === "skipped") return <div className="size-3.5 rounded-full bg-muted shrink-0" />;
  if (status === "queued") return <div className="size-3.5 rounded-full border border-muted-foreground shrink-0" />;
  return <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />;
}

export default SmartUploadZone;

/** Result of expanding the user's selection: either a plain file or one segment of a binder. */
interface ExpandedItem {
  file: File;
  // Only set for binder segments
  binderId?: string;
  binderSource?: File;
  binderSourceName?: string;
  segIndex?: number;
  startPage?: number;
  endPage?: number;
  totalSourcePages?: number;
  type?: string;
  customType?: string;
}

/**
 * Detect multi-page PDF binders and split them into one File per segment.
 * Returns the same files unchanged when no splitting is warranted.
 */
async function expandBinders(
  files: File[],
  rosterNames: string[],
  allowedTypes: string[],
): Promise<ExpandedItem[]> {
  const out: ExpandedItem[] = [];
  for (const file of files) {
    if (!isPdfFile(file)) {
      out.push({ file });
      continue;
    }
    let pageCount = 0;
    try { pageCount = await getPdfPageCount(file); } catch { pageCount = 0; }
    // Only attempt binder splitting when the filename indicates a binder/package.
    // Normal multi-page documents (transcripts, bank statements, passports) must stay intact.
    if (pageCount < 3 || !looksLikeBinderName(file.name)) {
      out.push({ file });
      continue;
    }
    let pageSnippets: string[] = [];
    try {
      // Cap to 30 pages of input (large binders → still useful, costs bounded).
      const maxPages = Math.min(pageCount, 30);
      const [snippets, pageImages] = await Promise.all([
        extractPerPageText(file, maxPages, 1000).catch(() => [] as string[]),
        getBinderPageImages(file, maxPages).catch(() => [] as string[]),
      ]);
      pageSnippets = snippets;
      const { data, error } = await supabase.functions.invoke("split-binder", {
        body: {
          filename: file.name,
          total_pages: pageCount,
          allowed_types: allowedTypes,
          case_people: rosterNames,
          page_snippets: pageSnippets,
          page_image_data_urls: pageImages,
        },
      });
      if (error) throw error;
      let segments = Array.isArray(data?.segments) ? data.segments : [];
      // Override AI types with deterministic per-segment text classification when AI says "Other"
      // or has very low confidence — keeps obvious passport/transcript/IELTS pages out of "Other".
      segments = segments.map((s: BinderSegment) => {
        const needsRetype = !s.type || s.type === "Other" || (s.confidence ?? 0) < 0.5;
        if (!needsRetype) return s;
        const start = Math.max(1, Math.min(pageCount, s.start_page ?? 1));
        const end = Math.max(start, Math.min(pageCount, s.end_page ?? start));
        const joined = pageSnippets.slice(start - 1, end).join(" \n ");
        const guess = inferTypeFromPageText(joined, allowedTypes);
        if (guess.type !== "Other") return { ...s, type: guess.type, suggested_label: null };
        return { ...s, suggested_label: guess.suggested_label ?? s.suggested_label ?? null };
      });
      const isBinderName = looksLikeBinderName(file.name);
      if (isBinderName && shouldFallbackToPageRanges(file.name, pageCount, segments)) {
        segments = buildPageReviewSegments(pageCount, pageSnippets, allowedTypes, "fallback_page_range");
        toast.message(`Binder splitter was unsure, so "${file.name}" was prepared as page-by-page segments for review.`);
      }
      // Normal 3+ page PDFs can be one valid document. Only binder-named PDFs
      // are forcibly exploded when AI returns one full-document segment.
      if (segments.length < 2) {
        if (isBinderName && isOneFullDocumentSegment(pageCount, segments)) {
          segments = buildPageReviewSegments(pageCount, pageSnippets, allowedTypes, "binder_single_segment_forced_split");
          toast.message(`AI couldn't find boundaries in "${file.name}" — split page-by-page for review. Use Merge to combine related pages.`);
        } else {
          out.push({ file });
          console.info("[binder-split]", { file: file.name, pageCount, isBinder: false, segments: 1, action: "kept_as_single_document" });
          continue;
        }
      }
      console.info("[binder-split]", { file: file.name, pageCount, isBinder: isBinderName, segments: segments.length });
      // Build one File per segment.
      const baseStem = file.name.replace(/\.pdf$/i, "");
      const binderId = `bndr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      for (let i = 0; i < segments.length; i++) {
        const s = segments[i] as {
          start_page: number; end_page: number; type: string;
          suggested_label?: string | null;
        };
        const label = (s.type === "Other" && s.suggested_label) ? s.suggested_label : s.type;
        const safeLabel = String(label || "Segment").replace(/[^\w\- ]+/g, "").slice(0, 40) || "Segment";
        const segName = `${baseStem}__${String(i + 1).padStart(2, "0")}_${safeLabel}_p${s.start_page}-${s.end_page}.pdf`;
        try {
          const segFile = await extractPagesAsPdfFile(file, s.start_page, s.end_page, segName);
          out.push({
            file: segFile,
            binderId,
            binderSource: file,
            binderSourceName: file.name,
            segIndex: i,
            startPage: s.start_page,
            endPage: s.end_page,
            totalSourcePages: pageCount,
            type: s.type,
            customType: s.type === "Other" && s.suggested_label ? s.suggested_label : undefined,
          });
        } catch (e) {
          console.warn("split-binder: failed to extract pages", s, e);
        }
      }
      toast.success(`Split "${file.name}" into ${segments.length} document${segments.length === 1 ? "" : "s"}`);
    } catch (e) {
      console.warn("split-binder failed; uploading as single PDF:", e);
      if (looksLikeBinderName(file.name) && shouldFallbackToPageRanges(file.name, pageCount, [])) {
        const binderId = `bndr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const baseStem = file.name.replace(/\.pdf$/i, "");
        for (let i = 1; i <= pageCount; i++) {
          const guessed = inferTypeFromPageText(pageSnippets[i - 1] ?? "", allowedTypes);
          const label = guessed.type === "Other" && guessed.suggested_label ? guessed.suggested_label : guessed.type;
          const safeLabel = String(label || "Segment").replace(/[^\w\- ]+/g, "").slice(0, 40) || "Segment";
          try {
            const segFile = await extractPagesAsPdfFile(file, i, i, `${baseStem}__${String(i).padStart(2, "0")}_${safeLabel}_p${i}-${i}.pdf`);
            out.push({ file: segFile, binderId, binderSource: file, binderSourceName: file.name, segIndex: i - 1, startPage: i, endPage: i, totalSourcePages: pageCount, type: guessed.type, customType: guessed.type === "Other" ? guessed.suggested_label ?? undefined : undefined });
          } catch (fallbackError) {
            console.warn("split-binder: fallback page extract failed", i, fallbackError);
          }
        }
        toast.message(`Could not auto-read binder boundaries, so "${file.name}" was prepared page-by-page for review.`);
        continue;
      }
      out.push({ file });
    }
  }
  return out;
}