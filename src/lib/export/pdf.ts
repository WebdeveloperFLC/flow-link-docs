import { jsPDF } from "jspdf";
import { rowsToSheetData } from "./formatRows";
import type { ExportColumnDef, SheetRow } from "./types";

const PDF_SAFE = (s: string) =>
  String(s ?? "")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

/** Simple tabular PDF export (landscape when many columns). */
export function exportToPdf<T>(rows: T[], columns: ExportColumnDef<T>[], filename: string): void {
  if (!rows.length) return;
  const sheet = rowsToSheetData(rows, columns);
  const orientation = columns.length > 6 ? "landscape" : "portrait";
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const margin = 10;
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const usableW = pageW - margin * 2;
  const colW = usableW / Math.max(columns.length, 1);
  const lineH = 5;
  const fontSize = columns.length > 10 ? 6 : 7;
  let y = margin;

  doc.setFontSize(fontSize);

  const drawRow = (cells: SheetRow, bold = false) => {
    if (y + lineH > pageH - margin) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", bold ? "bold" : "normal");
    let x = margin;
    for (let i = 0; i < cells.length; i++) {
      const text = PDF_SAFE(String(cells[i] ?? "")).slice(0, 48);
      doc.text(text, x, y, { maxWidth: colW - 1 });
      x += colW;
    }
    y += lineH;
  };

  const [header, ...body] = sheet;
  if (header) drawRow(header, true);
  for (const row of body) drawRow(row);

  const name = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  doc.save(name);
}
