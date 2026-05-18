import * as XLSX from "xlsx";
import type { SheetRow, SheetSpec } from "./exportSheet";

export interface ConsolidatedExportEntity {
  entity: string;
  currency: string;
  rate: number;
  revenue: number;
  expenses: number;
  profit: number;
  revenueCAD: number;
  expensesCAD: number;
  profitCAD: number;
}

export interface ConsolidatedExportTotals {
  consolidatedRev: number;
  consolidatedExp: number;
  consolidatedProfit: number;
}

export interface ConsolidatedExportInput {
  entities: ConsolidatedExportEntity[];
  eliminations: { label: string; amount: number }[];
  totals: ConsolidatedExportTotals;
  today?: string;
}

export const FMT_NUM = '#,##0.00;[Red](#,##0.00);"-"';
export const FMT_CUR_CAD = '"CA$"#,##0.00;[Red]("CA$"#,##0.00);"-"';
export const FMT_RATE = "0.0000";
export const FMT_PCT = '0.0%;[Red](0.0%);"-"';

export function buildConsolidatedRows(input: ConsolidatedExportInput): SheetRow[] {
  const { entities, eliminations, totals, today = new Date().toISOString().slice(0, 10) } = input;
  const elimTotal = eliminations.reduce((s, e) => s + e.amount, 0);
  const margin = totals.consolidatedRev ? totals.consolidatedProfit / totals.consolidatedRev : 0;

  const entityHeader: SheetRow = ["Entity", "Currency", "FX rate", "Revenue (native)", "Expenses (native)", "Profit (native)", "Revenue (CAD)", "Expenses (CAD)", "Profit (CAD)"];
  const entityRows: SheetRow[] = entities.map((e) => [
    e.entity, e.currency, e.rate,
    +e.revenue.toFixed(2), +e.expenses.toFixed(2), +e.profit.toFixed(2),
    +e.revenueCAD.toFixed(2), +e.expensesCAD.toFixed(2), +e.profitCAD.toFixed(2),
  ]);
  const elimRows: SheetRow[] = eliminations.map((e) => [e.label, +e.amount.toFixed(2)]);

  return [
    [`Consolidated report (CAD) — ${today}`],
    [],
    entityHeader,
    ...entityRows,
    [],
    ["Eliminations (CAD)", "Amount"],
    ...elimRows,
    ["Total eliminations", +elimTotal.toFixed(2)],
    [],
    ["Consolidated totals (CAD)", "Value"],
    ["Revenue", +totals.consolidatedRev.toFixed(2)],
    ["Expenses", +totals.consolidatedExp.toFixed(2)],
    ["Gross profit", +totals.consolidatedProfit.toFixed(2)],
    ["Net profit", +totals.consolidatedProfit.toFixed(2)],
    ["Margin %", margin],
  ];
}

export function buildConsolidatedFormats(rows: SheetRow[], entityCount: number): (string | undefined)[][] {
  return rows.map((r, i) => {
    const out: (string | undefined)[] = [];
    if (i < 3) return out;
    if (i < 3 + entityCount) {
      out[2] = FMT_RATE;
      out[3] = FMT_NUM; out[4] = FMT_NUM; out[5] = FMT_NUM;
      out[6] = FMT_CUR_CAD; out[7] = FMT_CUR_CAD; out[8] = FMT_CUR_CAD;
      return out;
    }
    if (r[0] === "Margin %") {
      out[1] = FMT_PCT;
      return out;
    }
    out[1] = FMT_CUR_CAD;
    return out;
  });
}

export function buildConsolidatedXlsxSpec(input: ConsolidatedExportInput): SheetSpec {
  const rows = buildConsolidatedRows(input);
  const formats = buildConsolidatedFormats(rows, input.entities.length);
  return { name: "Consolidated", rows, formats, colWidths: [28, 10, 10, 18, 18, 16, 18, 18, 16] };
}

/** Convert the in-memory rows to the CSV-ready shape (expand margin fraction to a percent number). */
export function toConsolidatedCsvRows(rows: SheetRow[]): SheetRow[] {
  return rows.map((r) =>
    r[0] === "Margin %" && typeof r[1] === "number"
      ? ["Margin %", +((r[1] as number) * 100).toFixed(2)]
      : r,
  );
}

/** Test helper: render a single cell's value using its applied format string. */
export function renderXlsxCell(spec: SheetSpec, row: number, col: number): { raw: unknown; z?: string; text: string } {
  const ws = XLSX.utils.aoa_to_sheet(spec.rows as unknown[][]);
  for (let r = 0; r < spec.rows.length; r++) {
    const rr = spec.rows[r] ?? [];
    for (let c = 0; c < rr.length; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const cell = (ws as Record<string, XLSX.CellObject>)[ref];
      if (!cell || cell.t !== "n") continue;
      const fmt = spec.formats?.[r]?.[c];
      if (fmt) (cell as { z?: string }).z = fmt;
    }
  }
  const ref = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = (ws as Record<string, XLSX.CellObject>)[ref];
  if (!cell) return { raw: undefined, text: "" };
  const text = cell.z ? XLSX.SSF.format(String(cell.z), cell.v as number) : String(cell.v);
  return { raw: cell.v, z: cell.z, text };
}