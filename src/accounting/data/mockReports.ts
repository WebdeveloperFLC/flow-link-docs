import type {
  ReportNode,
  EntityCode,
  EntityMeta,
  CurrencyCode,
  DrillTxn,
} from "../types/reports";

export const MOCK_ENTITIES: EntityMeta[] = [
  { code: "FLC-CA", name: "Future Link Consulting (Canada)", currency: "CAD", branches: ["Toronto HQ", "Vancouver"] },
  { code: "FLC-US", name: "Future Link Consulting (USA)", currency: "USD", branches: ["New York", "Austin"] },
  { code: "FLC-IN", name: "Future Link Consulting (India)", currency: "INR", branches: ["Mumbai", "Bengaluru"] },
  { code: "FL-CONSULTING", name: "FL Consulting Services Ltd.", currency: "CAD", branches: ["Toronto"] },
  { code: "FL-TRAINING", name: "FL Training Academy", currency: "CAD", branches: ["Toronto"] },
  { code: "FL-HOLDINGS", name: "FL Holdings Inc.", currency: "CAD", branches: ["Toronto"] },
];

export const MOCK_FX: Record<CurrencyCode, number> = {
  CAD: 1,
  USD: 1.36,
  INR: 0.0163,
};

export function convertToCAD(amount: number, currency: CurrencyCode): number {
  return amount * MOCK_FX[currency];
}

/* ───────────────────────── helpers ───────────────────────── */

function leaf(
  id: string,
  label: string,
  current: number,
  prior: number,
  drilldownKey?: string,
  byEntity?: Record<string, number>
): ReportNode {
  return { id, label, kind: "line", current, prior, drilldownKey, byEntity };
}

function group(
  id: string,
  label: string,
  children: ReportNode[],
  kind: "header" | "subtotal" = "subtotal"
): ReportNode {
  const current = children.reduce((s, c) => s + c.current, 0);
  const prior = children.reduce((s, c) => s + c.prior, 0);
  return { id, label, kind, current, prior, children };
}

/* ───────────────────────── P&L ───────────────────────── */

export function getPLTree(): ReportNode[] {
  const revenue = group(
    "rev",
    "Revenue",
    [
      leaf("rev-consulting", "Consulting revenue", 1_840_000, 1_620_000, "rev-consulting"),
      leaf("rev-software", "Software fees", 720_000, 610_000, "rev-software"),
      leaf("rev-training", "Training revenue", 285_000, 240_000, "rev-training"),
      leaf("rev-other", "Other revenue", 64_000, 58_000, "rev-other"),
    ],
    "header"
  );
  const totalRevenue: ReportNode = {
    id: "total-rev",
    label: "Total revenue",
    kind: "subtotal",
    current: revenue.current,
    prior: revenue.prior,
  };

  const cogs = group(
    "cogs",
    "Cost of revenue",
    [
      leaf("cogs-salaries", "Direct salaries", 540_000, 495_000, "cogs-salaries"),
      leaf("cogs-subs", "Subcontractor fees", 218_000, 205_000, "cogs-subs"),
    ],
    "header"
  );

  const grossProfit: ReportNode = {
    id: "gp",
    label: "Gross profit",
    kind: "subtotal",
    current: totalRevenue.current - cogs.current,
    prior: totalRevenue.prior - cogs.prior,
  };
  const grossMargin: ReportNode = {
    id: "gm",
    label: "Gross margin %",
    kind: "metric",
    current: grossProfit.current / totalRevenue.current,
    prior: grossProfit.prior / totalRevenue.prior,
  };

  const opex = group(
    "opex",
    "Operating expenses",
    [
      leaf("opex-sal", "Salaries & wages", 612_000, 568_000, "opex-sal"),
      leaf("opex-rent", "Rent & utilities", 142_000, 138_000, "opex-rent"),
      leaf("opex-travel", "Travel & entertainment", 86_000, 64_000, "opex-travel"),
      leaf("opex-tech", "Technology", 124_000, 102_000, "opex-tech"),
      leaf("opex-prof", "Professional fees", 78_000, 71_000, "opex-prof"),
      leaf("opex-dep", "Depreciation", 92_000, 88_000, "opex-dep"),
    ],
    "header"
  );
  const totalOpex: ReportNode = {
    id: "total-opex",
    label: "Total operating expenses",
    kind: "subtotal",
    current: opex.current,
    prior: opex.prior,
  };

  const ebitda: ReportNode = {
    id: "ebitda",
    label: "EBITDA",
    kind: "total",
    current: grossProfit.current - (totalOpex.current - 92_000),
    prior: grossProfit.prior - (totalOpex.prior - 88_000),
  };

  const netProfit: ReportNode = {
    id: "net",
    label: "Net profit",
    kind: "total",
    current: grossProfit.current - totalOpex.current,
    prior: grossProfit.prior - totalOpex.prior,
  };
  const netMargin: ReportNode = {
    id: "nm",
    label: "Net margin %",
    kind: "metric",
    current: netProfit.current / totalRevenue.current,
    prior: netProfit.prior / totalRevenue.prior,
  };

  return [revenue, totalRevenue, cogs, grossProfit, grossMargin, opex, totalOpex, ebitda, netProfit, netMargin];
}

