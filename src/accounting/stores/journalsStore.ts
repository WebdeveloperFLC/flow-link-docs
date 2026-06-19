import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { MOCK_JOURNALS, MOCK_ACCOUNTS } from "../data/mockJournals";
import type {
  Journal, JournalLine, JournalStatus, SourceType, Currency, AccountType,
} from "../data/mockJournals";
import { supabase } from "@/integrations/supabase/client";
import { getAccounts } from "./coaStore";
import { getAllEntities } from "./accountingEntitiesStore";
import { entityDisplayName, isEntityUuid } from "../lib/entityResolve";

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

function normalizeJournalEntity(j: Journal): Journal {
  const entities = getAllEntities();
  if (!isEntityUuid(j.entity)) return j;
  const name = entityDisplayName(j.entity, entities);
  if (name === j.entity) return j;
  return { ...j, entity: name };
}

let journals: Journal[] = (() => {
  if (typeof window === "undefined") return MOCK_JOURNALS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return (JSON.parse(raw) as Journal[]).map(normalizeJournalEntity);
  } catch {
    // Ignore malformed local cache and use seed journals.
  }
  return MOCK_JOURNALS;
})();

const listeners = new Set<() => void>();
function emit() {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(journals)); } catch {
    // Ignore localStorage write failures.
  }
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
  // Journal contract (Phase 1): derive contract fields, defaulting from
  // legacy fields so pre-Phase-1 callers keep working. branch_id falls back
  // to the entity when a caller has not supplied a branch yet.
  const entityId = j.entityId || j.entity || null;
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
    // ── contract columns ──
    entity_id: entityId,
    branch_id: j.branchId || entityId,
    source_module: j.sourceModule || "MANUAL",
    source_record_id: j.sourceRecordId || null,
    posting_date: j.postingDate || j.entryDate,
    is_reversal: j.isReversal ?? false,
    reversal_of_journal_id: j.reversalOfJournalId || null,
    reversed_by_journal_id: j.reversedByJournalId || null,
    attachment_path: j.attachmentPath || null,
    student_id: j.studentId || null,
    application_id: j.applicationId || null,
    institution_id: j.institutionId || null,
    aggregator_id: j.aggregatorId || null,
  };
}

function lineToDb(
  journalId: string,
  line: JournalLine,
  idx: number,
  header?: Journal,
): Record<string, unknown> {
  const entityId = line.entityId || header?.entityId || header?.entity || null;
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
    // ── contract columns ──
    entity_id: entityId,
    branch_id: line.branchId || header?.branchId || entityId,
    account_role: line.accountRole || null,
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
    entityId: row.entity_id ?? undefined,
    branchId: row.branch_id ?? row.branch ?? undefined,
    accountRole: row.account_role ?? undefined,
  };
}

function journalFromDb(row: any): Journal {
  const linesRaw = (row.accounting_journal_lines ?? []) as any[];
  const lines = linesRaw
    .slice()
    .sort((a, b) => (a.line_number ?? 0) - (b.line_number ?? 0))
    .map(lineFromDb);
  return normalizeJournalEntity({
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
    entityId: row.entity_id ?? undefined,
    branchId: row.branch_id ?? undefined,
    sourceModule: row.source_module ?? undefined,
    sourceRecordId: row.source_record_id ?? undefined,
    postingDate: row.posting_date ?? undefined,
    isReversal: row.is_reversal ?? undefined,
    reversalOfJournalId: row.reversal_of_journal_id ?? undefined,
    reversedByJournalId: row.reversed_by_journal_id ?? undefined,
    attachmentPath: row.attachment_path ?? undefined,
    studentId: row.student_id ?? undefined,
    applicationId: row.application_id ?? undefined,
    institutionId: row.institution_id ?? undefined,
    aggregatorId: row.aggregator_id ?? undefined,
    lines,
  });
}

