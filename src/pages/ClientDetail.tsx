import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download, FileText, FileCheck2, Eye, Trash2, Loader2, AlertCircle, Link2, Sparkles, FolderArchive, ShieldCheck, Plus, X, FileSearch, Unlink } from "lucide-react";
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
import { LetterCard } from "@/components/letters/LetterCard";
import { extractFirstPageText, renderPdfPagesToJpegDataUrls } from "@/lib/extractFirstPageText";
import { mergeExtractedFields } from "@/lib/extractedFields";
import { CasePeopleCard } from "@/components/clients/CasePeopleCard";
import { ClientFormsCard } from "@/components/clients/ClientFormsCard";
import { SectionBuilderCard, type SectionDoc } from "@/components/clients/SectionBuilderCard";
import { CustomBindersPanel } from "@/components/clients/CustomBindersPanel";
import { AddSectionDialog } from "@/components/clients/AddSectionDialog";
import { loadSections, inferSectionId, type CaseSection } from "@/lib/sections";
import { isChecklistAlias } from "@/lib/checklist";
import type { CasePerson } from "@/lib/casePeople";
import JSZip from "jszip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { openClientDocument } from "@/lib/documentPreview";

interface Client {
  id: string; full_name: string; application_id: string; country: string;
  application_type: string; template_id: string | null; status: string;
  extra_items?: ExtraItem[] | null;
  suppressed_template_items?: string[] | null;
}

interface Doc {
  id: string; client_id: string; document_type: string; custom_type: string | null;
  file_name: string; storage_path: string; mime_type: string | null;
  size_bytes: number | null; version: number; uploaded_at: string;
  section_id?: string | null;
  section_order?: number;
}

