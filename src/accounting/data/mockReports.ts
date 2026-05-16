// Mock data for the Accounting Reports module.
// TODAY = 2024-11-01 (consistent with the rest of the accounting module)

export type EntityCode = "CA" | "US" | "IN" | "AE";

export const MONTHLY_DATA: ReadonlyArray<{ month: string; revenue: number; expenses: number; gross: number }> = [];

export const ENTITY_DATA: ReadonlyArray<{ entity: string; revenue: number; expenses: number; profit: number; margin: number; country: string; currency: string; flag: string }> = [];

export type PLLine = { code: string; name: string; current: number; prior: number };

export const PL_DATA = {
  revenue: [] as PLLine[],
  costOfRevenue: [] as PLLine[],
  operatingExpenses: [] as PLLine[],
  taxExpense: 0,
  priorTaxExpense: 0,
};

export const BS_DATA = {
  assets: {
    current: [] as { code: string; name: string; amount: number }[],
    nonCurrent: [] as { code: string; name: string; amount: number }[],
  },
  liabilities: {
    current: [] as { code: string; name: string; amount: number }[],
    nonCurrent: [] as { code: string; name: string; amount: number }[],
  },
  equity: [] as { code: string; name: string; amount: number }[],
};

export const CF_DATA = {
  operating: [] as { label: string; amount: number }[],
  investing: [] as { label: string; amount: number }[],
  financing: [] as { label: string; amount: number }[],
  openingCash: 0,
};

// Indicative rates — converts native currencies to CAD for the consolidated view
export const FX_RATES: Record<string, number> = {
  CAD: 1,
  USD: 1.36,
  INR: 0.016,
  AED: 0.37,
  GBP: 1.72,
  AUD: 0.88,
};

// Mock drill-down transactions — keyed by P&L account code
export type DrillTxn = { date: string; description: string; entity: string; amount: number };

