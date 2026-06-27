/**
 * FLEOS reusable export framework.
 *
 * Extension pattern for new modules:
 * 1. Define `ExportColumnDef<T>[]` in the module (e.g. `programExportColumns.ts`).
 * 2. Pass filtered rows + optional `fetchAll` into `useExportDataset`.
 * 3. Render `<ExportMenu {...exportProps} />` beside existing import controls.
 * 4. Reuse `runExport` / `buildExportFilename` for scheduled jobs or API handlers
 *    — same types and writers, different row source.
 *
 * Do not duplicate CSV/XLSX logic; import writers from this package.
 */
export type { ExportColumnDef, ExportFormat, ExportRequest, ExportScope } from "./types";
export { cellToExportValue, rowsToSheetData } from "./formatRows";
export { escapeCsvCell, serializeCsv, exportToCsv } from "./csv";
export { exportToXlsx } from "./xlsx";
export { exportToPdf } from "./pdf";
export { buildExportFilename, runExport } from "./executeExport";
