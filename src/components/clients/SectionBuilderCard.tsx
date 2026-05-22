import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, Eye, Download, Trash2, GripVertical, Upload, Layers, FolderInput, Pencil, Check, Combine, MoreHorizontal, Link2, X as XIcon, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { saveSectionOrder, getSectionOrderMode, setSectionOrderMode, filterExtractedForSection, renameSection, archiveSection, type CaseSection } from "@/lib/sections";
import { combinePdfsFromStorage } from "@/lib/combinePdfs";
import { logActivity } from "@/lib/activity";
import {
  isPdfFile, getPdfPageCount, extractPerPageText, getBinderPageImages, extractPagesAsPdfFile,
  getAllowedDocumentTypes, shouldFallbackToPageRanges, inferTypeFromPageText, looksLikeBinderName,
  type BinderSegment,
} from "@/lib/binderSplit";
import { classifyDocument } from "@/lib/classifyDocument";
import { markChecklistItemReady } from "@/lib/checklist";
import { useMasterLabels } from "@/lib/masters";
import { openClientDocument } from "@/lib/documentPreview";
import { processToPdf } from "@/lib/processFile";
import { buildDocumentName, sanitizeName } from "@/lib/constants";
import { extractFirstPageText, renderPdfPagesToJpegDataUrls, imageFileToJpegDataUrl } from "@/lib/extractFirstPageText";
import { mergeExtractedFields } from "@/lib/extractedFields";

function isOneFullDocumentSegment(pageCount: number, segments: BinderSegment[]): boolean {
  if (pageCount < 3 || segments.length !== 1) return false;
  const only = segments[0];
  return (only.start_page ?? 1) <= 1 && (only.end_page ?? 0) >= pageCount;
}

function buildPageSegments(pageCount: number, pageSnippets: string[], allowedTypes: string[], reason: string): BinderSegment[] {
  return Array.from({ length: pageCount }, (_, pageIdx) => ({
    start_page: pageIdx + 1,
    end_page: pageIdx + 1,
    ...inferTypeFromPageText(pageSnippets[pageIdx] ?? "", allowedTypes),
    confidence: 0.35,
    reason,
  }));
}

