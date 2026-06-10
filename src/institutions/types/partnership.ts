export type PartnershipChannelType = "direct" | "indirect" | "student_direct";
export type PartnershipRouteStatus = "draft" | "active" | "expired" | "suspended";
export type CatalogStatus = "promoted" | "hidden" | "archived";
export type CommissionModel = "percentage" | "fixed" | "slab";

/** Volume-based commission tier (e.g. 1–4 students → $900). */
export interface CommissionSlab {
  min_students: number;
  /** null = open-ended (e.g. 9 and more). */
  max_students: number | null;
  amount: number;
}

export interface UpiAggregator {
  id: string;
  name: string;
  short_code: string | null;
  is_active: boolean;
  countries_served: string[] | null;
  website_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  default_portal_url: string | null;
  default_payment_terms: string | null;
  default_currency: string | null;
  notes: string | null;
}

export interface UpiPartnershipRoute {
  id: string;
  institution_id: string;
  channel_type: PartnershipChannelType;
  aggregator_id: string | null;
  route_code: string | null;
  display_name: string;
  status: PartnershipRouteStatus;
  valid_from: string | null;
  valid_to: string | null;
  intakes_covered: string[] | null;
  program_levels_covered: string[] | null;
  application_portal_url: string | null;
  aggregator_institution_code: string | null;
  is_default_route: boolean;
  priority_rank: number;
  commission_model: CommissionModel | string | null;
  commission_rate: number | null;
  commission_slabs: CommissionSlab[] | null;
  commission_currency: string | null;
  bonus_notes: string | null;
  payment_terms: string | null;
  estimated_payout_days: number | null;
  processing_sla_days: number | null;
  application_fee: number | null;
  application_fee_waiver: boolean;
  application_fee_waiver_from: string | null;
  application_fee_waiver_to: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  aggregator?: UpiAggregator | null;
}

export interface RouteCompareInput {
  tuition?: number;
  intake?: string;
  /** YTD enrolled students for slab commission estimate. */
  studentCount?: number;
}

export interface RouteCompareScore {
  route: UpiPartnershipRoute;
  score: number;
  rank: number;
  commissionEstimate: number | null;
}
