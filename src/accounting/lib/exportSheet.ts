import * as XLSX from "xlsx";

export type SheetRow = (string | number | null | undefined)[];

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

export function downloadXlsx(filename: string, sheets: { name: string; rows: SheetRow[] }[]) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows as unknown[][]);
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