/* ───────────────────────── Balance Sheet ───────────────────────── */

export function getBSTree(): { assets: ReportNode[]; liabEquity: ReportNode[] } {
  const currentAssets = group("ca", "Current assets", [
    leaf("ca-cash", "Cash & equivalents", 1_240_000, 1_120_000, "ca-cash"),
    leaf("ca-ar", "Accounts receivable", 860_000, 790_000, "ca-ar"),
    leaf("ca-inv", "Inventory", 145_000, 132_000, "ca-inv"),
    leaf("ca-prep", "Prepaid expenses", 64_000, 52_000, "ca-prep"),
  ]);
  const nonCurrent = group("nca", "Non-current assets", [
    leaf("nca-ppe", "Property, plant & equipment", 1_820_000, 1_780_000, "nca-ppe"),
    leaf("nca-int", "Intangible assets", 420_000, 460_000, "nca-int"),
    leaf("nca-inv", "Long-term investments", 380_000, 340_000, "nca-inv"),
  ]);
  const totalAssets: ReportNode = {
    id: "total-assets",
    label: "Total assets",
    kind: "total",
    current: currentAssets.current + nonCurrent.current,
    prior: currentAssets.prior + nonCurrent.prior,
  };

  const currentLiab = group("cl", "Current liabilities", [
    leaf("cl-ap", "Accounts payable", 425_000, 390_000, "cl-ap"),
    leaf("cl-accr", "Accrued expenses", 168_000, 142_000, "cl-accr"),
    leaf("cl-tax", "Tax payable", 92_000, 85_000, "cl-tax"),
    leaf("cl-st-debt", "Short-term debt", 200_000, 220_000, "cl-st-debt"),
  ]);
  const longTerm = group("lt", "Long-term liabilities", [
    leaf("lt-loan", "Long-term loans", 1_140_000, 1_220_000, "lt-loan"),
    leaf("lt-lease", "Lease obligations", 280_000, 310_000, "lt-lease"),
  ]);
  const equity = group("eq", "Equity", [
    leaf("eq-cs", "Common stock", 1_000_000, 1_000_000, "eq-cs"),
    leaf("eq-re", "Retained earnings", 1_624_000, 1_307_000, "eq-re"),
  ]);
  const totalLE: ReportNode = {
    id: "total-le",
    label: "Total liabilities & equity",
    kind: "total",
    current: currentLiab.current + longTerm.current + equity.current,
    prior: currentLiab.prior + longTerm.prior + equity.prior,
  };

  return {
    assets: [currentAssets, nonCurrent, totalAssets],
    liabEquity: [currentLiab, longTerm, equity, totalLE],
  };
}

/* ───────────────────────── Cash Flow ───────────────────────── */

export function getCashFlowTree(): {
  sections: ReportNode[];
  opening: number;
  closing: number;
  netChange: number;
} {
  const operating = group("op", "Operating activities", [
    leaf("op-ni", "Net income", 1_109_000, 893_000, "op-ni"),
    leaf("op-dep", "Depreciation & amortization", 92_000, 88_000, "op-dep"),
    leaf("op-ar", "Change in accounts receivable", -70_000, -55_000, "op-ar"),
    leaf("op-ap", "Change in accounts payable", 35_000, 22_000, "op-ap"),
    leaf("op-inv", "Change in inventory", -13_000, -8_000, "op-inv"),
  ]);
  const investing = group("inv", "Investing activities", [
    leaf("inv-ppe", "Purchase of equipment", -180_000, -160_000, "inv-ppe"),
    leaf("inv-acq", "Long-term investments", -40_000, -30_000, "inv-acq"),
  ]);
  const financing = group("fin", "Financing activities", [
    leaf("fin-debt", "Repayment of long-term debt", -80_000, -75_000, "fin-debt"),
    leaf("fin-div", "Dividends paid", -300_000, -250_000, "fin-div"),
  ]);
  const netChange = operating.current + investing.current + financing.current;
  const opening = 687_000;
  const closing = opening + netChange;
  return {
    sections: [operating, investing, financing],
    opening,
    closing,
    netChange,
  };
}

/* ───────────────────────── Consolidated ───────────────────────── */

