import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import {
  buildConsolidatedRows,
  buildConsolidatedXlsxSpec,
  toConsolidatedCsvRows,
  renderXlsxCell,
  FMT_PCT,
  type ConsolidatedExportInput,
} from "./consolidatedExport";

function makeInput(profit: number, revenue = 1000): ConsolidatedExportInput {
  return {
    entities: [
      { entity: "FLC-CA", currency: "CAD", rate: 1, revenue, expenses: revenue - profit, profit, revenueCAD: revenue, expensesCAD: revenue - profit, profitCAD: profit },
    ],
    eliminations: [],
    totals: { consolidatedRev: revenue, consolidatedExp: revenue - profit, consolidatedProfit: profit },
    today: "2025-05-18",
  };
}

function findMarginRowIndex(rows: ReturnType<typeof buildConsolidatedRows>): number {
  return rows.findIndex((r) => r[0] === "Margin %");
}

describe("consolidated export — margin row formatting", () => {
  describe("XLSX", () => {
    it("stores margin as a fraction with percent format (positive)", () => {
      const spec = buildConsolidatedXlsxSpec(makeInput(400, 1000)); // 40%
      const idx = findMarginRowIndex(spec.rows);
      const cell = renderXlsxCell(spec, idx, 1);
      expect(cell.raw).toBeCloseTo(0.4);
      expect(cell.z).toBe(FMT_PCT);
      expect(cell.text).toBe("40.0%");
    });

    it("renders negative margin with parentheses and percent sign", () => {
      const spec = buildConsolidatedXlsxSpec(makeInput(-123, 1000)); // -12.3%
      const idx = findMarginRowIndex(spec.rows);
      const cell = renderXlsxCell(spec, idx, 1);
      expect(cell.raw).toBeCloseTo(-0.123);
      expect(cell.z).toBe(FMT_PCT);
      expect(cell.text).toBe("(12.3%)");
    });

    it("renders zero margin as the placeholder dash", () => {
      const spec = buildConsolidatedXlsxSpec(makeInput(0, 1000));
      const idx = findMarginRowIndex(spec.rows);
      const cell = renderXlsxCell(spec, idx, 1);
      expect(cell.raw).toBe(0);
      expect(cell.text).toBe("-");
    });

    it("persists the percent format after a write/read round-trip", () => {
      const spec = buildConsolidatedXlsxSpec(makeInput(-250, 1000)); // -25%
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(spec.rows as unknown[][]);
      const idx = findMarginRowIndex(spec.rows);
      const ref = XLSX.utils.encode_cell({ r: idx, c: 1 });
      (ws[ref] as { z?: string }).z = FMT_PCT;
      XLSX.utils.book_append_sheet(wb, ws, "Consolidated");
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const wb2 = XLSX.read(buf, { type: "array", cellNF: true });
      const ws2 = wb2.Sheets["Consolidated"];
      const cell = ws2[ref];
      expect(cell.v).toBeCloseTo(-0.25);
      expect(String(cell.z)).toBe(FMT_PCT);
      expect(XLSX.SSF.format(String(cell.z), cell.v as number)).toBe("(25.0%)");
    });
  });

  describe("CSV", () => {
    it("expands positive margin fraction to a percent number", () => {
      const rows = toConsolidatedCsvRows(buildConsolidatedRows(makeInput(400, 1000)));
      const row = rows.find((r) => r[0] === "Margin %")!;
      expect(row[1]).toBe(40);
    });

    it("expands negative margin fraction to a negative percent number", () => {
      const rows = toConsolidatedCsvRows(buildConsolidatedRows(makeInput(-123, 1000)));
      const row = rows.find((r) => r[0] === "Margin %")!;
      expect(row[1]).toBe(-12.3);
    });

    it("keeps the row label as 'Margin %' so the unit is obvious", () => {
      const rows = toConsolidatedCsvRows(buildConsolidatedRows(makeInput(100, 1000)));
      expect(rows.some((r) => r[0] === "Margin %")).toBe(true);
      expect(rows.some((r) => r[0] === "Margin")).toBe(false);
    });
  });
});