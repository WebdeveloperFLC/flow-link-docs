import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createTask, type TaskKind, type TaskPriority } from "@/lib/clientTasks";
import {
  TASK_DUE_PRESETS,
  dueAtFromPresetHours,
  filterStaffByDepartment,
  loadStaffDirectory,
  type StaffMember,
} from "@/lib/staffDirectory";

/** Radix Select forbids empty-string item values; use sentinel for "no filter". */
const ALL_DEPARTMENTS = "__all__";

export function AddTaskDialog({
  open,
  onOpenChange,
  clientId,
  defaultKind,
  prefillTitle,
  applicationMode,
  pipelineStageId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId: string;
  defaultKind?: TaskKind;
  prefillTitle?: string;
  /** Application workflow: requires assignee + due date; shows department filter + SLA presets. */
  applicationMode?: boolean;
  pipelineStageId?: string | null;
  onCreated?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<TaskKind>(defaultKind ?? "task");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [dueAt, setDueAt] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(prefillTitle ?? "");
    setDescription("");
    setKind(defaultKind ?? "task");
    setPriority(applicationMode ? "high" : "normal");
    setDueAt(applicationMode ? dueAtFromPresetHours(24).slice(0, 16) : "");
    setAssignedTo("");
    setDepartmentId("");
    loadStaffDirectory().then(({ staff: s, departments: d }) => {
      setStaff(s);
      setDepartments(d);
      if (applicationMode) {
        const immigration = d.find((x) => x.name === "Immigration");
        if (immigration) setDepartmentId(immigration.id);
      }
    });
  }, [open, prefillTitle, defaultKind, applicationMode]);

  const assignableStaff = useMemo(
    () => filterStaffByDepartment(staff, departmentId || null),
    [staff, departmentId],
  );

  const applyPreset = (hours: number) => {
    const iso = dueAtFromPresetHours(hours);
    setDueAt(iso.slice(0, 16));
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setBusy(true);
    try {
      await createTask({
        clientId,
        title,
        description,
        kind,
        priority,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        assignedTo: assignedTo || null,
        departmentId: departmentId || null,
        pipelineStageId: pipelineStageId ?? null,
        requireAssignee: applicationMode,
        requireDue: applicationMode,
      });
      toast.success(applicationMode ? "Application task assigned" : "Task created");
      onCreated?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{applicationMode ? "Assign application task" : `New ${kind}`}</DialogTitle>
          {applicationMode && (
            <DialogDescription>
              Assign to a department member with a due date. They receive an in-app notification immediately.
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as TaskKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="callback">Callback</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Department</Label>
            <Select
              value={departmentId || ALL_DEPARTMENTS}
              onValueChange={(v) => {
                setDepartmentId(v === ALL_DEPARTMENTS ? "" : v);
                setAssignedTo("");
              }}
            >
              <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_DEPARTMENTS}>All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Complete visa QA review" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Due {applicationMode ? "*" : ""}</Label>
            <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {TASK_DUE_PRESETS.map((p) => (
                <Button key={p.hours} type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyPreset(p.hours)}>
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>Assign to {applicationMode ? "*" : ""}</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
              <SelectContent>
                {assignableStaff.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label}
                    <span className="text-muted-foreground">
                      {" "}· {u.role}{u.departmentName ? ` · ${u.departmentName}` : ""}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {applicationMode ? "Assign task" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
