import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download, FileText, FileCheck2, Eye, Trash2, Loader2, AlertCircle, Link2, Sparkles, FolderArchive, ShieldCheck, Plus, X, FileSearch, Unlink, ArrowRightLeft } from "lucide-react";
import { CallClientButton } from "@/components/clients/CallClientButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SmartUploadZone } from "@/components/documents/SmartUploadZone";
import { useAuth } from "@/contexts/AuthContext";
import { generateBinder } from "@/lib/binder";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";
import type { Template, TemplateItem, TemplateGroup } from "@/pages/Templates";
import { ShareLinkDialog } from "@/components/documents/ShareLinkDialog";
import { BINDER_GROUPS, groupForType } from "@/lib/binderGroups";
import { AddDocTypeDialog, type ExtraItem } from "@/components/clients/AddDocTypeDialog";
import { ClientProfileCard } from "@/components/clients/ClientProfileCard";
import { ClientPaymentsCard } from "@/components/clients/ClientPaymentsCard";
import { ClientServicesCard } from "@/components/clients/ClientServicesCard";
import { LetterCard } from "@/components/letters/LetterCard";
import { extractFirstPageText, renderPdfPagesToJpegDataUrls } from "@/lib/extractFirstPageText";
import { mergeExtractedFields } from "@/lib/extractedFields";
import { CasePeopleCard } from "@/components/clients/CasePeopleCard";
import { ClientFormsCard } from "@/components/clients/ClientFormsCard";
import { SectionBuilderCard, type SectionDoc } from "@/components/clients/SectionBuilderCard";
import { CustomBindersPanel } from "@/components/clients/CustomBindersPanel";
import { AddSectionDialog } from "@/components/clients/AddSectionDialog";
import { loadSections, inferSectionId, inferSectionIdFromList, resolveSectionIdByKey, type CaseSection } from "@/lib/sections";
import { isChecklistAlias } from "@/lib/checklist";
import type { CasePerson } from "@/lib/casePeople";
import JSZip from "jszip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { openClientDocument } from "@/lib/documentPreview";
import { ClientAccessDialog } from "@/components/clients/ClientAccessDialog";
import { ClientAccessCard } from "@/components/clients/ClientAccessCard";
import { InviteClientCard } from "@/components/clients/InviteClientCard";
import { HandoffDialog } from "@/components/clients/HandoffDialog";
import { AddRemarkDialog } from "@/components/clients/AddRemarkDialog";
import { ClientChatWorkspace } from "@/components/clients/ClientChatWorkspace";
import { ClientTimelineCard } from "@/components/clients/ClientTimelineCard";
import { ClientTasksCard } from "@/components/clients/ClientTasksCard";
import { HandoffHistoryCard } from "@/components/clients/HandoffHistoryCard";
import { QuickActionsBar } from "@/components/clients/QuickActionsBar";
import { ClientEmailCard } from "@/components/clients/ClientEmailCard";
import { ClientVoiceNotesCard } from "@/components/clients/ClientVoiceNotesCard";
import { AiSummaryPanel } from "@/components/clients/AiSummaryPanel";
import { PersonWorkspaceCard } from "@/components/clients/PersonWorkspaceCard";
import { ClientStageCard } from "@/components/clients/ClientStageCard";

interface Client {
  id: string; full_name: string; application_id: string; country: string;
  application_type: string; template_id: string | null; status: string;
  extra_items?: ExtraItem[] | null;
  suppressed_template_items?: string[] | null;
  owner_id?: string | null;
  created_by?: string | null;
}