export const PL_DRILLDOWN: Record<string, DrillTxn[]> = {
  "4000": [
    { date: "2024-10-28", description: "Visa filing — Sharma family (Canada PR)", entity: "Canada HQ", amount: 18500 },
    { date: "2024-10-22", description: "Consulting retainer — Patel Enterprises", entity: "India Pvt Ltd", amount: 12000 },
    { date: "2024-10-15", description: "Study permit application — Khan", entity: "Canada HQ", amount: 8400 },
  ],
  "4100": [
    { date: "2024-10-30", description: "IELTS batch — October cohort (24 students)", entity: "Future Link Academy", amount: 21600 },
    { date: "2024-10-18", description: "PTE intensive — weekend batch", entity: "India Pvt Ltd", amount: 14400 },
    { date: "2024-10-09", description: "TOEFL prep — corporate group", entity: "Future Link UAE", amount: 9800 },
  ],
  "4200": [
    { date: "2024-10-26", description: "French A1 — September intake", entity: "Canada HQ", amount: 13200 },
    { date: "2024-10-19", description: "German B1 — student visa prep", entity: "Future Link Academy", amount: 11800 },
    { date: "2024-10-08", description: "Spanish beginner — corporate", entity: "USA Corp", amount: 7400 },
  ],
  "4300": [
    { date: "2024-10-29", description: "UK study package — 4 students", entity: "Canada HQ", amount: 22400 },
    { date: "2024-10-21", description: "Australia bundle — Singh family", entity: "India Pvt Ltd", amount: 18900 },
    { date: "2024-10-11", description: "Germany package — Mehta", entity: "Future Link Academy", amount: 9200 },
  ],
  "4400": [
    { date: "2024-10-27", description: "Homestay placement fees (October)", entity: "Canada HQ", amount: 6400 },
    { date: "2024-10-20", description: "Airport pickup & SIM bundle", entity: "USA Corp", amount: 4200 },
    { date: "2024-10-12", description: "Forex commission — September", entity: "Future Link UAE", amount: 5800 },
  ],
  "4500": [
    { date: "2024-10-24", description: "Bank interest — Q3", entity: "Canada HQ", amount: 3200 },
    { date: "2024-10-17", description: "Referral bonus — university partner", entity: "India Pvt Ltd", amount: 4800 },
    { date: "2024-10-05", description: "Document translation surcharge", entity: "Canada HQ", amount: 1900 },
  ],
  "5010": [
    { date: "2024-10-30", description: "U of Toronto liaison Q4 invoice", entity: "Canada HQ", amount: -14200 },
    { date: "2024-10-19", description: "Conestoga College placement fees", entity: "Canada HQ", amount: -8400 },
    { date: "2024-10-08", description: "Deakin University agent fee", entity: "USA Corp", amount: -6800 },
  ],
  "5020": [
    { date: "2024-10-28", description: "IELTS centre booking — October", entity: "Future Link Academy", amount: -9600 },
    { date: "2024-10-15", description: "PTE Pearson VUE slots (bulk)", entity: "India Pvt Ltd", amount: -7200 },
    { date: "2024-10-04", description: "TOEFL ETS slot reservations", entity: "Future Link UAE", amount: -4400 },
  ],
  "5030": [
    { date: "2024-10-29", description: "Canadian visa filing fees — bulk", entity: "Canada HQ", amount: -8200 },
    { date: "2024-10-18", description: "UK CAS letter charges", entity: "India Pvt Ltd", amount: -5400 },
    { date: "2024-10-07", description: "VFS service fees — September", entity: "Future Link Academy", amount: -3600 },
  ],
  "5040": [
    { date: "2024-10-25", description: "Notarised translations — 12 docs", entity: "Canada HQ", amount: -2800 },
    { date: "2024-10-14", description: "Apostille batch — MEA Delhi", entity: "India Pvt Ltd", amount: -2200 },
    { date: "2024-10-02", description: "WES credential evaluation", entity: "USA Corp", amount: -1900 },
  ],
  "5000": [
    { date: "2024-10-31", description: "Payroll — October (Canada HQ)", entity: "Canada HQ", amount: -52000 },
    { date: "2024-10-31", description: "Payroll — October (India Pvt Ltd)", entity: "India Pvt Ltd", amount: -28000 },
    { date: "2024-10-31", description: "Payroll — October (USA Corp)", entity: "USA Corp", amount: -24000 },
  ],
  "5100": [
    { date: "2024-10-01", description: "Toronto office rent — October", entity: "Canada HQ", amount: -14800 },
    { date: "2024-10-01", description: "Mumbai office rent — October", entity: "India Pvt Ltd", amount: -8400 },
    { date: "2024-10-12", description: "Utilities — quarterly settlement", entity: "Future Link UAE", amount: -3200 },
  ],
  "5200": [
    { date: "2024-10-26", description: "Counsellor travel — university fair", entity: "Canada HQ", amount: -4800 },
    { date: "2024-10-17", description: "Local taxi — client meetings", entity: "India Pvt Ltd", amount: -1800 },
    { date: "2024-10-08", description: "Flight to Dubai — branch visit", entity: "USA Corp", amount: -2400 },
  ],
  "5300": [
    { date: "2024-10-15", description: "CRM annual subscription", entity: "Canada HQ", amount: -8400 },
    { date: "2024-10-10", description: "Microsoft 365 — 40 seats", entity: "India Pvt Ltd", amount: -3200 },
    { date: "2024-10-05", description: "Zoom enterprise — Q4", entity: "Canada HQ", amount: -1800 },
  ],
  "5400": [
    { date: "2024-10-22", description: "Google Ads — October campaign", entity: "Canada HQ", amount: -9200 },
    { date: "2024-10-14", description: "Facebook Ads — India recruitment", entity: "India Pvt Ltd", amount: -4800 },
    { date: "2024-10-06", description: "Education fair stall — Mumbai", entity: "Future Link Academy", amount: -3600 },
  ],
  "5500": [
    { date: "2024-10-20", description: "External audit — Q3 fees", entity: "Canada HQ", amount: -6800 },
    { date: "2024-10-11", description: "Legal — contract review", entity: "USA Corp", amount: -2400 },
    { date: "2024-10-03", description: "Tax filing fees", entity: "India Pvt Ltd", amount: -1800 },
  ],
  "5600": [
    { date: "2024-10-31", description: "RBC monthly fees", entity: "Canada HQ", amount: -480 },
    { date: "2024-10-15", description: "Wire transfer charges", entity: "India Pvt Ltd", amount: -680 },
    { date: "2024-10-04", description: "FX conversion charges", entity: "Future Link UAE", amount: -340 },
  ],
  "5700": [
    { date: "2024-10-01", description: "Office insurance — annual premium", entity: "Canada HQ", amount: -1800 },
    { date: "2024-10-01", description: "Liability insurance — UAE branch", entity: "Future Link UAE", amount: -1200 },
    { date: "2024-10-15", description: "Cyber insurance — Q4", entity: "USA Corp", amount: -900 },
  ],
  "5800": [
    { date: "2024-10-31", description: "Office equipment depreciation — Oct", entity: "Canada HQ", amount: -1600 },
    { date: "2024-10-31", description: "Furniture depreciation — Oct", entity: "India Pvt Ltd", amount: -800 },
    { date: "2024-10-31", description: "Intangibles amortisation — Oct", entity: "Canada HQ", amount: -600 },
  ],
  "5900": [
    { date: "2024-10-28", description: "Office supplies — October refill", entity: "Canada HQ", amount: -1200 },
    { date: "2024-10-15", description: "Staff welfare — team lunch", entity: "India Pvt Ltd", amount: -800 },
    { date: "2024-10-09", description: "Printing & stationery", entity: "Future Link UAE", amount: -400 },
  ],
};

