import { supabase } from "@/integrations/supabase/client";

export type TaskKind = "task" | "callback" | "reminder";
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type TaskStatus = "open" | "in_progress" | "done" | "cancelled";

export interface ClientTask {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  kind: TaskKind;
  priority: TaskPriority;
  status: TaskStatus;
  due_at: string | null;
  assigned_to: string | null;
  created_by: string | null;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function listTasks(clientId: string): Promise<ClientTask[]> {
  const { data, error } = await supabase
    .from("client_tasks" as never)
    .select("*")
    .eq("client_id", clientId)
    .order("status", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ClientTask[];
}

export async function createTask(input: {
  clientId: string;
  title: string;
  description?: string;
  kind?: TaskKind;
  priority?: TaskPriority;
  dueAt?: string | null;
  assignedTo?: string | null;
}): Promise<ClientTask> {
  const { data: u } = await supabase.auth.getUser();
  const me = u?.user?.id;
  if (!me) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("client_tasks" as never)
    .insert({
      client_id: input.clientId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      kind: input.kind ?? "task",
      priority: input.priority ?? "normal",
      due_at: input.dueAt ?? null,
      assigned_to: input.assignedTo ?? null,
      created_by: me,
    } as never)
    .select()
    .single();
  if (error) throw error;
  return data as ClientTask;
}

export async function updateTask(id: string, patch: Partial<Pick<ClientTask, "title" | "description" | "due_at" | "assigned_to" | "priority" | "status" | "kind">>) {
  const { error } = await supabase.from("client_tasks" as never).update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function completeTask(id: string) {
  const { data: u } = await supabase.auth.getUser();
  const me = u?.user?.id ?? null;
  const { error } = await supabase.from("client_tasks" as never).update({
    status: "done",
    completed_by: me,
    completed_at: new Date().toISOString(),
  } as never).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("client_tasks" as never).delete().eq("id", id);
  if (error) throw error;
}

export function subscribeTasks(clientId: string, onChange: () => void) {
  const ch = supabase
    .channel(`tasks:${clientId}`)
    .on("postgres_changes",
      { event: "*", schema: "public", table: "client_tasks", filter: `client_id=eq.${clientId}` },
      () => onChange(),
    )
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

export function bucketize(tasks: ClientTask[]) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date(); today.setHours(23, 59, 59, 999);
  const open = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled");
  const overdue = open.filter((t) => t.due_at && new Date(t.due_at).getTime() < now);
  const dueToday = open.filter((t) => t.due_at && !overdue.includes(t) && new Date(t.due_at).getTime() <= today.getTime());
  const upcoming = open.filter((t) => !overdue.includes(t) && !dueToday.includes(t));
  const done = tasks.filter((t) => t.status === "done" || t.status === "cancelled");
  return { overdue, dueToday, upcoming, done };
}
