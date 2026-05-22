import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMasterLabels } from "@/lib/masters";
import { fetchServiceCatalogue, type ServiceCatalogueItem } from "@/lib/leads";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { GripVertical, Plus, Trash2, FolderPlus, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";
import {
  loadSections,
  createSection,
  seedTemplateSectionsFromItems,
  type CaseSection,
  type TemplateSection,
} from "@/lib/sections";
import type { Template, TemplateItem } from "@/pages/Templates";

const uid = () => Math.random().toString(36).slice(2, 10);

interface SectionInEditor extends TemplateSection {
  collapsed?: boolean;
}

export const TemplateEditorDialog = ({ open, onOpenChange, template, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; template: Template | null; onSaved: () => void;
}) => {
  const [name, setName] = useState("");
  const [country, setCountry] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [items, setItems] = useState<Record<string, TemplateItem>>({});
  const [sections, setSections] = useState<SectionInEditor[]>([]);
  const [busy, setBusy] = useState(false);
  const [caseSections, setCaseSections] = useState<CaseSection[]>([]);
  const [newSectionLabel, setNewSectionLabel] = useState("");
  // Per-section "add doc" state.
  const [addDocPick, setAddDocPick] = useState<Record<string, string>>({});
  const [addDocCustom, setAddDocCustom] = useState<Record<string, string>>({});

  const COUNTRIES = useMasterLabels("countries");
  const DOCUMENT_TYPES = useMasterLabels("document_types");
  const [visaServices, setVisaServices] = useState<ServiceCatalogueItem[]>([]);

  useEffect(() => {
    if (!open) return;
    fetchServiceCatalogue("visa_immigration")
      .then(setVisaServices)
      .catch(() => setVisaServices([]));
  }, [open]);

  const categoryOptions = useMemo(() => {
    const filtered = country
      ? visaServices.filter((s) => !s.country_tag || s.country_tag === country)
      : visaServices;
    const list = filtered.length > 0 ? filtered : visaServices;
    return list.map((s) => ({ value: s.service_code || s.id, label: s.service_name }));
  }, [visaServices, country]);

  const currentCategoryIsKnown = useMemo(
    () => !category || categoryOptions.some((o) => o.value === category),
    [category, categoryOptions],
  );

  useEffect(() => {
    if (!open) return;
    loadSections(true).then(setCaseSections);
    setName(template?.name ?? "");
    setCountry(template?.country ?? "");
    setCategory(template?.category ?? "");

    // Build items map and section structure.
    const tplItems = template?.items ?? [];
    const itemsMap: Record<string, TemplateItem> = {};
    tplItems.forEach((it) => { itemsMap[it.id] = { ...it }; });
    setItems(itemsMap);

    const tplGroups = (template?.groups as TemplateSection[] | null | undefined) ?? null;
    if (tplGroups && tplGroups.length > 0) {
      // Filter item_ids to those still present.
      const cleaned = tplGroups
        .map((g) => ({ ...g, item_ids: g.item_ids.filter((id) => itemsMap[id]) }))
        .sort((a, b) => a.sort_order - b.sort_order);
      // Append any orphan items (present in items but not in any group) to a "Other" section.
      const placed = new Set(cleaned.flatMap((g) => g.item_ids));
      const orphans = tplItems.filter((it) => !placed.has(it.id));
      if (orphans.length > 0) {
        let other = cleaned.find((g) => g.section_key === "other");
        if (!other) {
          other = {
            id: uid(),
            section_key: "other",
            label: "Other Documents",
            sort_order: (cleaned.at(-1)?.sort_order ?? 0) + 10,
            item_ids: [],
          };
          cleaned.push(other);
        }
        other.item_ids.push(...orphans.map((o) => o.id));
      }
      setSections(cleaned);
    } else {
      // Legacy template — auto-bucket existing items.
      setSections(seedTemplateSectionsFromItems(tplItems));
    }
    setAddDocPick({});
    setAddDocCustom({});
    setNewSectionLabel("");
  }, [open, template]);

  // ---- Section operations ----
  const addSectionFromCase = (cs: CaseSection) => {
    if (sections.some((s) => s.section_key === cs.key)) {
      toast.info(`"${cs.label}" already added`);
      return;
    }
    setSections((p) => [...p, {
      id: uid(),
      section_key: cs.key,
      label: cs.label,
      sort_order: (p.at(-1)?.sort_order ?? 0) + 10,
      item_ids: [],
    }]);
  };

  const addCustomSection = async () => {
    const label = newSectionLabel.trim();
    if (!label) return;
    // Reuse existing case_section if same label/key already exists.
    const existing = caseSections.find((cs) => cs.label.toLowerCase() === label.toLowerCase());
    if (existing) {
      addSectionFromCase(existing);
      setNewSectionLabel("");
      return;
    }
    const created = await createSection(label);
    if (!created) { toast.error("Could not create section"); return; }
    setCaseSections((p) => [...p, created]);
    addSectionFromCase(created);
    setNewSectionLabel("");
  };

  const renameSectionLocal = (id: string, label: string) =>
    setSections((p) => p.map((s) => s.id === id ? { ...s, label } : s));

  const removeSection = (id: string) => {
    const sec = sections.find((s) => s.id === id);
    if (!sec) return;
    if (sec.item_ids.length > 0 && !confirm(`Remove section "${sec.label}" and its ${sec.item_ids.length} document(s)?`)) return;
    setSections((p) => p.filter((s) => s.id !== id));
    setItems((prev) => {
      const next = { ...prev };
      sec.item_ids.forEach((iid) => delete next[iid]);
      return next;
    });
  };

  const toggleCollapse = (id: string) =>
    setSections((p) => p.map((s) => s.id === id ? { ...s, collapsed: !s.collapsed } : s));

  // ---- Item operations ----
  const addItemToSection = (sectionId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = uid();
    const newItem: TemplateItem = { id, name: trimmed, mandatory: true, notes: "" };
    setItems((p) => ({ ...p, [id]: newItem }));
    setSections((p) => p.map((s) => s.id === sectionId ? { ...s, item_ids: [...s.item_ids, id] } : s));
    setAddDocPick((p) => ({ ...p, [sectionId]: "" }));
    setAddDocCustom((p) => ({ ...p, [sectionId]: "" }));
  };

  const updateItem = (id: string, patch: Partial<TemplateItem>) =>
    setItems((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  const removeItem = (sectionId: string, itemId: string) => {
    setSections((p) => p.map((s) => s.id === sectionId ? { ...s, item_ids: s.item_ids.filter((x) => x !== itemId) } : s));
    setItems((p) => { const n = { ...p }; delete n[itemId]; return n; });
  };

  // ---- Drag & drop ----
  const onDragEnd = (r: DropResult) => {
    if (!r.destination) return;
    if (r.type === "section") {
      const next = [...sections];
      const [moved] = next.splice(r.source.index, 1);
      next.splice(r.destination.index, 0, moved);
      setSections(next.map((s, i) => ({ ...s, sort_order: (i + 1) * 10 })));
      return;
    }
    if (r.type === "item") {
      const fromId = r.source.droppableId;
      const toId = r.destination.droppableId;
      setSections((prev) => {
        const next = prev.map((s) => ({ ...s, item_ids: [...s.item_ids] }));
        const from = next.find((s) => s.id === fromId);
        const to = next.find((s) => s.id === toId);
        if (!from || !to) return prev;
        const [moved] = from.item_ids.splice(r.source.index, 1);
        to.item_ids.splice(r.destination.index, 0, moved);
        return next;
      });
    }
  };

  // ---- Save ----
  const onSave = async () => {
    if (!name.trim() || !country || !category) { toast.error("Name, country, and category are required"); return; }
    const totalItems = sections.reduce((n, s) => n + s.item_ids.length, 0);
    if (totalItems === 0) { toast.error("Add at least one document"); return; }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Flatten items in the order dictated by sections + item_ids.
      const cleanItems: TemplateItem[] = [];
      const cleanGroups: TemplateSection[] = [];
      sections.forEach((s, sIdx) => {
        const item_ids: string[] = [];
        s.item_ids.forEach((iid) => {
          const it = items[iid];
          if (!it) return;
          const tidy: TemplateItem = {
            id: it.id,
            name: it.name.trim(),
            mandatory: !!it.mandatory,
            notes: it.notes?.trim() || "",
          };
          if (!tidy.name) return;
          cleanItems.push(tidy);
          item_ids.push(tidy.id);
        });
        cleanGroups.push({
          id: s.id,
          section_key: s.section_key,
          label: s.label.trim() || s.section_key,
          sort_order: (sIdx + 1) * 10,
          item_ids,
        });
      });

      if (template) {
        const { error } = await supabase
          .from("workflow_templates")
          .update({
            name: name.trim(), country, category,
            items: cleanItems as never,
            groups: cleanGroups as never,
            version: template.version + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", template.id);
        if (error) throw error;
        await logActivity("template.updated", "template", template.id, { name });
        toast.success("Template updated");
      } else {
        const { data, error } = await supabase
          .from("workflow_templates")
          .insert({
            name: name.trim(), country, category,
            items: cleanItems as never,
            groups: cleanGroups as never,
            created_by: user?.id ?? null,
          })
          .select()
          .single();
        if (error) throw error;
        await logActivity("template.created", "template", data?.id, { name });
        toast.success("Template created");
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save template";
      console.error("Template save failed:", e);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const availableCaseSections = useMemo(() => {
    const used = new Set(sections.map((s) => s.section_key));
    return caseSections.filter((cs) => !used.has(cs.key));
  }, [caseSections, sections]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Edit template" : "New workflow template"}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Country → Category → Section (e.g. Academics, Finance, Sponsor Documents) → Document type. Everything is fully customizable.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <Label>Template name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Canada Student Visa (SDS)" maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label>Country *</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Application Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {!currentCategoryIsKnown && (
                    <SelectItem value={category}>{category} (legacy)</SelectItem>
                  )}
                  {categoryOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <Label>Document Sections</Label>
              <div className="flex items-center gap-2">
                {availableCaseSections.length > 0 && (
                  <Select value="" onValueChange={(v) => {
                    const cs = caseSections.find((c) => c.key === v);
                    if (cs) addSectionFromCase(cs);
                  }}>
                    <SelectTrigger className="h-8 text-xs w-56"><SelectValue placeholder="+ Add existing section" /></SelectTrigger>
                    <SelectContent>
                      {availableCaseSections.map((cs) => (
                        <SelectItem key={cs.key} value={cs.key}>{cs.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Input
                  value={newSectionLabel}
                  onChange={(e) => setNewSectionLabel(e.target.value)}
                  placeholder="New section label…"
                  className="h-8 text-xs w-44"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSection(); } }}
                />
                <Button type="button" size="sm" variant="outline" className="h-8" onClick={addCustomSection} disabled={!newSectionLabel.trim()}>
                  <FolderPlus className="size-3.5 mr-1" /> Section
                </Button>
              </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="sections" type="section">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                    {sections.map((sec, secIdx) => (
                      <Draggable key={sec.id} draggableId={sec.id} index={secIdx}>
                        {(sp, secSnap) => (
                          <div
                            ref={sp.innerRef}
                            {...sp.draggableProps}
                            className={`rounded-lg border bg-muted/30 ${secSnap.isDragging ? "shadow-elev-lg" : ""}`}
                          >
                            <div className="flex items-center gap-2 px-3 py-2 border-b bg-card rounded-t-lg">
                              <div {...sp.dragHandleProps} className="text-muted-foreground cursor-grab active:cursor-grabbing">
                                <GripVertical className="size-4" />
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleCollapse(sec.id)}
                                className="text-muted-foreground hover:text-foreground"
                                aria-label="Toggle section"
                              >
                                {sec.collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                              </button>
                              <Input
                                value={sec.label}
                                onChange={(e) => renameSectionLocal(sec.id, e.target.value)}
                                className="h-7 text-sm font-semibold flex-1"
                              />
                              <span className="text-[11px] text-muted-foreground tabular-nums">{sec.item_ids.length}</span>
                              <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => removeSection(sec.id)}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>

                            {!sec.collapsed && (
                              <div className="p-3 space-y-2">
                                {/* Add document control */}
                                <div className="flex flex-wrap gap-2">
                                  <Select
                                    value={addDocPick[sec.id] ?? ""}
                                    onValueChange={(v) => setAddDocPick((p) => ({ ...p, [sec.id]: v }))}
                                  >
                                    <SelectTrigger className="h-8 text-xs flex-1 min-w-[180px]">
                                      <SelectValue placeholder="Pick a document type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {DOCUMENT_TYPES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    type="button" size="sm" variant="outline" className="h-8"
                                    disabled={!addDocPick[sec.id]}
                                    onClick={() => addItemToSection(sec.id, addDocPick[sec.id] ?? "")}
                                  >
                                    <Plus className="size-3.5 mr-1" /> Add
                                  </Button>
                                  <Input
                                    value={addDocCustom[sec.id] ?? ""}
                                    onChange={(e) => setAddDocCustom((p) => ({ ...p, [sec.id]: e.target.value }))}
                                    placeholder="…or type a custom document name"
                                    className="h-8 text-xs flex-1 min-w-[180px]"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        addItemToSection(sec.id, addDocCustom[sec.id] ?? "");
                                      }
                                    }}
                                  />
                                  <Button
                                    type="button" size="sm" variant="outline" className="h-8"
                                    disabled={!(addDocCustom[sec.id] ?? "").trim()}
                                    onClick={() => addItemToSection(sec.id, addDocCustom[sec.id] ?? "")}
                                  >
                                    <Plus className="size-3.5 mr-1" /> Custom
                                  </Button>
                                </div>

                                <Droppable droppableId={sec.id} type="item">
                                  {(dp) => (
                                    <div ref={dp.innerRef} {...dp.droppableProps} className="space-y-2 min-h-[8px]">
                                      {sec.item_ids.map((iid, idx) => {
                                        const it = items[iid];
                                        if (!it) return null;
                                        return (
                                          <Draggable key={iid} draggableId={iid} index={idx}>
                                            {(p, snap) => (
                                              <div
                                                ref={p.innerRef}
                                                {...p.draggableProps}
                                                className={`flex items-start gap-2 p-2.5 rounded-lg border bg-card ${snap.isDragging ? "shadow-elev-lg" : "shadow-elev-sm"}`}
                                              >
                                                <div {...p.dragHandleProps} className="mt-1 text-muted-foreground cursor-grab active:cursor-grabbing">
                                                  <GripVertical className="size-4" />
                                                </div>
                                                <div className="text-xs font-mono text-muted-foreground mt-1.5 w-6">{idx + 1}.</div>
                                                <div className="flex-1 space-y-1.5">
                                                  <Input value={it.name} onChange={(e) => updateItem(iid, { name: e.target.value })} className="h-8" />
                                                  <Input
                                                    value={it.notes ?? ""}
                                                    onChange={(e) => updateItem(iid, { notes: e.target.value })}
                                                    placeholder="Optional note (e.g. combine all semesters into one PDF)"
                                                    className="h-8 text-xs"
                                                  />
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                                                    <Switch checked={it.mandatory} onCheckedChange={(v) => updateItem(iid, { mandatory: v })} />
                                                    <span>Required</span>
                                                  </label>
                                                  <Button type="button" variant="ghost" size="icon" className="size-6 text-destructive" onClick={() => removeItem(sec.id, iid)}>
                                                    <Trash2 className="size-3.5" />
                                                  </Button>
                                                </div>
                                              </div>
                                            )}
                                          </Draggable>
                                        );
                                      })}
                                      {dp.placeholder}
                                      {sec.item_ids.length === 0 && (
                                        <div className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded">
                                          Add document types to this section.
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </Droppable>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {sections.length === 0 && (
                      <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                        Add a section above to start (e.g. Academics, Finance, Sponsor Documents).
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={busy} className="gradient-brand text-primary-foreground">
            {busy ? "Saving…" : template ? "Save changes" : "Create template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
