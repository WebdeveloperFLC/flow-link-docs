import { describe, expect, it } from "vitest";
import type { Database } from "./databaseCmsPhase3";

describe("databaseCmsPhase3", () => {
  it("extends client Database with CMS Phase 3 tables", () => {
    type Tables = Database["public"]["Tables"];
    const _combo: Tables["service_combinations"]["Row"] = {
      id: "",
      name: "",
      combination_type: "logical",
      service_codes: [],
      branch_id: null,
      firm_entity_id: null,
      package_price: null,
      package_currency: null,
      package_discount: null,
      custom_profitability: false,
      linked_offer_id: null,
      linked_incentive_scheme_id: null,
      wallet_eligible: true,
      wallet_scope_master_key: null,
      max_discount_pct: null,
      is_active: true,
      created_at: "",
      created_by: null,
      updated_at: "",
    };
    const _rule: Tables["offer_eligibility_rules"]["Row"] = {
      id: "",
      offer_id: null,
      audience: "existing",
      block_if_active_service: true,
      evaluate_against: [],
      scope_service_code: null,
      scope_country_tag: null,
      scope_master_key: null,
      is_active: true,
      notes: null,
      created_at: "",
      created_by: null,
      updated_at: "",
    };
    const _policy: Tables["commercial_autoapply_policy"]["Row"] = {
      entity_type: "service",
      policy: "auto_include",
      updated_at: "",
      updated_by: null,
    };
    expect(_combo.name).toBe("");
    expect(_rule.audience).toBe("existing");
    expect(_policy.policy).toBe("auto_include");
  });

  it("extends offers with priority and stackable", () => {
    type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
    const _priority: OfferRow["priority"] = 0;
    const _stackable: OfferRow["stackable"] = false;
    expect(_priority).toBe(0);
    expect(_stackable).toBe(false);
  });

  it("declares CMS RPC signatures", () => {
    type Fn = Database["public"]["Functions"];
    const _profit: Fn["fn_commercial_profitability"]["Args"] = {
      _period_key: "2026-06",
    };
    const _resolve: Fn["fn_resolve_combination"]["Args"] = {
      _combination_id: "00000000-0000-0000-0000-000000000001",
    };
    expect(_profit._period_key).toBe("2026-06");
    expect(_resolve._combination_id).toContain("0000");
  });
});