/** Convert a file name like `B.Tech_Year_2_Marksheet.pdf` → `B.Tech Year 2 Marksheet`. */
function prettyTitle(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  const cleaned = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return base;
  // Title-case words that are all-lowercase; preserve mixed-case tokens like "B.Tech".
  return cleaned
    .split(" ")
    .map((w) => (w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export interface SectionDoc {
  id: string;
  document_type: string;
  custom_type: string | null;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  section_id: string | null;
  section_order: number;
  uploaded_at: string;
  version: number;
}

interface BinderRow {
  id: string; file_name: string; storage_path: string; generated_at: string;
}

export interface PendingChecklistItem {
  id: string;
  name: string;
  mandatory: boolean;
  notes?: string | null;
  status?: "rejected" | "needs_reissue" | null;
  attachedFileName?: string | null;
  isExtra?: boolean;
}

export interface LinkableDoc {
  id: string;
  file_name: string;
  label: string;
}

interface Props {
  clientId: string;
  section: CaseSection;
  allSections: CaseSection[];
  documents: SectionDoc[];
  canEdit: boolean;
  isAdmin: boolean;
  onChanged: () => void;
  pendingChecklist?: PendingChecklistItem[];
  linkableDocs?: LinkableDoc[];
  onLinkDocToChecklist?: (docId: string, checklistName: string) => void | Promise<void>;
  onRemoveChecklistItem?: (itemId: string, itemName: string, mandatory: boolean, isExtra: boolean) => void | Promise<void>;
}

export const SectionBuilderCard = ({ clientId, section, allSections, documents, canEdit, isAdmin, onChanged, pendingChecklist = [], linkableDocs = [], onLinkDocToChecklist, onRemoveChecklistItem }: Props) => {
  const [orderMode, setOrderModeState] = useState<"auto" | "manual">("auto");
  const [items, setItems] = useState<SectionDoc[]>([]);
  const [combining, setCombining] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [binder, setBinder] = useState<BinderRow | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [mergeMode, setMergeMode] = useState<{ anchorId: string; selected: Set<string> } | null>(null);
  const [merging, setMerging] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(section.label);
  const [renaming, setRenaming] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const DOCUMENT_TYPES = useMasterLabels("document_types");
  const allowedDocumentTypes = getAllowedDocumentTypes(DOCUMENT_TYPES);

  // Sort docs based on mode
  useEffect(() => {
    const sorted = [...documents].sort((a, b) => {
      if (orderMode === "manual") {
        if (a.section_order !== b.section_order) return a.section_order - b.section_order;
      } else {
        const ta = (a.custom_type ?? a.document_type ?? "").localeCompare(b.custom_type ?? b.document_type ?? "");
        if (ta !== 0) return ta;
      }
      return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
    });
    setItems(sorted);
  }, [documents, orderMode]);

  // Load order mode + latest section binder
  useEffect(() => {
    let alive = true;
    (async () => {
      const mode = await getSectionOrderMode(clientId, section.id);
      if (alive) setOrderModeState(mode);
      const { data } = await supabase
        .from("binders")
        .select("id,file_name,storage_path,generated_at")
        .eq("client_id", clientId)
        .eq("section_id", section.id)
        .eq("scope", "section")
        .order("generated_at", { ascending: false })
        .limit(1);
      if (alive) setBinder((data?.[0] as BinderRow | undefined) ?? null);
    })();
    return () => { alive = false; };
  }, [clientId, section.id, documents.length]);

  const onModeChange = async (m: "auto" | "manual") => {
    setOrderModeState(m);
    await setSectionOrderMode(clientId, section.id, m);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    if (orderMode !== "manual") return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((it) => it.id === active.id);
    const newIdx = items.findIndex((it) => it.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(items, oldIdx, newIdx);
    setItems(next);
    await saveSectionOrder(next.map((it) => it.id));
  };

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      // Section-first upload: every file (and every binder segment) is forced
      // to stay in THIS section. The classifier still runs to label the doc,
      // but it is never used to move the document to a different section.
      const segments: { file: File; preType?: string; preLabel?: string | null }[] = [];
      for (const f of Array.from(files)) {
        if (!isPdfFile(f)) { segments.push({ file: f }); continue; }
        let pageCount = 0;
        try { pageCount = await getPdfPageCount(f); } catch { /* ignore */ }
        if (pageCount < 3 || !looksLikeBinderName(f.name)) { segments.push({ file: f }); continue; }
        let pageSnippets: string[] = [];
        try {
          const maxPages = Math.min(pageCount, 30);
          const [snippets, pageImages] = await Promise.all([
            extractPerPageText(f, maxPages, 1000).catch(() => [] as string[]),
            getBinderPageImages(f, maxPages).catch(() => [] as string[]),
          ]);
          pageSnippets = snippets;
          const { data, error } = await supabase.functions.invoke("split-binder", {
            body: {
              filename: f.name,
              total_pages: pageCount,
              allowed_types: allowedDocumentTypes,
              case_people: [],
              page_snippets: pageSnippets,
              page_image_data_urls: pageImages,
            },
          });
          if (error) throw error;
          let segs: BinderSegment[] = Array.isArray(data?.segments) ? data.segments : [];
          // Re-type weak / "Other" segments with deterministic text rules.
          segs = segs.map((s) => {
            const needsRetype = !s.type || s.type === "Other" || (s.confidence ?? 0) < 0.5;
            if (!needsRetype) return s;
            const start = Math.max(1, Math.min(pageCount, s.start_page ?? 1));
            const end = Math.max(start, Math.min(pageCount, s.end_page ?? start));
            const joined = pageSnippets.slice(start - 1, end).join(" \n ");
            const guess = inferTypeFromPageText(joined, allowedDocumentTypes);
            if (guess.type !== "Other") return { ...s, type: guess.type, suggested_label: null };
            return { ...s, suggested_label: guess.suggested_label ?? s.suggested_label ?? null };
          });
          const isBinderName = looksLikeBinderName(f.name);
          if (isBinderName && shouldFallbackToPageRanges(f.name, pageCount, segs)) {
            segs = buildPageSegments(pageCount, pageSnippets, allowedDocumentTypes, "fallback_page_range");
            toast.message(`Binder splitter was unsure, so "${f.name}" was split page-by-page.`);
          }
          // A normal multi-page PDF may be one valid document. Only binder-named
          // PDFs are exploded when AI returns one full-document segment.
          if (isBinderName && isOneFullDocumentSegment(pageCount, segs)) {
            segs = buildPageSegments(pageCount, pageSnippets, allowedDocumentTypes, "binder_single_segment_forced_split");
            toast.message(`"${f.name}" was split page-by-page for routing.`);
          }
          const baseStem = f.name.replace(/\.pdf$/i, "");
          for (let i = 0; i < segs.length; i++) {
            const s = segs[i] as { start_page: number; end_page: number; type: string; suggested_label?: string | null };
            const label = (s.type === "Other" && s.suggested_label) ? s.suggested_label : s.type;
            const safeLabel = String(label || "Segment").replace(/[^\w\- ]+/g, "").slice(0, 40) || "Segment";
            const segName = `${baseStem}__${String(i + 1).padStart(2, "0")}_${safeLabel}_p${s.start_page}-${s.end_page}.pdf`;
            try {
              const segFile = await extractPagesAsPdfFile(f, s.start_page, s.end_page, segName);
              segments.push({ file: segFile, preType: s.type, preLabel: s.suggested_label ?? null });
            } catch (e) { console.warn("split-binder: extract failed", e); }
          }
          toast.success(`Split "${f.name}" into ${segs.length} documents`);
        } catch (e) {
          console.warn("split-binder failed; uploading as single PDF:", e);
          if (looksLikeBinderName(f.name) && shouldFallbackToPageRanges(f.name, pageCount, [])) {
            const baseStem = f.name.replace(/\.pdf$/i, "");
            for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
              const guessed = inferTypeFromPageText(pageSnippets[pageIdx] ?? "", allowedDocumentTypes);
              const label = guessed.type === "Other" && guessed.suggested_label ? guessed.suggested_label : guessed.type;
              const safeLabel = String(label || "Segment").replace(/[^\w\- ]+/g, "").slice(0, 40) || "Segment";
              try {
                const segFile = await extractPagesAsPdfFile(f, pageIdx + 1, pageIdx + 1, `${baseStem}__${String(pageIdx + 1).padStart(2, "0")}_${safeLabel}_p${pageIdx + 1}-${pageIdx + 1}.pdf`);
                segments.push({ file: segFile, preType: guessed.type, preLabel: guessed.type === "Other" ? guessed.suggested_label ?? null : null });
              } catch (fallbackError) {
                console.warn("split-binder: fallback page extract failed", pageIdx + 1, fallbackError);
              }
            }
            toast.message(`Could not auto-read binder boundaries, so "${f.name}" was split page-by-page.`);
            continue;
          }
          segments.push({ file: f });
        }
      }

      let n = 0;
      const baseOrder = (items[items.length - 1]?.section_order ?? 0);
      for (const seg of segments) {
        const f = seg.file;
        // Classify (filename + content) to determine document type and target section.
        let docType = seg.preType ?? "Other";
        let customType: string | null = seg.preLabel ?? null;
        try {
          const c = await classifyDocument(f, allowedDocumentTypes);
          if (c?.type) {
            // Do not let a weak/failed AI "Other" overwrite a type already
            // determined during binder splitting or deterministic text rules.
            if (c.type !== "Other" || docType === "Other") {
              docType = c.type;
              customType = c.type === "Other" ? (c.customType ?? customType ?? prettyTitle(f.name)) : null;
            }
          }
        } catch (e) { console.warn("classify failed", e); }
        if (docType === "Other" && !customType) customType = prettyTitle(f.name);

        // SECTION-FIRST: file always stays in the section it was uploaded into.
        const targetSectionId = section.id;
        const targetSection = section;

        // Run every file through the same safe pipeline as Smart Upload:
        // - already-valid small PDFs are kept as-is (no scanner-corrupting
        //   pdf-lib re-save)
        // - images and oversize PDFs are converted/compressed to a PDF that
        //   the browser can render reliably
        // - the resulting filename uses the structured naming convention so
        //   files are consistent across upload surfaces
        const effectiveType = docType === "Other" ? (customType || "Other") : docType;
        const baseName = buildDocumentName(effectiveType, "Document", 1, "pdf").replace(/\.pdf$/, "");
        let processed: File;
        try {
          processed = await processToPdf(f, baseName);
        } catch (err) {
          console.warn("processToPdf failed; uploading original bytes", err);
          processed = f;
        }
        const path = `${clientId}/section/${targetSection.key}/${Date.now()}_${processed.name}`;
        const { error: upErr } = await supabase.storage.from("client-documents").upload(path, processed, {
          contentType: processed.type || "application/pdf",
        });
        if (upErr) { toast.error(upErr.message); continue; }

        const { data: insRow, error: insErr } = await supabase.from("client_documents").insert({
          client_id: clientId,
          document_type: docType,
          custom_type: customType,
          file_name: processed.name,
          storage_path: path,
          mime_type: processed.type || "application/pdf",
          size_bytes: processed.size,
          section_id: targetSectionId,
          section_order: baseOrder + (n + 1) * 10,
        }).select().single();
        if (insErr) { toast.error(insErr.message); continue; }
        n++;
        // Align custom_type with any matching checklist item name so the
        // checklist on the client page flips to "ready" automatically.
        try {
          const insertedId = (insRow as { id: string } | null)?.id;
          if (insertedId) {
            await markChecklistItemReady(
              insertedId,
              clientId,
              docType,
              customType,
              processed.name,
            );
          }
        } catch { /* best effort */ }

        // Background: same-section field extraction + authenticity verification.
        // Both are best-effort and never block the upload UX. Extracted fields
        // are filtered to ONLY this section's allowed fields so an Identity
        // upload can never silently fill, say, Finance numbers.
        const insertedId = (insRow as { id: string } | null)?.id;
        (async () => {
          try {
            const isPdfDoc = processed.type === "application/pdf" || processed.name.toLowerCase().endsWith(".pdf");
            const isImage = processed.type.startsWith("image/");
            const snippet = isPdfDoc ? await extractFirstPageText(processed, 28000, 8) : "";
            const imageDataUrls: string[] = isPdfDoc
              ? await renderPdfPagesToJpegDataUrls(processed, 6)
              : isImage
                ? [await imageFileToJpegDataUrl(processed)].filter(Boolean)
                : [];
            if (insertedId) {
              const { data } = await supabase.functions.invoke("extract-document-data", {
                body: {
                  document_id: insertedId,
                  document_type: effectiveType,
                  custom_type: docType === "Other" ? (customType ?? null) : null,
                  file_name: processed.name,
                  snippet,
                  image_data_urls: imageDataUrls,
                },
              });
              const rawFields = (data?.fields ?? {}) as Record<string, string | number | null>;
              const scoped = filterExtractedForSection(section.key, rawFields);
              if (Object.keys(scoped).length > 0) {
                const { written } = await mergeExtractedFields(
                  clientId,
                  insertedId,
                  processed.name,
                  scoped,
                  effectiveType,
                  docType === "Other" ? (customType ?? null) : null,
                );
                if (written.length > 0) {
                  toast.success(`Extracted ${written.length} field${written.length === 1 ? "" : "s"} into ${section.label}`);
                }
              }
            }
            // Authenticity verification (never blocks the UX).
            if (insertedId) {
              const pageImages: string[] = isPdfDoc
                ? await renderPdfPagesToJpegDataUrls(processed, 4)
                : isImage
                  ? [await imageFileToJpegDataUrl(processed)].filter(Boolean)
                  : [];
              const embeddedText = isPdfDoc ? await extractFirstPageText(processed, 12000, 4) : "";
              if (pageImages.length > 0 || embeddedText) {
                await supabase.functions.invoke("verify-document", {
                  body: {
                    document_id: insertedId,
                    doc_type: effectiveType,
                    page_image_data_urls: pageImages,
                    embedded_text: embeddedText,
                    ocr_text: "",
                  },
                });
              }
            }
          } catch (e) {
            console.warn("section extract/verify failed:", e);
          }
        })();
      }
      if (n > 0) toast.success(`Uploaded ${n} document${n === 1 ? "" : "s"}`);
      onChanged();
    } finally {
      setUploading(false);
    }
  };

  const onRenameTitle = async (d: SectionDoc, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed || trimmed === (d.custom_type ?? "")) return;
    const { error } = await supabase.from("client_documents").update({ custom_type: trimmed }).eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    // Rename may now match a different checklist item — re-run linking.
    try {
      await markChecklistItemReady(d.id, clientId, d.document_type, trimmed, trimmed);
    } catch { /* best effort */ }
    onChanged();
  };

  const onMergeRows = async () => {
    if (!mergeMode) return;
    const ids = [mergeMode.anchorId, ...Array.from(mergeMode.selected)];
    const ordered = items.filter((it) => ids.includes(it.id));
    if (ordered.length < 2) { toast.error("Pick at least one more file to merge"); return; }
    setMerging(true);
    try {
      const bytes = await combinePdfsFromStorage(ordered.map((d) => d.storage_path));
      if (!bytes.byteLength) { toast.error("Could not merge — no PDF pages"); return; }
      const anchor = ordered[0];
      const baseTitle = anchor.custom_type ?? prettyTitle(anchor.file_name);
      const fileName = `${baseTitle.replace(/[^a-zA-Z0-9]+/g, "_")}_merged.pdf`;
      const path = `${clientId}/section/${section.key}/${Date.now()}_${fileName}`;
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      const { error: upErr } = await supabase.storage.from("client-documents").upload(path, blob, { contentType: "application/pdf" });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("client_documents").insert({
        client_id: clientId,
        document_type: anchor.document_type || "Other",
        custom_type: baseTitle,
        file_name: fileName,
        storage_path: path,
        mime_type: "application/pdf",
        size_bytes: blob.size,
        section_id: section.id,
        section_order: anchor.section_order,
      });
      if (insErr) throw insErr;
      // remove originals (storage + row)
      await supabase.storage.from("client-documents").remove(ordered.map((d) => d.storage_path));
      await supabase.from("client_documents").delete().in("id", ordered.map((d) => d.id));
      toast.success(`Merged ${ordered.length} files into ${baseTitle}`);
      setMergeMode(null);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Merge failed");
    } finally {
      setMerging(false);
    }
  };

  const onCombine = async () => {
    if (items.length === 0) { toast.error("Nothing to combine"); return; }
    setCombining(true);
    try {
      const bytes = await combinePdfsFromStorage(items.map((d) => d.storage_path));
      if (!bytes.byteLength) { toast.error("Could not merge — no PDF pages"); return; }
      const fileName = `${section.label.replace(/[^a-zA-Z0-9]+/g, "")}_Binder.pdf`;
      const path = `${clientId}/binders/section_${section.key}_${Date.now()}.pdf`;
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      const { error: upErr } = await supabase.storage.from("client-documents").upload(path, blob, { contentType: "application/pdf" });
      if (upErr) throw upErr;
      const { data: row, error: insErr } = await supabase.from("binders").insert({
        client_id: clientId,
        section_id: section.id,
        scope: "section",
        group_label: section.label,
        order_mode: orderMode,
        included_items: items.map((it) => ({ id: it.id, file_name: it.file_name })) as never,
        file_name: fileName,
        storage_path: path,
        size_bytes: blob.size,
      }).select("id,file_name,storage_path,generated_at").single();
      if (insErr) throw insErr;
      setBinder(row as BinderRow);
      await logActivity("binder.section_generated", "client", clientId, { section: section.key, count: items.length });
      toast.success(`${section.label} binder ready`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Combine failed");
    } finally {
      setCombining(false);
    }
  };

  const onDownloadBinder = async () => {
    if (!binder) return;
    const { data } = await supabase.storage.from("client-documents").download(binder.storage_path);
    if (!data) { toast.error("Could not download"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a"); a.href = url; a.download = binder.file_name; a.click();
    URL.revokeObjectURL(url);
  };

  const onView = async (d: SectionDoc) => {
    await openClientDocument({
      storagePath: d.storage_path,
      fileName: d.file_name,
      mimeType: d.mime_type,
    });
  };

  const onDownload = async (d: SectionDoc) => {
    const { data } = await supabase.storage.from("client-documents").download(d.storage_path);
    if (!data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement("a"); a.href = url; a.download = d.file_name; a.click();
    URL.revokeObjectURL(url);
  };

  const onDelete = async (d: SectionDoc) => {
    if (!confirm(`Move ${d.file_name} to Trash?\n\nIt will be kept for 30 days and can be restored from the Trash.`)) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("client_documents")
      .update({ deleted_at: new Date().toISOString(), deleted_by: u.user?.id ?? null } as never)
      .eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    await logActivity("document.trashed", "document", d.id, { file_name: d.file_name });
    toast.success("Moved to Trash");
    onChanged();
  };

  const onMoveSection = async (d: SectionDoc, newSectionId: string) => {
    await supabase.from("client_documents").update({ section_id: newSectionId, section_order: 0 }).eq("id", d.id);
    onChanged();
  };

  return (
    <Card
      className={`overflow-hidden shadow-elev-sm transition-colors ${dragActive ? "ring-2 ring-primary bg-primary/5" : ""}`}
      onDragOver={(e) => { if (!canEdit) return; e.preventDefault(); setDragActive(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragActive(false); }}
      onDrop={(e) => {
        if (!canEdit) return;
        e.preventDefault(); setDragActive(false);
        if (e.dataTransfer.files?.length) onUpload(e.dataTransfer.files);
      }}
    >
      <div className="px-5 py-3.5 border-b flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <div>
            <div className="font-semibold text-sm">{section.label}</div>
            <div className="text-xs text-muted-foreground">{items.length} document{items.length === 1 ? "" : "s"}{binder ? " · binder ready" : ""}</div>
          </div>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="size-7 ml-1" aria-label="Section options">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => { setRenameValue(section.label); setRenameOpen(true); }}>
                  <Pencil className="size-3.5 mr-2" /> Rename section
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-3.5 mr-2" /> Delete section
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={orderMode} onValueChange={(v) => onModeChange(v as "auto" | "manual")} disabled={!canEdit}>
            <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto order</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
          {canEdit && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => { onUpload(e.target.files); e.currentTarget.value = ""; }}
              />
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Upload className="size-3.5 mr-1.5" />}
                Upload to {section.label}
              </Button>
              <Button size="sm" onClick={onCombine} disabled={combining || items.length === 0} className="gradient-accent text-white">
                {combining ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Layers className="size-3.5 mr-1.5" />}
                {items.length === 0
                  ? "Combine"
                  : items.length === 1
                    ? (binder ? "Re-build binder" : "Use as binder")
                    : (binder ? `Re-combine ${items.length} files` : `Combine ${items.length} files`)}
              </Button>
            </>
          )}
        </div>
      </div>

      {mergeMode && (
        <div className="px-5 py-2.5 bg-primary/5 border-b flex items-center justify-between gap-3 text-xs">
          <div>
            Pick rows to merge into <span className="font-semibold">{items.find((i) => i.id === mergeMode.anchorId)?.custom_type ?? "this row"}</span> · {mergeMode.selected.size} selected
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setMergeMode(null)} disabled={merging}>Cancel</Button>
            <Button size="sm" onClick={onMergeRows} disabled={merging || mergeMode.selected.size === 0}>
              {merging ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Combine className="size-3.5 mr-1.5" />}
              Merge {mergeMode.selected.size + 1} into one
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <>
          <PendingRows
            pending={pendingChecklist}
            canEdit={canEdit}
            linkableDocs={linkableDocs}
            onLinkDocToChecklist={onLinkDocToChecklist}
            onRemoveChecklistItem={onRemoveChecklistItem}
          />
          <div className="px-5 py-10 text-center text-xs text-muted-foreground border-2 border-dashed border-muted m-3 rounded">
            {dragActive
              ? `Drop files into ${section.label}`
              : (canEdit
                  ? `Drop files here or click "Upload to ${section.label}". Files are auto-classified, optimized for IRCC ≤ 4 MB, and their information is extracted into this section.`
                  : "No documents in this section yet.")}
          </div>
        </>
      ) : (
        <>
        <PendingRows
          pending={pendingChecklist}
          canEdit={canEdit}
          linkableDocs={linkableDocs}
          onLinkDocToChecklist={onLinkDocToChecklist}
          onRemoveChecklistItem={onRemoveChecklistItem}
        />
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
            <div className="divide-y">
              {items.map((d, i) => (
                <SortableRow
                  key={d.id}
                  doc={d}
                  index={i + 1}
                  manual={orderMode === "manual"}
                  canEdit={canEdit}
                  isAdmin={isAdmin}
                  sections={allSections.filter((s) => s.id !== section.id)}
                  mergeMode={mergeMode}
                  onStartMerge={() => setMergeMode({ anchorId: d.id, selected: new Set() })}
                  onToggleMergePick={() => setMergeMode((m) => {
                    if (!m || m.anchorId === d.id) return m;
                    const next = new Set(m.selected);
                    if (next.has(d.id)) next.delete(d.id);
                    else next.add(d.id);
                    return { ...m, selected: next };
                  })}
                  onRenameTitle={(t) => onRenameTitle(d, t)}
                  onView={() => onView(d)}
                  onDownload={() => onDownload(d)}
                  onDelete={() => onDelete(d)}
                  onMove={(sid) => onMoveSection(d, sid)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        </>
      )}

      {binder && (
        <div className="px-5 py-3 border-t bg-success/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="size-4 text-success shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{binder.file_name}</div>
              <div className="text-[11px] text-muted-foreground">Generated {new Date(binder.generated_at).toLocaleString()}</div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={onDownloadBinder}>
            <Download className="size-3.5 mr-1.5" /> Download
          </Button>
        </div>
      )}

      <Dialog open={renameOpen} onOpenChange={(o) => { if (!renaming) setRenameOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename section</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="rename-section" className="text-xs">Section name</Label>
            <Input
              id="rename-section"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameValue.trim()) {
                  e.preventDefault();
                  (async () => {
                    setRenaming(true);
                    const ok = await renameSection(section.id, renameValue);
                    setRenaming(false);
                    if (ok) { toast.success("Section renamed"); setRenameOpen(false); onChanged(); }
                    else toast.error("Could not rename section");
                  })();
                }
              }}
            />
            <p className="text-[11px] text-muted-foreground">Renaming changes only the displayed name; existing documents stay where they are.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={renaming}>Cancel</Button>
            <Button
              disabled={renaming || !renameValue.trim() || renameValue.trim() === section.label}
              onClick={async () => {
                setRenaming(true);
                const ok = await renameSection(section.id, renameValue);
                setRenaming(false);
                if (ok) { toast.success("Section renamed"); setRenameOpen(false); onChanged(); }
                else toast.error("Could not rename section");
              }}
            >
              {renaming ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={(o) => { if (!deleting) setDeleteOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete section "{section.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              The section will be hidden from every client. {items.length > 0
                ? `This section still contains ${items.length} document${items.length === 1 ? "" : "s"} — move or delete them first.`
                : "This section is empty, so it's safe to delete."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting || items.length > 0}
              onClick={async (e) => {
                e.preventDefault();
                setDeleting(true);
                const res = await archiveSection(section.id);
                setDeleting(false);
                if (res.ok) { toast.success("Section deleted"); setDeleteOpen(false); onChanged(); }
                else if (res.reason === "has_documents") toast.error(`Move or delete the ${res.count} document${res.count === 1 ? "" : "s"} first`);
                else toast.error(res.reason ?? "Could not delete section");
              }}
            >
              Delete section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

function SortableRow({
  doc, index, manual, canEdit, isAdmin, sections, mergeMode, onStartMerge, onToggleMergePick, onRenameTitle, onView, onDownload, onDelete, onMove,
}: {
  doc: SectionDoc; index: number; manual: boolean; canEdit: boolean; isAdmin: boolean;
  sections: CaseSection[];
  mergeMode: { anchorId: string; selected: Set<string> } | null;
  onStartMerge: () => void;
  onToggleMergePick: () => void;
  onRenameTitle: (title: string) => void;
  onView: () => void; onDownload: () => void; onDelete: () => void; onMove: (sid: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doc.id, disabled: !manual });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(doc.custom_type ?? "");
  useEffect(() => { setTitleDraft(doc.custom_type ?? ""); }, [doc.custom_type]);
  const isAnchor = mergeMode?.anchorId === doc.id;
  const isPicked = mergeMode?.selected.has(doc.id) ?? false;
  return (
    <div ref={setNodeRef} style={style} className={`px-5 py-2.5 flex items-center gap-2 hover:bg-muted/30 ${isAnchor ? "bg-primary/10" : isPicked ? "bg-primary/5" : ""}`}>
      <button
        className={`size-6 flex items-center justify-center rounded ${manual ? "cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" : "text-muted-foreground/30 cursor-not-allowed"}`}
        title={manual ? "Drag to reorder" : "Switch to Manual to reorder"}
        {...attributes} {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="text-xs font-mono tabular-nums text-muted-foreground w-6 text-right">{String(index).padStart(2, "0")}</div>
      <FileText className="size-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        {editingTitle ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { onRenameTitle(titleDraft); setEditingTitle(false); }
                if (e.key === "Escape") { setTitleDraft(doc.custom_type ?? ""); setEditingTitle(false); }
              }}
              onBlur={() => { onRenameTitle(titleDraft); setEditingTitle(false); }}
              className="h-7 text-sm"
            />
            <Button size="icon" variant="ghost" className="size-6" onMouseDown={(e) => e.preventDefault()}>
              <Check className="size-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 group">
            <div className="text-sm truncate font-medium">{doc.custom_type || prettyTitle(doc.file_name)}</div>
            {canEdit && (
              <button onClick={() => setEditingTitle(true)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground" title="Rename">
                <Pencil className="size-3" />
              </button>
            )}
          </div>
        )}
        <div className="text-[11px] text-muted-foreground truncate">
          {doc.file_name}
          {doc.size_bytes ? ` · ${(doc.size_bytes / 1024).toFixed(0)} KB` : ""}
        </div>
      </div>
      {mergeMode && !isAnchor && (
        <Button size="sm" variant={isPicked ? "default" : "outline"} className="h-7 px-2 text-xs" onClick={onToggleMergePick}>
          {isPicked ? "Picked" : "Pick"}
        </Button>
      )}
      {!mergeMode && canEdit && (
        <Button size="icon" variant="ghost" className="size-7" title="Merge with other rows in this section" onClick={onStartMerge}>
          <Combine className="size-3.5" />
        </Button>
      )}
      <Button size="icon" variant="ghost" className="size-7" onClick={onView}><Eye className="size-3.5" /></Button>
      <Button size="icon" variant="ghost" className="size-7" onClick={onDownload}><Download className="size-3.5" /></Button>
      {canEdit && sections.length > 0 && (
        <Select onValueChange={onMove}>
          <SelectTrigger className="h-7 w-[36px] p-0 border-0 bg-transparent hover:bg-muted [&>svg]:hidden justify-center" title="Move to another section">
            <FolderInput className="size-3.5 text-muted-foreground" />
          </SelectTrigger>
          <SelectContent>
            {sections.map((s) => <SelectItem key={s.id} value={s.id}>Move to {s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {isAdmin && (
        <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={onDelete}><Trash2 className="size-3.5" /></Button>
      )}
    </div>
  );
}

function PendingRows({
  pending, canEdit, linkableDocs, onLinkDocToChecklist, onRemoveChecklistItem,
}: {
  pending: PendingChecklistItem[];
  canEdit: boolean;
  linkableDocs: LinkableDoc[];
  onLinkDocToChecklist?: (docId: string, checklistName: string) => void | Promise<void>;
  onRemoveChecklistItem?: (itemId: string, itemName: string, mandatory: boolean, isExtra: boolean) => void | Promise<void>;
}) {
  if (!pending || pending.length === 0) return null;
  return (
    <div className="divide-y bg-muted/20">
      {pending.map((it) => {
        const isRejected = it.status === "rejected";
        const isReissue = it.status === "needs_reissue";
        return (
          <div key={`pending-${it.id}`} className="px-5 py-2.5 flex items-center gap-2">
            <div className="size-6 flex items-center justify-center text-muted-foreground/50">
              <AlertCircle className="size-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium flex items-center gap-1.5 truncate">
                <span className="truncate">{it.name}</span>
                {it.mandatory && <span className="text-secondary text-[10px] font-semibold">REQUIRED</span>}
                {it.isExtra && <span className="text-[10px] uppercase font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Added</span>}
              </div>
              {it.notes && <div className="text-[11px] text-muted-foreground truncate">{it.notes}</div>}
              {it.attachedFileName && (
                <div className="text-[11px] text-muted-foreground truncate">{it.attachedFileName}</div>
              )}
            </div>
            {isRejected ? (
              <span className="text-[11px] px-2 py-0.5 rounded bg-destructive/10 text-destructive font-semibold uppercase tracking-wide">Rejected</span>
            ) : isReissue ? (
              <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold uppercase tracking-wide">Reissue</span>
            ) : (
              <span className={`text-[11px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide ${it.mandatory ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>
                {it.mandatory ? "Pending" : "Optional"}
              </span>
            )}
            {canEdit && onLinkDocToChecklist && linkableDocs.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" title="Link an already-uploaded document to this checklist item">
                    <Link2 className="size-3 mr-1" /> Link doc
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="px-3 py-2 border-b text-[11px] text-muted-foreground">
                    Pick an uploaded document to count for <span className="font-semibold text-foreground">{it.name}</span>
                  </div>
                  <div className="max-h-72 overflow-auto divide-y">
                    {linkableDocs.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => onLinkDocToChecklist(doc.id, it.name)}
                        className="w-full text-left px-3 py-2 hover:bg-accent text-xs"
                      >
                        <div className="font-medium truncate">{doc.file_name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{doc.label}</div>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {canEdit && onRemoveChecklistItem && (
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-muted-foreground hover:text-destructive"
                title={it.isExtra ? "Remove this requirement (uploaded files stay)" : "Remove from this client's checklist (does not delete uploaded files)"}
                onClick={() => onRemoveChecklistItem(it.id, it.name, it.mandatory, !!it.isExtra)}
              >
                <XIcon className="size-3.5" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}