/** Returns P&L tree with per-entity breakdown for consolidation. */
export function getConsolidatedTree(entities: EntityCode[]): {
  rows: ReportNode[];
  eliminations: { label: string; amount: number }[];
} {
  // Per-entity revenue/expense in their source currency
  const entityFigures: Record<EntityCode, { rev: number; cogs: number; opex: number }> = {
    "FLC-CA": { rev: 1_240_000, cogs: 360_000, opex: 540_000 },
    "FLC-US": { rev: 980_000, cogs: 290_000, opex: 410_000 },
    "FLC-IN": { rev: 42_000_000, cogs: 14_000_000, opex: 18_500_000 },
    "FL-CONSULTING": { rev: 480_000, cogs: 120_000, opex: 180_000 },
    "FL-TRAINING": { rev: 285_000, cogs: 95_000, opex: 110_000 },
    "FL-HOLDINGS": { rev: 64_000, cogs: 0, opex: 42_000 },
  };

  const buildRow = (
    id: string,
    label: string,
    pick: (e: EntityCode) => number,
    elimination: number,
    kind: "line" | "subtotal" | "total" = "line"
  ): ReportNode => {
    const byEntity: Record<string, number> = {};
    let consolidated = 0;
    entities.forEach((e) => {
      const v = pick(e);
      byEntity[e] = v;
      const ccy = MOCK_ENTITIES.find((m) => m.code === e)!.currency;
      consolidated += convertToCAD(v, ccy);
    });
    consolidated += elimination;
    return {
      id,
      label,
      kind,
      current: consolidated,
      prior: consolidated * 0.9,
      byEntity,
      elimination,
      drilldownKey: id,
    };
  };

  const eliminations = [
    { label: "Intercompany consulting fees (CA → US)", amount: -180_000 },
    { label: "Intercompany management fees (Holdings → Subs)", amount: -64_000 },
    { label: "Unrealized intra-group margin", amount: -28_000 },
  ];
  const totalElim = eliminations.reduce((s, e) => s + e.amount, 0);

  const rows: ReportNode[] = [
    buildRow("c-rev", "Revenue", (e) => entityFigures[e].rev, totalElim, "subtotal"),
    buildRow("c-cogs", "Cost of revenue", (e) => entityFigures[e].cogs, 0, "line"),
    buildRow("c-opex", "Operating expenses", (e) => entityFigures[e].opex, 0, "line"),
    buildRow(
      "c-net",
      "Net profit",
      (e) => entityFigures[e].rev - entityFigures[e].cogs - entityFigures[e].opex,
      totalElim,
      "total"
    ),
  ];
  return { rows, eliminations };
}

/* ───────────────────────── Trend / breakdown ───────────────────────── */

export const REVENUE_TREND = [
  { month: "Jun", revenue: 760_000 },
  { month: "Jul", revenue: 820_000 },
  { month: "Aug", revenue: 880_000 },
  { month: "Sep", revenue: 940_000 },
  { month: "Oct", revenue: 1_020_000 },
  { month: "Nov", revenue: 1_109_000 },
];

export const EXPENSE_BREAKDOWN = [
  { name: "Salaries & wages", value: 612_000 },
  { name: "Direct costs", value: 758_000 },
  { name: "Technology", value: 124_000 },
  { name: "Rent & utilities", value: 142_000 },
  { name: "Travel", value: 86_000 },
  { name: "Professional fees", value: 78_000 },
  { name: "Depreciation", value: 92_000 },
];

/* ───────────────────────── Drilldown txns ───────────────────────── */

const COUNTERPARTIES = [
  "Acme Corp",
  "Globex Holdings",
  "Initech Solutions",
  "Umbrella Trading",
  "Hooli Inc.",
  "Stark Industries",
  "Wayne Enterprises",
];

function makeTxns(key: string, count: number, baseAmount: number): DrillTxn[] {
  const out: DrillTxn[] = [];
  for (let i = 0; i < count; i++) {
    const entity = MOCK_ENTITIES[i % MOCK_ENTITIES.length];
    out.push({
      id: `${key}-tx-${i + 1}`,
      date: `2025-1${(i % 2) + 1}-${String((i * 3) % 28 + 1).padStart(2, "0")}`,
      docRef: `INV-${2025000 + i * 7 + key.length}`,
      entity: entity.code,
      branch: entity.branches[i % entity.branches.length],
      account: key,
      amount: Math.round(baseAmount / count + (i % 3) * (baseAmount / count) * 0.05),
      currency: entity.currency,
      journalId: `JE-${10500 + i}`,
      counterparty: COUNTERPARTIES[i % COUNTERPARTIES.length],
    });
  }
  return out;
}

export function getDrilldownTxns(key: string, total = 100_000): DrillTxn[] {
  return makeTxns(key, 8, total);
}