async function repairJournalEntityRefsInDb() {
  const entities = getAllEntities();
  if (!entities.length) return;
  const repairs = journals
    .filter((j) => isEntityUuid(j.entity))
    .map((j) => ({ id: j.id, entity: entityDisplayName(j.entity, entities) }))
    .filter((r) => r.entity && !isEntityUuid(r.entity));
  for (const r of repairs) {
    if (!isUuid(r.id)) continue;
    try {
      await supabase.from("accounting_journals").update({ entity: r.entity }).eq("id", r.id);
    } catch {
      // best-effort migration for legacy intercompany journals
    }
  }
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
    void repairJournalEntityRefsInDb();
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
      const finalStatus = created.status || "DRAFT";
      // Posted journals are immutable and their lines cannot be inserted once
      // POSTED (DB guard). So always insert as DRAFT, add lines, then promote
      // to the requested status. This is the single, contract-compliant path.
      const headerPayload = {
        ...headerToDb(created),
        status: "DRAFT",
        posted_at: null,
        created_by: u?.user?.id ?? null,
      };
      const { data: hdr, error: hErr } = await supabase
        .from("accounting_journals")
        .insert(headerPayload as any)
        .select("id, journal_number")
        .single();
      if (hErr) throw hErr;

      const lineRows = (created.lines || []).map((l, i) => lineToDb(id, l, i, created));
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

      // Promote to the requested status (e.g. POSTED) after lines exist.
      if (finalStatus !== "DRAFT") {
        const promote: Record<string, unknown> = { status: finalStatus };
        if (finalStatus === "POSTED") {
          promote.posted_at = created.postedAt || new Date().toISOString();
          promote.posted_by = u?.user?.id ?? null;
        }
        const { error: pErr } = await supabase
          .from("accounting_journals")
          .update(promote as any)
          .eq("id", id);
        if (pErr) {
          await supabase.from("accounting_journals").delete().eq("id", id);
          throw pErr;
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
  // Posted journals are immutable — corrections must go through reverseJournal().
  if (prev.status === "POSTED" && patch.status !== "VOIDED") {
    toast.error("Posted journals are immutable. Create a reversal entry instead.");
    return;
  }
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
        const lineRows = (next.lines || []).map((l, i) => lineToDb(id, l, i, next));
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
  const target = journals.find((j) => j.id === id);
  if (target?.status === "POSTED") {
    toast.error("Posted journals cannot be deleted. Create a reversal entry instead.");
    return;
  }
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

/**
 * Reverse a posted journal (the only correction path). Builds a mirror
 * journal with debit/credit swapped, posts it in the current period, and
 * links both directions. Returns the new reversal journal (optimistically).
 */
export function reverseJournal(
  originalId: string,
  opts?: { reason?: string; postingDate?: string; attachmentPath?: string },
): Journal | undefined {
  const original = journals.find((j) => j.id === originalId);
  if (!original) {
    toast.error("Cannot reverse: journal not found.");
    return undefined;
  }
  if (original.status !== "POSTED") {
    toast.error("Only posted journals can be reversed.");
    return undefined;
  }
  if (original.reversedByJournalId) {
    toast.error("This journal has already been reversed.");
    return undefined;
  }

  const today = (opts?.postingDate || new Date().toISOString().slice(0, 10));
  const reversalLines: JournalLine[] = (original.lines || []).map((l) => ({
    ...l,
    id: newUuid(),
    debit: Number(l.credit) || 0,
    credit: Number(l.debit) || 0,
    description: `Reversal: ${l.description || ""}`.trim(),
  }));

  const reversal = addJournal({
    entryNumber: "",
    entryDate: today,
    entity: original.entity,
    narration: `Reversal of ${original.entryNumber || original.id}${opts?.reason ? ` — ${opts.reason}` : ""}`,
    sourceType: original.sourceType,
    reference: original.reference,
    currency: original.currency,
    status: "POSTED",
    createdBy: "",
    postedAt: new Date().toISOString(),
    lines: reversalLines,
    entityId: original.entityId || original.entity,
    branchId: original.branchId,
    sourceModule: original.sourceModule || "MANUAL",
    sourceRecordId: original.sourceRecordId,
    postingDate: today,
    isReversal: true,
    reversalOfJournalId: original.id,
    attachmentPath: opts?.attachmentPath,
    studentId: original.studentId,
    applicationId: original.applicationId,
    institutionId: original.institutionId,
    aggregatorId: original.aggregatorId,
  } as Omit<Journal, "id">);

  // Link the original -> reversal (allowed mutation on a posted journal).
  journals = journals.map((j) =>
    j.id === originalId ? { ...j, reversedByJournalId: reversal.id } : j,
  );
  emit();
  if (isUuid(originalId)) {
    void supabase
      .from("accounting_journals")
      .update({ reversed_by_journal_id: reversal.id } as any)
      .eq("id", originalId)
      .then(({ error }) => {
        if (error) console.warn("[journalsStore] reversal link failed", error);
      });
  }

  toast.success("Reversal entry posted.");
  return reversal;
}