// Intercompany eliminations applied on consolidation (CAD)
export const ELIMINATIONS = [
  { label: "Intercompany service fees (CA HQ ↔ India)", amount: -48000 },
  { label: "Management charges (CA HQ ↔ UAE)", amount: -24000 },
];

// ─────────────────────────────────────────────────────────────────
// Back-compat exports used by ReportFilterBar and ReportDrilldownModal
// (existing accounting components that pre-date this rewrite)
// ─────────────────────────────────────────────────────────────────
import type { DrillTxn as DrillTxnRich, EntityCode as EntityCodeRich } from "../types/reports";

export const MOCK_ENTITIES: { code: EntityCodeRich; name: string; currency: "CAD" | "USD" | "INR"; branches: string[] }[] = [
  { code: "FLC-CA", name: "Future Link Canada HQ", currency: "CAD", branches: ["Toronto", "Vancouver", "Calgary"] },
  { code: "FLC-US", name: "Future Link USA Corp", currency: "USD", branches: ["New York", "San Francisco"] },
  { code: "FLC-IN", name: "Future Link India Pvt Ltd", currency: "INR", branches: ["Delhi", "Mumbai", "Bangalore"] },
  { code: "FL-CONSULTING", name: "Future Link Consulting", currency: "CAD", branches: ["Toronto"] },
  { code: "FL-TRAINING", name: "Future Link Academy", currency: "INR", branches: ["Mumbai", "Bangalore"] },
  { code: "FL-HOLDINGS", name: "Future Link Holdings", currency: "CAD", branches: ["Toronto"] },
];

const SAMPLE_COUNTERPARTIES = [
  "Sharma family", "Patel Enterprises", "U of Toronto", "Conestoga College",
  "Pearson VUE", "VFS Global", "RBC", "HDFC Bank", "Khan & co.", "Mehta family",
];

export function getDrilldownTxns(key: string, totalAmount: number): DrillTxnRich[] {
  // Generate a small, deterministic-looking set of mock transactions that sum
  // approximately to `totalAmount`. Pulls from PL_DRILLDOWN if available, then
  // pads or scales to reach the requested total.
  const seed = PL_DRILLDOWN[key] ?? [];
  const count = Math.max(seed.length, 5);
  const sign = totalAmount < 0 ? -1 : 1;
  const target = Math.abs(totalAmount);
  const baseSum = seed.reduce((s, t) => s + Math.abs(t.amount), 0) || target;
  const scale = baseSum > 0 ? target / baseSum : 1;

  return Array.from({ length: count }).map((_, i) => {
    const src = seed[i % Math.max(seed.length, 1)];
    const ent = MOCK_ENTITIES[i % MOCK_ENTITIES.length];
    const branch = ent.branches[i % ent.branches.length];
    const amount = src
      ? Math.round(Math.abs(src.amount) * scale) * sign
      : Math.round((target / count)) * sign;
    return {
      id: `${key}-${i + 1}`,
      date: src?.date ?? `2024-10-${String(28 - i * 3).padStart(2, "0")}`,
      docRef: `DOC-${key}-${String(1000 + i)}`,
      entity: ent.code,
      branch,
      account: src?.description ?? `Transaction ${i + 1}`,
      amount,
      currency: ent.currency,
      journalId: `JE-${2400 + i}`,
      counterparty: SAMPLE_COUNTERPARTIES[i % SAMPLE_COUNTERPARTIES.length],
    };
  });
}