interface Doc {
  id: string; client_id: string; document_type: string; custom_type: string | null;
  file_name: string; storage_path: string; mime_type: string | null;
  size_bytes: number | null; version: number; uploaded_at: string;
  section_id?: string | null;
  section_order?: number;
  status?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

interface BinderRow {
  id: string; file_name: string; storage_path: string; generated_at: string; group_label: string | null;
}

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canUpload, isAdmin, canDeleteDocs, user } = useAuth();
  const [accessDenied, setAccessDenied] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatingGroups, setGeneratingGroups] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ type: "document" | "binder"; id: string; label: string } | null>(null);
  const [optimizing, setOptimizing] = useState<string | null>(null);
  const [optimizingAll, setOptimizingAll] = useState(false);
  const [binders, setBinders] = useState<BinderRow[]>([]);
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [reExtracting, setReExtracting] = useState(false);
  const [syncingOdoo, setSyncingOdoo] = useState(false);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const [people, setPeople] = useState<CasePerson[]>([]);
  const [sections, setSections] = useState<CaseSection[]>([]);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [remarkOpen, setRemarkOpen] = useState(false);
  const [trashedDocs, setTrashedDocs] = useState<Doc[]>([]);
  const [trashUserNames, setTrashUserNames] = useState<Record<string, string>>({});
  const [secondaryLoading, setSecondaryLoading] = useState(true);

  // Critical fetch — only what's needed for the first paint above the fold
  // (client + template + active documents + sections). Runs in parallel.
  const loadCritical = useCallback(async () => {
    if (!id) return;
    const [{ data: c, error: cErr }, sectionsData, { data: activeDocs }] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).maybeSingle(),
      loadSections(true),
      supabase
        .from("client_documents")
        .select("*")
        .eq("client_id", id)
        .is("deleted_at", null)
        .order("uploaded_at", { ascending: false }),
    ]);
    // [access-debug] Backend RLS is the source of truth. If the row is not
    // returned, the current user lacks owner / assignment / share access.
    // eslint-disable-next-line no-console
    console.log("[access-debug] client-detail", {
      user: user?.id, clientId: id, isAdmin,
      accessSource: c ? "rls-allowed" : "rls-denied",
      error: cErr?.message,
    });
    if (!c) {
      setAccessDenied(true);
      toast.error("You don't have access to this client.");
      navigate("/clients", { replace: true });
      return;
    }
    setClient(c as unknown as Client | null);
    setSections(sectionsData);
    setDocs((activeDocs ?? []) as Doc[]);
    if (c?.template_id) {
      const { data: t } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("id", c.template_id)
        .single();
      setTemplate(t as unknown as Template | null);
    } else {
      setTemplate(null);
    }
  }, [id, user?.id, isAdmin, navigate]);

  // Secondary fetch — below-the-fold cards (binders, trash, profile names).
  // Runs after the critical paint. Splitting into a separate query also lets
  // server-side filtering (deleted_at IS NOT NULL) be index-assisted.
  const loadSecondary = useCallback(async () => {
    if (!id) return;
    setSecondaryLoading(true);
    const [{ data: trashed }, { data: b }] = await Promise.all([
      supabase
        .from("client_documents")
        .select("*")
        .eq("client_id", id)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false }),
      supabase
        .from("binders")
        .select("id,file_name,storage_path,generated_at,group_label")
        .eq("client_id", id)
        .order("generated_at", { ascending: false }),
    ]);
    const trashedRows = (trashed ?? []) as Doc[];
    setTrashedDocs(trashedRows);
    setBinders((b ?? []) as BinderRow[]);
    const uids = Array.from(new Set(trashedRows.map((x) => x.deleted_by).filter(Boolean) as string[]));
    if (uids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", uids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: { id: string; full_name: string | null; email: string | null }) => {
        map[p.id] = p.full_name ?? p.email ?? p.id.slice(0, 8);
      });
      setTrashUserNames(map);
    } else {
      setTrashUserNames({});
    }
    setSecondaryLoading(false);
  }, [id]);

  // Compatibility shim — existing handlers call `load()` after mutations.
  // Keep that contract: refresh both critical + secondary data.
  const load = useCallback(async () => {
    await loadCritical();
    loadSecondary();
  }, [loadCritical, loadSecondary]);

  // Critical paint first — secondary kicks off right after to avoid serial waterfall.
  useEffect(() => { loadCritical(); }, [loadCritical]);
  useEffect(() => {
    // Defer secondary by a tick so the critical render commits first.
    const t = setTimeout(() => { loadSecondary(); }, 0);
    return () => clearTimeout(t);
  }, [loadSecondary]);

  // Backfill: ensure every doc has a section_id so it appears in some section card.
  useEffect(() => {
    if (!docs.length || !sections.length) return;
    const orphaned = docs.filter((d) => !d.section_id);
    if (orphaned.length === 0) return;
    let cancelled = false;
    (async () => {
      let n = 0;
      for (const d of orphaned) {
        const typeName = d.document_type === "Other" ? (d.custom_type ?? "Other") : d.document_type;
        const sid = await inferSectionId(typeName);
        if (sid) {
          await supabase.from("client_documents").update({ section_id: sid }).eq("id", d.id);
          n++;
        }
      }
      if (!cancelled && n > 0) load();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, sections]);

  // Backfill: align custom_type to the matching checklist item name so that
  // already-uploaded documents (uploaded before the linking pipeline ran, or
  // classified under a near-alias) flip their checklist row from Pending to
  // Ready without a re-upload.
  useEffect(() => {
    if (!docs.length) return;
    const items: TemplateItem[] = checklistItems;
    if (items.length === 0) return;
    let cancelled = false;
    (async () => {
      let changed = 0;
      for (const d of docs) {
        // Don't override a manual link the user already set.
        if (d.custom_type && d.custom_type.trim() !== "") continue;
        // Don't auto-link rejected / reissue-pending docs back into checklist.
        if (d.status === "rejected" || d.status === "needs_reissue") continue;
        const t1 = d.document_type === "Other" ? (d.custom_type ?? "") : d.document_type;
        const t2 = d.custom_type ?? "";
        // Already matches some item by exact name → skip.
        const exact = items.find((it) => it.name === t1 || it.name === t2);
        if (exact) continue;
        // Find items that match by alias on the type labels (NOT the
        // filename — that caused single uploads to satisfy multiple rows).
        const aliasItems = items.filter(
          (it) =>
            (t1 && isChecklistAlias(t1, it.name)) ||
            (t2 && isChecklistAlias(t2, it.name)),
        );
        // Skip if ambiguous — we'd rather leave it pending than mis-link.
        if (aliasItems.length !== 1) continue;
        const aliasItem = aliasItems[0];
        const { error } = await supabase
          .from("client_documents")
          .update({ custom_type: aliasItem.name })
          .eq("id", d.id);
        if (!error) changed++;
      }
      if (!cancelled && changed > 0) load();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, template?.id, client?.id]);

  /** Memoized doc-by-type matchers — built once per (docs) change so we don't
   *  re-scan the full docs array N×items per render. */
  const { attachedDocByType, docByType } = useMemo(() => {
    const attached = (typeName: string): Doc | undefined => {
      const matches = docs.filter((d) => {
        const t1 = d.document_type === "Other" ? (d.custom_type ?? "") : d.document_type;
        const t2 = d.custom_type ?? "";
        if (t1 === typeName || t2 === typeName) return true;
        if (t1 && isChecklistAlias(t1, typeName)) return true;
        if (t2 && t2 !== t1 && isChecklistAlias(t2, typeName)) return true;
        return false;
      });
      return matches.sort((a, b) => b.version - a.version)[0];
    };
    const ready = (typeName: string): Doc | undefined => {
      const d = attached(typeName);
      if (!d) return undefined;
      const s = d.status ?? "ready";
      if (s === "rejected" || s === "needs_reissue") return undefined;
      return d;
    };
    return { attachedDocByType: attached, docByType: ready };
  }, [docs]);

  const suppressedIds = useMemo(
    () => new Set<string>(client?.suppressed_template_items ?? []),
    [client?.suppressed_template_items],
  );
  const extraItems: ExtraItem[] = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const tplItemNames = new Set((template?.items ?? []).map((it) => norm(it.name)));
    return ((client?.extra_items as ExtraItem[] | null | undefined) ?? [])
      .filter((e) => !tplItemNames.has(norm(e.name)));
  }, [client?.extra_items, template?.items]);
  const visibleTemplateItems = useMemo(
    () => (template?.items ?? []).filter((it) => !suppressedIds.has(it.id)),
    [template?.items, suppressedIds],
  );
  const checklistItems: TemplateItem[] = useMemo(
    () => [
      ...visibleTemplateItems,
      ...extraItems.map((e) => ({ id: e.id, name: e.name, mandatory: !!e.mandatory, notes: e.notes })),
    ],
    [visibleTemplateItems, extraItems],
  );
  const completed = useMemo(
    () => checklistItems.filter((it) => docByType(it.name)).length,
    [checklistItems, docByType],
  );
  const requiredMissing = useMemo(
    () => checklistItems.filter((it) => it.mandatory && !docByType(it.name)),
    [checklistItems, docByType],
  );

  /** Sectioned view of the checklist. If the assigned template defines `groups`,
   *  we honour that hierarchy. Extra items (added per-client) are appended to
   *  a synthetic "Added requirements" section at the end. Otherwise we fall
   *  back to a single flat section. */
  const checklistSections: Array<{ id: string; label: string; items: TemplateItem[] }> = useMemo(() => {
    const tplItems = visibleTemplateItems;
    const tplGroups = (template?.groups ?? null) as TemplateGroup[] | null;
    const itemMap = new Map(tplItems.map((it) => [it.id, it]));
    const out: Array<{ id: string; label: string; items: TemplateItem[] }> = [];
    if (tplGroups && tplGroups.length > 0) {
      const placed = new Set<string>();
      for (const g of [...tplGroups].sort((a, b) => a.sort_order - b.sort_order)) {
        const items = g.item_ids
          .map((id) => itemMap.get(id))
          .filter((x): x is TemplateItem => !!x);
        items.forEach((it) => placed.add(it.id));
        if (items.length > 0) out.push({ id: g.id, label: g.label, items });
      }
      const orphans = tplItems.filter((it) => !placed.has(it.id));
      if (orphans.length > 0) out.push({ id: "_orphans", label: "Other Documents", items: orphans });
    } else if (tplItems.length > 0) {
      out.push({ id: "_all", label: "Documents", items: tplItems });
    }
    if (extraItems.length > 0) {
      out.push({
        id: "_extras",
        label: "Added requirements",
        items: extraItems.map((e) => ({ id: e.id, name: e.name, mandatory: !!e.mandatory, notes: e.notes })),
      });
    }
    return out;
  }, [visibleTemplateItems, template?.groups, extraItems]);

  /** Map each template checklist item id → the case_section id defined by the
   *  template's `groups`. This is what drives section placement for pending
   *  rows AND uploaded documents, so a "Job Offer letter" required item
   *  always lands in the Experience section even when keyword inference would
   *  bucket it differently. Falls back to `inferSectionIdFromList` per item. */
  const itemSectionIdById = useMemo(() => {
    const map = new Map<string, string>();
    if (!sections.length) return map;
    const tplGroups = (template?.groups ?? []) as TemplateGroup[];
    for (const g of tplGroups) {
      const sid = resolveSectionIdByKey(g.section_key, sections);
      if (!sid) continue;
      for (const itemId of g.item_ids) map.set(itemId, sid);
    }
    // Fallbacks for items not placed in any group.
    for (const it of checklistItems) {
      if (map.has(it.id)) continue;
      const sid = inferSectionIdFromList(it.name, sections);
      if (sid) map.set(it.id, sid);
    }
    return map;
  }, [template?.groups, sections, checklistItems]);

  /** For each active document, the section it SHOULD live in based on the
   *  matching checklist item's template-defined section (when applicable).
   *  Used both for view-time placement and for a one-time backfill so the
   *  stored `section_id` matches what the user sees. */
  const docTargetSection = useMemo(() => {
    const map = new Map<string, string>();
    if (!sections.length || !checklistItems.length) return map;
    for (const d of docs) {
      const t1 = d.document_type === "Other" ? (d.custom_type ?? "") : d.document_type;
      const t2 = d.custom_type ?? "";
      const match = checklistItems.find((it) => it.name === t1 || it.name === t2)
        ?? checklistItems.find(
          (it) =>
            (t1 && isChecklistAlias(t1, it.name)) ||
            (t2 && t2 !== t1 && isChecklistAlias(t2, it.name)),
        );
      const sid = match ? itemSectionIdById.get(match.id) : undefined;
      if (sid) map.set(d.id, sid);
    }
    return map;
  }, [docs, checklistItems, itemSectionIdById, sections.length]);

  // Backfill: if a doc's stored section_id doesn't match the template-defined
  // section for its checklist item, realign it (one-shot, idempotent).
  useEffect(() => {
    if (docTargetSection.size === 0) return;
    let cancelled = false;
    (async () => {
      let n = 0;
      for (const d of docs) {
        const target = docTargetSection.get(d.id);
        if (!target || target === d.section_id) continue;
        const { error } = await supabase
          .from("client_documents")
          .update({ section_id: target })
          .eq("id", d.id);
        if (!error) n++;
      }
      if (!cancelled && n > 0) load();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docTargetSection]);

  const onDelete = async (d: Doc) => {
    if (!confirm(`Move ${d.file_name} to Trash?\n\nIt will be kept for 30 days and can be restored. Admins can permanently delete it after that.`)) return;
    const { error } = await supabase
      .from("client_documents")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null } as never)
      .eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    await logActivity("document.trashed", "document", d.id, { file_name: d.file_name });
    toast.success("Moved to Trash");
    load();
  };

  const onRestore = async (d: Doc) => {
    const { error } = await supabase
      .from("client_documents")
      .update({ deleted_at: null, deleted_by: null } as never)
      .eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    await logActivity("document.restored", "document", d.id, { file_name: d.file_name });
    toast.success("Restored");
    load();
  };

  const onPermanentDelete = async (d: Doc) => {
    if (!confirm(`Permanently delete ${d.file_name}? This cannot be undone.`)) return;
    await supabase.storage.from("client-documents").remove([d.storage_path]);
    const { error } = await supabase.from("client_documents").delete().eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    await logActivity("document.purged", "document", d.id, { file_name: d.file_name });
    toast.success("Permanently deleted");
    load();
  };

  /** Manually link an uploaded doc to a checklist item by writing the item's
   *  exact name into custom_type. The render-time matcher then flips Pending → Ready. */
  const linkDocToChecklist = async (docId: string, checklistName: string) => {
    const { error } = await supabase
      .from("client_documents")
      .update({ custom_type: checklistName })
      .eq("id", docId);
    if (error) { toast.error(error.message); return; }
    await logActivity("document.linked_to_checklist", "document", docId, { checklist_item: checklistName });
    toast.success(`Linked to "${checklistName}"`);
    load();
  };

  /** Unlink: clear custom_type so the doc is no longer counted under the
   *  current checklist item. Document stays uploaded — only the link is removed. */
  const unlinkDocFromChecklist = async (docId: string) => {
    const { error } = await supabase
      .from("client_documents")
      .update({ custom_type: null })
      .eq("id", docId);
    if (error) { toast.error(error.message); return; }
    await logActivity("document.unlinked_from_checklist", "document", docId);
    load();
  };

  const onAddExtraItem = async (item: ExtraItem) => {
    if (!client) return;
    const next = [...extraItems, item];
    const { error } = await supabase
      .from("clients")
      .update({ extra_items: next as never })
      .eq("id", client.id);
    if (error) { toast.error(error.message); return; }
    await logActivity("client.extra_item_added", "client", client.id, { type: item.name, mandatory: item.mandatory });
    toast.success(`Added "${item.name}"`);
    load();
  };

  const onRemoveExtraItem = async (itemId: string) => {
    if (!client) return;
    const next = extraItems.filter((e) => e.id !== itemId);
    const { error } = await supabase
      .from("clients")
      .update({ extra_items: next as never })
      .eq("id", client.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  /** Hide a template-defined checklist item for THIS client only. The
   *  underlying workflow_template stays untouched. */
  const onSuppressTemplateItem = async (itemId: string, itemName: string, mandatory: boolean) => {
    if (!client) return;
    if (mandatory && !confirm(`Remove required item "${itemName}" from this client's checklist?`)) return;
    const next = Array.from(new Set([...(client.suppressed_template_items ?? []), itemId]));
    const { error } = await supabase
      .from("clients")
      .update({ suppressed_template_items: next as never })
      .eq("id", client.id);
    if (error) { toast.error(error.message); return; }
    await logActivity("client.template_item_suppressed", "client", client.id, { item: itemName });
    toast.success(`Removed "${itemName}" from this client`);
    load();
  };

  const onRestoreSuppressed = async () => {
    if (!client) return;
    const { error } = await supabase
      .from("clients")
      .update({ suppressed_template_items: [] as never })
      .eq("id", client.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const onReExtract = async () => {
    if (!client) return;
    setReExtracting(true);
    let ok = 0, errs = 0, totalWritten = 0;
    try {
      // Only PDFs can be text-extracted client side. Identity passports must run first
      // so passport-authoritative fields overwrite any stale values before lower-priority docs run.
      const pdfs = docs
        .filter((d) => (d.mime_type ?? "").includes("pdf") || d.file_name.toLowerCase().endsWith(".pdf"))
        .sort((a, b) => {
          const passportScore = (d: Doc) => {
            const type = `${d.document_type ?? ""} ${d.custom_type ?? ""}`.toLowerCase();
            const inIdentity = d.section_id === "identity" || /\/identity\//i.test(d.storage_path);
            return inIdentity && type.includes("passport") ? 0 : 1;
          };
          return passportScore(a) - passportScore(b);
        });
      for (const d of pdfs) {
        try {
          // Try browser-side text/image extraction first (fast path for digital PDFs).
          // For scanned PDFs (passport copies, etc.) these will be empty — the backend
          // function will fall back to reading the original PDF from storage.
          let snippet = "";
          let imageDataUrls: string[] = [];
          try {
            const { data: blob } = await supabase.storage.from("client-documents").download(d.storage_path);
            if (blob) {
              const file = new File([blob], d.file_name, { type: d.mime_type || "application/pdf" });
              snippet = await extractFirstPageText(file, 12000, 3);
              imageDataUrls = await renderPdfPagesToJpegDataUrls(file, 3);
            }
          } catch (e) {
            console.warn("client-side pdf extract failed, falling back to server:", e);
          }
          const effectiveType = d.document_type === "Other" ? (d.custom_type ?? "Other") : d.document_type;
          const { data } = await supabase.functions.invoke("extract-document-data", {
            body: {
              document_id: d.id,
              document_type: effectiveType,
              file_name: d.file_name,
              snippet,
              image_data_urls: imageDataUrls,
            },
          });
          const fields = (data?.fields ?? {}) as Record<string, string | number | null>;
          if (fields && Object.keys(fields).length > 0) {
            const { written } = await mergeExtractedFields(
              client.id, d.id, d.file_name, fields, effectiveType,
              d.document_type === "Other" ? (d.custom_type ?? null) : null,
            );
            totalWritten += written.length;
            ok++;
          } else {
            // Backend returned no fields — surface reason in console for debugging.
            console.warn("extract-document-data returned no fields", { document_id: d.id, reason: data?.reason });
            errs++;
          }
        } catch { errs++; }
      }
      if (ok > 0) {
        toast.success(`Re-extracted ${ok}/${pdfs.length} · ${totalWritten} new fields`);
      } else if (pdfs.length > 0) {
        toast.error(`Re-extract found 0 fields across ${pdfs.length} document${pdfs.length === 1 ? "" : "s"}. Check console for details.`);
      } else {
        toast.message("No PDF documents to re-extract");
      }
      setProfileRefreshKey((k) => k + 1);
    } finally {
      setReExtracting(false);
    }
  };

  const onSyncOdoo = async () => {
    if (!client) return;
    setSyncingOdoo(true);
    try {
      const { data, error } = await supabase.functions.invoke("odoo-sync", {
        body: { action: "sync_one", client_id: client.id },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Sync failed");
      if (data.skipped) { toast.message(`Odoo sync skipped: ${data.skipped}`); return; }
      await logActivity("odoo.client_synced", "client", client.id, data);
      toast.success(`Synced to Odoo${data.lead_id ? ` · lead #${data.lead_id}` : ""}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Odoo sync failed");
    } finally {
      setSyncingOdoo(false);
    }
  };

  // Auto-sync on client open when integration_settings.auto_on_open is enabled
  useEffect(() => {
    if (!client?.id) return;
    let cancelled = false;
    (async () => {
      const { data: settings } = await supabase
        .from("integration_settings")
        .select("enabled, auto_on_open, mode")
        .eq("key", "odoo")
        .maybeSingle();
      if (cancelled) return;
      if (!settings?.enabled || !settings.auto_on_open || settings.mode === "off") return;
      // Fire and forget — non-blocking
      supabase.functions.invoke("odoo-sync", {
        body: { action: "sync_one", client_id: client.id },
      }).then(({ data, error }) => {
        if (error || !data?.ok) return;
        if (data.pulled) toast.message("Updated from Odoo");
      });
    })();
    return () => { cancelled = true; };
  }, [client?.id]);

  const onView = async (d: Doc) => {
    const ok = await openClientDocument({
      storagePath: d.storage_path,
      fileName: d.file_name,
      mimeType: d.mime_type,
    });
    if (ok) await logActivity("document.viewed", "document", d.id);
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

  const LARGE_BYTES = 1.5 * 1024 * 1024;
  const onOptimizeAll = async () => {
    const targets = docs.filter((d) => (d.size_bytes ?? 0) > LARGE_BYTES);
    if (targets.length === 0) { toast.info("All documents already optimized"); return; }
    setOptimizingAll(true);
    let totalSaved = 0;
    let processed = 0;
    try {
      for (const d of targets) {
        try {
          const { data } = await supabase.functions.invoke("process-large-file", {
            body: { document_id: d.id },
          });
          totalSaved += (data?.saved as number) ?? 0;
          processed += 1;
        } catch { /* continue with next */ }
      }
      toast.success(`Optimized ${processed}/${targets.length} · saved ${(totalSaved / 1024).toFixed(0)} KB total`);
      load();
    } finally {
      setOptimizingAll(false);
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

  const onGenerateGroupedBinders = async () => {
    if (!client) return;
    if (!template) { toast.error("Assign a workflow template first"); return; }
    setGeneratingGroups(true);
    const cleanName = client.full_name.replace(/[^a-zA-Z0-9]/g, "");
    let made = 0;
    try {
      // Prefer template-defined sections when available; fall back to BINDER_GROUPS.
      const tplGroups = (template.groups ?? null) as TemplateGroup[] | null;
      type GroupSpec = { key: string; label: string; items: TemplateItem[] };
      const itemMap = new Map(template.items.map((it) => [it.id, it]));
      const groupSpecs: GroupSpec[] = (tplGroups && tplGroups.length > 0)
        ? [...tplGroups]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((g) => ({
              key: g.section_key,
              label: g.label,
              items: g.item_ids.map((id) => itemMap.get(id)).filter((x): x is TemplateItem => !!x),
            }))
        : BINDER_GROUPS.map((bg) => ({
            key: bg.key,
            label: bg.label,
            items: template.items.filter((it) => groupForType(it.name).key === bg.key),
          }));

      for (const group of groupSpecs) {
        const groupItems = group.items;
        const groupHasUploads = groupItems.some((it) => docByType(it.name));
        if (groupItems.length === 0 || !groupHasUploads) continue;

        const bytes = await generateBinder({
          clientName: client.full_name,
          applicationId: client.application_id,
          country: client.country,
          applicationType: client.application_type,
          templateName: template.name,
          items: groupItems,
          documents: docs,
          groupLabel: group.label,
        });
        const fileName = `${group.label.replace(/[^a-zA-Z0-9]/g, "")}_${cleanName}.pdf`;
        const path = `${client.id}/binders/${Date.now()}_${fileName}`;
        const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
        const { error: upErr } = await supabase.storage
          .from("client-documents")
          .upload(path, blob, { contentType: "application/pdf" });
        if (upErr) throw upErr;
        await supabase.from("binders").insert({
          client_id: client.id,
          file_name: fileName,
          storage_path: path,
          size_bytes: blob.size,
          group_label: group.label,
        });
        await logActivity("binder.generated", "client", client.id, { file_name: fileName, group: group.label });
        made += 1;
      }
      if (made === 0) toast.info("No grouped binders generated — upload documents first");
      else toast.success(`Generated ${made} grouped binder${made === 1 ? "" : "s"}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate grouped binders");
    } finally {
      setGeneratingGroups(false);
    }
  };

  const onDownloadAllBinders = async () => {
    if (!binders.length) return;
    try {
      const zip = new JSZip();
      for (const b of binders) {
        const { data, error } = await supabase.storage.from("client-documents").download(b.storage_path);
        if (error || !data) continue;
        zip.file(b.file_name, await data.arrayBuffer());
      }
      const out = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${client?.full_name.replace(/[^a-zA-Z0-9]/g, "")}_AllBinders.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to zip binders");
    }
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
            <CallClientButton clientId={client.id} />
            <Button onClick={() => setHandoffOpen(true)} variant="outline" size="sm">
              <ArrowRightLeft className="size-4 mr-1.5" /> Hand off
            </Button>
            <Button onClick={() => setRemarkOpen(true)} variant="outline" size="sm">
              <FileText className="size-4 mr-1.5" /> Add remark
            </Button>
            {(isAdmin || (!!user && (client.owner_id === user.id || client.created_by === user.id))) && (
              <Button onClick={() => setAccessOpen(true)} variant="outline" size="sm">
                <ShieldCheck className="size-4 mr-1.5" /> Manage access
              </Button>
            )}
            {canUpload && (
              <>
                <Button onClick={onGenerateGroupedBinders} disabled={generatingGroups || !template} variant="outline" size="sm">
                  {generatingGroups ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <FolderArchive className="size-4 mr-1.5" />}
                  Grouped binders
                </Button>
                <Button onClick={onGenerateBinder} disabled={generating || !template} className="gradient-accent text-white">
                  {generating ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <FileCheck2 className="size-4 mr-1.5" />}
                  Full binder
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="p-8 grid lg:grid-cols-3 gap-6">
        {/* Left: unified case documents (sections + checklist + uploads) */}
        <div className="lg:col-span-2 space-y-6">
          <ClientStageCard clientId={client.id} clientCountry={client.country} />
          <ClientProfileCard
            clientId={client.id}
            canEdit={canUpload}
            onReExtract={onReExtract}
            reExtracting={reExtracting}
            onSyncOdoo={onSyncOdoo}
            syncingOdoo={syncingOdoo}
            refreshKey={profileRefreshKey}
          />

          <ClientServicesCard clientId={client.id} canEdit={canUpload} />

          <ClientPaymentsCard clientId={client.id} />

          <LetterCard clientId={client.id} canGenerate={canUpload} onGenerated={load} />

          <ClientFormsCard
            clientId={client.id}
            country={client.country}
            category={client.application_type}
            canEdit={canUpload}
          />

          {/* Unified case documents: every section in one place — checklist + uploaded files + per-section combine. */}
          {sections.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-semibold text-sm">Case documents</div>
                  <div className="text-xs text-muted-foreground">
                    {template
                      ? `${template.name} · ${completed}/${checklistItems.length} ready`
                      : "No workflow template assigned"}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {requiredMissing.length > 0 && (
                    <div className="text-xs text-secondary flex items-center gap-1.5 font-medium">
                      <AlertCircle className="size-3.5" /> {requiredMissing.length} required missing
                    </div>
                  )}
                  {suppressedIds.size > 0 && (
                    <button
                      type="button"
                      onClick={onRestoreSuppressed}
                      className="text-[11px] text-muted-foreground underline hover:text-foreground"
                      title="Restore checklist items removed for this client"
                    >
                      Restore {suppressedIds.size} hidden
                    </button>
                  )}
                  {canUpload && (
                    <Button size="sm" variant="outline" onClick={() => setAddDocOpen(true)}>
                      <Plus className="size-3.5 mr-1" /> Add document
                    </Button>
                  )}
                  {isAdmin && (
                    <Button size="sm" variant="outline" onClick={() => setAddSectionOpen(true)}>
                      <Plus className="size-3.5 mr-1.5" /> New section
                    </Button>
                  )}
                </div>
              </div>
              {sections.map((sec) => {
                const sectionDocs: SectionDoc[] = docs
                  .filter((d) => {
                    const target = docTargetSection.get(d.id);
                    if (target) return target === sec.id;
                    return d.section_id === sec.id;
                  })
                  .map((d) => ({
                    id: d.id,
                    document_type: d.document_type,
                    custom_type: d.custom_type,
                    file_name: d.file_name,
                    storage_path: d.storage_path,
                    mime_type: d.mime_type,
                    size_bytes: d.size_bytes,
                    section_id: d.section_id ?? null,
                    section_order: d.section_order ?? 0,
                    uploaded_at: d.uploaded_at,
                    version: d.version,
                  }));
                // Checklist items that belong to this section AND don't yet have an attached doc.
                const pendingChecklist = checklistItems
                  .filter((it) => {
                    const ready = docByType(it.name);
                    if (ready) return false;
                    const placed = itemSectionIdById.get(it.id)
                      ?? inferSectionIdFromList(it.name, sections);
                    return placed === sec.id;
                  })
                  .map((it) => {
                    const attached = attachedDocByType(it.name);
                    const status = attached?.status === "rejected"
                      ? ("rejected" as const)
                      : attached?.status === "needs_reissue"
                        ? ("needs_reissue" as const)
                        : null;
                    return {
                      id: it.id,
                      name: it.name,
                      mandatory: !!it.mandatory,
                      notes: it.notes ?? null,
                      status,
                      attachedFileName: attached?.file_name ?? null,
                      isExtra: extraItems.some((e) => e.id === it.id),
                    };
                  });
                // Docs uploaded but not (yet) linked to any checklist item — eligible for manual linking.
                const linkableDocs = docs
                  .filter((doc) => {
                    const t1 = doc.document_type === "Other" ? (doc.custom_type ?? "") : doc.document_type;
                    const t2 = doc.custom_type ?? "";
                    return !checklistItems.some((it) => it.name === t1 || it.name === t2);
                  })
                  .map((doc) => ({
                    id: doc.id,
                    file_name: doc.file_name,
                    label: doc.document_type === "Other" ? (doc.custom_type ?? "Other") : doc.document_type,
                  }));
                return (
                  <SectionBuilderCard
                    key={sec.id}
                    clientId={client.id}
                    section={sec}
                    allSections={sections}
                    documents={sectionDocs}
                    canEdit={canUpload}
                    isAdmin={isAdmin}
                    canDelete={canDeleteDocs}
                    onChanged={load}
                    pendingChecklist={pendingChecklist}
                    linkableDocs={linkableDocs}
                    onLinkDocToChecklist={linkDocToChecklist}
                    onRemoveChecklistItem={(itemId, itemName, mandatory, isExtra) =>
                      isExtra
                        ? onRemoveExtraItem(itemId)
                        : onSuppressTemplateItem(itemId, itemName, mandatory)
                    }
                  />
                );
              })}
            </div>
          )}

          {/* Mirrored workspaces for non-applicant people on the case */}
          {people.filter((p) => p.role !== "applicant").length > 0 && (
            <div className="space-y-4">
              <div className="font-semibold text-sm">People on this file</div>
              {people
                .filter((p) => p.role !== "applicant")
                .map((p) => (
                  <PersonWorkspaceCard
                    key={p.id}
                    client={client}
                    person={p}
                    canEdit={canUpload}
                    isAdmin={isAdmin}
                    onChanged={load}
                  />
                ))}
            </div>
          )}

          {secondaryLoading && binders.length === 0 && trashedDocs.length === 0 && (
            <Card className="overflow-hidden shadow-elev-sm">
              <div className="px-6 py-4 border-b">
                <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                <div className="h-3 w-24 bg-muted rounded animate-pulse mt-2" />
              </div>
              <div className="divide-y">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="px-6 py-3 flex items-center gap-3">
                    <div className="size-4 bg-muted rounded animate-pulse shrink-0" />
                    <div className="flex-1">
                      <div className="h-3.5 w-56 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-32 bg-muted rounded animate-pulse mt-1.5" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {binders.length > 0 && (
            <Card className="overflow-hidden shadow-elev-sm">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div>
                  <div className="font-semibold">Generated binders</div>
                  <div className="text-xs text-muted-foreground">{binders.length} binder{binders.length === 1 ? "" : "s"}</div>
                </div>
                <Button variant="outline" size="sm" onClick={onDownloadAllBinders}>
                  <Download className="size-3.5 mr-1.5" /> Download all (.zip)
                </Button>
              </div>
              <div className="divide-y">
                {binders.map((b) => (
                  <div key={b.id} className="px-6 py-3 flex items-center gap-3">
                    <FileCheck2 className="size-4 text-secondary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{b.file_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.group_label ? <span className="font-semibold text-secondary mr-1">{b.group_label}</span> : null}
                        {new Date(b.generated_at).toLocaleString()}
                      </div>
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

          {trashedDocs.length > 0 && (
            <Card className="overflow-hidden shadow-elev-sm">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    <Trash2 className="size-4 text-destructive" /> Trash · Recycle bin
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Items are kept for 30 days. After that, an admin can permanently delete them.
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{trashedDocs.length} item{trashedDocs.length === 1 ? "" : "s"}</div>
              </div>
              <div className="divide-y">
                {trashedDocs.map((d) => {
                  const deletedAt = d.deleted_at ? new Date(d.deleted_at) : null;
                  const expiresAt = deletedAt ? new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
                  const expired = expiresAt ? expiresAt.getTime() < Date.now() : false;
                  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : 0;
                  const byName = d.deleted_by ? (trashUserNames[d.deleted_by] ?? "Unknown") : "Unknown";
                  return (
                    <div key={d.id} className="px-6 py-3 flex items-center gap-3">
                      <FileText className="size-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate line-through text-muted-foreground">{d.file_name}</div>
                        <div className="text-xs text-muted-foreground">
                          Deleted by <span className="font-medium">{byName}</span>
                          {deletedAt ? <> · {deletedAt.toLocaleString()}</> : null}
                          {" · "}
                          {expired
                            ? <span className="text-destructive font-semibold">Eligible for permanent deletion</span>
                            : <span>Auto-purges in {daysLeft} day{daysLeft === 1 ? "" : "s"}</span>}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => onRestore(d)}>Restore</Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onPermanentDelete(d)}
                          disabled={!expired}
                          title={expired ? "Permanently delete" : "Available after 30-day retention"}
                        >
                          Delete forever
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right: upload */}
        <div className="space-y-4">
          <ClientAccessCard
            clientId={client.id}
            ownerId={client.owner_id ?? null}
            createdBy={client.created_by ?? null}
            onOwnerChanged={load}
            onManageClick={() => setAccessOpen(true)}
          />
          <InviteClientCard clientId={client.id} defaultEmail={(client as any).email ?? null} />
          <CustomBindersPanel
            clientId={client.id}
            clientName={client.full_name}
            sections={sections}
            docsBySection={sections.reduce((acc, s) => {
              acc[s.id] = docs.filter((d) => d.section_id === s.id).map((d) => ({
                id: d.id, document_type: d.document_type, custom_type: d.custom_type,
                file_name: d.file_name, storage_path: d.storage_path, mime_type: d.mime_type,
                size_bytes: d.size_bytes, section_id: d.section_id ?? null,
                section_order: d.section_order ?? 0, uploaded_at: d.uploaded_at, version: d.version,
              }));
              return acc;
            }, {} as Record<string, SectionDoc[]>)}
            requiredItems={checklistItems.map((it) => ({ id: it.id, name: it.name, mandatory: !!it.mandatory }))}
            canGenerate={canUpload}
            isAdmin={isAdmin}
            onGenerated={load}
          />
          <CasePeopleCard
            clientId={client.id}
            canEdit={canUpload}
            isAdmin={isAdmin}
            onChange={setPeople}
          />
          {canUpload ? (
            <Card className="overflow-hidden shadow-elev-sm">
              <Accordion type="single" collapsible>
                <AccordionItem value="advanced" className="border-0">
                  <AccordionTrigger className="px-5 py-3 hover:no-underline">
                    <div className="text-left">
                      <div className="text-sm font-semibold">Advanced: split a multi-doc PDF</div>
                      <div className="text-[11px] text-muted-foreground">
                        Only for binders that contain several documents in one PDF. Default uploads belong inside a section.
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="px-3 pb-3">
                      <SmartUploadZone
                        client={client}
                        templateTypes={checklistItems.map((it) => it.name)}
                        people={people}
                        onUploaded={load}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          ) : (
            <Card className="p-6 text-center text-sm text-muted-foreground">Read-only access.</Card>
          )}
        </div>
      </div>
      <ShareLinkDialog open={!!shareTarget} onOpenChange={(o) => !o && setShareTarget(null)} target={shareTarget} />
      {client && (
        <div className="px-8 pb-8 space-y-6">
          <QuickActionsBar
            clientId={client.id}
            clientName={client.full_name}
            phone={(client as Client & { phone?: string | null }).phone ?? null}
            email={(client as Client & { email?: string | null }).email ?? null}
          />
          <AiSummaryPanel clientId={client.id} />
          <div className="grid lg:grid-cols-2 gap-6">
            <ClientTasksCard clientId={client.id} />
            <HandoffHistoryCard clientId={client.id} />
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <ClientEmailCard clientId={client.id} defaultTo={(client as Client & { email?: string | null }).email ?? null} />
            <ClientVoiceNotesCard clientId={client.id} />
          </div>
          <ClientChatWorkspace clientId={client.id} />
          <ClientTimelineCard clientId={client.id} />
        </div>
      )}
      <AddSectionDialog open={addSectionOpen} onOpenChange={setAddSectionOpen} onCreated={load} />
      <AddDocTypeDialog
        open={addDocOpen}
        onOpenChange={setAddDocOpen}
        existingTypes={checklistItems.map((it) => it.name)}
        onAdd={onAddExtraItem}
      />
      {client && (
        <ClientAccessDialog
          open={accessOpen}
          onOpenChange={setAccessOpen}
          clientId={client.id}
          clientName={client.full_name}
        />
      )}
      {client && (
        <HandoffDialog
          open={handoffOpen}
          onOpenChange={setHandoffOpen}
          clientId={client.id}
          clientName={client.full_name}
        />
      )}
      {client && (
        <AddRemarkDialog
          open={remarkOpen}
          onOpenChange={setRemarkOpen}
          clientId={client.id}
        />
      )}
    </AppLayout>
  );
};

export default ClientDetail;