import { downloadCsv } from "@/accounting/lib/exportSheet";
import { rowsToSheetData } from "./formatRows";
import type { ExportColumnDef } from "./types";

/** Escape a single CSV cell (pure — used in tests). */
export function escapeCsvCell(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serialize rows + columns to a CSV string (UTF-8, no BOM). */
export function serializeCsv<T>(rows: T[], columns: ExportColumnDef<T>[]): string {
  const sheet = rowsToSheetData(rows, columns);
  return sheet.map((r) => r.map(escapeCsvCell).join(",")).join("\n");
}

export function exportToCsv<T>(rows: T[], columns: ExportColumnDef<T>[], filename: string): void {
  const sheet = rowsToSheetData(rows, columns);
  const name = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  downloadCsv(name, sheet);
}
