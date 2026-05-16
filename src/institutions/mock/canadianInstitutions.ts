import type { MockAgreement, MockCommission, MockCommissionRule, MockClaimCycle, MockInvoice, MockPromotion } from "./types";

/** Mock data only used when DB returns no rows AND USE_MOCK_DATA=true. */

export const mockAgreements: MockAgreement[] = [
  {
    id: "mock-agr-seneca",
    institution_id: "mock-inst-seneca",
    title: "Seneca Polytechnic — Master Recruitment Agreement",
    agreement_type: "commission",
    status: "active",
    valid_from: "2024-01-01",
    valid_to: "2026-12-31",
    renewal_reminder_days: 90,
    extracted_data: {
      countries_allowed: ["India", "Nigeria", "Philippines", "Vietnam"],
      sub_agent_allowed: true,
      b2b_allowed: true,
      governing_law: "Ontario, Canada",
      claim_deadline_days: 45,
      invoice_deadline_days: 30,
      termination_notice_days: 90,
      clawback_rule: "Refund if student withdraws before week 4 of term.",
      ai_summary: "Standard 15% per semester commission with 2% bonus for May/Sep intakes. Sub-agents allowed with prior written notice.",
    },
    notes: "",
  },
  {
    id: "mock-agr-conestoga",
    institution_id: "mock-inst-conestoga",
    title: "Conestoga College — Partnership MOU",
    agreement_type: "partnership",
    status: "active",
    valid_from: "2023-06-01",
    valid_to: "2025-06-30",
    renewal_reminder_days: 60,
    extracted_data: {
      countries_allowed: ["India"],
      sub_agent_allowed: false,
      b2b_allowed: true,
      governing_law: "Ontario, Canada",
      claim_deadline_days: 60,
      invoice_deadline_days: 30,
      termination_notice_days: 60,
      ai_summary: "Yearly payout, India-only recruitment. Renewal review needed within 60 days.",
    },
    notes: "",
  },
];

export const mockCommissions: MockCommission[] = [
  {
    id: "mock-com-seneca",
    institution_id: "mock-inst-seneca",
    agreement_id: "mock-agr-seneca",
    name: "Seneca standard commission",
    model_type: "percentage",
    currency: "CAD",
    is_active: true,
    is_proposed: false,
    base_rate_percent: 15,
    payout_basis: "first_semester_tuition",
    payment_timing: "Within 60 days of CAS issuance",
    tax_treatment: "GST exclusive",
  },
  {
    id: "mock-com-conestoga",
    institution_id: "mock-inst-conestoga",
    agreement_id: "mock-agr-conestoga",
    name: "Conestoga yearly commission",
    model_type: "percentage",
    currency: "CAD",
    is_active: true,
    is_proposed: false,
    base_rate_percent: 12,
    payout_basis: "year_one_tuition",
    payment_timing: "Yearly after enrollment census",
    tax_treatment: "GST exclusive",
  },
];

export const mockCommissionRules: MockCommissionRule[] = [
  { id: "r1", commission_id: "mock-com-seneca", rule_name: "May intake bonus", rule_type: "bonus", payout_amount: 2, payout_type: "percentage", condition_field: "intake", condition_operator: "in", condition_value: "May,Sep", payout_currency: "CAD" },
  { id: "r2", commission_id: "mock-com-seneca", rule_name: "Slab 50+ students", rule_type: "slab_tier", payout_amount: 18, payout_type: "percentage", min_value: 50, max_value: 999, payout_currency: "CAD" },
  { id: "r3", commission_id: "mock-com-conestoga", rule_name: "PG diploma bonus", rule_type: "bonus", payout_amount: 1, payout_type: "percentage", condition_field: "program_level", condition_operator: "=", condition_value: "PG Diploma", payout_currency: "CAD" },
];

export const mockClaimCycles: MockClaimCycle[] = [
  { id: "cc-1", institution_id: "mock-inst-seneca", period_label: "Winter 2026", intake: "January 2026", status: "open", claim_due_date: "2026-03-15", invoice_due_date: "2026-04-15", total_expected: 84000, total_received: 0, currency: "CAD" },
  { id: "cc-2", institution_id: "mock-inst-seneca", period_label: "Fall 2025", intake: "September 2025", status: "partially_paid", claim_due_date: "2025-11-15", invoice_due_date: "2025-12-15", total_expected: 126000, total_received: 92000, currency: "CAD" },
  { id: "cc-3", institution_id: "mock-inst-conestoga", period_label: "Winter 2026", intake: "January 2026", status: "open", claim_due_date: "2026-03-30", invoice_due_date: "2026-04-30", total_expected: 48000, total_received: 0, currency: "CAD" },
];

export const mockInvoices: MockInvoice[] = [
  { id: "inv-1", institution_id: "mock-inst-seneca", claim_cycle_id: "cc-2", invoice_no: "FLC-2025-0091", amount: 92000, currency: "CAD", status: "paid", sent_at: "2025-11-20T00:00:00Z", paid_at: "2025-12-22T00:00:00Z" },
  { id: "inv-2", institution_id: "mock-inst-seneca", claim_cycle_id: "cc-2", invoice_no: "FLC-2025-0114", amount: 34000, currency: "CAD", status: "overdue", sent_at: "2025-12-30T00:00:00Z" },
];

export const mockPromotions: MockPromotion[] = [
  { id: "promo-1", institution_id: "mock-inst-seneca", title: "Application fee waiver — May 2026 intake", promo_type: "seasonal", valid_from: "2026-01-01", valid_to: "2026-04-30", target_countries: ["India", "Nigeria"], is_active: true, auto_detected: true },
  { id: "promo-2", institution_id: "mock-inst-conestoga", title: "Free GIC partner offer", promo_type: "general", valid_from: "2026-01-01", valid_to: "2026-12-31", target_countries: ["India"], is_active: true, auto_detected: false },
];