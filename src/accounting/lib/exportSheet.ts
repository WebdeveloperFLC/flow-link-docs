import * as XLSX from "xlsx";

export type SheetRow = (string | number | null | undefined)[];

export interface SheetSpec {
  name: string;
  rows: SheetRow[];
  /** Per-cell Excel number formats (sparse, same shape as rows). */
  formats?: (string | undefined)[][];
  /** Default number format for numeric cells without an explicit format. */
  defaultNumFmt?: string;
  /** Column widths in characters (0-based). */
  colWidths?: number[];
}

export function downloadCsv(filename: string, rows: SheetRow[]) {
  const csv = rows
    .map((r) => r.map((v) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, filename);
}

export function downloadXlsx(filename: string, sheets: SheetSpec[]) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows as unknown[][]);
    // Apply number formats
    for (let r = 0; r < s.rows.length; r++) {
      const row = s.rows[r] ?? [];
      for (let c = 0; c < row.length; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        const cell = (ws as Record<string, XLSX.CellObject>)[ref];
        if (!cell || cell.t !== "n") continue;
        const fmt = s.formats?.[r]?.[c] ?? s.defaultNumFmt;
        if (fmt) cell.z = fmt;
      }
    }
    if (s.colWidths?.length) {
      ws["!cols"] = s.colWidths.map((w) => ({ wch: w }));
    }
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31) || "Sheet1");
  }
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  triggerDownload(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}