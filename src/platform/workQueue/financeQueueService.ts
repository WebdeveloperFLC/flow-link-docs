/**
 * Finance work queue aggregator — merges platform queue items with live CRM/journal fallbacks.
 * Reusable pattern: domain adapter over universal workQueueEngine.
 */
import { supabase } from "@/integrations/supabase/client";
import { getPaymentJournalForSource } from "@/accounting/lib/crmBridge";
import type { WorkQueueItem, WorkQueueItemKind } from "../types/workQueue";
import { listWorkQueueItems } from "./workQueueEngine";

export type FinanceQueueSection =
  | "all"
  | "pending_cash_verification"
  | "pending_payment_verification"
  | "pending_journal_approval";

export interface FinanceQueueCounts {
  cash: number;
  verification: number;
  journal: number;
  total: number;
}

function kindMatchesSection(kind: WorkQueueItemKind, section: FinanceQueueSection): boolean {
  if (section === "all") return true;
  return kind === section;
}

/** Live CRM rows not yet represented in platform_work_queue_items (pre-migration / fallback). */
async function loadCrmVerificationFallback(): Promise<WorkQueueItem[]> {
  const { data } = await supabase
    .from("client_invoice_payments")
    .select(
      "id,client_id,invoice_id,method,currency,amount,paid_at,posted_by, client:clients!client_invoice_payments_client_id_fkey(full_name), invoice:client_invoices!client_invoice_payments_invoice_id_fkey(invoice_number)",
    )
    .eq("payment_status", "awaiting_verification")
    .is("archived_at", null)
    .order("paid_at", { ascending: false })
    .limit(300);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const method = String(row.method ?? "");
    const isCash = method === "cash";
    const client = row.client as { full_name?: string } | null;
    const invoice = row.invoice as { invoice_number?: string } | null;
    return {
      id: `crm-verify-${row.id}`,
      queueDomain: "finance" as const,
      kind: (isCash ? "pending_cash_verification" : "pending_payment_verification") as WorkQueueItemKind,
      status: "open" as const,
      title: isCash ? "Pending cash verification" : "Pending payment verification",
      subtitle: `${row.currency} ${Number(row.amount).toFixed(2)} · ${client?.full_name ?? "Client"} · ${invoice?.invoice_number ?? "—"}`,
      businessEventId: null,
      sourceModule: "CRM_AR",
      sourceRecordId: String(row.id),
      entityId: null,
      branchId: null,
      assignedToUserId: null,
      priority: isCash ? 10 : 5,
      link: `/accounting/finance-queue?section=${isCash ? "pending_cash_verification" : "pending_payment_verification"}`,
      metadata: {
        client_id: row.client_id,
        invoice_id: row.invoice_id,
        method,
        posted_by: row.posted_by,
        invoice_number: invoice?.invoice_number,
        fallback: true,
      },
      createdAt: String(row.paid_at ?? new Date().toISOString()),
    };
  });
}

async function loadJournalApprovalFallback(): Promise<WorkQueueItem[]> {
  const { data: payments } = await supabase
    .from("client_invoice_payments")
    .select("id, currency, amount, verified_at, client_id")
    .eq("payment_status", "verified")
    .is("archived_at", null)
    .eq("is_refund", false)
    .order("verified_at", { ascending: false })
    .limit(200);

  const items: WorkQueueItem[] = [];
  for (const pay of payments ?? []) {
    const journal = await getPaymentJournalForSource(String(pay.id));
    if (!journal || journal.status !== "DRAFT") continue;
    items.push({
      id: `crm-journal-${pay.id}`,
      queueDomain: "finance",
      kind: "pending_journal_approval",
      status: "open",
      title: "Draft journal awaiting approval",
      subtitle: `${pay.currency} ${Number(pay.amount).toFixed(2)} · payment ${String(pay.id).slice(0, 8)}…`,
      businessEventId: null,
      sourceModule: "CRM_AR",
      sourceRecordId: String(pay.id),
      entityId: null,
      branchId: null,
      assignedToUserId: null,
      priority: 3,
      link: "/accounting/finance-queue?section=pending_journal_approval",
      metadata: { journal_id: journal.id, payment_id: pay.id, client_id: pay.client_id, fallback: true },
      createdAt: String(pay.verified_at ?? new Date().toISOString()),
    });
  }
  return items;
}

function dedupeItems(items: WorkQueueItem[]): WorkQueueItem[] {
  const seen = new Set<string>();
  const out: WorkQueueItem[] = [];
  for (const item of items.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))) {
    const key = `${item.kind}:${item.sourceRecordId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export async function loadFinanceWorkQueue(section: FinanceQueueSection = "all"): Promise<WorkQueueItem[]> {
  const [platformItems, verifyFallback, journalFallback] = await Promise.all([
    listWorkQueueItems({ queueDomain: "finance", status: "open", limit: 500 }),
    loadCrmVerificationFallback(),
    loadJournalApprovalFallback(),
  ]);

  const merged = dedupeItems([...platformItems, ...verifyFallback, ...journalFallback]);
  return merged.filter((i) => kindMatchesSection(i.kind, section));
}

export async function loadFinanceQueueCounts(): Promise<FinanceQueueCounts> {
  const all = await loadFinanceWorkQueue("all");
  const cash = all.filter((i) => i.kind === "pending_cash_verification").length;
  const verification = all.filter((i) => i.kind === "pending_payment_verification").length;
  const journal = all.filter((i) => i.kind === "pending_journal_approval").length;
  return { cash, verification, journal, total: all.length };
}
