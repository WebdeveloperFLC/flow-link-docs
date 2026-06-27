import { downloadXlsx } from "@/accounting/lib/exportSheet";
import { rowsToSheetData } from "./formatRows";
import type { ExportColumnDef } from "./types";

export function exportToXlsx<T>(
  rows: T[],
  columns: ExportColumnDef<T>[],
  filename: string,
  sheetName = "Export",
): void {
  const sheet = rowsToSheetData(rows, columns);
  const name = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  const colWidths = columns.map((c) => Math.min(40, Math.max(10, c.header.length + 2)));
  downloadXlsx(name, [{ name: sheetName, rows: sheet, colWidths }]);
}
