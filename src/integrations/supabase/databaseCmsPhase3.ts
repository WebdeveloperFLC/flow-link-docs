/**
 * CMS Phase 3A–3D schema — merged into Supabase client until types.ts is regenerated from DB.
 */
import type { Database as DatabaseBase, Json } from "./types";

type ServiceCombinationRow = {
  id: string;
  name: string;
  combination_type: string;
  service_codes: string[];
  branch_id: string | null;
  firm_entity_id: string | null;
  package_price: number | null;
  package_currency: string | null;
  package_discount: number | null;
  custom_profitability: boolean;
  linked_offer_id: string | null;
  linked_incentive_scheme_id: string | null;
  wallet_eligible: boolean;
  wallet_scope_master_key: string | null;
  max_discount_pct: number | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
};

type OfferEligibilityRuleRow = {
  id: string;
  offer_id: string | null;
  audience: string;
  block_if_active_service: boolean;
  evaluate_against: string[];
  scope_service_code: string | null;
  scope_country_tag: string | null;
  scope_master_key: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
};

type AutoApplyPolicyRow = {
  entity_type: string;
  policy: string;
  updated_at: string;
  updated_by: string | null;
};

type CmsPhase3Tables = {
  commercial_autoapply_policy: {
    Row: AutoApplyPolicyRow;
    Insert: {
      entity_type: string;
      policy: string;
      updated_at?: string;
      updated_by?: string | null;
    };
    Update: {
      entity_type?: string;
      policy?: string;
      updated_at?: string;
      updated_by?: string | null;
    };
    Relationships: [];
  };
  offer_eligibility_rules: {
    Row: OfferEligibilityRuleRow;
    Insert: {
      id?: string;
      offer_id?: string | null;
      audience?: string;
      block_if_active_service?: boolean;
      evaluate_against?: string[];
      scope_service_code?: string | null;
      scope_country_tag?: string | null;
      scope_master_key?: string | null;
      is_active?: boolean;
      notes?: string | null;
      created_at?: string;
      created_by?: string | null;
      updated_at?: string;
    };
    Update: {
      id?: string;
      offer_id?: string | null;
      audience?: string;
      block_if_active_service?: boolean;
      evaluate_against?: string[];
      scope_service_code?: string | null;
      scope_country_tag?: string | null;
      scope_master_key?: string | null;
      is_active?: boolean;
      notes?: string | null;
      created_at?: string;
      created_by?: string | null;
      updated_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: "offer_eligibility_rules_offer_id_fkey";
        columns: ["offer_id"];
        isOneToOne: false;
        referencedRelation: "offers";
        referencedColumns: ["id"];
      },
    ];
  };
  service_combinations: {
    Row: ServiceCombinationRow;
    Insert: {
      id?: string;
      name: string;
      combination_type?: string;
      service_codes?: string[];
      branch_id?: string | null;
      firm_entity_id?: string | null;
      package_price?: number | null;
      package_currency?: string | null;
      package_discount?: number | null;
      custom_profitability?: boolean;
      linked_offer_id?: string | null;
      linked_incentive_scheme_id?: string | null;
      wallet_eligible?: boolean;
      wallet_scope_master_key?: string | null;
      max_discount_pct?: number | null;
      is_active?: boolean;
      created_at?: string;
      created_by?: string | null;
      updated_at?: string;
    };
    Update: {
      id?: string;
      name?: string;
      combination_type?: string;
      service_codes?: string[];
      branch_id?: string | null;
      firm_entity_id?: string | null;
      package_price?: number | null;
      package_currency?: string | null;
      package_discount?: number | null;
      custom_profitability?: boolean;
      linked_offer_id?: string | null;
      linked_incentive_scheme_id?: string | null;
      wallet_eligible?: boolean;
      wallet_scope_master_key?: string | null;
      max_discount_pct?: number | null;
      is_active?: boolean;
      created_at?: string;
      created_by?: string | null;
      updated_at?: string;
    };
    Relationships: [];
  };
};

type CmsPhase3Functions = {
  fn_commercial_profitability: {
    Args: {
      _period_key: string;
      _group_by?: string;
      _branch_id?: string | null;
      _limit?: number;
    };
    Returns: {
      dimension: string;
      group_key: string;
      group_label: string;
      revenue_inr: number;
      discount_inr: number;
      incentive_inr: number;
      commission_inr: number;
      net_inr: number;
      net_margin_pct: number;
    }[];
  };
  fn_crm_integration_health: {
    Args: Record<string, never>;
    Returns: Json;
  };
  fn_resolve_combination: {
    Args: {
      _combination_id: string;
      _client_id?: string | null;
    };
    Returns: Json;
  };
};

type BaseOffers = DatabaseBase["public"]["Tables"]["offers"];

export type Database = Omit<DatabaseBase, "public"> & {
  public: Omit<DatabaseBase["public"], "Tables" | "Functions"> & {
    Tables: DatabaseBase["public"]["Tables"] &
      CmsPhase3Tables & {
        offers: {
          Row: BaseOffers["Row"] & { priority: number; stackable: boolean };
          Insert: BaseOffers["Insert"] & { priority?: number; stackable?: boolean };
          Update: BaseOffers["Update"] & { priority?: number; stackable?: boolean };
          Relationships: BaseOffers["Relationships"];
        };
      };
    Functions: DatabaseBase["public"]["Functions"] & CmsPhase3Functions;
  };
};
