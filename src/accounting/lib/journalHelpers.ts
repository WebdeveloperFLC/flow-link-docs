import type { CoaAccount } from "../types/coa";
import type { AccountType, JournalLine, Currency } from "../data/mockJournals";
import { getAccounts } from "../stores/coaStore";
import { getJournals } from "../stores/journalsStore";

export function findAccount(id: string): CoaAccount | undefined {
  return getAccounts().find((a) => a.id === id);
}

export function toAccountType(groupCode: string): AccountType {
  const map: Record<string, AccountType> = {
    ASSET: "ASSET",
    LIABILITY: "LIABILITY",
    EQUITY: "EQUITY",
    REVENUE: "REVENUE",
    EXPENSE: "EXPENSE",
    COGS: "EXPENSE",
    OTHER_INCOME: "REVENUE",
    OTHER_EXPENSE: "EXPENSE",
  };
  return map[groupCode] ?? "EXPENSE";
}

export function buildLine(opts: {
  id: string;
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string;
  taxCode?: string;
}): JournalLine | null {
  const a = findAccount(opts.accountId);
  if (!a) return null;
  return {
    id: opts.id,
    accountId: a.id,
    accountCode: a.code,
    accountName: a.name,
    accountType: toAccountType(a.groupCode),
    debit: opts.debit ?? 0,
    credit: opts.credit ?? 0,
    description: opts.description ?? "",
    taxCode: opts.taxCode ?? "",
  };
}

export function nextJournalNumber(prefix = "JE"): string {
  const year = new Date().getFullYear();
  const n = getJournals().length + 1;
  return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
}

export const CURRENCY_FALLBACK: Currency = "CAD";
export function asCurrency(c: string): Currency {
  return (c === "CAD" || c === "USD" || c === "INR" ? c : "CAD") as Currency;
}