interface BinderRow {
  id: string; file_name: string; storage_path: string; generated_at: string; group_label: string | null;
}

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { canUpload, isAdmin } = useAuth();
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

  const load = useCallback(async () => {
    if (!id) return;
    const { data: c } = await supabase.from("clients").select("*").eq("id", id).single();
    setClient(c as unknown as Client | null);
    if (c?.template_id) {
      const { data: t } = await supabase.from("workflow_templates").select("*").eq("id", c.template_id).single();
      setTemplate(t as unknown as Template | null);
    } else { setTemplate(null); }
    const { data: d } = await supabase.from("client_documents").select("*").eq("client_id", id).order("uploaded_at", { ascending: false });
    setDocs((d ?? []) as Doc[]);
    const { data: b } = await supabase.from("binders").select("id,file_name,storage_path,generated_at,group_label").eq("client_id", id).order("generated_at", { ascending: false });
    setBinders((b ?? []) as BinderRow[]);
    setSections(await loadSections(true));
  }, [id]);

  useEffect(() => { load(); }, [load]);

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

  const docByType = (typeName: string): Doc | undefined => {
    const matches = docs.filter((d) => {
      // Primary type label on the doc — what the user sees.
      const t1 = d.document_type === "Other" ? (d.custom_type ?? "") : d.document_type;
      // Secondary label — markChecklistItemReady writes the matched checklist
      // name here so we always check it as a "linked checklist item" hint.
      const t2 = d.custom_type ?? "";
      if (t1 === typeName || t2 === typeName) return true;
      if (t1 && isChecklistAlias(t1, typeName)) return true;
      if (t2 && t2 !== t1 && isChecklistAlias(t2, typeName)) return true;
      return false;
    });
    return matches.sort((a, b) => b.version - a.version)[0];
  };

  const suppressedIds = new Set<string>(client?.suppressed_template_items ?? []);
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const tplItemNames = new Set((template?.items ?? []).map((it) => norm(it.name)));
  // Hide extras whose name duplicates a template item — those are leftovers
  // from an earlier "Add document" press and shouldn't show as a separate row.
  const extraItems: ExtraItem[] = (
    (client?.extra_items as ExtraItem[] | null | undefined) ?? []
  ).filter((e) => !tplItemNames.has(norm(e.name)));
  const visibleTemplateItems = (template?.items ?? []).filter((it) => !suppressedIds.has(it.id));
  const checklistItems: TemplateItem[] = [
    ...visibleTemplateItems,
    ...extraItems.map((e) => ({ id: e.id, name: e.name, mandatory: !!e.mandatory, notes: e.notes })),
  ];
  const completed = checklistItems.filter((it) => docByType(it.name)).length;
  const requiredMissing = checklistItems.filter((it) => it.mandatory && !docByType(it.name));

  /** Sectioned view of the checklist. If the assigned template defines `groups`,
   *  we honour that hierarchy. Extra items (added per-client) are appended to
   *  a synthetic "Added requirements" section at the end. Otherwise we fall
   *  back to a single flat section. */
  const checklistSections: Array<{ id: string; label: string; items: TemplateItem[] }> = (() => {
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
  })();

  const onDelete = async (d: Doc) => {
    if (!confirm(`Delete ${d.file_name}?`)) return;
    await supabase.storage.from("client-documents").remove([d.storage_path]);
    await supabase.from("client_documents").delete().eq("id", d.id);
    await logActivity("document.deleted", "document", d.id, { file_name: d.file_name });
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
              <div className="flex items-center gap-3">
                {requiredMissing.length > 0 && (
                  <div className="text-xs text-secondary flex items-center gap-1.5 font-medium">
                    <AlertCircle className="size-3.5" /> {requiredMissing.length} required missing
                  </div>
                )}
                {canUpload && (
                  <Button size="sm" variant="outline" onClick={() => setAddDocOpen(true)}>
                    <Plus className="size-3.5 mr-1" /> Add document
                  </Button>
                )}
              </div>
            </div>
            {!template && (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                No workflow template assigned. Edit this client to assign one, or create templates first.
              </div>
            )}
            <div className="divide-y">
              {(() => {
                let runningIdx = 0;
                return checklistSections.map((sec) => {
                  const secReady = sec.items.filter((it) => docByType(it.name)).length;
                  return (
                    <div key={sec.id}>
                      <div className="px-6 py-2.5 bg-muted/40 flex items-center justify-between">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{sec.label}</div>
                        <div className="text-[11px] text-muted-foreground tabular-nums">{secReady}/{sec.items.length} ready</div>
                      </div>
                      {sec.items.map((it) => {
                        runningIdx += 1;
                        const i = runningIdx - 1;
                        const d = docByType(it.name);
                        const isExtra = extraItems.some((e) => e.id === it.id);
                        const linkableDocs = docs.filter((doc) => {
                          const t1 = doc.document_type === "Other" ? (doc.custom_type ?? "") : doc.document_type;
                          const t2 = doc.custom_type ?? "";
                          return t1 !== it.name && t2 !== it.name;
                        });
                        return (
                          <div key={it.id} className="px-6 py-3.5 flex items-center gap-4 border-t">
                            <div className="text-xs font-mono tabular-nums text-muted-foreground w-6">{String(i+1).padStart(2,"0")}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        {it.name}
                        {it.mandatory && <span className="text-secondary text-[10px]">REQUIRED</span>}
                        {isExtra && <span className="text-[10px] uppercase font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Added</span>}
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
                    {canUpload && !d && linkableDocs.length > 0 && (
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
                            {linkableDocs.map((doc) => {
                              const label = doc.document_type === "Other" ? (doc.custom_type ?? "Other") : doc.document_type;
                              return (
                                <button
                                  key={doc.id}
                                  onClick={() => linkDocToChecklist(doc.id, it.name)}
                                  className="w-full text-left px-3 py-2 hover:bg-accent text-xs"
                                >
                                  <div className="font-medium truncate">{doc.file_name}</div>
                                  <div className="text-[10px] text-muted-foreground truncate">{label}</div>
                                </button>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    {canUpload && d && d.custom_type && d.custom_type === it.name && d.document_type !== "Other" && (
                      <Button
                        size="icon" variant="ghost" className="size-7 text-muted-foreground"
                        title="Unlink this document from the checklist item (file stays uploaded)"
                        onClick={() => unlinkDocFromChecklist(d.id)}
                      >
                        <Unlink className="size-3.5" />
                      </Button>
                    )}
                    {isExtra && canUpload && !d && (
                      <Button size="icon" variant="ghost" className="size-7 text-muted-foreground" title="Remove this requirement"
                        onClick={() => onRemoveExtraItem(it.id)}>
                        <X className="size-3.5" />
                      </Button>
                    )}
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </div>
          </Card>

          <ClientProfileCard
            clientId={client.id}
            canEdit={canUpload}
            onReExtract={onReExtract}
            reExtracting={reExtracting}
            onSyncOdoo={onSyncOdoo}
            syncingOdoo={syncingOdoo}
            refreshKey={profileRefreshKey}
          />

          <LetterCard clientId={client.id} canGenerate={canUpload} onGenerated={load} />

          <ClientFormsCard
            clientId={client.id}
            country={client.country}
            category={client.application_type}
            canEdit={canUpload}
          />

          {/* Section binders — upload many docs per section, drag to order, combine into a section binder. */}
          {sections.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Sections · upload into the right one so info auto-fills there
                </div>
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={() => setAddSectionOpen(true)}>
                    <Plus className="size-3.5 mr-1.5" /> New section
                  </Button>
                )}
              </div>
              {sections.map((sec) => {
                const sectionDocs: SectionDoc[] = docs
                  .filter((d) => d.section_id === sec.id)
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
                return (
                  <SectionBuilderCard
                    key={sec.id}
                    clientId={client.id}
                    section={sec}
                    allSections={sections}
                    documents={sectionDocs}
                    canEdit={canUpload}
                    isAdmin={isAdmin}
                    onChanged={load}
                  />
                );
              })}
            </div>
          )}

          {/* Flat list — collapsed by default; section cards above are the primary surface. */}
          <Card className="overflow-hidden shadow-elev-sm">
            <Accordion type="single" collapsible>
              <AccordionItem value="flat" className="border-0">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center justify-between gap-3 flex-1">
                    <div className="text-left">
                      <div className="font-semibold">All uploaded documents (flat list)</div>
                      <div className="text-xs text-muted-foreground">
                        {docs.length} file{docs.length===1?"":"s"} · auto-renamed, PDF-converted & compressed for IRCC (≤ 4 MB)
                      </div>
                    </div>
                    {canUpload && docs.some((d) => (d.size_bytes ?? 0) > LARGE_BYTES) && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold uppercase tracking-wide">
                        Optimize available
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {canUpload && docs.some((d) => (d.size_bytes ?? 0) > LARGE_BYTES) && (
                    <div className="px-6 pb-2">
                      <Button variant="outline" size="sm" onClick={onOptimizeAll} disabled={optimizingAll}>
                        {optimizingAll ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Sparkles className="size-3.5 mr-1.5" />}
                        Re-optimize all
                      </Button>
                    </div>
                  )}
                  <div className="divide-y border-t">
              {docs.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">No documents uploaded yet.</div>
              )}
              {docs.map((d) => (
                <div key={d.id} className="px-6 py-3 flex items-center gap-3">
                  <FileText className="size-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.file_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <span>{d.custom_type ?? d.document_type}</span>
                      {d.size_bytes ? <span>· {(d.size_bytes/1024).toFixed(0)} KB</span> : null}
                      {(d.size_bytes ?? 0) <= LARGE_BYTES ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-success/10 text-success text-[10px] font-semibold uppercase tracking-wide">
                          <ShieldCheck className="size-3" /> IRCC ✓
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold uppercase tracking-wide">
                          Optimize
                        </span>
                      )}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => onView(d)}><Eye className="size-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => onDownload(d)}><Download className="size-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="size-7" title="Create share link"
                    onClick={() => setShareTarget({ type: "document", id: d.id, label: d.file_name })}>
                    <Link2 className="size-3.5" />
                  </Button>
                  <Link to={`/verification?document_id=${d.id}`} title="Verify authenticity">
                    <Button size="icon" variant="ghost" className="size-7"><FileSearch className="size-3.5" /></Button>
                  </Link>
                  {(d.size_bytes ?? 0) > LARGE_BYTES && (
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
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>

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
        </div>

        {/* Right: upload */}
        <div className="space-y-4">
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
      <AddSectionDialog open={addSectionOpen} onOpenChange={setAddSectionOpen} onCreated={load} />
      <AddDocTypeDialog
        open={addDocOpen}
        onOpenChange={setAddDocOpen}
        existingTypes={checklistItems.map((it) => it.name)}
        onAdd={onAddExtraItem}
      />
    </AppLayout>
  );
};

export default ClientDetail;