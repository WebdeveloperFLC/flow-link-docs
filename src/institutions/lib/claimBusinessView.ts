/** Business-facing derivations for Direct Institution claims — no schema changes. */

export type ClaimStudentRow = {
  id: string;
  student_name: string;
  nationality?: string | null;
  country_of_origin?: string | null;
  program_name: string;
  program_level?: string | null;
  campus?: string | null;
  intake_term?: string | null;
  intake_year?: number | null;
  tuition_amount?: number | null;
  tuition_paid_amount?: number | null;
  commission_amount?: number | null;
  expected_amount?: number | null;
  amended_expected_amount?: number | null;
  approved_amount?: number | null;
  commission_rate_applied?: number | null;
  commission_snapshot_id?: string | null;
  enrollment_status?: string | null;
  eligibility_status?: string | null;
  claim_status?: string | null;
  payment_status?: string | null;
  hold_status?: string | null;
  hold_reason?: string | null;
  hold_notes?: string | null;
  commission_period_code?: string | null;
  commission_period_label?: string | null;
  institution_validation_notes?: string | null;
  block_notes?: string | null;
  invoice_id?: string | null;
  submitted_by_agency_date?: string | null;
  amount_received?: number | null;
  amount_outstanding?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type ClaimCycleRow = {
  id: string;
  period_label: string;
  intake?: string | null;
  status?: string | null;
  claim_due_date?: string | null;
  invoice_due_date?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ClaimInvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  amount_received?: number | null;
  amount_outstanding?: number | null;
  currency?: string | null;
  due_date?: string | null;
  invoice_date?: string | null;
};

export type BillingProfileSummary = {
  profile_name: string;
  payment_terms_days?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type InstitutionSubmissionTemplate = {
  label: string;
  method: string;
  excel: boolean;
  word: boolean;
  portal: boolean;
  tax: string;
  academicPeriod: string;
  academicTerminology: string;
  requiredColumns: string[];
  columnOrder: string[];
  invoiceNumbering: string;
  emailSubject: string;
  emailBody: string;
  attachments: string[];
  checklist: string[];
  portalUrl?: string;
  requiresInvoice: boolean;
  directPaymentOnly: boolean;
};

const ACADEMIC_LABELS: Record<string, string> = {
  pending: "Application",
  enrolled: "Enrolled",
  withdrawn: "Withdrawn",
  deferred: "Deferred",
  dismissed: "Dismissed",
  graduated: "Graduated",
  on_leave: "Deferred",
};

export function academicStatusLabel(status?: string | null): string {
  if (!status) return "Unknown";
  return ACADEMIC_LABELS[status] ?? status.replace(/_/g, " ");
}

export function scholarshipAmount(s: ClaimStudentRow): number {
  const m = s.metadata ?? {};
  const v = m.scholarship_amount ?? m.scholarship;
  return v != null ? Number(v) || 0 : 0;
}

export function commissionableTuition(s: ClaimStudentRow): number | null {
  const scholarship = scholarshipAmount(s);
  if (scholarship > 0 && s.tuition_amount != null) {
    return Math.max(Number(s.tuition_amount) - scholarship, 0);
  }
  if (s.tuition_paid_amount != null && Number(s.tuition_paid_amount) > 0) {
    return Number(s.tuition_paid_amount);
  }
  return s.tuition_amount != null ? Number(s.tuition_amount) : null;
}

export function expectedCommission(s: ClaimStudentRow): number {
  return Number(
    s.amended_expected_amount ?? s.expected_amount ?? s.commission_amount ?? 0,
  );
}

export function submittedCommission(s: ClaimStudentRow): number {
  if (s.claim_status === "submitted" || s.claim_status === "approved" || s.submitted_by_agency_date) {
    return expectedCommission(s);
  }
  return 0;
}

export function institutionApprovedCommission(s: ClaimStudentRow): number | null {
  if (s.approved_amount != null) return Number(s.approved_amount);
  return null;
}

export function hasOverride(s: ClaimStudentRow): boolean {
  return s.amended_expected_amount != null && s.expected_amount != null
    && Number(s.amended_expected_amount) !== Number(s.expected_amount);
}

export function isClawback(s: ClaimStudentRow): boolean {
  return s.payment_status === "written_off"
    || (s.metadata?.scenario === "clawback")
    || (s.approved_amount != null && Number(s.approved_amount) < 0);
}

export function financialVerificationStatus(s: ClaimStudentRow): string {
  if (s.hold_status === "active" && s.hold_reason === "tuition_pending") {
    return "Tuition outstanding";
  }
  if (s.payment_status === "paid") return "Verified paid";
  if (s.payment_status === "partially_paid") return "Partial payment";
  if (s.commission_snapshot_id) return "Snapshotted";
  if (expectedCommission(s) > 0) return "Calculated";
  return "Pending calculation";
}

export function financialStatusLabel(s: ClaimStudentRow, hasInvoice: boolean): string {
  if (isClawback(s)) return "Clawback";
  if (s.payment_status === "paid") return "Paid";
  if (s.payment_status === "partially_paid") return "Partially paid";
  if (s.payment_status === "written_off") return "Written off";
  if (hasInvoice && s.invoice_id) return "Invoice generated";
  if (s.approved_amount != null && institutionApprovedCommission(s)! < expectedCommission(s)) {
    return "Adjusted";
  }
  return "Expected";
}

export function businessNotes(s: ClaimStudentRow): string {
  const parts: string[] = [];
  const metaNotes = s.metadata?.business_notes;
  if (typeof metaNotes === "string") parts.push(metaNotes);
  if (s.institution_validation_notes) parts.push(s.institution_validation_notes);
  if (s.hold_notes) parts.push(s.hold_notes);
  if (s.block_notes) parts.push(s.block_notes);
  const scenario = s.metadata?.scenario;
  if (typeof scenario === "string") parts.push(`Scenario: ${scenario}`);
  return parts.join(" · ") || "—";
}

const DEFAULT_TEMPLATE: InstitutionSubmissionTemplate = {
  label: "Standard Ontario college package",
  method: "Email + Excel",
  excel: true,
  word: false,
  portal: false,
  tax: "HST",
  academicPeriod: "Semester",
  academicTerminology: "Semester",
  requiredColumns: ["Student Name", "Program", "Intake", "Commission Amount"],
  columnOrder: ["Student Name", "Program", "Intake", "Tuition", "Commission"],
  invoiceNumbering: "FLC-{YYYY}-{INST}-{SEQ}",
  emailSubject: "Commission claim — {institution} — {period}",
  emailBody: "Please find attached our commission claim for {period}.",
  attachments: ["excel", "student_schedule"],
  checklist: ["Validate claim", "Freeze snapshots", "Export package", "Submit"],
  requiresInvoice: true,
  directPaymentOnly: false,
};

export function parseInstitutionTemplate(
  institutionMeta?: Record<string, unknown> | null,
  billing?: BillingProfileSummary | null,
): InstitutionSubmissionTemplate {
  const raw = (billing?.metadata?.claim_submission_template
    ?? institutionMeta?.claim_submission_template) as Record<string, unknown> | undefined;

  if (!raw) {
    return {
      ...DEFAULT_TEMPLATE,
      method: String(institutionMeta?.submission_method ?? DEFAULT_TEMPLATE.method),
      tax: String(billing?.metadata?.tax_type ?? DEFAULT_TEMPLATE.tax),
    };
  }

  const cols = raw.required_columns;
  const order = raw.column_order;

  return {
    label: String(raw.label ?? DEFAULT_TEMPLATE.label),
    method: String(raw.method ?? institutionMeta?.submission_method ?? DEFAULT_TEMPLATE.method),
    excel: raw.excel !== false,
    word: raw.word === true,
    portal: raw.portal === true,
    tax: String(raw.tax ?? billing?.metadata?.tax_type ?? DEFAULT_TEMPLATE.tax),
    academicPeriod: String(raw.academic_period ?? DEFAULT_TEMPLATE.academicPeriod),
    academicTerminology: String(raw.academic_terminology ?? raw.academic_period ?? DEFAULT_TEMPLATE.academicTerminology),
    requiredColumns: Array.isArray(cols) ? cols.map(String) : DEFAULT_TEMPLATE.requiredColumns,
    columnOrder: Array.isArray(order) ? order.map(String) : DEFAULT_TEMPLATE.columnOrder,
    invoiceNumbering: String(raw.invoice_numbering ?? DEFAULT_TEMPLATE.invoiceNumbering),
    emailSubject: String(raw.email_subject ?? DEFAULT_TEMPLATE.emailSubject),
    emailBody: String(raw.email_body ?? DEFAULT_TEMPLATE.emailBody),
    attachments: Array.isArray(raw.attachments) ? raw.attachments.map(String) : DEFAULT_TEMPLATE.attachments,
    checklist: Array.isArray(raw.checklist) ? raw.checklist.map(String) : DEFAULT_TEMPLATE.checklist,
    portalUrl: raw.portal_url ? String(raw.portal_url) : undefined,
    requiresInvoice: raw.requires_invoice !== false,
    directPaymentOnly: raw.direct_payment_only === true,
  };
}

/** @deprecated use parseInstitutionTemplate */
export function submissionTemplate(
  institutionMeta?: Record<string, unknown> | null,
  billing?: BillingProfileSummary | null,
) {
  const t = parseInstitutionTemplate(institutionMeta, billing);
  return {
    method: t.method,
    excel: t.excel,
    word: t.word,
    portal: t.portal,
    tax: t.tax,
    period: t.academicPeriod,
    label: t.label,
  };
}

export type ClaimSummary = {
  studentsIncluded: number;
  studentsPending: number;
  studentsBlocked: number;
  studentsOnHold: number;
  studentsReady: number;
  studentsSubmitted: number;
  expectedCommission: number;
  submittedTotal: number;
  institutionApproved: number;
  received: number;
  outstanding: number;
  adjusted: number;
  clawback: number;
  variance: number;
  lastPaymentDate: string | null;
  nextDueDate: string | null;
  agingDays: number | null;
  canSubmitToday: boolean;
  blockers: string[];
  lastSnapshotAt: string | null;
};

export function computeClaimSummary(
  students: ClaimStudentRow[],
  invoice?: ClaimInvoiceRow | null,
  cycle?: ClaimCycleRow | null,
  opts?: { validated?: boolean },
): ClaimSummary {
  const blockers: string[] = [];
  let expectedTotal = 0;
  let submittedTotal = 0;
  let institutionApproved = 0;
  let received = 0;
  let adjusted = 0;
  let clawback = 0;
  let studentsPending = 0;
  let studentsBlocked = 0;
  let studentsOnHold = 0;
  let studentsReady = 0;
  let studentsSubmitted = 0;
  let lastSnapshotAt: string | null = null;
  let lastPaymentDate: string | null = null;

  for (const s of students) {
    if (s.eligibility_status === "cancelled" || s.eligibility_status === "ineligible") {
      studentsBlocked += 1;
      blockers.push(`${s.student_name}: excluded (${s.enrollment_status ?? s.eligibility_status})`);
      continue;
    }
    if (s.hold_status === "active") {
      studentsOnHold += 1;
      blockers.push(`${s.student_name}: on hold (${s.hold_reason ?? "other"})`);
    }
    if (s.eligibility_status === "pending" || s.claim_status === "not_ready") {
      studentsPending += 1;
    }
    if (s.eligibility_status === "eligible" && s.claim_status === "ready" && s.hold_status !== "active") {
      studentsReady += 1;
    }
    if (s.claim_status === "submitted" || s.claim_status === "approved" || s.submitted_by_agency_date) {
      studentsSubmitted += 1;
      submittedTotal += expectedCommission(s);
    }
    expectedTotal += expectedCommission(s);
    if (s.approved_amount != null) {
      institutionApproved += Number(s.approved_amount);
      if (Number(s.approved_amount) < expectedCommission(s)) {
        adjusted += expectedCommission(s) - Number(s.approved_amount);
      }
    } else if (s.claim_status === "submitted" || s.claim_status === "approved") {
      institutionApproved += expectedCommission(s);
    }
    if (isClawback(s)) {
      clawback += Math.abs(expectedCommission(s));
    }
    received += Number(s.amount_received ?? 0);
    if (Number(s.amount_received ?? 0) > 0 && s.metadata?.last_payment_date) {
      lastPaymentDate = String(s.metadata.last_payment_date);
    }
    if (s.commission_snapshot_id && !lastSnapshotAt) {
      lastSnapshotAt = "Frozen on student row";
    }
  }

  if (studentsReady === 0 && studentsSubmitted === 0) {
    blockers.push("No students ready for submission");
  }
  if (!opts?.validated) blockers.push("Claim not validated — run Validate Claim");

  const outstanding = invoice?.amount_outstanding != null
    ? Number(invoice.amount_outstanding)
    : Math.max(institutionApproved || expectedTotal - received, 0);

  const variance = institutionApproved > 0
    ? institutionApproved - submittedTotal
    : expectedTotal - received;

  const nextDueDate = invoice?.due_date ?? cycle?.claim_due_date ?? cycle?.invoice_due_date ?? null;
  let agingDays: number | null = null;
  if (nextDueDate) {
    agingDays = Math.ceil((Date.now() - new Date(nextDueDate).getTime()) / 86400000);
  }

  return {
    studentsIncluded: students.length,
    studentsPending,
    studentsBlocked,
    studentsOnHold,
    studentsReady,
    studentsSubmitted,
    expectedCommission: expectedTotal,
    submittedTotal,
    institutionApproved,
    received: invoice?.amount_received != null ? Number(invoice.amount_received) : received,
    outstanding,
    adjusted,
    clawback,
    variance,
    lastPaymentDate,
    nextDueDate,
    agingDays,
    canSubmitToday: studentsReady > 0 && studentsOnHold === 0 && (opts?.validated ?? false),
    blockers: [...new Set(blockers)],
    lastSnapshotAt,
  };
}

export type ValidationIssue = { severity: "error" | "warning"; message: string; studentId?: string };

export function validateClaimForSubmission(students: ClaimStudentRow[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const candidates = students.filter(
    (s) => s.eligibility_status === "eligible" && s.claim_status === "ready" && s.hold_status !== "active",
  );

  if (candidates.length === 0) {
    issues.push({ severity: "error", message: "No students ready for submission in this claim." });
  }

  for (const s of students) {
    if (s.hold_status === "active") {
      issues.push({
        severity: "error",
        message: `${s.student_name} is on hold (${s.hold_reason ?? "other"}).`,
        studentId: s.id,
      });
    }
    if (s.eligibility_status === "eligible" && s.claim_status === "ready") {
      if (!s.commission_snapshot_id) {
        issues.push({
          severity: "error",
          message: `${s.student_name} has no commission snapshot — mark eligible to freeze.`,
          studentId: s.id,
        });
      }
      if (expectedCommission(s) <= 0) {
        issues.push({
          severity: "error",
          message: `${s.student_name} has zero expected commission — recalculate first.`,
          studentId: s.id,
        });
      }
    }
    if (s.tuition_amount == null) {
      issues.push({
        severity: "warning",
        message: `${s.student_name} has no gross tuition recorded.`,
        studentId: s.id,
      });
    }
  }

  return issues;
}

export type CommissionExplanationLine = { label: string; value: string; detail?: string };

export type CommissionExplanation = {
  studentName: string;
  amountType: string;
  finalAmount: number;
  currency: string;
  lines: CommissionExplanationLine[];
};

export function buildCommissionExplanation(
  s: ClaimStudentRow,
  amountType: "expected" | "approved" | "received" | "outstanding" | "commissionable",
): CommissionExplanation {
  const lines: CommissionExplanationLine[] = [];
  const gross = s.tuition_amount;
  const scholarship = scholarshipAmount(s);
  const commissionable = commissionableTuition(s);
  const rate = s.commission_rate_applied;
  const expected = Number(s.expected_amount ?? s.commission_amount ?? 0);
  const amended = s.amended_expected_amount;
  const approved = s.approved_amount;
  const received = s.amount_received;
  const outstanding = s.amount_outstanding;

  lines.push({
    label: "Calculation rule",
    value: rate != null ? `${rate}% of commissionable tuition` : "Fixed / hybrid rule from agreement",
    detail: s.commission_snapshot_id ? "Frozen in commission snapshot" : "Not yet snapshotted",
  });
  if (gross != null) {
    lines.push({ label: "Gross tuition", value: fmtAmt(gross) });
  }
  if (scholarship > 0) {
    lines.push({ label: "Scholarship", value: fmtAmt(scholarship), detail: "Reduces commissionable base" });
  }
  if (commissionable != null) {
    lines.push({ label: "Commissionable tuition", value: fmtAmt(commissionable) });
  }
  if (rate != null) {
    lines.push({ label: "Commission %", value: `${rate}%` });
  }
  if (expected > 0) {
    lines.push({ label: "Expected (calculated)", value: fmtAmt(expected) });
  }
  if (amended != null && amended !== expected) {
    lines.push({
      label: "Manual override",
      value: fmtAmt(Number(amended)),
      detail: `Original expected was ${fmtAmt(expected)}`,
    });
  }
  if (approved != null) {
    lines.push({
      label: "Institution approved",
      value: fmtAmt(Number(approved)),
      detail: s.institution_validation_notes ?? undefined,
    });
  }
  if (received != null && Number(received) > 0) {
    lines.push({ label: "Payment received", value: fmtAmt(Number(received)), detail: "Allocated from commission payment" });
  }
  if (outstanding != null && Number(outstanding) > 0) {
    lines.push({ label: "Outstanding", value: fmtAmt(Number(outstanding)) });
  }
  if (s.metadata?.scenario) {
    lines.push({ label: "Demo scenario", value: String(s.metadata.scenario) });
  }

  let finalAmount = expected;
  if (amountType === "approved" && approved != null) finalAmount = Number(approved);
  if (amountType === "received") finalAmount = Number(received ?? 0);
  if (amountType === "outstanding") finalAmount = Number(outstanding ?? 0);
  if (amountType === "commissionable") finalAmount = Number(commissionable ?? 0);
  if (amountType === "expected") finalAmount = expectedCommission(s);

  return {
    studentName: s.student_name,
    amountType,
    finalAmount,
    currency: "CAD",
    lines,
  };
}

function fmtAmt(n: number) {
  return `CAD ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function buildExcelPreviewRows(
  students: ClaimStudentRow[],
  template: InstitutionSubmissionTemplate,
): string[][] {
  const headers = template.columnOrder.length > 0 ? template.columnOrder : template.requiredColumns;
  const rows = students
    .filter((s) => s.eligibility_status !== "cancelled")
    .map((s) => {
      const map: Record<string, string> = {
        "Student Name": s.student_name,
        Student: s.student_name,
        Program: s.program_name,
        Level: s.program_level ?? "",
        Intake: s.intake_term ?? "",
        Campus: s.campus ?? "",
        "Academic Period": s.commission_period_label ?? s.commission_period_code ?? template.academicPeriod,
        Tuition: commissionableTuition(s) != null ? String(commissionableTuition(s)) : "",
        "Gross Tuition": s.tuition_amount != null ? String(s.tuition_amount) : "",
        Scholarship: scholarshipAmount(s) > 0 ? String(scholarshipAmount(s)) : "",
        "Commission %": s.commission_rate_applied != null ? String(s.commission_rate_applied) : "",
        "Commission Amount": String(expectedCommission(s)),
        Commission: String(expectedCommission(s)),
      };
      return headers.map((h) => map[h] ?? "");
    });
  return [headers, ...rows];
}

export function buildEmailPreview(
  institutionName: string,
  periodLabel: string,
  template: InstitutionSubmissionTemplate,
  studentCount: number,
  expectedTotal: string,
): string {
  const subject = template.emailSubject
    .replace("{institution}", institutionName)
    .replace("{period}", periodLabel);
  const body = template.emailBody
    .replace("{institution}", institutionName)
    .replace("{period}", periodLabel)
    .replace("{student_count}", String(studentCount))
    .replace("{total}", expectedTotal);

  return `Subject: ${subject}

${body}

Students included: ${studentCount}
Total expected commission: ${expectedTotal}
Submission method: ${template.method}
Tax treatment: ${template.tax}
Academic period: ${template.academicTerminology}

Regards,
Future Link Consultants Inc.`;
}
