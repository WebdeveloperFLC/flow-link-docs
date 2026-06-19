import Decimal from "decimal.js";
import type { Journal } from "../data/mockJournals";
import type { CoaAccount, AccountGroup } from "../types/coa";
import type { SettingsEntity } from "../types/settings";
import { journalMatchesEntityFilter } from "./entityResolve";

/** Sentinel values for entity filter dropdowns (match report pages). */
export const ENTITY_ALL = "__all__";
export const ENTITY_NONE = "__none__";

export function getJournalEntityRef(j: Journal): string {
  return (j.entityId ?? j.entity ?? "").trim();
}

export function getJournalDate(j: Journal): string {
  return j.postingDate ?? j.entryDate;
}

/** Filter posted journals by entity scope (same semantics as General Ledger). */
export function filterJournalsByEntity(
  journals: Journal[],
  entityFilter: string,
  entities: SettingsEntity[],
  opts?: { status?: Journal["status"]; asOf?: string; from?: string; to?: string },
): Journal[] {
  return journals.filter((j) => {
    if (opts?.status && j.status !== opts.status) return false;
    if (opts?.status === undefined && j.status !== "POSTED") return false;
    const date = getJournalDate(j);
    if (opts?.asOf && date > opts.asOf) return false;
    if (opts?.from && date < opts.from) return false;
    if (opts?.to && date > opts.to) return false;
    if (entityFilter === ENTITY_ALL) return true;
    if (entityFilter === ENTITY_NONE) {
      const ref = getJournalEntityRef(j);
      return !ref || !entities.some((e) => e.id === ref || e.name === ref);
    }
    return journalMatchesEntityFilter(getJournalEntityRef(j), entityFilter, entities);
  });
}

/**
 * Accounts visible on an entity-scoped report:
 * - entity-specific COA rows, plus
 * - global (null entityId) accounts that receive postings from entity-filtered journals.
 */
export function accountsForEntityReport(
  accounts: CoaAccount[],
  journals: Journal[],
  entityFilter: string,
  entities: SettingsEntity[],
): CoaAccount[] {
  if (entityFilter === ENTITY_ALL) return accounts;
  if (entityFilter === ENTITY_NONE) return accounts.filter((a) => a.entityId === null);

  const scopedJournals = filterJournalsByEntity(journals, entityFilter, entities);
  const touchedIds = new Set<string>();
  for (const j of scopedJournals) {
    for (const l of j.lines) {
      if (l.accountId) touchedIds.add(l.accountId);
    }
  }

  return accounts.filter(
    (a) => a.entityId === entityFilter || (a.entityId === null && touchedIds.has(a.id)),
  );
}

export function sumAccountActivity(
  accountId: string,
  journals: Journal[],
  entityFilter: string,
  entities: SettingsEntity[],
  opts: { asOf?: string; from?: string; to?: string },
): { dr: Decimal; cr: Decimal } {
  const scoped = filterJournalsByEntity(journals, entityFilter, entities, {
    status: "POSTED",
    asOf: opts.asOf,
    from: opts.from,
    to: opts.to,
  });
  let dr = new Decimal(0);
  let cr = new Decimal(0);
  for (const j of scoped) {
    for (const l of j.lines) {
      if (l.accountId !== accountId) continue;
      dr = dr.plus(new Decimal(l.debit || 0));
      cr = cr.plus(new Decimal(l.credit || 0));
    }
  }
  return { dr, cr };
}

export function closingBalance(
  account: CoaAccount,
  nature: "DEBIT" | "CREDIT",
  journals: Journal[],
  entityFilter: string,
  entities: SettingsEntity[],
  asOf: string,
): Decimal {
  const { dr, cr } = sumAccountActivity(account.id, journals, entityFilter, entities, { asOf });
  const opening = new Decimal(account.openingBalance || 0);
  return nature === "DEBIT" ? opening.plus(dr).minus(cr) : opening.plus(cr).minus(dr);
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  parentId: string | null;
  entityLabel: string;
  groupCode: string;
  groupLabel: string;
  nature: "DEBIT" | "CREDIT";
  debitCol: Decimal;
  creditCol: Decimal;
  signedClosing: Decimal;
  oppositeSide: boolean;
}

