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