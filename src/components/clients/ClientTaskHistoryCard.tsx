import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { listTasks, subscribeTasks, type ClientTask } from "@/lib/clientTasks";
import { ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useProfileNameMap } from "@/hooks/useProfileNameMap";

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Completed",
  cancelled: "Cancelled",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "dd-MMM-yyyy h:mm a");
  } catch {
    return iso;
  }
}

export function ClientTaskHistoryCard({ clientId }: { clientId: string }) {
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const profileUserIds = useMemo(
    () => tasks.flatMap((t) => [t.assigned_to, t.created_by, t.completed_by]),
    [tasks],
  );
  const names = useProfileNameMap(profileUserIds);

  const refresh = () => listTasks(clientId).then(setTasks).catch(() => {});
  useEffect(() => {
    refresh();
    const off = subscribeTasks(clientId, refresh);
    return () => {
      off();
    };
  }, [clientId]);

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [tasks],
  );

  return (
    <Card className="overflow-hidden shadow-elev-sm" id="client-task-history">
      <div className="px-6 py-4 border-b">
        <div className="font-semibold flex items-center gap-2">
          <ListTodo className="size-4" /> Task history
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          All tasks including completed and cancelled — permanent historical record.
        </p>
      </div>
      {sorted.length === 0 ? (
        <div className="px-6 py-10 text-sm text-muted-foreground text-center">No tasks recorded yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">Task</th>
                <th className="px-4 py-2.5 font-semibold">Assigned by</th>
                <th className="px-4 py-2.5 font-semibold">Assigned to</th>
                <th className="px-4 py-2.5 font-semibold">Created</th>
                <th className="px-4 py-2.5 font-semibold">Due</th>
                <th className="px-4 py-2.5 font-semibold">Completed</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold min-w-[140px]">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map((t) => (
                <tr key={t.id} className={cn(t.status === "done" && "bg-muted/10")}>
                  <td className="px-4 py-3 font-medium">{t.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.created_by ? (names[t.created_by] ?? "…") : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.assigned_to ? (names[t.assigned_to] ?? "…") : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(t.created_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(t.due_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(t.completed_at)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold",
                        t.status === "done" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                        t.status === "cancelled" && "bg-muted text-muted-foreground",
                        t.status === "open" && "bg-primary/10 text-primary",
                        t.status === "in_progress" && "bg-amber-500/15 text-amber-700",
                      )}
                    >
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate" title={t.description ?? ""}>
                    {t.description?.trim() || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