export function computeTrialBalanceRows(
  asOf: string,
  accounts: CoaAccount[],
  groups: AccountGroup[],
  journals: Journal[],
  entities: SettingsEntity[],
  entityFilter: string,
): TrialBalanceRow[] {
  const groupBy = new Map(groups.map((g) => [g.code, g]));
  const entityNameById = new Map(entities.map((e) => [e.id, e.name]));
  const visible = accountsForEntityReport(accounts, journals, entityFilter, entities);

  return visible.map((a) => {
    const g = groupBy.get(a.groupCode);
    const nature: "DEBIT" | "CREDIT" = g?.nature ?? "DEBIT";
    const { dr, cr } = sumAccountActivity(a.id, journals, entityFilter, entities, { asOf });
    const closing = nature === "DEBIT"
      ? new Decimal(a.openingBalance || 0).plus(dr).minus(cr)
      : new Decimal(a.openingBalance || 0).plus(cr).minus(dr);
    const isNeg = closing.lt(0);
    const abs = closing.abs();
    let debitCol = new Decimal(0);
    let creditCol = new Decimal(0);
    if (!closing.eq(0)) {
      const showOn = isNeg
        ? (nature === "DEBIT" ? "CR" : "DR")
        : (nature === "DEBIT" ? "DR" : "CR");
      if (showOn === "DR") debitCol = abs;
      else creditCol = abs;
    }
    return {
      accountId: a.id,
      code: a.code,
      name: a.name,
      parentId: a.parentId,
      entityLabel: a.entityId ? (entityNameById.get(a.entityId) ?? "—") : "All",
      groupCode: a.groupCode,
      groupLabel: g?.label ?? a.groupCode,
      nature,
      debitCol,
      creditCol,
      signedClosing: closing,
      oppositeSide: isNeg,
    };
  });
}

export interface BSRow {
  code: string;
  name: string;
  amount: number;
}

export interface BalanceSheetResult {
  curAssets: BSRow[];
  ncAssets: BSRow[];
  curLiab: BSRow[];
  ncLiab: BSRow[];
  eqRows: BSRow[];
  retainedEarnings: number;
  totalAssets: number;
  totalLiabEq: number;
  balanced: boolean;
}

const NONCURRENT_ASSET_TYPES = new Set(["FIXED_ASSET"]);
const NONCURRENT_LIAB_TYPES = new Set(["LOAN"]);
const PL_GROUPS = new Set(["REVENUE", "COGS", "EXPENSE", "OTHER_INCOME", "OTHER_EXPENSE"]);

export function computeBalanceSheet(
  asOf: string,
  accounts: CoaAccount[],
  groups: AccountGroup[],
  journals: Journal[],
  entities: SettingsEntity[],
  entityFilter: string,
): BalanceSheetResult {
  const groupBy = new Map(groups.map((g) => [g.code, g]));
  const visible = accountsForEntityReport(accounts, journals, entityFilter, entities);

  const curAssets: BSRow[] = [];
  const ncAssets: BSRow[] = [];
  const curLiab: BSRow[] = [];
  const ncLiab: BSRow[] = [];
  const eqRows: BSRow[] = [];

  for (const a of visible) {
    const g = groupBy.get(a.groupCode);
    if (!g || PL_GROUPS.has(g.code)) continue;
    const c = closingBalance(a, g.nature, journals, entityFilter, entities, asOf).toNumber();
    if (Math.abs(c) < 0.005) continue;
    const row: BSRow = { code: a.code, name: a.name, amount: c };
    if (g.code === "ASSET") {
      (NONCURRENT_ASSET_TYPES.has(a.typeCode) ? ncAssets : curAssets).push(row);
    } else if (g.code === "LIABILITY") {
      (NONCURRENT_LIAB_TYPES.has(a.typeCode) ? ncLiab : curLiab).push(row);
    } else if (g.code === "EQUITY") {
      eqRows.push(row);
    }
  }

  let retainedEarnings = 0;
  for (const a of visible) {
    const g = groupBy.get(a.groupCode);
    if (!g || !PL_GROUPS.has(g.code)) continue;
    const c = closingBalance(a, g.nature, journals, entityFilter, entities, asOf).toNumber();
    if (g.nature === "CREDIT") retainedEarnings += c;
    else retainedEarnings -= c;
  }

  const totalAssets =
    curAssets.reduce((s, r) => s + r.amount, 0) + ncAssets.reduce((s, r) => s + r.amount, 0);
  const totalLiabEq =
    curLiab.reduce((s, r) => s + r.amount, 0) +
    ncLiab.reduce((s, r) => s + r.amount, 0) +
    eqRows.reduce((s, r) => s + r.amount, 0) +
    retainedEarnings;

  return {
    curAssets,
    ncAssets,
    curLiab,
    ncLiab,
    eqRows,
    retainedEarnings,
    totalAssets,
    totalLiabEq,
    balanced: Math.abs(totalAssets - totalLiabEq) < 0.05,
  };
}

