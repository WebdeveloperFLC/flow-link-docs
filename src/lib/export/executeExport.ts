import { exportToCsv } from "./csv";
import { exportToPdf } from "./pdf";
import type { ExportFormat, ExportRequest } from "./types";
import { exportToXlsx } from "./xlsx";

export function buildExportFilename(base: string, scope: string, format: ExportFormat): string {
  const date = new Date().toISOString().slice(0, 10);
  const clean = base.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "") || "export";
  const ext = format === "csv" ? "csv" : format === "xlsx" ? "xlsx" : "pdf";
  return `${clean}_${scope}_${date}.${ext}`;
}

export function runExport<T>(request: ExportRequest<T>): void {
  const { format, rows, columns, filename } = request;
  if (!rows.length) throw new Error("Nothing to export");
  switch (format) {
    case "csv":
      exportToCsv(rows, columns, filename);
      break;
    case "xlsx":
      exportToXlsx(rows, columns, filename);
      break;
    case "pdf":
      exportToPdf(rows, columns, filename);
      break;
    default:
      throw new Error(`Unsupported format: ${format satisfies never}`);
  }
}
