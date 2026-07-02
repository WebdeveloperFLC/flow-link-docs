/* =====================================================================
 * PLANNED — NOT ACTIVE.
 *
 * Client → Institution commission bridge. This module is dormant and
 * MUST NOT be imported from any runtime code path. It documents the
 * eventual auto-sync logic; every handler short-circuits on the
 * BRIDGE_ENABLED flag so it is safe to keep in the bundle.
 *
 * See ./INTEGRATION_PLAN.md for the full activation checklist.
 * ===================================================================== */

export const BRIDGE_ENABLED = false as const;

// ---------- Event payload types ----------

export interface VisaApprovedEvent {
  clientId: string;
  approvalDate: string; // ISO date
  visaStatus: "approved" | "granted";
  studyPermitNumber?: string;
}

export interface TuitionPaidEvent {
  clientId: string;
  paymentDate: string;
  amount: number;
  currency: "CAD" | string;
  paymentType: "tuition";
  status: "confirmed" | "paid";
}

export interface ApplicationSubmittedEvent {
  clientId: string;
  institutionId: string;
  workflowStage: "application_submitted";
  submittedAt: string;
}

export interface ConsentFormSubmittedEvent {
  clientId: string;
  documentType: "consent_form";
  submittedAt: string;
}

export interface StudentDeferralEvent {
  clientId: string;
  fromIntake: string;
  toIntake: string;
}

export interface MatchedStudent {
  id: string;
  institution_id: string;
  student_name: string;
  matched_by: "passport" | "email" | "name_institution_intake" | "institution_student_id";
}

// ---------- Matching logic ----------

/**
 * Match a client record to a `upi_commission_students` row.
 * Priority:
 *  1. passport_number exact
 *  2. client.email = student_email
 *  3. full_name + institution_id + intake_term
 *  4. institution_student_id (stored on client profile)
 * Logs to upi_audit_logs (action='match_failed') and emits an AI
 * suggestion when no match is found.
 */
export async function matchClientToCommissionStudent(_clientId: string): Promise<MatchedStudent | null> {
  if (!BRIDGE_ENABLED) return null;
  // TODO(activation): implement the four-step priority lookup using supabase client.
  // 1. SELECT id, institution_id, student_name FROM upi_commission_students
  //    WHERE passport_number = client.passport_number LIMIT 1;
  // 2. fall back to student_email = client.email
  // 3. fall back to (student_name, institution_id, intake_term) tuple
  // 4. fall back to student_id_at_institution = client.institution_student_id
  // On miss, INSERT into upi_audit_logs with action='match_failed' and
  // create an ai_suggestion ("Could not auto-match client …").
  return null;
}

// ---------- Eligibility checker ----------

export interface EligibilityInput {
  consent_form_submitted: boolean | null;
  consent_form_withdrawn: boolean | null;
  consent_withdrawal_date: string | null;
  study_permit_approved_date: string | null;
  is_full_time: boolean | null;
  registered_credits: number | null;
  enrollment_status: string | null;
  tuition_amount: number | null;
  tuition_paid_amount: number | null;
  agreement_active: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  checks: Record<string, boolean>;
}

export function evaluateCommissionEligibility(s: EligibilityInput): EligibilityResult {
  const checks = {
    consent_submitted: !!s.consent_form_submitted,
    consent_not_withdrawn_before_sp:
      !s.consent_form_withdrawn ||
      (!!s.consent_withdrawal_date && !!s.study_permit_approved_date &&
       new Date(s.consent_withdrawal_date) > new Date(s.study_permit_approved_date)),
    full_time: !!s.is_full_time,
    credits_minimum: (s.registered_credits ?? 0) >= 9,
    enrolled: s.enrollment_status === "enrolled",
    tuition_paid: (s.tuition_paid_amount ?? 0) >= (s.tuition_amount ?? Infinity),
    agreement_active: s.agreement_active,
  };
  return { eligible: Object.values(checks).every(Boolean), checks };
}

// ---------- Event handlers (dormant stubs) ----------

/**
 * EVENT 1 — fired when a client's visa_status flips to 'approved'/'granted'.
 * Action: update matched commission student's study_permit_approved_date and,
 * if also enrolled, mark enrollment_status='enrolled'; emit AI suggestion:
 * "Visa approved for [Student Name] — verify enrollment and submit consent
 *  form if not yet done".
 */
export async function onVisaApproved(_event: VisaApprovedEvent): Promise<void> {
  if (!BRIDGE_ENABLED) return;
  // TODO(activation): match + update + recalc eligibility + emit suggestion.
}

/**
 * EVENT 2 — fired when a tuition payment is confirmed/paid.
 * Action: update tuition_paid_amount + tuition_paid_date, recompute commission
 * amount from the institution's active commission rules, and if every
 * eligibility check passes set commission_status='eligible' + emit:
 * "Commission now eligible for [Student Name] at [Institution] — CAD [amount].
 *  Add to [Term] claim cycle."
 */
export async function onTuitionPaid(_event: TuitionPaidEvent): Promise<void> {
  if (!BRIDGE_ENABLED) return;
  // TODO(activation): see EVENT 2 in INTEGRATION_PLAN.md
}

/**
 * EVENT 3 — fired when client workflow reaches 'application_submitted'.
 * Action: ensure a upi_commission_students row exists for (client, institution)
 * with commission_status='pending'; link client_id; emit:
 * "New application submitted to [Institution] for [Student Name] —
 *  ensure consent form is submitted with application".
 */
export async function onApplicationSubmitted(_event: ApplicationSubmittedEvent): Promise<void> {
  if (!BRIDGE_ENABLED) return;
  // TODO(activation): upsert pending commission_student + suggestion.
}

/**
 * EVENT 4 — fired when a consent_form document is uploaded/marked complete.
 * Action: consent_form_submitted=true, consent_form_date=today, remove any
 * 'no_consent_form' block, re-run eligibility evaluation.
 */
export async function onConsentFormSubmitted(_event: ConsentFormSubmittedEvent): Promise<void> {
  if (!BRIDGE_ENABLED) return;
  // TODO(activation): toggle flags + clear block + re-evaluate.
}

/**
 * EVENT 5 — fired when a client intake is moved to a future term.
 * Action: mark current student record carried_forward with reason
 * 'Student deferred by institution/choice', create a new
 * upi_commission_students row for the new term and set
 * carried_from_cycle_id to the original cycle; emit AI suggestion.
 */
export async function onStudentDeferral(_event: StudentDeferralEvent): Promise<void> {
  if (!BRIDGE_ENABLED) return;
  // TODO(activation): split record across cycles + suggestion.
}