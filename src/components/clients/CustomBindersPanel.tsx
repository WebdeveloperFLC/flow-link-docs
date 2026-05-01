import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  FileCheck2, Loader2, Plus, Download, Eye, Link2, Trash2,
  ArrowUp, ArrowDown, X, CheckCircle2, AlertCircle, Pencil, FolderArchive,
} from "lucide-react";
import { combinePdfsFromStorage } from "@/lib/combinePdfs";
import { logActivity } from "@/lib/activity";
import { openClientDocument } from "@/lib/documentPreview";
import type { CaseSection } from "@/lib/sections";
import type { SectionDoc } from "@/components/clients/SectionBuilderCard";
import { ShareLinkDialog } from "@/components/documents/ShareLinkDialog";
import { toast } from "sonner";

interface RequiredItem { id: string; name: string; mandatory: boolean; }

interface BinderRow {
  id: string;
  file_name: string;
  storage_path: string;
  generated_at: string;
  group_label: string | null;
  scope: string;
  size_bytes: number | null;
  included_items: { id: string; file_name: string; section_id?: string | null }[] | null;
}

interface Props {
  clientId: string;
  clientName: string;
  sections: CaseSection[];
  docsBySection: Record<string, SectionDoc[]>;
  requiredItems: RequiredItem[];
  canGenerate: boolean;
  isAdmin: boolean;
  onGenerated: () => void;
}

const safeFileName = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") || "Binder";

