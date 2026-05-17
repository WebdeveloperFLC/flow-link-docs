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

  // ── CLIENT FUNDS HELD (Liabilities) — pass-through, never revenue ──
  a("cf-2401", "2401", "Client Funds — Tuition Held", "LIABILITY", "AP", "CAD", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "Tuition fees received from clients to be paid to institutions",
    ...({ automationTags: ["client_funds", "pass_through"] } as any),
  }),
  a("cf-2402", "2402", "Client Funds — Embassy / Visa Fees", "LIABILITY", "AP", "CAD", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "Embassy and visa filing fees received from clients",
    ...({ automationTags: ["client_funds", "pass_through"] } as any),
  }),
  a("cf-2403", "2403", "Client Funds — Application Fees", "LIABILITY", "AP", "CAD", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "College/university application fees received from clients",
    ...({ automationTags: ["client_funds", "pass_through"] } as any),
  }),
  a("cf-2404", "2404", "Client Funds — GIC Held", "LIABILITY", "AP", "CAD", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "GIC amounts received from students — to be transferred to bank",
    ...({ automationTags: ["client_funds", "pass_through", "GIC"] } as any),
  }),
  a("cf-2405", "2405", "Client Funds — Other Expenses", "LIABILITY", "AP", "CAD", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "Other client funds received for expenses on their behalf",
    ...({ automationTags: ["client_funds", "pass_through"] } as any),
  }),
  a("cf-2406", "2406", "Client Funds — Biometrics Fees", "LIABILITY", "AP", "CAD", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "Biometrics fees collected from clients",
    ...({ automationTags: ["client_funds", "pass_through"] } as any),
  }),
  a("cf-2407", "2407", "Client Funds — Medical / Police", "LIABILITY", "AP", "CAD", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "Medical exam and police certificate fees collected from clients",
    ...({ automationTags: ["client_funds", "pass_through"] } as any),
  }),

  // ── REVENUE (actual FLC income) ──
  a("rev-4101", "4101", "Canada Student Visa Fees — Revenue", "REVENUE", "VISA_REV", "CAD", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "FLC consulting fee for Canada student visa service",
    ...({ automationTags: ["visa_revenue"] } as any),
  }),
  a("rev-4102", "4102", "Immigration Consulting Fees", "REVENUE", "IMMIGRATION_REV", "CAD", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "PR, Express Entry, PNP, work permit consulting fees",
    ...({ automationTags: ["visa_revenue"] } as any),
  }),
  a("rev-4103", "4103", "Study Abroad Consulting Fees", "REVENUE", "VISA_REV", "CAD", 0, 0, null, null, {
    normalBalance: "CREDIT",
    ...({ automationTags: ["consulting_revenue"] } as any),
  }),
  a("rev-4104", "4104", "Visitor / Super Visa Fees", "REVENUE", "VISA_REV", "CAD", 0, 0, null, null, {
    normalBalance: "CREDIT",
    ...({ automationTags: ["visa_revenue"] } as any),
  }),
  a("rev-4301", "4301", "Canada Institution Commission", "REVENUE", "COMMISSION_REV", "CAD", 0, 0, null, null, {
    normalBalance: "CREDIT",
    ...({ automationTags: ["institution_commission"] } as any),
  }),
  a("rev-4302", "4302", "UK Institution Commission", "REVENUE", "COMMISSION_REV", "GBP", 0, 0, null, null, {
    normalBalance: "CREDIT",
    ...({ automationTags: ["institution_commission"] } as any),
  }),
  a("rev-4303", "4303", "Australia Institution Commission", "REVENUE", "COMMISSION_REV", "AUD", 0, 0, null, null, {
    normalBalance: "CREDIT",
    ...({ automationTags: ["institution_commission"] } as any),
  }),

  // ── EXPENSE pass-through (offsets client-fund liabilities) ──
  a("exp-5101", "5101", "Embassy Fees Paid — Client", "EXPENSE", "PROFESSIONAL_FEES", "CAD", 0, 0, null, null, {
    normalBalance: "DEBIT",
    description: "Embassy/visa fees paid on behalf of clients — offset by 2402",
    ...({ automationTags: ["client_funds", "pass_through"] } as any),
  }),
  a("exp-5102", "5102", "Tuition Paid — Client", "EXPENSE", "PROFESSIONAL_FEES", "CAD", 0, 0, null, null, {
    normalBalance: "DEBIT",
    description: "Tuition paid to institutions on behalf of clients — offset by 2401",
    ...({ automationTags: ["client_funds", "pass_through"] } as any),
  }),
  a("exp-5103", "5103", "Application Fees Paid — Client", "EXPENSE", "PROFESSIONAL_FEES", "CAD", 0, 0, null, null, {
    normalBalance: "DEBIT",
    description: "Application fees paid to institutions on behalf of clients",
    ...({ automationTags: ["client_funds", "pass_through"] } as any),
  }),

  // ── SUSPENSE ──
  a("sus-9001", "9001", "Suspense — Unclassified", "LIABILITY", "AP", "CAD", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "Temporary account for unclassified transactions. Clear monthly.",
    ...({ automationTags: ["suspense"] } as any),
  }),

  // ── CLIENT FUNDS — additional pass-through ──
  a("cf-2408", "2408", "Client Funds — WES Evaluation", "LIABILITY", "AP", "CAD", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "WES credential evaluation fees collected from clients",
    ...({ automationTags: ["client_funds", "pass_through"] } as any),
  }),
  a("cf-2409", "2409", "Client Funds — Notarization", "LIABILITY", "AP", "INR", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "Notarization, photocopy, affidavit costs collected",
    ...({ automationTags: ["client_funds", "pass_through"] } as any),
  }),
  a("cf-2410", "2410", "Client Funds — Loan Processing", "LIABILITY", "AP", "INR", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "Bank loan processing fees collected from clients",
    ...({ automationTags: ["client_funds", "pass_through"] } as any),
  }),
  a("cf-2411", "2411", "Client Funds — Courier / Dispatch", "LIABILITY", "AP", "INR", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "Courier and document dispatch fees",
    ...({ automationTags: ["client_funds", "pass_through"] } as any),
  }),

  // ── REVENUE — FLC service & coaching (India INR) ──
  a("rev-4201", "4201", "IELTS Coaching Revenue", "REVENUE", "COACHING_REV", "INR", 0, 0, null, null, {
    normalBalance: "CREDIT",
    ...({ automationTags: ["coaching_revenue"] } as any),
  }),
  a("rev-4202", "4202", "PTE Coaching Revenue", "REVENUE", "COACHING_REV", "INR", 0, 0, null, null, {
    normalBalance: "CREDIT",
    ...({ automationTags: ["coaching_revenue"] } as any),
  }),
  a("rev-4203", "4203", "French / German Language Coaching", "REVENUE", "COACHING_REV", "INR", 0, 0, null, null, {
    normalBalance: "CREDIT",
    ...({ automationTags: ["coaching_revenue"] } as any),
  }),
  a("rev-4204", "4204", "Mock Test / Study Material Revenue", "REVENUE", "COACHING_REV", "INR", 0, 0, null, null, {
    normalBalance: "CREDIT",
    ...({ automationTags: ["coaching_revenue"] } as any),
  }),
  a("rev-4105", "4105", "Loan Assistance Fee", "REVENUE", "VISA_REV", "INR", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "FLC fee for education loan assistance",
    ...({ automationTags: ["consulting_revenue"] } as any),
  }),
  a("rev-4401", "4401", "Application Service Charge", "REVENUE", "VISA_REV", "INR", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "FLC charge for processing college applications",
    ...({ automationTags: ["consulting_revenue"] } as any),
  }),
  a("rev-4402", "4402", "Documentation / Notarization Charges", "REVENUE", "VISA_REV", "INR", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "FLC handling charge for notarization and documentation",
    ...({ automationTags: ["consulting_revenue"] } as any),
  }),
  a("rev-4403", "4403", "Courier / Dispatch Charges", "REVENUE", "VISA_REV", "INR", 0, 0, null, null, {
    normalBalance: "CREDIT",
    ...({ automationTags: ["consulting_revenue"] } as any),
  }),
  a("rev-4404", "4404", "WES / Credential Evaluation Service", "REVENUE", "VISA_REV", "CAD", 0, 0, null, null, {
    normalBalance: "CREDIT",
    description: "FLC fee for WES evaluation assistance",
    ...({ automationTags: ["consulting_revenue"] } as any),
  }),

  // ── PASS-THROUGH EXPENSES (FLC pays third party) ──
  a("exp-5104", "5104", "WES Fees Paid — Client", "EXPENSE", "PROFESSIONAL_FEES", "CAD", 0, 0, null, null, {
    normalBalance: "DEBIT",
    description: "WES fees paid on behalf of clients",
    ...({ automationTags: ["client_funds", "pass_through"] } as any),
  }),
  a("exp-5105", "5105", "Notarization Paid — Client", "EXPENSE", "PROFESSIONAL_FEES", "INR", 0, 0, null, null, {
    normalBalance: "DEBIT",
    ...({ automationTags: ["client_funds", "pass_through"] } as any),
  }),
  a("exp-5106", "5106", "Biometrics Paid — Client", "EXPENSE", "PROFESSIONAL_FEES", "CAD", 0, 0, null, null, {
    normalBalance: "DEBIT",
    ...({ automationTags: ["client_funds", "pass_through"] } as any),
  }),
  a("exp-5107", "5107", "Loan Processing Paid — Bank", "EXPENSE", "PROFESSIONAL_FEES", "INR", 0, 0, null, null, {
    normalBalance: "DEBIT",
    ...({ automationTags: ["client_funds", "pass_through"] } as any),
  }),
];