export interface PLLine {
  code: string;
  name: string;
  current: number;
  prior: number;
}

export interface ProfitLossResult {
  revenue: PLLine[];
  cogs: PLLine[];
  opex: PLLine[];
  tax: PLLine[];
  totalRevenue: number;
  totalCogs: number;
  totalOpex: number;
  totalTax: number;
  grossProfit: number;
  netIncome: number;
  priorNetIncome: number;
}

export function computeProfitLoss(
  from: string,
  to: string,
  priorFrom: string,
  priorTo: string,
  accounts: CoaAccount[],
  groups: AccountGroup[],
  journals: Journal[],
  entities: SettingsEntity[],
  entityFilter: string,
): ProfitLossResult {
  const groupBy = new Map(groups.map((g) => [g.code, g]));
  const visible = accountsForEntityReport(accounts, journals, entityFilter, entities);

  function periodNet(a: CoaAccount, nature: "DEBIT" | "CREDIT", pFrom: string, pTo: string): number {
    const { dr, cr } = sumAccountActivity(a.id, journals, entityFilter, entities, { from: pFrom, to: pTo });
    return nature === "DEBIT" ? dr.minus(cr).toNumber() : cr.minus(dr).toNumber();
  }

  const revenue: PLLine[] = [];
  const cogs: PLLine[] = [];
  const opex: PLLine[] = [];
  const tax: PLLine[] = [];

  for (const a of visible) {
    const g = groupBy.get(a.groupCode);
    if (!g || !PL_GROUPS.has(g.code)) continue;
    const cur = periodNet(a, g.nature, from, to);
    const pri = periodNet(a, g.nature, priorFrom, priorTo);
    if (Math.abs(cur) < 0.005 && Math.abs(pri) < 0.005) continue;
    const line: PLLine = { code: a.code, name: a.name, current: cur, prior: pri };
    if (g.code === "REVENUE" || g.code === "OTHER_INCOME") revenue.push(line);
    else if (g.code === "COGS") cogs.push(line);
    else if (a.typeCode === "TAX" || a.typeCode === "TAXES" || a.code.startsWith("23")) tax.push(line);
    else if (g.code === "EXPENSE" || g.code === "OTHER_EXPENSE") opex.push(line);
  }

  const totalRevenue = revenue.reduce((s, l) => s + l.current, 0);
  const totalCogs = cogs.reduce((s, l) => s + l.current, 0);
  const totalOpex = opex.reduce((s, l) => s + l.current, 0);
  const totalTax = tax.reduce((s, l) => s + l.current, 0);
  const grossProfit = totalRevenue - totalCogs;
  const netIncome = grossProfit - totalOpex - totalTax;

  const priorNetIncome =
    revenue.reduce((s, l) => s + l.prior, 0) -
    cogs.reduce((s, l) => s + l.prior, 0) -
    opex.reduce((s, l) => s + l.prior, 0) -
    tax.reduce((s, l) => s + l.prior, 0);

  return { revenue, cogs, opex, tax, totalRevenue, totalCogs, totalOpex, totalTax, grossProfit, netIncome, priorNetIncome };
}
