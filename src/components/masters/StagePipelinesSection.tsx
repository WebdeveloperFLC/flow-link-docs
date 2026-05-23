import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Workflow } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Pipeline {
  id: string;
  name: string;
  country: string;
  service_category: string;
  is_active: boolean;
}

interface Stage {
  id: string;
  pipeline_id: string;
  key: string;
  label: string;
  sort_order: number;
  color: string | null;
  notify_client: boolean;
}

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

  const load = async () => {
    setLoading(true);
    const [p, s] = await Promise.all([
      supabase.from("stage_pipelines").select("*").order("country").order("name"),
      supabase.from("pipeline_stages").select("*").order("sort_order"),
    ]);
    setPipelines((p.data ?? []) as Pipeline[]);
    const grouped: Record<string, Stage[]> = {};
    for (const st of (s.data ?? []) as Stage[]) {
      (grouped[st.pipeline_id] ??= []).push(st);
    }
    setStagesByPipeline(grouped);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const grouped = pipelines.reduce<Record<string, Pipeline[]>>((acc, p) => {
    (acc[p.country] ??= []).push(p); return acc;
  }, {});

  const onMoveStage = async (stage: Stage, dir: -1 | 1) => {
    const list = stagesByPipeline[stage.pipeline_id] ?? [];
    const idx = list.findIndex((s) => s.id === stage.id);
    const swap = list[idx + dir];
    if (!swap) return;
    await supabase.from("pipeline_stages").update({ sort_order: swap.sort_order }).eq("id", stage.id);
    await supabase.from("pipeline_stages").update({ sort_order: stage.sort_order }).eq("id", swap.id);
    await load();
  };

  const onDeleteStage = async (stage: Stage) => {
    if (!confirm(`Delete stage "${stage.label}"?`)) return;
    const { error } = await supabase.from("pipeline_stages").delete().eq("id", stage.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Stage deleted");
    await load();
  };

  const onDeletePipeline = async (p: Pipeline) => {
    if (!confirm(`Delete pipeline "${p.name}" and all its stages?`)) return;
    const { error } = await supabase.from("stage_pipelines").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Pipeline deleted");
    await load();
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

      {loading && <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>}
      {!loading && pipelines.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">No pipelines yet.</Card>
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
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.service_category}</span>
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
                      {stages.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-2 text-sm border rounded-md px-3 py-1.5">
                          {isAdmin && (
                            <div className="flex gap-0.5">
                              <Button size="icon" variant="ghost" className="size-6" disabled={i === 0}
                                onClick={() => onMoveStage(s, -1)}><ArrowUp className="size-3" /></Button>
                              <Button size="icon" variant="ghost" className="size-6" disabled={i === stages.length - 1}
                                onClick={() => onMoveStage(s, 1)}><ArrowDown className="size-3" /></Button>
                            </div>
                          )}
                          <span className="inline-block size-3 rounded-full border" style={{ background: s.color ?? "#6366f1" }} />
                          <span className="font-medium flex-1">{s.label}</span>
                          <span className="font-mono text-xs text-muted-foreground">{s.key}</span>
                          {s.notify_client && <span className="text-[10px] uppercase tracking-wider text-primary">notify</span>}
                          {isAdmin && (
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="size-7"
                                onClick={() => { setEditingStage(s); setStageDialogPipelineId(p.id); setStageDialogOpen(true); }}>
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="size-7 text-destructive"
                                onClick={() => onDeleteStage(s)}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
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
        onSaved={load}
      />
      <StageDialog
        open={stageDialogOpen}
        onOpenChange={setStageDialogOpen}
        pipelineId={stageDialogPipelineId}
        stage={editingStage}
        nextSortOrder={(stageDialogPipelineId && (stagesByPipeline[stageDialogPipelineId]?.length ?? 0) * 10 + 10) || 10}
        existingKeys={(stageDialogPipelineId && stagesByPipeline[stageDialogPipelineId]?.map((s) => s.key)) || []}
        onSaved={load}
      />
    </div>
  );
}

function PipelineDialog({
  open, onOpenChange, pipeline, onSaved,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  pipeline: Pipeline | null; onSaved: () => void;
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
    if (!name.trim() || !country.trim() || !serviceCategory.trim()) {
      toast.error("Name, country and service category are required"); return;
    }
    setBusy(true);
    try {
      if (pipeline) {
        const { error } = await supabase.from("stage_pipelines").update({
          name: name.trim(), country: country.trim(),
          service_category: serviceCategory.trim(), is_active: isActive,
        }).eq("id", pipeline.id);
        if (error) throw error;
      } else {
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
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Canada Study Visa" autoFocus />
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
    if (keyConflict) { toast.error("Key already used in this pipeline"); return; }
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
        if (error) throw error;
      }
      toast.success(stage ? "Stage updated" : "Stage added");
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
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