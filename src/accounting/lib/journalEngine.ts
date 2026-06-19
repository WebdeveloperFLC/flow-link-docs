import { addJournal, reverseJournal } from "../stores/journalsStore";
import type { Journal, JournalLine, Currency, SourceModule } from "../data/mockJournals";
import { resolveRoleAccount } from "../stores/accountRolesStore";
import { getAccounts } from "../stores/coaStore";
import type { CoaAccount } from "../types/coa";

/**
 * Central Journal Engine (Phase 1).
 *
 * The single, contract-compliant path for creating accounting journals.
 * Every workflow (CRM AR, trust, AP, payroll, tax, close) builds a set of
 * posting legs and calls `postJournal`. The engine:
 *   1. validates the mandatory journal contract,
 *   2. resolves symbolic account roles -> postable COA accounts,
 *   3. asserts the entry balances, and
 *   4. posts it immutably via the journals store.
 *
 * Corrections are never edits — use `reverseJournal` (re-exported).
 */

export interface PostingLeg {
  /** Symbolic role (preferred) e.g. 'AR_STUDENT'. */
  roleKey?: string;
  /** Explicit COA code, used when a role is not appropriate. */
  accountCode?: string;
  drCr: "DR" | "CR";
  amount: number;
  description?: string;
  taxCode?: string;
}

export interface PostingInput {
  entityId: string;
  branchId: string;
  currency: Currency | string;
  sourceModule: SourceModule;
  sourceRecordId?: string;
  postingDate: string; // yyyy-mm-dd
  narration: string;
  reference?: string;
  legs: PostingLeg[];
  status?: "DRAFT" | "POSTED";
  attachmentPath?: string;
  /** Reserved nullable references for future commission integration. */
  studentId?: string;
  applicationId?: string;
  institutionId?: string;
  aggregatorId?: string;
}

export class PostingError extends Error {}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

function findByCode(code: string, entityId?: string): CoaAccount | undefined {
  const coa = getAccounts();
  const scoped = entityId ? coa.find((a) => a.code === code && a.entityId === entityId) : undefined;
  const global = coa.find((a) => a.code === code && (a.entityId === null || a.entityId === undefined));
  return scoped ?? global ?? coa.find((a) => a.code === code);
}

function resolveLegAccount(leg: PostingLeg, entityId: string): CoaAccount {
  if (leg.roleKey) {
    const acc = resolveRoleAccount(leg.roleKey, entityId);
    if (!acc) {
      throw new PostingError(
        `No account mapped for role "${leg.roleKey}" (entity ${entityId}). ` +
        `Configure it in Account Roles.`,
      );
    }
    return acc;
  }
  if (leg.accountCode) {
    const acc = findByCode(leg.accountCode, entityId);
    if (!acc) throw new PostingError(`COA account "${leg.accountCode}" not found.`);
    return acc;
  }
  throw new PostingError("Posting leg must specify a roleKey or accountCode.");
}

function validateContract(input: PostingInput) {
  const missing: string[] = [];
  if (!input.entityId) missing.push("entity_id");
  if (!input.branchId) missing.push("branch_id"); // decision #4: branch is mandatory
  if (!input.currency) missing.push("currency");
  if (!input.sourceModule) missing.push("source_module");
  if (!input.postingDate) missing.push("posting_date");
  if (!input.narration) missing.push("narration");
  if (missing.length) {
    throw new PostingError(`Journal contract incomplete — missing: ${missing.join(", ")}.`);
  }
  if (!input.legs?.length || input.legs.length < 2) {
    throw new PostingError("A journal needs at least two posting legs.");
  }
}

/**
 * Build + post a balanced, immutable journal. Returns the created Journal.
 * Throws PostingError on contract / balance / mapping failures.
 */
export function postJournal(input: PostingInput): Journal {
  validateContract(input);

  const lines: JournalLine[] = input.legs.map((leg, i) => {
    const amount = round2(leg.amount);
    if (amount < 0) throw new PostingError("Posting leg amounts must be non-negative.");
    const acc = resolveLegAccount(leg, input.entityId);
    return {
      id: "",
      accountId: acc.id,
      accountCode: acc.code,
      accountName: acc.name,
      accountType: (acc.groupCode as JournalLine["accountType"]) ?? "EXPENSE",
      debit: leg.drCr === "DR" ? amount : 0,
      credit: leg.drCr === "CR" ? amount : 0,
      description: leg.description || input.narration,
      taxCode: leg.taxCode || "",
      entityId: input.entityId,
      branchId: input.branchId,
      accountRole: leg.roleKey,
    } as JournalLine;
  }).filter((l) => l.debit > 0 || l.credit > 0);

  const totalDr = round2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCr = round2(lines.reduce((s, l) => s + l.credit, 0));
  if (Math.abs(totalDr - totalCr) > 0.005) {
    throw new PostingError(
      `Journal does not balance: debits ${totalDr.toFixed(2)} vs credits ${totalCr.toFixed(2)}.`,
    );
  }
  if (totalDr === 0) throw new PostingError("Journal has no monetary effect.");

  const created = addJournal({
    entryNumber: "",
    entryDate: input.postingDate,
    entity: input.entityId,
    narration: input.narration,
    sourceType: "MANUAL",
    reference: input.reference || "",
    currency: (input.currency as Currency) || "CAD",
    status: input.status || "POSTED",
    createdBy: "",
    postedAt: (input.status ?? "POSTED") === "POSTED" ? new Date().toISOString() : undefined,
    lines,
    entityId: input.entityId,
    branchId: input.branchId,
    sourceModule: input.sourceModule,
    sourceRecordId: input.sourceRecordId,
    postingDate: input.postingDate,
    attachmentPath: input.attachmentPath,
    studentId: input.studentId,
    applicationId: input.applicationId,
    institutionId: input.institutionId,
    aggregatorId: input.aggregatorId,
  } as Omit<Journal, "id">);

  return created;
}

export { reverseJournal };
