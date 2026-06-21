import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, AlertTriangle, CheckCircle2, CalendarClock, Trash2 } from "lucide-react";
import { listTasks, completeTask, subscribeTasks, deleteTask, bucketize, type ClientTask } from "@/lib/clientTasks";
import { TaskDueCountdown } from "./TaskDueCountdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileNameMap } from "@/hooks/useProfileNameMap";

const PRIO_TONE: Record<string, string> = {
  urgent: "bg-destructive/15 text-destructive",
  high: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  normal: "bg-muted text-muted-foreground",
  low: "bg-muted/60 text-muted-foreground",
};

export function ClientTasksCard({ clientId }: { clientId: string }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const profileUserIds = useMemo(
    () => tasks.flatMap((t) => [t.assigned_to, t.created_by]),
    [tasks],
  );
  const names = useProfileNameMap(profileUserIds);

  const refresh = () => listTasks(clientId).then(setTasks).catch(() => {});
  useEffect(() => {
    refresh();
    const off = subscribeTasks(clientId, refresh, "card");
    return () => {
      off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const buckets = useMemo(() => bucketize(tasks), [tasks]);

  const onComplete = async (t: ClientTask) => {
    try {
      await completeTask(t.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };
  const onDelete = async (t: ClientTask) => {
    if (!confirm(`Delete "${t.title}"?`)) return;
    try {
      await deleteTask(t.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const Section = ({ icon: Icon, label, items, tone }: { icon: React.ElementType; label: string; items: ClientTask[]; tone?: string }) =>
    items.length === 0 ? null : (
      <div className="border-t">
        <div className={cn("px-6 py-2 text-[11px] uppercase tracking-wider font-semibold flex items-center gap-1.5", tone)}>
          <Icon className="size-3.5" /> {label} <span className="text-muted-foreground">· {items.length}</span>
        </div>
        <div className="divide-y">
          {items.map((t) => {
            const overdue = t.due_at && new Date(t.due_at).getTime() < Date.now() && t.status !== "done";
            return (
              <div key={t.id} className="px-6 py-3 flex items-start gap-3">
                <Checkbox
                  checked={t.status === "done"}
                  onCheckedChange={() => t.status !== "done" && onComplete(t)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                    <span className={cn(t.status === "done" && "line-through text-muted-foreground")}>{t.title}</span>
                    <span className={cn("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded", PRIO_TONE[t.priority])}>{t.priority}</span>
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">{t.kind}</span>
                  </div>
                  {t.description && <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>}
                  <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                    {t.due_at && (
                      <span className={cn("inline-flex items-center gap-1", overdue && "text-destructive font-medium")}>
                        <Clock className="size-3" />
                        {new Date(t.due_at).toLocaleString()}
                        {" · "}
                        <TaskDueCountdown dueAt={t.due_at} />
                      </span>
                    )}
                    {t.assigned_to && <span>· assignee: {names[t.assigned_to] ?? "…"}</span>}
                    {t.created_by && <span>· by {names[t.created_by] ?? "…"}</span>}
                  </div>
                </div>
                {(t.created_by === user?.id || t.assigned_to === user?.id) && (
                  <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(t)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="px-6 py-4 border-b">
        <div className="font-semibold flex items-center gap-2">
          <CalendarClock className="size-4" /> Tasks & callbacks
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {buckets.overdue.length + buckets.dueToday.length + buckets.upcoming.length} open · {buckets.done.length} done
          {" · "}
          Use the <strong>Task</strong> button in the header to create new tasks.
        </div>
      </div>
      {tasks.length === 0 && (
        <div className="px-6 py-10 text-sm text-muted-foreground text-center">
          No tasks yet — use the Task button at the top of this client record to create one.
        </div>
      )}
      <Section icon={AlertTriangle} label="Overdue" items={buckets.overdue} tone="text-destructive" />
      <Section icon={Clock} label="Due today" items={buckets.dueToday} tone="text-amber-600" />
      <Section icon={CalendarClock} label="Upcoming" items={buckets.upcoming} />
      <Section icon={CheckCircle2} label="Done" items={buckets.done} tone="text-success" />
    </Card>
  );
}
