import { describe, expect, it } from "vitest";
import { prefillFromLead } from "@/lib/clientRegistration";
import type { Lead } from "@/lib/leads";

const baseLead: Lead = {
  id: "lead-1",
  lead_number: "L-001",
  lead_type: "warm",
  status: "new",
  first_name: "Pooja",
  last_name: "Patel",
  coaching_services: [],
  visa_services: [],
  admission_services: [],
  allied_services: [],
  interested_countries: ["Canada"],
  visa_locked: false,
  lead_temperature: "warm",
  is_cold_pool: false,
  notes_locked: false,
  created_at: "",
  updated_at: "",
};

describe("prefillFromLead budget", () => {
  it("copies journey budget fields and legacy budget scalar on conversion", () => {
    const draft = prefillFromLead({
      ...baseLead,
      has_budget: "yes",
      budget_currency: "USD",
      budget_min: 1000000,
      budget_max: 150000,
    });
    expect(draft.has_budget).toBe("yes");
    expect(draft.budget_currency).toBe("USD");
    expect(draft.budget_min).toBe(1000000);
    expect(draft.budget_max).toBe(150000);
    expect(draft.budget).toBe(150000);
  });

  it("does not set legacy budget when has_budget is not yes", () => {
    const draft = prefillFromLead({
      ...baseLead,
      has_budget: "no",
      budget_min: 50000,
    });
    expect(draft.budget).toBeNull();
  });
});
