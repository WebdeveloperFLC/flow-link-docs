import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { MOCK_JOURNALS, MOCK_ACCOUNTS } from "../data/mockJournals";
import type {
  Journal, JournalLine, JournalStatus, SourceType, Currency, AccountType,
} from "../data/mockJournals";
import { supabase } from "@/integrations/supabase/client";
import { getAccounts } from "./coaStore";

const STORAGE_KEY = "accounting:journals:v3";
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string | null | undefined) => !!v && UUID_RX.test(v);

function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(16)}-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let journals: Journal[] = (() => {
  if (typeof window === "undefined") return MOCK_JOURNALS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Journal[];
  } catch {}
  return MOCK_JOURNALS;
})();

const listeners = new Set<() => void>();
function emit() {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(journals)); } catch {}
  listeners.forEach((l) => l());
}

// ─── DB mapping ─────────────────────────────────────────────────────────────
function totalsFor(lines: JournalLine[]) {
  const td = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const tc = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  return { td, tc, balanced: Math.abs(td - tc) < 0.005 };
}

function headerToDb(j: Journal): Record<string, unknown> {
  const { td, tc, balanced } = totalsFor(j.lines || []);
  return {
    id: j.id,
    // Do NOT send journal_number — the DB trigger generates it.
    entry_date: j.entryDate,
    entity: j.entity,
    currency: j.currency || "CAD",
    source_type: j.sourceType || "MANUAL",
    reference: j.reference || null,
    narration: j.narration || "",
    status: j.status || "DRAFT",
    total_debit: td,
    total_credit: tc,
    is_balanced: balanced,
    posted_at: j.postedAt || null,
    voided_at: j.voidedAt || null,
    void_reason: j.voidReason || null,
  };
}

function lineToDb(journalId: string, line: JournalLine, idx: number): Record<string, unknown> {
  return {
    id: isUuid(line.id) ? line.id : newUuid(),
    journal_id: journalId,
    line_number: idx + 1,
    account_id: isUuid(line.accountId) ? line.accountId : null,
    account_code: line.accountCode || null,
    account_name: line.accountName || null,
    description: line.description || null,
    tax_code: line.taxCode || null,
    debit: Number(line.debit) || 0,
    credit: Number(line.credit) || 0,
  };
}

function lineFromDb(row: any): JournalLine {
  // Resolve accountType from coa cache by code or id.
  const coa = getAccounts();
  const a = coa.find((x) =>
    (row.account_id && x.id === row.account_id) ||
    (row.account_code && x.code === row.account_code)
  ) || MOCK_ACCOUNTS.find((x) => x.id === row.account_id || x.code === row.account_code);
  return {
    id: row.id,
    accountId: row.account_id ?? row.account_code ?? "",
    accountCode: row.account_code ?? a?.code ?? "",
    accountName: row.account_name ?? a?.name ?? "",
    accountType: (((a as any)?.type ?? (a as any)?.typeCode) ?? "EXPENSE") as AccountType,
    debit: Number(row.debit) || 0,
    credit: Number(row.credit) || 0,
    description: row.description ?? "",
    taxCode: row.tax_code ?? "",
  };
}

function journalFromDb(row: any): Journal {
  const linesRaw = (row.accounting_journal_lines ?? []) as any[];
  const lines = linesRaw
    .slice()
    .sort((a, b) => (a.line_number ?? 0) - (b.line_number ?? 0))
    .map(lineFromDb);
  return {
    id: row.id,
    entryNumber: row.journal_number,
    entryDate: row.entry_date,
    entity: row.entity,
    narration: row.narration ?? "",
    sourceType: (row.source_type ?? "MANUAL") as SourceType,
    reference: row.reference ?? "",
    currency: (row.currency ?? "CAD") as Currency,
    status: (row.status ?? "DRAFT") as JournalStatus,
    createdBy: "",
    postedAt: row.posted_at ?? undefined,
    voidedAt: row.voided_at ?? undefined,
    voidReason: row.void_reason ?? undefined,
    lines,
  };
}

async function hydrateFromSupabase() {
  try {
    const { data, error } = await supabase
      .from("accounting_journals")
      .select("*, accounting_journal_lines(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!data) return;
    const byId = new Map(journals.map((j) => [j.id, j]));
    for (const row of data) byId.set(row.id, journalFromDb(row));
    journals = Array.from(byId.values());
    emit();
  } catch (e) {
    console.warn("[journalsStore] hydrate failed", e);
  }
}
import { runWhenAuthReady } from "./_hydrationGate";
runWhenAuthReady(hydrateFromSupabase);

// ─── Public API ─────────────────────────────────────────────────────────────
export function useJournals(): Journal[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => journals,
    () => journals,
  );
}
export const getJournals = () => journals;
export const getJournal = (id: string) => journals.find((j) => j.id === id);

