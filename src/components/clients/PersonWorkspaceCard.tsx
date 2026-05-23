import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  UserCircle2, ChevronDown, ChevronRight, Upload, FileText, CheckCircle2, XCircle,
  Loader2, FileCheck2, MessageSquare, Plus, Trash2, Link2, RefreshCw, Eye, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { processToPdf } from "@/lib/processFile";
import { buildPersonDocumentName, sanitizeName } from "@/lib/constants";
import { generateBinder } from "@/lib/binder";
import { openClientDocument } from "@/lib/documentPreview";
import { listTimeline, type TimelineRow } from "@/lib/timeline";
import { logActivity } from "@/lib/activity";
import { inferSectionId } from "@/lib/sections";
import { ROLE_LABEL, ROLE_SHORT, type CasePerson } from "@/lib/casePeople";
import {
  buildPersonChecklist, computeCompleteness, computeReadinessTier, readinessLabel,
  readinessChipClass, buildSuggestedBinder, appendPersonTimeline,
  personScopedDocs, personScopedExtras, personScopedSuppressed,
  type PersonChecklistItem, type PersonExtraItem,
} from "@/lib/personWorkspace";
import { BINDER_PRESETS } from "@/lib/binderPresets";

interface PersonDoc {
  id: string;
  client_id: string;
  person_id: string | null;
  document_type: string;
  custom_type: string | null;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  version: number;
  uploaded_at: string;
  status: string | null;
  is_shared?: boolean | null;
}

interface ClientLite {
  id: string;
  full_name: string;
  application_id: string;
  country: string;
  application_type: string;
  extra_items?: PersonExtraItem[] | null;
  suppressed_template_items?: (string | { id: string; person_id?: string | null })[] | null;
}

interface BinderRow {
  id: string;
  file_name: string;
  storage_path: string;
  generated_at: string;
}

interface Props {
  client: ClientLite;
  person: CasePerson;
  canEdit: boolean;
  isAdmin: boolean;
  onChanged?: () => void;
}

const statusBadge = (status: string | null | undefined) => {
  const s = status ?? "received";
  if (s === "verified") return <Badge variant="outline" className="bg-success/10 text-success border-success/30">Verified</Badge>;
  if (s === "rejected") return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Rejected</Badge>;
  if (s === "needs_reissue") return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400">Needs reissue</Badge>;
  return <Badge variant="outline">Received</Badge>;
};

