/** Supported download formats. Extend here for scheduled/API exports later. */
export type ExportFormat = "csv" | "xlsx" | "pdf";

/** Which row set to export. */
export type ExportScope = "filtered" | "selected" | "all";

export interface ExportColumnDef<T = unknown> {
  id: string;
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
}

export interface ExportRequest<T = unknown> {
  format: ExportFormat;
  scope: ExportScope;
  rows: T[];
  columns: ExportColumnDef<T>[];
  filename: string;
}

export type SheetCell = string | number | null | undefined;
export type SheetRow = SheetCell[];
