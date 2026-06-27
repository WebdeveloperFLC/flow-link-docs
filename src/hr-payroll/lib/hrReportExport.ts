export type ReportExportRow = (string | number)[];

/** Escape CSV/TSV cell values for Excel (UTF-8 safe). */
export function csvEscapeCell(v: string | number): string {
  const s = String(v);
  if (/[",\n\r\t]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadReportTable(
  headers: readonly string[],
  rows: ReportExportRow[],
  filename: string,
  fmt: "CSV" | "Excel",
) {
  const sep = fmt === "CSV" ? "," : "\t";
  const bom = "\uFEFF";
  const csv = [
    headers.map(csvEscapeCell).join(sep),
    ...rows.map((r) => r.map(csvEscapeCell).join(sep)),
  ].join("\n");
  const blob = new Blob([bom + csv], {
    type: fmt === "CSV" ? "text/csv;charset=utf-8" : "application/vnd.ms-excel;charset=utf-8",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.${fmt === "CSV" ? "csv" : "xls"}`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function reportHtml(
  title: string,
  subtitle: string,
  headers: readonly string[],
  bodyRows: string,
  recordCount: number,
) {
  const th = headers.map((h) => `<th>${h}</th>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:system-ui,sans-serif;padding:24px;color:#1a2233;font-size:11px}
h1{font-size:18px;margin:0}h2{font-size:12px;color:#666;font-weight:500;margin:4px 0 16px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #dde3ef;padding:6px 8px;text-align:left}
th{background:#f6f8fc;font-weight:600}
.meta{font-size:12px;color:#666;margin-bottom:12px}
</style></head><body>
<h1>${title}</h1>
<h2>${subtitle}</h2>
<div class="meta">${recordCount} records</div>
<table><thead><tr>${th}</tr></thead><tbody>${bodyRows}</tbody></table>
</body></html>`;
}

export function printReportTable(
  title: string,
  subtitle: string,
  headers: readonly string[],
  rows: ReportExportRow[],
) {
  const body = rows
    .map((r) => `<tr>${r.map((v) => `<td>${String(v).replace(/</g, "&lt;")}</td>`).join("")}</tr>`)
    .join("");
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(reportHtml(title, subtitle, headers, body, rows.length));
  w.document.close();
  w.print();
}