export const PersonWorkspaceCard = ({ client, person, canEdit, isAdmin, onChanged }: Props) => {
  const [open, setOpen] = useState(true);
  const [docs, setDocs] = useState<PersonDoc[]>([]);
  const [binders, setBinders] = useState<BinderRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generatingBinder, setGeneratingBinder] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [remarkOpen, setRemarkOpen] = useState(false);
  const [remarkText, setRemarkText] = useState("");
  const [pendingLinkDocId, setPendingLinkDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: d }, { data: b }, tl] = await Promise.all([
      supabase
        .from("client_documents")
        .select("id,client_id,person_id,document_type,custom_type,file_name,storage_path,mime_type,size_bytes,version,uploaded_at,status,is_shared")
        .eq("client_id", client.id)
        .eq("person_id", person.id)
        .is("deleted_at", null)
        .order("uploaded_at", { ascending: false }),
      supabase
        .from("binders")
        .select("id,file_name,storage_path,generated_at,metadata")
        .eq("client_id", client.id)
        .order("generated_at", { ascending: false }),
      listTimeline(client.id, 200).catch(() => [] as TimelineRow[]),
    ]);
    setDocs((d ?? []) as PersonDoc[]);
    setBinders(
      ((b ?? []) as { id: string; file_name: string; storage_path: string; generated_at: string; metadata: Record<string, unknown> | null }[])
        .filter((r) => (r.metadata as { person_id?: string } | null)?.person_id === person.id)
        .map((r) => ({ id: r.id, file_name: r.file_name, storage_path: r.storage_path, generated_at: r.generated_at })),
    );
    setTimeline(
      (tl ?? []).filter((t) => (t.metadata as { person_id?: string } | null)?.person_id === person.id),
    );
    setLoading(false);
  }, [client.id, person.id]);

  useEffect(() => { void load(); }, [load]);

  // Per-person extras + suppressed (namespaced via person_id in JSON).
  const extras = useMemo(
    () => personScopedExtras((client.extra_items ?? []) as PersonExtraItem[], person.id),
    [client.extra_items, person.id],
  );
  const suppressed = useMemo(
    () => personScopedSuppressed(client.suppressed_template_items ?? null, person.id),
    [client.suppressed_template_items, person.id],
  );

  const checklist: PersonChecklistItem[] = useMemo(
    () => buildPersonChecklist(person.role, undefined, extras, suppressed),
    [person.role, extras, suppressed],
  );

  const completeness = useMemo(() => computeCompleteness(checklist, docs), [checklist, docs]);
  const tier = useMemo(() => computeReadinessTier(completeness), [completeness]);
  const suggestedBinder = useMemo(
    () => buildSuggestedBinder(BINDER_PRESETS[person.role].types, docs),
    [person.role, docs],
  );

  // Match checklist items to their latest non-rejected doc (if any).
  const docByItem = useMemo(() => {
    const m = new Map<string, PersonDoc | undefined>();
    for (const it of checklist) {
      const found = docs.find((d) => {
        const t1 = d.document_type === "Other" ? d.custom_type ?? "" : d.document_type;
        const t2 = d.custom_type ?? "";
        return (t1 === it.name || t2 === it.name) && d.status !== "rejected" && d.status !== "needs_reissue";
      });
      m.set(it.id, found);
    }
    return m;
  }, [checklist, docs]);

  // Unlinked docs available for manual linking to a checklist item.
  const unlinkedDocs = useMemo(() => {
    const names = new Set(checklist.map((it) => it.name));
    return docs.filter((d) => {
      const t1 = d.document_type === "Other" ? d.custom_type ?? "" : d.document_type;
      const t2 = d.custom_type ?? "";
      return !names.has(t1) && !names.has(t2);
    });
  }, [checklist, docs]);

  /* ──────────────── Upload ──────────────── */

  const onPickFile = () => fileInputRef.current?.click();

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const baseName = buildPersonDocumentName("Other", ROLE_SHORT[person.role], person.full_name, 1, "pdf").replace(/\.pdf$/, "");
        const processed = await processToPdf(file, baseName);
        const path = `${client.id}/${person.id}/${sanitizeName("Other")}/${Date.now()}_${processed.name}`;
        const { error: upErr } = await supabase.storage
          .from("client-documents")
          .upload(path, processed, { contentType: "application/pdf" });
        if (upErr) throw upErr;
        const sectionId = await inferSectionId("Other").catch(() => null);
        const { data: ins, error: insErr } = await supabase
          .from("client_documents")
          .insert({
            client_id: client.id,
            person_id: person.id,
            is_shared: false,
            document_type: "Other",
            custom_type: null,
            file_name: processed.name,
            storage_path: path,
            mime_type: "application/pdf",
            size_bytes: processed.size,
            version: 1,
            status: "received",
            section_id: sectionId,
          })
          .select()
          .single();
        if (insErr) throw insErr;
        await logActivity("document.uploaded", "document", ins.id, {
          client_id: client.id, person_id: person.id, person_name: person.full_name, person_role: person.role,
        });
        await appendPersonTimeline({
          clientId: client.id, personId: person.id,
          eventType: "person_document_uploaded",
          summary: `Document uploaded for ${person.full_name}: ${processed.name}`,
          metadata: { document_id: ins.id, file_name: processed.name, person_role: person.role },
        });
      }
      toast.success("Uploaded");
      await load();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* ──────────────── Doc actions ──────────────── */

  const linkDocToItem = async (docId: string, itemName: string) => {
    const { error } = await supabase
      .from("client_documents")
      .update({ custom_type: itemName })
      .eq("id", docId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Linked to "${itemName}"`);
    setPendingLinkDocId(null);
    await load();
  };

  const setDocStatus = async (doc: PersonDoc, status: "verified" | "rejected" | "needs_reissue" | "received") => {
    const { error } = await supabase
      .from("client_documents")
      .update({ status })
      .eq("id", doc.id);
    if (error) { toast.error(error.message); return; }
    await appendPersonTimeline({
      clientId: client.id, personId: person.id,
      eventType: status === "verified" ? "person_document_verified" : "person_document_status_changed",
      summary: `${doc.file_name} marked ${status.replace("_", " ")}`,
      metadata: { document_id: doc.id, status },
    });
    await load();
  };

  const onDeleteDoc = async (doc: PersonDoc) => {
    if (!confirm(`Move ${doc.file_name} to Trash?`)) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("client_documents")
      .update({ deleted_at: new Date().toISOString(), deleted_by: u?.user?.id ?? null })
      .eq("id", doc.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Moved to Trash");
    await load();
  };

  /* ──────────────── Extras & suppression (per-person) ──────────────── */

  const addExtraItem = async () => {
    const name = prompt(`Add a required document for ${person.full_name}:`);
    if (!name?.trim()) return;
    const next: PersonExtraItem[] = [
      ...((client.extra_items ?? []) as PersonExtraItem[]),
      { id: `extra:${Math.random().toString(36).slice(2, 10)}`, name: name.trim(), mandatory: true, person_id: person.id },
    ];
    const { error } = await supabase.from("clients").update({ extra_items: next as never }).eq("id", client.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Added "${name.trim()}"`);
    onChanged?.();
  };

  const removeChecklistItem = async (item: PersonChecklistItem) => {
    if (!confirm(`Remove "${item.name}" from ${person.full_name}'s checklist?`)) return;
    if (item.isExtra) {
      const next = ((client.extra_items ?? []) as PersonExtraItem[]).filter((e) => e.id !== item.id);
      const { error } = await supabase.from("clients").update({ extra_items: next as never }).eq("id", client.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const current = (client.suppressed_template_items ?? []) as (string | { id: string; person_id?: string | null })[];
      const next = [...current, { id: item.id, person_id: person.id }];
      const { error } = await supabase.from("clients").update({ suppressed_template_items: next as never }).eq("id", client.id);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(`Removed "${item.name}"`);
    onChanged?.();
  };

  /* ──────────────── Binder ──────────────── */

  const onGeneratePersonBinder = async (only?: string[]) => {
    if (docs.length === 0) { toast.error("No documents to include"); return; }
    const selected = only && only.length
      ? docs.filter((d) => only.includes(d.id))
      : docs;
    if (selected.length === 0) { toast.error("Selected preset has no matching documents yet"); return; }
    setGeneratingBinder(true);
    try {
      const pdf = await generateBinder({
        clientName: `${client.full_name} — ${ROLE_LABEL[person.role]} (${person.full_name})`,
        applicationId: client.application_id,
        country: client.country,
        applicationType: client.application_type,
        templateName: BINDER_PRESETS[person.role].label,
        items: checklist.map((it) => ({ name: it.name, mandatory: it.mandatory, notes: it.notes ?? undefined })),
        documents: selected.map((d) => ({
          id: d.id,
          document_type: d.document_type,
          custom_type: d.custom_type,
          file_name: d.file_name,
          storage_path: d.storage_path,
          version: d.version,
        })),
        groupLabel: BINDER_PRESETS[person.role].label,
      });
      const fileName = `${sanitizeName(person.full_name)}_${sanitizeName(BINDER_PRESETS[person.role].label)}_${Date.now()}.pdf`;
      const path = `${client.id}/${person.id}/binders/${fileName}`;
      const { error: upErr } = await supabase.storage
        .from("client-documents")
        .upload(path, pdf, { contentType: "application/pdf" });
      if (upErr) throw upErr;
      const { data: br, error: brErr } = await supabase
        .from("binders")
        .insert({
          client_id: client.id,
          file_name: fileName,
          storage_path: path,
          size_bytes: pdf.byteLength,
          group_label: BINDER_PRESETS[person.role].label,
          scope: "person",
          metadata: { person_id: person.id, person_role: person.role } as never,
        })
        .select()
        .single();
      if (brErr) throw brErr;
      await appendPersonTimeline({
        clientId: client.id, personId: person.id,
        eventType: "person_binder_created",
        summary: `${BINDER_PRESETS[person.role].label} generated for ${person.full_name}`,
        metadata: { binder_id: br.id, file_name: fileName, included_count: selected.length },
      });
      toast.success("Binder created");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Binder generation failed");
    } finally {
      setGeneratingBinder(false);
    }
  };

  /* ──────────────── Remark ──────────────── */

  const onSaveRemark = async () => {
    const text = remarkText.trim();
    if (!text) return;
    await appendPersonTimeline({
      clientId: client.id, personId: person.id,
      eventType: "person_remark",
      summary: text,
      metadata: { person_role: person.role, person_name: person.full_name },
    });
    setRemarkText("");
    setRemarkOpen(false);
    await load();
  };

  /* ──────────────── Render ──────────────── */

  const roleChipClass =
    person.role === "applicant" ? "bg-primary/10 text-primary"
    : person.role === "co_applicant" ? "bg-secondary/10 text-secondary"
    : person.role === "sponsor" || person.role === "co_sponsor" ? "bg-success/10 text-success"
    : "bg-muted text-muted-foreground";

  const missingPreview = completeness.mandatoryMissing.slice(0, 3);
  const missingMore = Math.max(0, completeness.mandatoryMissing.length - missingPreview.length);

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-6 py-4 border-b flex items-center gap-3 text-left hover:bg-muted/40"
      >
        {open ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
        <UserCircle2 className="size-5 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{person.full_name}</span>
            <span className={`text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded ${roleChipClass}`}>
              {ROLE_LABEL[person.role]}
            </span>
            {person.relationship && <span className="text-xs text-muted-foreground">· {person.relationship}</span>}
            <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded border ${readinessChipClass(tier)}`}>
              {readinessLabel(tier)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            <span className="font-mono">{completeness.requiredReceived}/{completeness.requiredTotal} required · {completeness.percent}%</span>
            <div className="h-1.5 w-32 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${completeness.percent}%` }} />
            </div>
            {completeness.rejectedCount > 0 && <span className="text-destructive">· {completeness.rejectedCount} rejected</span>}
            {missingPreview.length > 0 && (
              <span title={completeness.mandatoryMissing.join(" · ")}>
                Missing: {missingPreview.join(" · ")}{missingMore > 0 ? ` · +${missingMore} more` : ""}
              </span>
            )}
          </div>
        </div>
      </button>

      {open && (
        <div className="px-6 py-4 space-y-5">
          {/* Basic details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {person.date_of_birth && <div><div className="text-muted-foreground">Date of birth</div><div>{person.date_of_birth}</div></div>}
            {person.passport_number && <div><div className="text-muted-foreground">Passport</div><div className="font-mono">{person.passport_number}</div></div>}
            {person.gender && <div><div className="text-muted-foreground">Gender</div><div>{person.gender}</div></div>}
            <div><div className="text-muted-foreground">Documents</div><div>{docs.length} on file</div></div>
          </div>

          {/* Suggested binder */}
          {BINDER_PRESETS[person.role].types.length > 0 && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 flex items-center gap-3 flex-wrap">
              <Sparkles className="size-4 text-primary" />
              <div className="text-sm flex-1 min-w-0">
                <div className="font-medium">{BINDER_PRESETS[person.role].label}</div>
                <div className="text-xs text-muted-foreground">
                  {suggestedBinder.matchedTypes.length}/{BINDER_PRESETS[person.role].types.length} ready
                  {suggestedBinder.missingTypes.length > 0 && (
                    <> · missing: <span className="text-foreground/80">{suggestedBinder.missingTypes.slice(0, 3).join(", ")}{suggestedBinder.missingTypes.length > 3 ? "…" : ""}</span></>
                  )}
                </div>
              </div>
              {canEdit && (
                <Button size="sm" variant="outline" disabled={generatingBinder || suggestedBinder.selectedDocIds.length === 0}
                  onClick={() => onGeneratePersonBinder(suggestedBinder.selectedDocIds)}>
                  {generatingBinder ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <FileCheck2 className="size-3.5 mr-1" />}
                  Generate
                </Button>
              )}
            </div>
          )}

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Documents checklist</div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={addExtraItem}><Plus className="size-3.5 mr-1" /> Add</Button>
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
                  <Button size="sm" onClick={onPickFile} disabled={uploading}>
                    {uploading ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Upload className="size-3.5 mr-1" />}
                    Upload
                  </Button>
                </div>
              )}
            </div>
            <div className="border rounded-md divide-y">
              {checklist.length === 0 && (
                <div className="px-3 py-4 text-xs text-muted-foreground text-center">No checklist items.</div>
              )}
              {checklist.map((it) => {
                const doc = docByItem.get(it.id);
                return (
                  <div key={it.id} className="px-3 py-2 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm flex items-center gap-2 flex-wrap">
                        <span className={doc ? "" : "text-muted-foreground"}>{it.name}</span>
                        {it.mandatory && <span className="text-[10px] uppercase font-semibold text-destructive">required</span>}
                        {it.isPreset && <span className="text-[10px] uppercase font-semibold text-muted-foreground">preset</span>}
                        {it.isExtra && <span className="text-[10px] uppercase font-semibold text-muted-foreground">extra</span>}
                      </div>
                      {it.notes && <div className="text-xs text-muted-foreground">{it.notes}</div>}
                      {doc && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <FileText className="size-3" /> {doc.file_name} · v{doc.version}
                        </div>
                      )}
                    </div>
                    {doc ? (
                      <>
                        {statusBadge(doc.status)}
                        <Button size="icon" variant="ghost" className="size-7" title="Preview"
                          onClick={() => openClientDocument(doc)}><Eye className="size-3.5" /></Button>
                        {canEdit && doc.status !== "verified" && (
                          <Button size="icon" variant="ghost" className="size-7 text-success" title="Mark verified"
                            onClick={() => setDocStatus(doc, "verified")}><CheckCircle2 className="size-3.5" /></Button>
                        )}
                        {canEdit && doc.status !== "rejected" && (
                          <Button size="icon" variant="ghost" className="size-7 text-destructive" title="Reject"
                            onClick={() => setDocStatus(doc, "rejected")}><XCircle className="size-3.5" /></Button>
                        )}
                      </>
                    ) : (
                      <>
                        {canEdit && unlinkedDocs.length > 0 && (
                          <div className="relative">
                            <Button size="sm" variant="outline" onClick={() => setPendingLinkDocId(pendingLinkDocId === it.id ? null : it.id)}>
                              <Link2 className="size-3.5 mr-1" /> Link
                            </Button>
                            {pendingLinkDocId === it.id && (
                              <div className="absolute right-0 mt-1 w-64 z-10 bg-popover border rounded-md shadow-md p-1 max-h-60 overflow-auto">
                                {unlinkedDocs.map((d) => (
                                  <button key={d.id} type="button"
                                    className="w-full text-left text-xs px-2 py-1.5 hover:bg-accent rounded"
                                    onClick={() => linkDocToItem(d.id, it.name)}>
                                    {d.file_name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                      </>
                    )}
                    {canEdit && (it.isExtra || it.isPreset) && (
                      <Button size="icon" variant="ghost" className="size-7 text-muted-foreground" title="Remove from checklist"
                        onClick={() => removeChecklistItem(it)}><Trash2 className="size-3.5" /></Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unlinked docs */}
          {unlinkedDocs.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1.5">Other uploads ({unlinkedDocs.length})</div>
              <div className="border rounded-md divide-y">
                {unlinkedDocs.map((d) => (
                  <div key={d.id} className="px-3 py-2 flex items-center gap-2 text-sm">
                    <FileText className="size-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{d.file_name}</span>
                    {statusBadge(d.status)}
                    <Button size="icon" variant="ghost" className="size-7" title="Preview"
                      onClick={() => openClientDocument(d)}><Eye className="size-3.5" /></Button>
                    {canEdit && (
                      <Button size="icon" variant="ghost" className="size-7 text-destructive" title="Delete"
                        onClick={() => onDeleteDoc(d)}><Trash2 className="size-3.5" /></Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Person binders */}
          {binders.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1.5">Generated binders</div>
              <div className="border rounded-md divide-y">
                {binders.map((b) => (
                  <div key={b.id} className="px-3 py-2 flex items-center gap-2 text-sm">
                    <FileCheck2 className="size-4 text-secondary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{b.file_name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(b.generated_at).toLocaleString()}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={async () => {
                      const { data } = await supabase.storage.from("client-documents").download(b.storage_path);
                      if (!data) return;
                      const url = URL.createObjectURL(data);
                      const a = document.createElement("a"); a.href = url; a.download = b.file_name; a.click();
                      URL.revokeObjectURL(url);
                      await appendPersonTimeline({
                        clientId: client.id, personId: person.id,
                        eventType: "person_binder_downloaded",
                        summary: `Binder downloaded: ${b.file_name}`,
                        metadata: { binder_id: b.id },
                      });
                    }}>
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remarks + activity */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setRemarkOpen((v) => !v)}>
              <MessageSquare className="size-3.5 mr-1" /> Add remark
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowActivity((v) => !v)}>
              {showActivity ? "Hide" : "Show"} activity ({timeline.length})
            </Button>
            <Button size="sm" variant="ghost" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`size-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
          {remarkOpen && (
            <div className="space-y-2">
              <Textarea value={remarkText} onChange={(e) => setRemarkText(e.target.value)} rows={3} placeholder={`Note for ${person.full_name}…`} />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setRemarkOpen(false); setRemarkText(""); }}>Cancel</Button>
                <Button size="sm" onClick={onSaveRemark} disabled={!remarkText.trim()}>Save remark</Button>
              </div>
            </div>
          )}
          {showActivity && (
            <div className="border rounded-md divide-y max-h-64 overflow-auto">
              {timeline.length === 0 && <div className="px-3 py-4 text-xs text-muted-foreground text-center">No activity for this person yet.</div>}
              {timeline.map((t) => (
                <div key={t.id} className="px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{t.event_type.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">{new Date(t.created_at).toLocaleString()}</span>
                  </div>
                  {t.summary && <div className="text-muted-foreground mt-0.5">{t.summary}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default PersonWorkspaceCard;