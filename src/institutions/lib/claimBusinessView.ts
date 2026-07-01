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
};

export type BillingProfileSummary = {
  profile_name: string;
  payment_terms_days?: number | null;
  metadata?: Record<string, unknown> | null;
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

export function institutionApprovedCommission(s: ClaimStudentRow): number | null {
  if (s.approved_amount != null) return Number(s.approved_amount);
  return null;
}

export function hasOverride(s: ClaimStudentRow): boolean {
  return s.amended_expected_amount != null && s.expected_amount != null
    && Number(s.amended_expected_amount) !== Number(s.expected_amount);
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
  if (s.institution_validation_notes) parts.push(s.institution_validation_notes);
  if (s.hold_notes) parts.push(s.hold_notes);
  if (s.block_notes) parts.push(s.block_notes);
  const scenario = s.metadata?.scenario;
  if (typeof scenario === "string") parts.push(`Scenario: ${scenario}`);
  return parts.join(" · ") || "—";
}

export function submissionTemplate(institutionMeta?: Record<string, unknown> | null, billing?: BillingProfileSummary | null) {
  const t = (billing?.metadata?.claim_submission_template ?? institutionMeta?.claim_submission_template) as Record<string, unknown> | undefined;
  return {
    method: String(t?.method ?? institutionMeta?.submission_method ?? "Email + Excel"),
    excel: t?.excel !== false,
    word: t?.word === true,
    portal: t?.portal === true,
    tax: String(t?.tax ?? billing?.metadata?.tax_type ?? "HST"),
    period: String(t?.academic_period ?? "Semester"),
    label: String(t?.label ?? "Standard Ontario college package"),
  };
}

export type ClaimSummary = {
  studentsIncluded: number;
  studentsPending: number;
  studentsBlocked: number;
  studentsOnHold: number;
  studentsReady: number;
  expectedCommission: number;
  institutionApproved: number;
  received: number;
  outstanding: number;
  canSubmitToday: boolean;
  blockers: string[];
  lastSnapshotAt: string | null;
};

export function computeClaimSummary(
  students: ClaimStudentRow[],
  invoice?: ClaimInvoiceRow | null,
  opts?: { validated?: boolean },
): ClaimSummary {
  const blockers: string[] = [];
  let expectedTotal = 0;
  let institutionApproved = 0;
  let received = 0;
  let studentsPending = 0;
  let studentsBlocked = 0;
  let studentsOnHold = 0;
  let studentsReady = 0;
  let lastSnapshotAt: string | null = null;

  for (const s of students) {
    if (s.eligibility_status === "cancelled" || s.eligibility_status === "ineligible") {
      studentsBlocked += 1;
      continue;
    }
    if (s.hold_status === "active") {
      studentsOnHold += 1;
      blockers.push(`${s.student_name}: hold (${s.hold_reason ?? "other"})`);
    }
    if (s.eligibility_status === "pending" || s.claim_status === "not_ready") {
      studentsPending += 1;
    }
    if (s.eligibility_status === "eligible" && s.claim_status === "ready" && s.hold_status !== "active") {
      studentsReady += 1;
    }
    expectedTotal += expectedCommission(s);
    if (s.approved_amount != null) {
      institutionApproved += Number(s.approved_amount);
    } else if (s.claim_status === "submitted" || s.claim_status === "approved") {
      institutionApproved += expectedCommission(s);
    }
    received += Number(s.amount_received ?? 0);
    if (s.commission_snapshot_id && !lastSnapshotAt) {
      lastSnapshotAt = "Frozen on student row";
    }
  }

  if (studentsReady === 0) blockers.push("No students in Ready claim status");
  if (!opts?.validated) blockers.push("Claim not validated — run Validate Claim");

  const outstanding = invoice?.amount_outstanding != null
    ? Number(invoice.amount_outstanding)
    : Math.max(expectedTotal - received, 0);

  return {
    studentsIncluded: students.length,
    studentsPending,
    studentsBlocked,
    studentsOnHold,
    studentsReady,
    expectedCommission: expectedTotal,
    institutionApproved,
    received: invoice?.amount_received != null ? Number(invoice.amount_received) : received,
    outstanding,
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
