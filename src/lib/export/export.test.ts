import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { escapeCsvCell, serializeCsv } from "./csv";
import { cellToExportValue, rowsToSheetData } from "./formatRows";
import type { ExportColumnDef } from "./types";

type Row = { name: string; fee: number | null; active: boolean };

const COLUMNS: ExportColumnDef<Row>[] = [
  { id: "name", header: "Program Name", accessor: (r) => r.name },
  { id: "fee", header: "Tuition", accessor: (r) => r.fee },
  { id: "active", header: "Active", accessor: (r) => r.active },
];

const SAMPLE: Row[] = [
  { name: 'Business "Admin"', fee: 12000, active: true },
  { name: "Line\nbreak", fee: null, active: false },
];

describe("export csv helpers", () => {
  it("escapes commas, quotes, and newlines", () => {
    expect(escapeCsvCell("plain")).toBe("plain");
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell("a\nb")).toBe('"a\nb"');
  });

  it("serializes header and rows", () => {
    const csv = serializeCsv(SAMPLE, COLUMNS);
    expect(csv).toContain("Program Name,Tuition,Active");
    expect(csv).toContain('"Business ""Admin""",12000,Yes');
    expect(csv).toContain('"Line\nbreak",,No');
  });
});

describe("export formatRows", () => {
  it("maps booleans to Yes/No and nulls to empty strings", () => {
    const sheet = rowsToSheetData(SAMPLE, COLUMNS);
    expect(sheet[1]).toEqual(['Business "Admin"', 12000, "Yes"]);
    expect(cellToExportValue(null)).toBe("");
    expect(cellToExportValue(true)).toBe("Yes");
  });
});

describe("export xlsx", () => {
  it("builds a workbook with header row", () => {
    const sheet = rowsToSheetData(SAMPLE, COLUMNS);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet as unknown[][]), "Programs");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const wb2 = XLSX.read(buf, { type: "array" });
    const ws = wb2.Sheets.Programs;
    expect(ws.A1.v).toBe("Program Name");
    expect(ws.A2.v).toBe('Business "Admin"');
    expect(ws.C2.v).toBe("Yes");
  });

  it("produces non-empty xlsx buffer via sheet utils", () => {
    const sheet = rowsToSheetData(SAMPLE, COLUMNS);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet as unknown[][]), "Export");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    expect(buf.byteLength).toBeGreaterThan(100);
  });
});
