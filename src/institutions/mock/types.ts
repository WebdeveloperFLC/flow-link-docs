export interface MockAgreement {
  id: string;
  institution_id: string;
  title: string;
  agreement_type: string;
  status: string;
  valid_from: string | null;
  valid_to: string | null;
  renewal_reminder_days: number;
  extracted_data: Record<string, any>;
  notes: string;
}

export interface MockCommission {
  id: string;
  institution_id: string;
  agreement_id: string | null;
  name: string;
  model_type: string;
  currency: string;
  is_active: boolean;
  is_proposed: boolean;
  base_rate_percent: number;
  payout_basis: string;
  payment_timing: string;
  tax_treatment: string;
}

export interface MockCommissionRule {
  id: string;
  commission_id: string;
  rule_name: string;
  rule_type: string;
  payout_amount: number;
  payout_type: "percentage" | "fixed" | "multiplier";
  payout_currency: string;
  condition_field?: string;
  condition_operator?: string;
  condition_value?: string;
  min_value?: number;
  max_value?: number;
}

export interface MockClaimCycle {
  id: string;
  institution_id: string;
  period_label: string;
  intake: string;
  status: "open" | "submitted" | "partially_paid" | "closed" | "disputed";
  claim_due_date: string | null;
  invoice_due_date: string | null;
  total_expected: number;
  total_received: number;
  currency: string;
}

export interface MockInvoice {
  id: string;
  institution_id: string;
  claim_cycle_id: string | null;
  invoice_no: string;
  amount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "partially_paid" | "overdue" | "disputed" | "void";
  sent_at?: string;
  paid_at?: string;
}

export interface MockPromotion {
  id: string;
  institution_id: string;
  title: string;
  promo_type: string;
  valid_from: string | null;
  valid_to: string | null;
  target_countries: string[];
  is_active: boolean;
  auto_detected: boolean;
}

export interface MockStudent {
  id: string;
  institution_id: string;
  claim_cycle_id: string | null;
  full_name: string;
  country: string;
  intake_original: string;
  intake_processed: string;
  program: string;
  tuition: number;
  currency: string;
  status:
    | "eligible"
    | "pending_dues"
    | "deferred"
    | "withdrawn"
    | "missing_consent"
    | "carried_forward";
  carry_forward_from?: string | null;
  block_reason?: string | null;
}

export interface MockCampaign {
  id: string;
  institution_id: string | null;
  name: string;
  period_from: string;
  period_to: string;
  is_active: boolean;
  bonus_logic: string;
  target_countries: string[];
  eligible_institutions: string[];
  promotion_ids: string[];
  claim_impact: string;
  renewal_impact: string;
  channel: string;
}

export interface MockSource {
  id: string;
  institution_id: string;
  source_type: string;
  name: string;
  url: string | null;
  uploaded_at: string;
  confidence_score: number;
  status: "queued" | "running" | "completed" | "failed";
  linked_agreement_id?: string | null;
}

export interface MockSuggestion {
  id: string;
  institution_id: string;
  suggestion_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  confidence: number;
  status: "pending" | "accepted" | "dismissed" | "deferred";
  affected_record?: string | null;
}

export interface MockPayment {
  id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  method: string;
  proof_path?: string | null;
}