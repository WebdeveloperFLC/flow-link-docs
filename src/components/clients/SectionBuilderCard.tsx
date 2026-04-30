import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, Eye, Download, Trash2, GripVertical, Upload, Layers, FolderInput } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { saveSectionOrder, getSectionOrderMode, setSectionOrderMode, type CaseSection } from "@/lib/sections";
import { combinePdfsFromStorage } from "@/lib/combinePdfs";
import { logActivity } from "@/lib/activity";

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

interface Props {
  clientId: string;
  section: CaseSection;
  allSections: CaseSection[];
  documents: SectionDoc[];
  canEdit: boolean;
  isAdmin: boolean;
  onChanged: () => void;
}

export const SectionBuilderCard = ({ clientId, section, allSections, documents, canEdit, isAdmin, onChanged }: Props) => {
  const [orderMode, setOrderModeState] = useState<"auto" | "manual">("auto");
  const [items, setItems] = useState<SectionDoc[]>([]);
  const [combining, setCombining] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [binder, setBinder] = useState<BinderRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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
      let n = 0;
      const baseOrder = (items[items.length - 1]?.section_order ?? 0);
      for (const f of Array.from(files)) {
        const safe = f.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
        const path = `${clientId}/section/${section.key}/${Date.now()}_${safe}`;
        const { error: upErr } = await supabase.storage.from("client-documents").upload(path, f, { contentType: f.type || "application/octet-stream" });
        if (upErr) { toast.error(upErr.message); continue; }
        const { error: insErr } = await supabase.from("client_documents").insert({
          client_id: clientId,
          document_type: "Other",
          custom_type: section.label,
          file_name: f.name,
          storage_path: path,
          mime_type: f.type || null,
          size_bytes: f.size,
          section_id: section.id,
          section_order: baseOrder + (n + 1) * 10,
        });
        if (insErr) { toast.error(insErr.message); continue; }
        n++;
      }
      if (n > 0) toast.success(`Uploaded ${n} file${n === 1 ? "" : "s"} to ${section.label}`);
      onChanged();
    } finally {
      setUploading(false);
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
    const { data } = await supabase.storage.from("client-documents").download(d.storage_path);
    if (!data) return;
    const blob = new Blob([await data.arrayBuffer()], { type: d.mime_type || "application/pdf" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const onDownload = async (d: SectionDoc) => {
    const { data } = await supabase.storage.from("client-documents").download(d.storage_path);
    if (!data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement("a"); a.href = url; a.download = d.file_name; a.click();
    URL.revokeObjectURL(url);
  };

  const onDelete = async (d: SectionDoc) => {
    if (!confirm(`Delete ${d.file_name}?`)) return;
    await supabase.storage.from("client-documents").remove([d.storage_path]);
    await supabase.from("client_documents").delete().eq("id", d.id);
    onChanged();
  };

  const onMoveSection = async (d: SectionDoc, newSectionId: string) => {
    await supabase.from("client_documents").update({ section_id: newSectionId, section_order: 0 }).eq("id", d.id);
    onChanged();
  };

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="px-5 py-3.5 border-b flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <div>
            <div className="font-semibold text-sm">{section.label}</div>
            <div className="text-xs text-muted-foreground">{items.length} document{items.length === 1 ? "" : "s"}{binder ? " · binder ready" : ""}</div>
          </div>
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
              <input ref={fileInputRef} type="file" multiple className="hidden"
                onChange={(e) => { onUpload(e.target.files); e.target.value = ""; }} />
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Upload className="size-3.5 mr-1.5" />}
                Upload
              </Button>
              <Button size="sm" onClick={onCombine} disabled={combining || items.length === 0} className="gradient-accent text-white">
                {combining ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Layers className="size-3.5 mr-1.5" />}
                {binder ? "Re-combine" : "Combine"}
              </Button>
            </>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-8 text-center text-xs text-muted-foreground">
          No documents in this section yet. {canEdit && "Click Upload to add files."}
        </div>
      ) : (
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
                  onView={() => onView(d)}
                  onDownload={() => onDownload(d)}
                  onDelete={() => onDelete(d)}
                  onMove={(sid) => onMoveSection(d, sid)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
    </Card>
  );
};

function SortableRow({
  doc, index, manual, canEdit, isAdmin, sections, onView, onDownload, onDelete, onMove,
}: {
  doc: SectionDoc; index: number; manual: boolean; canEdit: boolean; isAdmin: boolean;
  sections: CaseSection[];
  onView: () => void; onDownload: () => void; onDelete: () => void; onMove: (sid: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doc.id, disabled: !manual });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="px-5 py-2.5 flex items-center gap-2 hover:bg-muted/30">
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
        <div className="text-sm truncate">{doc.file_name}</div>
        <div className="text-[11px] text-muted-foreground truncate">
          {doc.custom_type ?? doc.document_type}
          {doc.size_bytes ? ` · ${(doc.size_bytes / 1024).toFixed(0)} KB` : ""}
        </div>
      </div>
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