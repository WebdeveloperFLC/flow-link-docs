/**
 * Universal work queue engine — reusable across Finance, HR, Admissions, etc.
 */
import { supabase } from "@/integrations/supabase/client";
import type { WorkQueueDomain, WorkQueueItem, WorkQueueItemKind, WorkQueueItemStatus } from "../types/workQueue";

const LS_KEY = "platform:work_queue:v1";

function readLocal(): WorkQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LS_KEY) ?? "[]") as WorkQueueItem[];
  } catch {
    return [];
  }
}

function writeLocal(items: WorkQueueItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(items.slice(0, 1000)));
  } catch {
    /* ignore */
  }
}

export async function enqueueWorkItem(input: Omit<WorkQueueItem, "id" | "createdAt" | "status"> & {
  status?: WorkQueueItemStatus;
}): Promise<WorkQueueItem> {
  const item: WorkQueueItem = {
    id: crypto.randomUUID(),
    status: input.status ?? "open",
    createdAt: new Date().toISOString(),
    ...input,
  };

  try {
    const { error } = await supabase.from("platform_work_queue_items" as never).insert({
      id: item.id,
      queue_domain: item.queueDomain,
      kind: item.kind,
      status: item.status,
      title: item.title,
      subtitle: item.subtitle,
      business_event_id: item.businessEventId,
      source_module: item.sourceModule,
      source_record_id: item.sourceRecordId,
      entity_id: item.entityId,
      branch_id: item.branchId,
      assigned_to_user_id: item.assignedToUserId,
      priority: item.priority ?? 0,
      link: item.link,
      metadata: item.metadata ?? {},
    } as never);
    if (!error) return item;
  } catch {
    /* table pending migration */
  }

  const local = readLocal();
  // Dedupe open items for same source
  const deduped = local.filter(
    (x) =>
      !(
        x.status === "open" &&
        x.sourceRecordId === item.sourceRecordId &&
        x.kind === item.kind
      ),
  );
  deduped.unshift(item);
  writeLocal(deduped);
  return item;
}

export async function completeWorkItem(id: string): Promise<void> {
  try {
    await supabase
      .from("platform_work_queue_items" as never)
      .update({ status: "completed", completed_at: new Date().toISOString() } as never)
      .eq("id", id);
  } catch {
    /* fallback */
  }
  writeLocal(
    readLocal().map((x) =>
      x.id === id ? { ...x, status: "completed", completedAt: new Date().toISOString() } : x,
    ),
  );
}

export async function listWorkQueueItems(filter: {
  queueDomain?: WorkQueueDomain;
  kind?: WorkQueueItemKind;
  status?: WorkQueueItemStatus;
  limit?: number;
}): Promise<WorkQueueItem[]> {
  const limit = filter.limit ?? 200;
  try {
    let q = supabase
      .from("platform_work_queue_items" as never)
      .select("*")
      .eq("status", filter.status ?? "open")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (filter.queueDomain) q = q.eq("queue_domain", filter.queueDomain);
    if (filter.kind) q = q.eq("kind", filter.kind);
    const { data } = await q;
    if (data?.length) return (data as Record<string, unknown>[]).map(mapRow);
  } catch {
    /* fallback */
  }
  return readLocal()
    .filter((x) => (filter.status ? x.status === filter.status : x.status === "open"))
    .filter((x) => (filter.queueDomain ? x.queueDomain === filter.queueDomain : true))
    .filter((x) => (filter.kind ? x.kind === filter.kind : true))
    .slice(0, limit);
}

function mapRow(row: Record<string, unknown>): WorkQueueItem {
  return {
    id: String(row.id),
    queueDomain: row.queue_domain as WorkQueueDomain,
    kind: row.kind as WorkQueueItemKind,
    status: row.status as WorkQueueItemStatus,
    title: String(row.title),
    subtitle: (row.subtitle as string) ?? null,
    businessEventId: (row.business_event_id as string) ?? null,
    sourceModule: (row.source_module as string) ?? null,
    sourceRecordId: (row.source_record_id as string) ?? null,
    entityId: (row.entity_id as string) ?? null,
    branchId: (row.branch_id as string) ?? null,
    assignedToUserId: (row.assigned_to_user_id as string) ?? null,
    priority: Number(row.priority ?? 0),
    link: (row.link as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    completedAt: (row.completed_at as string) ?? null,
  };
}

/** Finance queue adapter — first consumer of universal queue. */
export async function enqueueFinancePaymentVerification(input: {
  paymentId: string;
  clientId: string;
  method: string;
  amount: number;
  currency: string;
  businessEventId?: string | null;
  entityId?: string | null;
  branchId?: string | null;
  clientName?: string | null;
}): Promise<WorkQueueItem> {
  const isCash = input.method === "cash";
  return enqueueWorkItem({
    queueDomain: "finance",
    kind: isCash ? "pending_cash_verification" : "pending_payment_verification",
    title: isCash ? "Pending cash verification" : "Pending payment verification",
    subtitle: `${input.currency} ${Number(input.amount).toFixed(2)}${input.clientName ? ` — ${input.clientName}` : ""}`,
    businessEventId: input.businessEventId,
    sourceModule: "CRM_AR",
    sourceRecordId: input.paymentId,
    entityId: input.entityId,
    branchId: input.branchId,
    link: `/accounting/finance-queue?section=${isCash ? "pending_cash_verification" : "pending_payment_verification"}`,
    metadata: { client_id: input.clientId, method: input.method },
  });
}

export async function enqueueFinanceJournalApproval(input: {
  journalId: string;
  paymentId: string;
  businessEventId?: string | null;
  entityId?: string | null;
  branchId?: string | null;
}): Promise<WorkQueueItem> {
  return enqueueWorkItem({
    queueDomain: "finance",
    kind: "pending_journal_approval",
    title: "Draft journal awaiting approval",
    subtitle: `Payment ${input.paymentId.slice(0, 8)}…`,
    businessEventId: input.businessEventId,
    sourceModule: "CRM_AR",
    sourceRecordId: input.paymentId,
    entityId: input.entityId,
    branchId: input.branchId,
    link: `/accounting/journals`,
    metadata: { journal_id: input.journalId, payment_id: input.paymentId },
  });
}
