import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMasterLabels } from "@/lib/masters";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";
import type { Template, TemplateItem } from "@/pages/Templates";

const uid = () => Math.random().toString(36).slice(2, 10);

export const TemplateEditorDialog = ({ open, onOpenChange, template, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; template: Template | null; onSaved: () => void;
}) => {
  const [name, setName] = useState("");
  const [country, setCountry] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [pickType, setPickType] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const COUNTRIES = useMasterLabels("countries");
  const APPLICATION_TYPES = useMasterLabels("application_types");
  const DOCUMENT_TYPES = useMasterLabels("document_types");

  useEffect(() => {
    if (open) {
      setName(template?.name ?? "");
      setCountry(template?.country ?? "");
      setCategory(template?.category ?? "");
      setItems(template?.items ?? []);
      setPickType("");
    }
  }, [open, template]);

  const addItem = (n: string) => {
    if (!n) return;
    setItems((p) => [...p, { id: uid(), name: n, mandatory: true, notes: "" }]);
    setPickType("");
  };

  const onDragEnd = (r: DropResult) => {
    if (!r.destination) return;
    const next = [...items];
    const [moved] = next.splice(r.source.index, 1);
    next.splice(r.destination.index, 0, moved);
    setItems(next);
  };

  const update = (id: string, patch: Partial<TemplateItem>) =>
    setItems((p) => p.map((it) => it.id === id ? { ...it, ...patch } : it));

  const remove = (id: string) => setItems((p) => p.filter((it) => it.id !== id));

  const onSave = async () => {
    if (!name.trim() || !country || !category) { toast.error("Name, country, and category are required"); return; }
    if (items.length === 0) { toast.error("Add at least one document"); return; }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const cleanItems = items.map((it) => ({
        id: it.id, name: it.name.trim(), mandatory: !!it.mandatory, notes: it.notes?.trim() || "",
      }));
      if (template) {
        const { error } = await supabase
          .from("workflow_templates")
          .update({
            name: name.trim(), country, category,
            items: cleanItems as never,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Edit template" : "New workflow template"}</DialogTitle>
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
              <Label>Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{APPLICATION_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Documents (drag to reorder)</Label>
              <span className="text-xs text-muted-foreground">{items.length} item{items.length===1?"":"s"}</span>
            </div>

            <div className="flex gap-2 mb-3">
              <Select value={pickType} onValueChange={setPickType}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Choose a document type to add" /></SelectTrigger>
                <SelectContent>{DOCUMENT_TYPES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
              <Button type="button" onClick={() => addItem(pickType)} disabled={!pickType}><Plus className="size-4" /></Button>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="items">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                    {items.map((it, idx) => (
                      <Draggable key={it.id} draggableId={it.id} index={idx}>
                        {(p, snap) => (
                          <div ref={p.innerRef} {...p.draggableProps}
                            className={`flex items-start gap-2 p-3 rounded-lg border bg-card ${snap.isDragging ? "shadow-elev-lg" : "shadow-elev-sm"}`}>
                            <div {...p.dragHandleProps} className="mt-1 text-muted-foreground cursor-grab active:cursor-grabbing">
                              <GripVertical className="size-4" />
                            </div>
                            <div className="text-xs font-mono text-muted-foreground mt-1.5 w-6">{idx+1}.</div>
                            <div className="flex-1 space-y-2">
                              <Input value={it.name} onChange={(e) => update(it.id, { name: e.target.value })} className="h-8" />
                              <Input value={it.notes ?? ""} onChange={(e) => update(it.id, { notes: e.target.value })}
                                placeholder="Optional note (e.g. combine all semesters into one PDF)" className="h-8 text-xs" />
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                                <Switch checked={it.mandatory} onCheckedChange={(v) => update(it.id, { mandatory: v })} />
                                <span>Required</span>
                              </label>
                              <Button type="button" variant="ghost" size="icon" className="size-6 text-destructive" onClick={() => remove(it.id)}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {items.length === 0 && (
                      <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                        Add documents above to build the checklist.
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