export const CustomBindersPanel = ({
  clientId, clientName, sections, docsBySection, requiredItems, canGenerate, isAdmin, onGenerated,
}: Props) => {
  const [binders, setBinders] = useState<BinderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BinderRow | null>(null);
  const [shareTarget, setShareTarget] = useState<{ type: "binder"; id: string; label: string } | null>(null);

  const allDocsById = useMemo(() => {
    const map = new Map<string, SectionDoc & { sectionLabel: string }>();
    for (const s of sections) {
      for (const d of (docsBySection[s.id] ?? [])) {
        map.set(d.id, { ...d, sectionLabel: s.label });
      }
    }
    return map;
  }, [sections, docsBySection]);

  const reload = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("binders")
      .select("id,file_name,storage_path,generated_at,group_label,scope,size_bytes,included_items")
      .eq("client_id", clientId)
      .order("generated_at", { ascending: false });
    setBinders((data ?? []) as unknown as BinderRow[]);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDownload = async (b: BinderRow) => {
    const { data } = await supabase.storage.from("client-documents").download(b.storage_path);
    if (!data) { toast.error("Could not download"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a"); a.href = url; a.download = b.file_name; a.click();
    URL.revokeObjectURL(url);
  };

  const onView = async (b: BinderRow) => {
    await openClientDocument({ storagePath: b.storage_path, fileName: b.file_name, mimeType: "application/pdf" });
  };

  const onDelete = async (b: BinderRow) => {
    if (!confirm(`Delete binder "${b.file_name}"?`)) return;
    await supabase.storage.from("client-documents").remove([b.storage_path]);
    await supabase.from("binders").delete().eq("id", b.id);
    await logActivity("binder.deleted", "client", clientId, { file_name: b.file_name });
    reload();
  };

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="px-5 py-3.5 border-b flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold flex items-center gap-2">
            <FolderArchive className="size-4 text-secondary" /> Custom binders
          </div>
          <div className="text-xs text-muted-foreground">
            Create as many binders as you need — for IRCC separate uploads.
          </div>
        </div>
        {canGenerate && (
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }} className="gradient-accent text-white">
            <Plus className="size-3.5 mr-1.5" /> New binder
          </Button>
        )}
      </div>

      <div className="divide-y">
        {loading ? (
          <div className="px-5 py-6 text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-3.5 animate-spin" /> Loading binders…
          </div>
        ) : binders.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-muted-foreground">
            No binders yet. Click <span className="font-semibold">New binder</span> to build one from any documents across sections.
          </div>
        ) : (
          binders.map((b) => {
            const items = b.included_items ?? [];
            const docTypes = new Set(
              items
                .map((it) => allDocsById.get(it.id))
                .filter(Boolean)
                .map((d) => (d!.document_type === "Other" ? d!.custom_type : d!.document_type) ?? ""),
            );
            const requiredCovered = requiredItems.filter((r) => r.mandatory && docTypes.has(r.name));
            const requiredMissing = requiredItems.filter((r) => r.mandatory && !docTypes.has(r.name));
            return (
              <div key={b.id} className="px-5 py-3 space-y-2">
                <div className="flex items-center gap-3">
                  <FileCheck2 className="size-4 text-secondary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{b.group_label || b.file_name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {items.length} doc{items.length === 1 ? "" : "s"} · {new Date(b.generated_at).toLocaleString()}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="size-7" title="Preview" onClick={() => onView(b)}>
                    <Eye className="size-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="size-7" title="Download" onClick={() => onDownload(b)}>
                    <Download className="size-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="size-7" title="Share link"
                    onClick={() => setShareTarget({ type: "binder", id: b.id, label: b.group_label || b.file_name })}>
                    <Link2 className="size-3.5" />
                  </Button>
                  {canGenerate && (
                    <Button size="icon" variant="ghost" className="size-7" title="Edit"
                      onClick={() => { setEditing(b); setOpen(true); }}>
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                  {isAdmin && (
                    <Button size="icon" variant="ghost" className="size-7 text-destructive" title="Delete"
                      onClick={() => onDelete(b)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
                {requiredItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 ml-7">
                    {requiredCovered.map((r) => (
                      <span key={r.id} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-semibold">
                        <CheckCircle2 className="size-3" /> {r.name}
                      </span>
                    ))}
                    {requiredMissing.map((r) => (
                      <span key={r.id} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-secondary/10 text-secondary font-semibold">
                        <AlertCircle className="size-3" /> {r.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <BinderEditor
        open={open}
        onOpenChange={setOpen}
        clientId={clientId}
        clientName={clientName}
        sections={sections}
        docsBySection={docsBySection}
        requiredItems={requiredItems}
        editing={editing}
        onSaved={() => { reload(); onGenerated(); }}
      />

      <ShareLinkDialog
        open={!!shareTarget}
        onOpenChange={(o) => !o && setShareTarget(null)}
        target={shareTarget}
      />
    </Card>
  );
};

/* ----- Editor dialog ----- */

interface EditorProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId: string;
  clientName: string;
  sections: CaseSection[];
  docsBySection: Record<string, SectionDoc[]>;
  requiredItems: RequiredItem[];
  editing: BinderRow | null;
  onSaved: () => void;
}

const BinderEditor = ({
  open, onOpenChange, clientId, clientName, sections, docsBySection, requiredItems, editing, onSaved,
}: EditorProps) => {
  const [name, setName] = useState("");
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const allDocsById = useMemo(() => {
    const map = new Map<string, SectionDoc & { sectionLabel: string }>();
    for (const s of sections) {
      for (const d of (docsBySection[s.id] ?? [])) {
        map.set(d.id, { ...d, sectionLabel: s.label });
      }
    }
    return map;
  }, [sections, docsBySection]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.group_label || editing.file_name.replace(/\.pdf$/i, ""));
      const ids = (editing.included_items ?? [])
        .map((it) => it.id)
        .filter((id) => allDocsById.has(id));
      setOrderedIds(ids);
    } else {
      setName("");
      setOrderedIds([]);
    }
  }, [open, editing, allDocsById]);

  const selected = new Set(orderedIds);

  const toggle = (id: string) => {
    setOrderedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const move = (id: string, dir: -1 | 1) => {
    setOrderedIds((prev) => {
      const i = prev.indexOf(id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const remove = (id: string) => setOrderedIds((prev) => prev.filter((x) => x !== id));

  // Required-docs status reflecting CURRENT selection
  const docTypesInSelection = useMemo(() => {
    const set = new Set<string>();
    for (const id of orderedIds) {
      const d = allDocsById.get(id);
      if (!d) continue;
      const t = d.document_type === "Other" ? d.custom_type : d.document_type;
      if (t) set.add(t);
    }
    return set;
  }, [orderedIds, allDocsById]);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) { toast.error("Name your binder"); return; }
    if (orderedIds.length === 0) { toast.error("Pick at least one document"); return; }
    setBusy(true);
    try {
      const orderedDocs = orderedIds
        .map((id) => allDocsById.get(id))
        .filter(Boolean) as (SectionDoc & { sectionLabel: string })[];
      const bytes = await combinePdfsFromStorage(orderedDocs.map((d) => d.storage_path));
      if (!bytes.byteLength) { toast.error("Could not merge — no PDF pages"); return; }
      const fileName = `${safeFileName(trimmed)}_${safeFileName(clientName)}.pdf`;
      const path = `${clientId}/binders/${Date.now()}_${fileName}`;
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      const { error: upErr } = await supabase.storage
        .from("client-documents")
        .upload(path, blob, { contentType: "application/pdf" });
      if (upErr) throw upErr;

      const includedItems = orderedDocs.map((d) => ({
        id: d.id, file_name: d.file_name, section_id: d.section_id ?? null,
      }));

      if (editing) {
        // Replace the storage object + update the row. Remove the old PDF.
        await supabase.storage.from("client-documents").remove([editing.storage_path]).catch(() => {});
        const { error: updErr } = await supabase
          .from("binders")
          .update({
            group_label: trimmed,
            file_name: fileName,
            storage_path: path,
            size_bytes: blob.size,
            included_items: includedItems as never,
          } as never)
          .eq("id", editing.id);
        if (updErr) throw updErr;
        await logActivity("binder.custom_updated", "client", clientId, { binder_id: editing.id, name: trimmed, count: orderedDocs.length });
        toast.success(`Binder "${trimmed}" updated`);
      } else {
        const { error: insErr } = await supabase.from("binders").insert({
          client_id: clientId,
          scope: "custom",
          group_label: trimmed,
          file_name: fileName,
          storage_path: path,
          size_bytes: blob.size,
          order_mode: "manual",
          included_items: includedItems as never,
        });
        if (insErr) throw insErr;
        await logActivity("binder.custom_created", "client", clientId, { name: trimmed, count: orderedDocs.length });
        toast.success(`Binder "${trimmed}" created`);
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save binder");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit binder" : "New binder"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="binder-name" className="text-xs">Binder name</Label>
            <Input
              id="binder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Identity binder, Education binder"
            />
          </div>

          {requiredItems.length > 0 && (
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                Required documents
              </div>
              <div className="flex flex-wrap gap-1.5">
                {requiredItems.filter((r) => r.mandatory).map((r) => {
                  const have = docTypesInSelection.has(r.name);
                  return (
                    <span
                      key={r.id}
                      className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded font-semibold ${
                        have ? "bg-success/10 text-success" : "bg-secondary/10 text-secondary"
                      }`}
                    >
                      {have ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}
                      {r.name}
                    </span>
                  );
                })}
                {requiredItems.filter((r) => r.mandatory).length === 0 && (
                  <span className="text-[11px] text-muted-foreground italic">No required items in template.</span>
                )}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {/* LEFT: pick from any section */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Available documents
              </div>
              <div className="rounded-lg border divide-y max-h-[44vh] overflow-y-auto">
                {sections.map((s) => {
                  const docs = docsBySection[s.id] ?? [];
                  if (docs.length === 0) return null;
                  return (
                    <div key={s.id}>
                      <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide bg-muted/40 text-muted-foreground">
                        {s.label} · {docs.length}
                      </div>
                      {docs.map((d) => {
                        const isSel = selected.has(d.id);
                        return (
                          <label
                            key={d.id}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/50 cursor-pointer"
                          >
                            <Checkbox checked={isSel} onCheckedChange={() => toggle(d.id)} />
                            <span className="flex-1 truncate">
                              <span className="font-medium">{d.custom_type || d.document_type}</span>
                              <span className="text-muted-foreground"> · {d.file_name}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  );
                })}
                {sections.every((s) => (docsBySection[s.id] ?? []).length === 0) && (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                    No documents yet. Upload into a section first.
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: ordered selection */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                In binder · order ({orderedIds.length})
              </div>
              <div className="rounded-lg border divide-y max-h-[44vh] overflow-y-auto">
                {orderedIds.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                    Tick documents on the left. Use ↑ ↓ to reorder.
                  </div>
                ) : (
                  orderedIds.map((id, i) => {
                    const d = allDocsById.get(id);
                    if (!d) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                        <span className="font-mono tabular-nums text-muted-foreground w-6 text-right">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{d.custom_type || d.document_type}</div>
                          <div className="truncate text-[10px] text-muted-foreground">
                            {d.sectionLabel} · {d.file_name}
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="size-6" onClick={() => move(id, -1)} disabled={i === 0}>
                          <ArrowUp className="size-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-6" onClick={() => move(id, 1)} disabled={i === orderedIds.length - 1}>
                          <ArrowDown className="size-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-6 text-destructive" onClick={() => remove(id)}>
                          <X className="size-3" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={busy || !name.trim() || orderedIds.length === 0} className="gradient-accent text-white">
            {busy ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <FileCheck2 className="size-3.5 mr-1.5" />}
            {editing ? "Save changes" : "Create binder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};