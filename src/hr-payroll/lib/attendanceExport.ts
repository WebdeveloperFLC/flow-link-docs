import type { AttendanceRegisterRow, AttendanceSummaryRow } from "./attendanceRegister";

const DETAIL_HEADERS = [
  "Employee",
  "Code",
  "Branch",
  "Department",
  "Date",
  "Check in",
  "Check out",
  "Break start",
  "Break end",
  "Net hours",
  "Break",
  "Status",
  "Mispunch",
] as const;

const SUMMARY_HEADERS = [
  "Employee",
  "Code",
  "Branch",
  "Department",
  "Designation",
  "Records",
  "Present",
  "Absent",
  "Late",
  "Half day",
  "Leaves",
  "Week off",
  "Mispunch",
  "Working days",
  "OT",
  "Working hours",
] as const;

function detailValues(r: AttendanceRegisterRow): (string | number)[] {
  const netH = r.netMinutes ? `${Math.floor(r.netMinutes / 60)}h ${r.netMinutes % 60}m` : "—";
  const breakH = r.breakMinutes ? `${Math.floor(r.breakMinutes / 60)}h ${r.breakMinutes % 60}m` : "—";
  return [
    r.fullName,
    r.empCode,
    r.branchName ?? "",
    r.departmentName ?? "",
    r.workDate,
    r.checkIn ?? "",
    r.checkOut ?? "",
    r.breakStart ?? "",
    r.breakEnd ?? "",
    netH,
    breakH,
    r.status,
    r.isMispunch ? "Yes" : "No",
  ];
}

function summaryValues(r: AttendanceSummaryRow): (string | number)[] {
  const otH = r.otMinutes ? `${Math.floor(r.otMinutes / 60)}h ${r.otMinutes % 60}m` : "—";
  return [
    r.fullName,
    r.empCode,
    r.branchName ?? "",
    r.departmentName ?? "",
    r.designationName ?? "",
    r.recordCount,
    r.present,
    r.absent,
    r.lateMarks,
    r.halfDays,
    r.leaves,
    r.weekOff,
    r.mispunches,
    r.workingDays,
    otH,
    r.workingHours,
  ];
}

function downloadTable(
  headers: readonly string[],
  rows: (string | number)[][],
  filename: string,
  fmt: "CSV" | "Excel",
) {
  const sep = fmt === "CSV" ? "," : "\t";
  const csv = [headers.join(sep), ...rows.map((r) => r.join(sep))].join("\n");
  const blob = new Blob([csv], {
    type: fmt === "CSV" ? "text/csv;charset=utf-8" : "application/vnd.ms-excel",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.${fmt === "CSV" ? "csv" : "xls"}`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function downloadAttendanceRegister(
  rows: AttendanceRegisterRow[],
  from: string,
  to: string,
  fmt: "CSV" | "Excel",
) {
  downloadTable(
    DETAIL_HEADERS,
    rows.map(detailValues),
    `attendance_register_${from}_${to}`,
    fmt,
  );
}

export function downloadAttendanceSummary(
  rows: AttendanceSummaryRow[],
  from: string,
  to: string,
  fmt: "CSV" | "Excel",
) {
  downloadTable(
    SUMMARY_HEADERS,
    rows.map(summaryValues),
    `attendance_summary_${from}_${to}`,
    fmt,
  );
}

function reportHtml(title: string, subtitle: string, headers: readonly string[], bodyRows: string) {
  const th = headers.map((h) => `<th>${h}</th>`).join("");
  return `<!DOCTYPE html><html><head><title>${title}</title>
<style>
body{font-family:system-ui,sans-serif;padding:24px;color:#1a2233;font-size:11px}
h1{font-size:18px;margin:0}h2{font-size:12px;color:#666;font-weight:500;margin:4px 0 16px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #dde3ef;padding:5px 6px;text-align:left}
th{background:#f6f8fc;font-weight:600}
td.num{text-align:right}
</style></head><body>
<h1>Future Link Consultants</h1>
<h2>${title} · ${subtitle}</h2>
<table><thead><tr>${th}</tr></thead><tbody>${bodyRows}</tbody></table>
</body></html>`;
}

export function printAttendanceRegister(rows: AttendanceRegisterRow[], from: string, to: string) {
  const body = rows
    .map((r) => {
      const vals = detailValues(r);
      return `<tr>${vals.map((v) => `<td>${v}</td>`).join("")}</tr>`;
    })
    .join("");
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(reportHtml("Attendance Register", `${from} to ${to}`, DETAIL_HEADERS, body));
  w.document.close();
  w.print();
}

export function printAttendanceSummary(rows: AttendanceSummaryRow[], from: string, to: string) {
  const body = rows
    .map((r) => {
      const vals = summaryValues(r);
      return `<tr>${vals.map((v, i) => `<td class="${i >= 5 ? "num" : ""}">${v}</td>`).join("")}</tr>`;
    })
    .join("");
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(reportHtml("Attendance Summary", `${from} to ${to}`, SUMMARY_HEADERS, body));
  w.document.close();
  w.print();
}
