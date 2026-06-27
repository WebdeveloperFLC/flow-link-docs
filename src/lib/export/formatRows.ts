import type { ExportColumnDef, SheetRow } from "./types";

export function cellToExportValue(v: string | number | boolean | null | undefined): string | number {
  if (v == null) return "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return v;
}

/** Build header + data rows for CSV/XLSX/PDF writers. */
export function rowsToSheetData<T>(rows: T[], columns: ExportColumnDef<T>[]): SheetRow[] {
  const header: SheetRow = columns.map((c) => c.header);
  const data = rows.map((row) => columns.map((col) => cellToExportValue(col.accessor(row))));
  return [header, ...data];
}
