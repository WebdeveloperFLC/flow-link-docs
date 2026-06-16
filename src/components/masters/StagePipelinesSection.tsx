import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAllPipelineStages,
  groupPipelineStagesByPipelineId,
  nextPipelineStageSortOrder,
  type PipelineStageRow,
} from "@/lib/stagePipelines";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, GripVertical, Workflow } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { formatServiceLibraryLabel } from "@/lib/service-library/resolveServiceLabel";

interface Pipeline {
  id: string;
  name: string;
  country: string;
  service_category: string;
  is_active: boolean;
  library_id?: string | null;
}

type LibraryLabelRow = {
  id: string;
  service: string;
  sub_service: string;
  academy_metadata?: { displayName?: string } | null;
};

function pipelineDisplayName(p: Pipeline, libraryLabels: Record<string, string>): string {
  if (p.library_id && libraryLabels[p.library_id]) return libraryLabels[p.library_id];
  return p.name;
}

type Stage = PipelineStageRow;

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);

export function StagePipelinesSection() {
  const { isAdmin } = useAuth();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stagesByPipeline, setStagesByPipeline] = useState<Record<string, Stage[]>>({});
  const [loading, setLoading] = useState(true);
  const [pipelineDialogOpen, setPipelineDialogOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [stageDialogPipelineId, setStageDialogPipelineId] = useState<string | null>(null);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [countryFilter, setCountryFilter] = useState("all");
  const [libraryLabels, setLibraryLabels] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [p, stages] = await Promise.all([
        supabase.from("stage_pipelines").select("*").order("country").order("name"),
        fetchAllPipelineStages(),
      ]);
      if (p.error) throw p.error;
      const rows = (p.data ?? []) as Pipeline[];
      setPipelines(rows);

      const libraryIds = [...new Set(rows.map((r) => r.library_id).filter(Boolean))] as string[];
      if (libraryIds.length) {
        const { data: libs, error: libErr } = await supabase
          .from("service_library")
          .select("id, service, sub_service, academy_metadata")
          .in("id", libraryIds);
        if (libErr) throw libErr;
        const labels: Record<string, string> = {};
        for (const row of (libs ?? []) as LibraryLabelRow[]) {
          labels[row.id] = formatServiceLibraryLabel(row);
        }
        setLibraryLabels(labels);
      } else {
        setLibraryLabels({});
      }

      setStagesByPipeline(groupPipelineStagesByPipelineId(stages));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load stage pipelines");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const countryOptions = useMemo(() => {
    const countries = [...new Set(pipelines.map((p) => p.country).filter(Boolean))];
    countries.sort((a, b) => a.localeCompare(b));
    return countries;
  }, [pipelines]);

  const visiblePipelines = useMemo(() => {
    if (countryFilter === "all") return pipelines;
    return pipelines.filter((p) => p.country === countryFilter);
  }, [pipelines, countryFilter]);

  const grouped = useMemo(
    () =>
      visiblePipelines.reduce<Record<string, Pipeline[]>>((acc, p) => {
        (acc[p.country] ??= []).push(p);
        return acc;
      }, {}),
    [visiblePipelines],
  );

  const onReorderStages = async (pipelineId: string, oldIndex: number, newIndex: number) => {
    const list = [...(stagesByPipeline[pipelineId] ?? [])];
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    const reordered = arrayMove(list, oldIndex, newIndex);
    const withOrder = reordered.map((s, i) => ({ ...s, sort_order: (i + 1) * 10 }));
    setStagesByPipeline((prev) => ({ ...prev, [pipelineId]: withOrder }));
    try {
      const results = await Promise.all(
        withOrder.map((s) =>
          supabase.from("pipeline_stages").update({ sort_order: s.sort_order }).eq("id", s.id),
        ),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reorder stages");
      await load();
    }
  };

  const onDeleteStage = async (stage: Stage) => {
    if (!confirm(`Delete stage "${stage.label}"?`)) return;
    const { error } = await supabase.from("pipeline_stages").delete().eq("id", stage.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Stage deleted");
    await load();
  };

  const onDeletePipeline = async (p: Pipeline) => {
    const label = pipelineDisplayName(p, libraryLabels);
    if (!confirm(`Delete pipeline "${label}" and all its stages?`)) return;
    const { error } = await supabase.from("stage_pipelines").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Pipeline deleted");
    await load();
  };

  const onToggleClientVisible = async (stage: Stage, next: boolean) => {
    setStagesByPipeline((prev) => {
      const list = (prev[stage.pipeline_id] ?? []).map((s) =>
        s.id === stage.id ? { ...s, is_client_visible: next } : s,
      );
      return { ...prev, [stage.pipeline_id]: list };
    });
    const { error } = await supabase
      .from("pipeline_stages")
      .update({ is_client_visible: next })
      .eq("id", stage.id);
    if (error) { toast.error(error.message); await load(); }
  };

  const onChangeClientLabel = async (stage: Stage, value: string) => {
    const trimmed = value.trim();
    const next = trimmed === "" ? null : trimmed;
    if ((stage.client_label ?? null) === next) return;
    const { error } = await supabase
      .from("pipeline_stages")
      .update({ client_label: next })
      .eq("id", stage.id);
    if (error) { toast.error(error.message); await load(); return; }
    setStagesByPipeline((prev) => {
      const list = (prev[stage.pipeline_id] ?? []).map((s) =>
        s.id === stage.id ? { ...s, client_label: next } : s,
      );
      return { ...prev, [stage.pipeline_id]: list };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Workflow className="size-4" /> Stage pipelines</h2>
          <p className="text-sm text-muted-foreground">
            Application-stage workflows per country &amp; service. New clients are auto-assigned to a matching pipeline.
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => { setEditingPipeline(null); setPipelineDialogOpen(true); }}
            className="gradient-brand text-primary-foreground"
          >
            <Plus className="size-4 mr-1.5" /> New pipeline
          </Button>
        )}
      </div>

      {!loading && pipelines.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {countryOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">
            {visiblePipelines.length} of {pipelines.length} pipelines
            {countryFilter !== "all" && (
              <span className="block text-[10px] mt-0.5">Showing {countryFilter} only</span>
            )}
          </span>
        </div>
      )}

      {loading && <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>}
      {!loading && pipelines.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">No pipelines yet.</Card>
      )}
      {!loading && pipelines.length > 0 && visiblePipelines.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No pipelines for {countryFilter}.
        </Card>
      )}

      {Object.entries(grouped).map(([country, list]) => (
        <Card key={country} className="overflow-hidden">
          <div className="px-4 py-2.5 bg-muted/40 border-b text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            {country}
          </div>
          <Accordion type="multiple" className="divide-y">
            {list.map((p) => {
              const stages = stagesByPipeline[p.id] ?? [];
              return (
                <AccordionItem value={p.id} key={p.id} className="border-0">
                  <div className="flex items-center gap-2 px-4">
                    <AccordionTrigger className="flex-1">
                      <div className="flex items-center gap-3 text-left">
                        <span className="font-medium">{pipelineDisplayName(p, libraryLabels)}</span>
                        {!p.library_id && (
                          <span className="text-xs text-muted-foreground">{p.service_category}</span>
                        )}
                        <span className="text-xs text-muted-foreground">· {stages.length} stages</span>
                        {!p.is_active && <span className="text-xs text-destructive">inactive</span>}
                      </div>
                    </AccordionTrigger>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="size-7"
                          onClick={() => { setEditingPipeline(p); setPipelineDialogOpen(true); }}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7 text-destructive"
                          onClick={() => onDeletePipeline(p)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <AccordionContent className="px-4">
                    <div className="space-y-2 pb-2">
                      {stages.length === 0 && (
                        <div className="text-xs text-muted-foreground py-2">No stages yet.</div>
                      )}
                      <PipelineStagesList
                        pipelineId={p.id}
                        stages={stages}
                        isAdmin={isAdmin}
                        onReorder={onReorderStages}
                        onToggleClientVisible={onToggleClientVisible}
                        onChangeClientLabel={onChangeClientLabel}
                        onEdit={(s) => {
                          setEditingStage(s);
                          setStageDialogPipelineId(p.id);
                          setStageDialogOpen(true);
                        }}
                        onDelete={onDeleteStage}
                      />
                      {isAdmin && (
                        <Button size="sm" variant="outline"
                          onClick={() => { setEditingStage(null); setStageDialogPipelineId(p.id); setStageDialogOpen(true); }}>
                          <Plus className="size-3.5 mr-1" /> Add stage
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </Card>
      ))}

      <PipelineDialog
        open={pipelineDialogOpen}
        onOpenChange={setPipelineDialogOpen}
        pipeline={editingPipeline}
        libraryLabel={
          editingPipeline?.library_id ? libraryLabels[editingPipeline.library_id] : undefined
        }
        onSaved={load}
      />
      <StageDialog
        open={stageDialogOpen}
        onOpenChange={setStageDialogOpen}
        pipelineId={stageDialogPipelineId}
        stage={editingStage}
        nextSortOrder={
          stageDialogPipelineId
            ? nextPipelineStageSortOrder(stagesByPipeline[stageDialogPipelineId] ?? [])
            : 10
        }
        existingKeys={(stageDialogPipelineId && stagesByPipeline[stageDialogPipelineId]?.map((s) => s.key)) || []}
        onSaved={load}
      />
    </div>
  );
}

function SortableStageRow({
  stage,
  isAdmin,
  onToggleClientVisible,
  onChangeClientLabel,
  onEdit,
  onDelete,
}: {
  stage: Stage;
  isAdmin: boolean;
  onToggleClientVisible: (stage: Stage, next: boolean) => void;
  onChangeClientLabel: (stage: Stage, value: string) => void;
  onEdit: (stage: Stage) => void;
  onDelete: (stage: Stage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
    disabled: !isAdmin,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 text-sm border rounded-md px-3 py-1.5 bg-card",
        stage.is_client_visible ? "" : "opacity-60",
        isDragging && "opacity-80 shadow-md z-10",
      )}
    >
      {isAdmin ? (
        <button
          type="button"
          className="touch-none text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      ) : (
        <span className="size-4" />
      )}
      <span className="inline-block size-3 rounded-full border shrink-0" style={{ background: stage.color ?? "#6366f1" }} />
      <span className="font-medium min-w-[140px]">{stage.label}</span>
      <span className="font-mono text-xs text-muted-foreground min-w-[100px]">{stage.key}</span>
      <Input
        defaultValue={stage.client_label ?? ""}
        placeholder="Same as internal label"
        disabled={!isAdmin}
        onBlur={(e) => onChangeClientLabel(stage, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="h-7 text-xs flex-1 min-w-[140px]"
      />
      {stage.notify_client && (
        <span className="text-[10px] uppercase tracking-wider text-primary shrink-0">notify</span>
      )}
      <div className="flex items-center gap-1.5 shrink-0">
        <Switch
          checked={stage.is_client_visible}
          onCheckedChange={(v) => onToggleClientVisible(stage, v)}
          disabled={!isAdmin}
        />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">client</span>
      </div>
      {isAdmin && (
        <div className="flex gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="size-7" onClick={() => onEdit(stage)}>
            <Pencil className="size-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => onDelete(stage)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

function PipelineStagesList({
  pipelineId,
  stages,
  isAdmin,
  onReorder,
  onToggleClientVisible,
  onChangeClientLabel,
  onEdit,
  onDelete,
}: {
  pipelineId: string;
  stages: Stage[];
  isAdmin: boolean;
  onReorder: (pipelineId: string, oldIndex: number, newIndex: number) => void;
  onToggleClientVisible: (stage: Stage, next: boolean) => void;
  onChangeClientLabel: (stage: Stage, value: string) => void;
  onEdit: (stage: Stage) => void;
  onDelete: (stage: Stage) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stages.findIndex((s) => s.id === active.id);
    const newIndex = stages.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    void onReorder(pipelineId, oldIndex, newIndex);
  };

  if (stages.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {stages.map((s) => (
            <SortableStageRow
              key={s.id}
              stage={s}
              isAdmin={isAdmin}
              onToggleClientVisible={onToggleClientVisible}
              onChangeClientLabel={onChangeClientLabel}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function PipelineDialog({
  open, onOpenChange, pipeline, libraryLabel, onSaved,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  pipeline: Pipeline | null;
  libraryLabel?: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(pipeline?.name ?? "");
      setCountry(pipeline?.country ?? "");
      setServiceCategory(pipeline?.service_category ?? "");
      setIsActive(pipeline?.is_active ?? true);
    }
  }, [open, pipeline]);

  const onSubmit = async () => {
    if (!libraryLabel && !name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!country.trim() || !serviceCategory.trim()) {
      toast.error("Country and service category are required"); return;
    }
    setBusy(true);
    try {
      if (pipeline) {
        const patch: Record<string, unknown> = {
          country: country.trim(),
          service_category: serviceCategory.trim(),
          is_active: isActive,
        };
        if (!libraryLabel) patch.name = name.trim();
        const { error } = await supabase.from("stage_pipelines").update(patch).eq("id", pipeline.id);
        if (error) throw error;
      } else {
        if (!name.trim()) {
          toast.error("Name is required");
          return;
        }
        const { error } = await supabase.from("stage_pipelines").insert({
          name: name.trim(), country: country.trim(),
          service_category: serviceCategory.trim(), is_active: isActive,
        });
        if (error) throw error;
      }
      toast.success(pipeline ? "Pipeline updated" : "Pipeline created");
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{pipeline ? "Edit pipeline" : "New pipeline"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Name *</Label>
            {libraryLabel ? (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                {libraryLabel}
                <p className="text-[11px] text-muted-foreground mt-1">
                  Name follows Service Library. Edit the service there to rename.
                </p>
              </div>
            ) : (
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Canada Study Visa" autoFocus />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Country *</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Canada" />
            </div>
            <div className="space-y-1.5"><Label>Service category *</Label>
              <Input value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)} placeholder="Study Visa" />
            </div>
          </div>
          <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>Active</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={busy} className="gradient-brand text-primary-foreground">
            {busy ? "Saving…" : pipeline ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StageDialog({
  open, onOpenChange, pipelineId, stage, nextSortOrder, existingKeys, onSaved,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  pipelineId: string | null; stage: Stage | null;
  nextSortOrder: number; existingKeys: string[]; onSaved: () => void;
}) {
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [color, setColor] = useState("#6366f1");
  const [notify, setNotify] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel(stage?.label ?? "");
      setKey(stage?.key ?? "");
      setKeyTouched(!!stage);
      setColor(stage?.color ?? "#6366f1");
      setNotify(stage?.notify_client ?? false);
    }
  }, [open, stage]);

  useEffect(() => {
    if (!keyTouched && !stage) setKey(slugify(label));
  }, [label, keyTouched, stage]);

  const keyConflict = !!key && (!stage || stage.key !== key) && existingKeys.includes(key);

  const onSubmit = async () => {
    if (!pipelineId) return;
    if (!label.trim() || !key.trim()) { toast.error("Label and key are required"); return; }
    if (keyConflict) {
      toast.error("Key already used in this pipeline — refresh the page if you do not see it listed.");
      return;
    }
    setBusy(true);
    try {
      if (stage) {
        const { error } = await supabase.from("pipeline_stages").update({
          label: label.trim(), key: key.trim(), color, notify_client: notify,
        }).eq("id", stage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pipeline_stages").insert({
          pipeline_id: pipelineId, label: label.trim(), key: key.trim(),
          color, notify_client: notify, sort_order: nextSortOrder,
        });
        if (error) {
          if (/duplicate key|unique/i.test(error.message)) {
            const { data: existing } = await supabase
              .from("pipeline_stages")
              .select("id, label, key")
              .eq("pipeline_id", pipelineId)
              .eq("key", key.trim())
              .maybeSingle();
            if (existing) {
              toast.error(
                `Stage "${existing.label}" (${existing.key}) already exists — refreshing list.`,
              );
              onOpenChange(false);
              onSaved();
              return;
            }
          }
          throw error;
        }
      }
      toast.success(stage ? "Stage updated" : "Stage added");
      onOpenChange(false);
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{stage ? "Edit stage" : "Add stage"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Label *</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Documents submitted" autoFocus />
          </div>
          <div className="space-y-1.5"><Label>Key *</Label>
            <Input value={key}
              onChange={(e) => { setKey(e.target.value); setKeyTouched(true); }}
              className={keyConflict ? "border-destructive" : ""}
              placeholder="docs_submitted" />
            {keyConflict && <p className="text-[11px] text-destructive">Already used in this pipeline.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1.5"><Label>Colour</Label>
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-full" />
            </div>
            <div className="flex items-center gap-2 pb-2"><Switch checked={notify} onCheckedChange={setNotify} /><Label>Notify client</Label></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={busy || keyConflict} className="gradient-brand text-primary-foreground">
            {busy ? "Saving…" : stage ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}