export function addJournal(input: Omit<Journal, "id">): Journal {
  const id = newUuid();
  const created: Journal = { id, ...input } as Journal;
  journals = [created, ...journals];
  emit();
  void (async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      const headerPayload = { ...headerToDb(created), created_by: u?.user?.id ?? null };
      if (created.status === "POSTED") {
        (headerPayload as any).posted_by = u?.user?.id ?? null;
      }
      const { data: hdr, error: hErr } = await supabase
        .from("accounting_journals")
        .insert(headerPayload as any)
        .select("id, journal_number")
        .single();
      if (hErr) throw hErr;

      const lineRows = (created.lines || []).map((l, i) => lineToDb(id, l, i));
      if (lineRows.length) {
        const { error: lErr } = await supabase
          .from("accounting_journal_lines")
          .insert(lineRows as any);
        if (lErr) {
          // Atomic: roll back header, cascade removes any lines
          await supabase.from("accounting_journals").delete().eq("id", id);
          throw lErr;
        }
      }

      // Patch local with DB-generated journal_number
      if (hdr?.journal_number) {
        journals = journals.map((j) =>
          j.id === id ? { ...j, entryNumber: hdr.journal_number } : j
        );
        emit();
      }
    } catch (e: any) {
      console.warn("[journalsStore] insert failed", e);
      journals = journals.filter((j) => j.id !== id);
      emit();
      toast.error(`Failed to save journal: ${e?.message ?? "unknown error"}`);
    }
  })();
  return created;
}

export function updateJournal(id: string, patch: Partial<Journal>) {
  const prev = journals.find((j) => j.id === id);
  if (!prev) return;
  const next: Journal = { ...prev, ...patch };
  journals = journals.map((j) => (j.id === id ? next : j));
  emit();
  if (!isUuid(id)) return;
  void (async () => {
    let previousLineRows: any[] = [];
    let hadLineReplacementAttempt = false;
    try {
      const { error: hErr } = await supabase
        .from("accounting_journals")
        .update(headerToDb(next) as any)
        .eq("id", id);
      if (hErr) throw hErr;

      // If lines changed, replace them all (atomic per-journal)
      if (patch.lines) {
        hadLineReplacementAttempt = true;
        const { data: existingRows, error: sErr } = await supabase
          .from("accounting_journal_lines")
          .select("*")
          .eq("journal_id", id)
          .order("line_number", { ascending: true });
        if (sErr) throw sErr;
        previousLineRows = existingRows ?? [];

        const { error: dErr } = await supabase
          .from("accounting_journal_lines")
          .delete()
          .eq("journal_id", id);
        if (dErr) throw dErr;
        const lineRows = (next.lines || []).map((l, i) => lineToDb(id, l, i));
        if (lineRows.length) {
          const { error: lErr } = await supabase
            .from("accounting_journal_lines")
            .insert(lineRows as any);
          if (lErr) throw lErr;
        }
      }
    } catch (e: any) {
      if (hadLineReplacementAttempt) {
        try {
          // Best-effort compensation so DB lines are not left empty on partial failure.
          await supabase.from("accounting_journal_lines").delete().eq("journal_id", id);
          if (previousLineRows.length) {
            const { error: restoreErr } = await supabase.from("accounting_journal_lines").insert(previousLineRows as any);
            if (restoreErr) {
              console.warn("[journalsStore] line restore failed", restoreErr);
            }
          }
        } catch (restoreCatch) {
          console.warn("[journalsStore] line restore threw", restoreCatch);
        }
      }
      console.warn("[journalsStore] update failed", e);
      journals = journals.map((j) => (j.id === id ? prev : j));
      emit();
      toast.error(`Failed to update journal: ${e?.message ?? "unknown error"}`);
    }
  })();
}

export function deleteJournal(id: string) {
  const prev = journals;
  journals = journals.filter((j) => j.id !== id);
  emit();
  if (!isUuid(id)) return;
  void (async () => {
    try {
      // Lines cascade via FK ON DELETE CASCADE
      const { error } = await supabase.from("accounting_journals").delete().eq("id", id);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[journalsStore] delete failed", e);
      journals = prev;
      emit();
      toast.error(`Failed to delete journal: ${e?.message ?? "unknown error"}`);
    }
  })();
}
