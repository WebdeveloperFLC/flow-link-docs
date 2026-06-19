import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { runWhenAuthReady } from "./_hydrationGate";
import { postInvoiceJournal, postPaymentJournal } from "../lib/crmBridge";

/**
 * CRM Bridge automation.
 *
 * Idempotently journalizes CRM source-of-truth records:
 *   - issued client_invoices  -> revenue accrual journals
 *   - verified client_invoice_payments -> cash receipt + trust journals
 *
 * Posting is idempotent (guarded by source_module + source_record_id in
 * crmBridge), so re-running is safe. A bounded auto-run executes once per
 * session; the same functions back a manual "Sync CRM" action in the UI.
 */

export interface CrmBridgeStatus {
  running: boolean;
  lastRunAt?: string;
  invoicesPosted: number;
  paymentsPosted: number;
  errors: number;
  lastError?: string;
}

const BATCH = 200;

let status: CrmBridgeStatus = { running: false, invoicesPosted: 0, paymentsPosted: 0, errors: 0 };
const listeners = new Set<() => void>();
function set(next: Partial<CrmBridgeStatus>) {
  status = { ...status, ...next };
  listeners.forEach((l) => l());
}

export function useCrmBridgeStatus(): CrmBridgeStatus {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => status,
    () => status,
  );
}

export const getCrmBridgeStatus = () => status;

/** Journalize issued CRM invoices that do not yet have an accounting journal. */
export async function syncCrmInvoices(limit = BATCH): Promise<number> {
  const { data, error } = await supabase
    .from("client_invoices")
    .select("id, status, archived_at")
    .in("status", ["sent", "paid", "overdue"])
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  let posted = 0;
  for (const row of data ?? []) {
    try {
      const j = await postInvoiceJournal(row.id);
      if (j) posted += 1;
    } catch (e: any) {
      set({ errors: status.errors + 1, lastError: e?.message ?? String(e) });
      console.warn("[crmBridge] invoice post failed", row.id, e);
    }
  }
  return posted;
}

/** Journalize verified CRM payments that do not yet have an accounting journal. */
export async function syncCrmPayments(limit = BATCH): Promise<number> {
  const { data, error } = await supabase
    .from("client_invoice_payments")
    .select("id, is_refund, verified_at, archived_at")
    .not("verified_at", "is", null)
    .is("archived_at", null)
    .eq("is_refund", false)
    .order("paid_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  let posted = 0;
  for (const row of data ?? []) {
    try {
      const j = await postPaymentJournal(row.id);
      if (j) posted += 1;
    } catch (e: any) {
      set({ errors: status.errors + 1, lastError: e?.message ?? String(e) });
      console.warn("[crmBridge] payment post failed", row.id, e);
    }
  }
  return posted;
}

/** Run a full bridge sync (invoices then payments). Safe to call repeatedly. */
export async function syncCrmAll(limit = BATCH): Promise<CrmBridgeStatus> {
  if (status.running) return status;
  set({ running: true });
  try {
    const invoicesPosted = await syncCrmInvoices(limit);
    const paymentsPosted = await syncCrmPayments(limit);
    set({
      running: false,
      lastRunAt: new Date().toISOString(),
      invoicesPosted: status.invoicesPosted + invoicesPosted,
      paymentsPosted: status.paymentsPosted + paymentsPosted,
    });
  } catch (e: any) {
    set({ running: false, errors: status.errors + 1, lastError: e?.message ?? String(e) });
  }
  return status;
}

// Bounded auto-run once per session for accounting users (RLS-guarded).
let autoRan = false;
runWhenAuthReady(() => {
  if (autoRan) return;
  autoRan = true;
  void syncCrmAll();
});
