import type { ReportExportRow } from "./hrReportExport";

/** Shared mispunch table/report column labels (P3 consistency). */
export const MISPUNCH_TABLE_COLUMNS = {
  ref: "Ref",
  employee: "Employee",
  date: "Date",
  issue: "Issue",
  evidence: "Evidence",
  status: "Status",
  approvedBy: "Approved By",
} as const;

export type MispunchDisplayRow = {
  ref: string;
  employee: string;
  date: string;
  issue: string;
  evidence: string;
  status: string;
  approvedBy: string;
};

export function mispunchExportHeaders(includeRef = true): string[] {
  const cols = [
    MISPUNCH_TABLE_COLUMNS.employee,
    MISPUNCH_TABLE_COLUMNS.date,
    MISPUNCH_TABLE_COLUMNS.issue,
    MISPUNCH_TABLE_COLUMNS.evidence,
    MISPUNCH_TABLE_COLUMNS.status,
    MISPUNCH_TABLE_COLUMNS.approvedBy,
  ];
  return includeRef ? [MISPUNCH_TABLE_COLUMNS.ref, ...cols] : cols;
}

export function mispunchExportRow(r: MispunchDisplayRow, includeRef = true): ReportExportRow {
  const base: ReportExportRow = [
    r.employee,
    r.date,
    r.issue,
    r.evidence,
    r.status,
    r.approvedBy,
  ];
  return includeRef ? [r.ref, ...base] : base;
}
