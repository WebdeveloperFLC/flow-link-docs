import { CoaAccount } from "../types/coa";

const now = new Date().toISOString();

function a(
  id: string, code: string, name: string, groupCode: string, typeCode: string,
  currency: string, balance: number, txnCount = 0,
  parentId: string | null = null, entityId: string | null = null,
  extras: Partial<CoaAccount> = {},
): CoaAccount {
  return {
    id, code, name, groupCode, typeCode, parentId,
    currency, entityId,
    openingBalance: 0, currentBalance: balance,
    status: "ACTIVE",
    txnCount,
    createdAt: now,
    ...extras,
  };
}

/**
 * Suggested inter-company COA template — accountants should review currencies
 * and add/remove pairs as new group entities are added.
 * groupCode / typeCode use the seeded codes from coaMasterStore.ts.
 */
export const SEED_ACCOUNTS: CoaAccount[] = [
  // ── INTER-COMPANY — Due FROM (Assets) ──
  a("ic-1800", "1800", "Due from Future Link Consultants Pvt Ltd", "ASSET", "AR", "INR", 0, 0, null, null, {
    normalBalance: "DEBIT",
    description: "Inter-company receivable from FL Consultants India",
  }),
  a("ic-1801", "1801", "Due from Future Link Visa Consultants Pvt Ltd", "ASSET", "AR", "INR", 0, 0, null, null, { normalBalance: "DEBIT" }),
  a("ic-1802", "1802", "Due from Future Link Academic Excellence Pvt Ltd", "ASSET", "AR", "INR", 0, 0, null, null, { normalBalance: "DEBIT" }),
  a("ic-1803", "1803", "Due from Future Link Consultants Inc (Canada)", "ASSET", "AR", "CAD", 0, 0, null, null, { normalBalance: "DEBIT" }),
  a("ic-1804", "1804", "Due from Future Way Consultants Inc", "ASSET", "AR", "CAD", 0, 0, null, null, { normalBalance: "DEBIT" }),
  a("ic-1805", "1805", "Due from Ontario Inc 2709223", "ASSET", "AR", "CAD", 0, 0, null, null, { normalBalance: "DEBIT" }),

  // ── INTER-COMPANY — Due TO (Liabilities) ──
  a("ic-2600", "2600", "Due to Future Link Consultants Pvt Ltd", "LIABILITY", "AP", "INR", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "Inter-company payable to FL Consultants India",
  }),
  a("ic-2601", "2601", "Due to Future Link Visa Consultants Pvt Ltd", "LIABILITY", "AP", "INR", 0, 0, null, null, { normalBalance: "CREDIT" }),
  a("ic-2602", "2602", "Due to Future Link Academic Excellence Pvt Ltd", "LIABILITY", "AP", "INR", 0, 0, null, null, { normalBalance: "CREDIT" }),
  a("ic-2603", "2603", "Due to Future Link Consultants Inc (Canada)", "LIABILITY", "AP", "CAD", 0, 0, null, null, { normalBalance: "CREDIT" }),
  a("ic-2604", "2604", "Due to Future Way Consultants Inc", "LIABILITY", "AP", "CAD", 0, 0, null, null, { normalBalance: "CREDIT" }),
  a("ic-2605", "2605", "Due to Ontario Inc 2709223", "LIABILITY", "AP", "CAD", 0, 0, null, null, { normalBalance: "CREDIT" }),

  // ── MANAGEMENT FEE / INTERCOMPANY REVENUE ──
  a("ic-4700", "4700", "Management Fee Income", "REVENUE", "COMMISSION_REV", "INR", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "Management fees charged to other group entities",
  }),
  a("ic-4701", "4701", "Software Development Revenue — Intercompany", "REVENUE", "COMMISSION_REV", "INR", 0, 0, null, null, { normalBalance: "CREDIT" }),
  a("ic-4702", "4702", "Staff Cost Recharge — Intercompany", "REVENUE", "COMMISSION_REV", "INR", 0, 0, null, null, { normalBalance: "CREDIT" }),

  // ── MANAGEMENT FEE / INTERCOMPANY EXPENSE ──
  a("ic-6700", "6700", "Management Fee Expense", "EXPENSE", "PROFESSIONAL_FEES", "CAD", 0, 0, null, null, {
    normalBalance: "DEBIT",
    description: "Management fees paid to group entities",
  }),
  a("ic-6701", "6701", "Software Development — Intercompany", "EXPENSE", "PROFESSIONAL_FEES", "CAD", 0, 0, null, null, { normalBalance: "DEBIT" }),
  a("ic-6702", "6702", "Staff Cost Recharge — Intercompany", "EXPENSE", "SALARIES", "CAD", 0, 0, null, null, { normalBalance: "DEBIT" }),
];