import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  buildExportFilename,
  runExport,
  type ExportColumnDef,
  type ExportFormat,
  type ExportScope,
} from "@/lib/export";

export interface UseExportDatasetOptions<T> {
  /** Current filtered/sorted rows shown in the UI. */
  rows: T[];
  selectedIds?: Set<string> | string[];
  getRowId: (row: T) => string;
  /** Full dataset fetch (permission-gated in the UI). */
  fetchAll?: () => Promise<T[]>;
  columns: ExportColumnDef<T>[];
  filenameBase: string;
  canExportAll?: boolean;
  formats?: ExportFormat[];
  sheetName?: string;
}

export function useExportDataset<T>({
  rows,
  selectedIds = new Set<string>(),
  getRowId,
  fetchAll,
  columns,
  filenameBase,
  canExportAll = false,
  formats = ["csv", "xlsx", "pdf"],
}: UseExportDatasetOptions<T>) {
  const [busy, setBusy] = useState(false);

  const selectedCount = useMemo(() => {
    const ids = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
    return rows.filter((r) => ids.has(getRowId(r))).length;
  }, [rows, selectedIds, getRowId]);

  const resolveRows = useCallback(
    async (scope: ExportScope): Promise<T[]> => {
      if (scope === "filtered") return rows;
      if (scope === "selected") {
        const ids = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
        return rows.filter((r) => ids.has(getRowId(r)));
      }
      if (!fetchAll) throw new Error("Full export is not available for this view");
      return fetchAll();
    },
    [rows, selectedIds, getRowId, fetchAll],
  );

  const exportData = useCallback(
    async (format: ExportFormat, scope: ExportScope) => {
      if (scope === "selected" && selectedCount === 0) {
        toast.error("Select at least one record to export");
        return;
      }
      if (scope === "all" && !canExportAll) {
        toast.error("You do not have permission to export the full dataset");
        return;
      }
      setBusy(true);
      try {
        const data = await resolveRows(scope);
        if (!data.length) {
          toast.error("Nothing to export");
          return;
        }
        const filename = buildExportFilename(filenameBase, scope, format);
        runExport({ format, scope, rows: data, columns, filename });
        toast.success(`Exported ${data.length} record${data.length === 1 ? "" : "s"}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Export failed");
      } finally {
        setBusy(false);
      }
    },
    [canExportAll, columns, filenameBase, resolveRows, selectedCount],
  );

  return {
    exportData,
    busy,
    formats,
    canExportAll: canExportAll && !!fetchAll,
    counts: {
      filtered: rows.length,
      selected: selectedCount,
    },
  };
}

export type ExportDatasetProps = ReturnType<typeof useExportDataset>;
