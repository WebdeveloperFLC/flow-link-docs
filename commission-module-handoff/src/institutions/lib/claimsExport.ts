// FLC Claims export helpers — CSV builder + print helpers.
// No external dependencies; uses Blob/anchor for CSV download and window.print for PDF.

const AGENCY = {
  name: "Future Link Consultants Inc.",
  address: "5 Vandorf Street, Toronto, Ontario, Canada M1B 4Y3",
  phone: "+1 416 902 4524",
  email: "overseasrelations@futurelinkconsultants.com",
  website: "www.futurelinkconsultants.com",
} as const;

export const FLC_AGENCY = AGENCY;

export const formatCAD = (n: number | null | undefined) =>
  n == null ? "" : `CAD ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const csvEscape = (v: unknown): string => {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const yesNo = (v: boolean | null | undefined) => (v == null ? "" : v ? "Yes" : "No");

export interface ExportStudent {
  student_name: string;
  nationality: string | null;
  program_name: string;
  campus: string | null;
  intake_term: string | null;
  student_id_at_institution: string | null;
  study_permit_number?: string | null;
  study_permit_approved_date: string | null;
  consent_form_submitted: boolean | null;
  enrollment_status: string | null;
  registered_credits: number | null;
  is_full_time: boolean | null;
  tuition_amount: number | null;
  tuition_paid_date: string | null;
  commission_rate_applied: number | null;
  commission_amount: number | null;
  commission_status: string;
  block_reason: string | null;
  is_carried_forward: boolean | null;
  invoice_id: string | null;
}

export interface ExportInvoiceLookup {
  [invoiceId: string]: { invoice_number: string };
}

const CSV_COLUMNS = [
  "Student Name", "Nationality", "Program", "Campus", "Intake Term",
  "Student ID at Institution", "Study Permit Number", "SP Approved Date",
  "Consent Form Submitted", "Enrollment Status", "Credits Registered",
  "Full Time", "Tuition Amount CAD", "Tuition Paid Date",
  "Commission Rate %", "Commission Amount CAD", "Commission Status",
  "Block Reason", "Carried Forward", "Invoice Number",
];

export function buildClaimCsv(students: ExportStudent[], invoiceLookup: ExportInvoiceLookup = {}): string {
  const header = CSV_COLUMNS.join(",");
  const rows = students.map((s) => [
    s.student_name,
    s.nationality,
    s.program_name,
    s.campus,
    s.intake_term,
    s.student_id_at_institution,
    s.study_permit_number ?? "",
    s.study_permit_approved_date,
    yesNo(s.consent_form_submitted),
    s.enrollment_status,
    s.registered_credits,
    yesNo(s.is_full_time),
    s.tuition_amount,
    s.tuition_paid_date,
    s.commission_rate_applied,
    s.commission_amount,
    s.commission_status,
    s.block_reason,
    yesNo(s.is_carried_forward),
    s.invoice_id ? invoiceLookup[s.invoice_id]?.invoice_number ?? "" : "",
  ].map(csvEscape).join(","));
  return [header, ...rows].join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function filenameForClaim(institutionName: string, term: string, date = new Date()) {
  const clean = (v: string) => v.replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "");
  const d = date.toISOString().slice(0, 10);
  return `FLC_Claim_${clean(institutionName)}_${clean(term)}_${d}.csv`;
}

/**
 * Print a specific element by toggling a body class that the print CSS keys off of.
 * Other DOM stays untouched; print CSS hides everything except `.fl-print-active .fl-print-root`.
 */
export function printWithRoot(callback?: () => void) {
  document.body.classList.add("fl-print-active");
  const cleanup = () => {
    document.body.classList.remove("fl-print-active");
    window.removeEventListener("afterprint", cleanup);
    callback?.();
  };
  window.addEventListener("afterprint", cleanup);
  // give React a tick to render the print root
  setTimeout(() => window.print(), 50);
}