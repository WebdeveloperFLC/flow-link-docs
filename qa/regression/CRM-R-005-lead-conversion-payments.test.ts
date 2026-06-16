import { describe, expect, it } from "vitest";
import { paymentStatusLabel } from "@/lib/paymentApprovers";
import { isStudentServiceCode, selectionHasStudentServices } from "@/lib/studentServices";

describe("paymentStatusLabel", () => {
  it("maps awaiting_verification to Pending Verification", () => {
    expect(paymentStatusLabel("awaiting_verification")).toBe("Pending Verification");
  });

  it("maps verified to Confirmed", () => {
    expect(paymentStatusLabel("verified")).toBe("Confirmed");
  });
});

describe("studentServices", () => {
  it("detects student visa codes", () => {
    expect(isStudentServiceCode("CANADA_STUDENT_VISA", "Canada Student Visa")).toBe(true);
    expect(isStudentServiceCode("VISITOR_VISA", "Visitor Visa")).toBe(false);
  });

  it("selectionHasStudentServices checks visa array", () => {
    expect(
      selectionHasStudentServices(
        { visa_services: ["b2000001-0001-4000-8000-000000000031::USA"] },
        new Map([["b2000001-0001-4000-8000-000000000031::USA", "USA Student Visa"]]),
      ),
    ).toBe(true);
    expect(selectionHasStudentServices({ visa_services: ["VISITOR"] }, new Map([["VISITOR", "Visitor Visa"]]))).toBe(
      false,
    );
  });
});

describe("prefillFromLead journey fields", () => {
  it("includes lead_source from lead", async () => {
    const { prefillFromLead } = await import("@/lib/clientRegistration");
    const draft = prefillFromLead({
      id: "l1",
      lead_number: "L-1",
      lead_type: "warm",
      status: "new",
      first_name: "A",
      last_name: "B",
      coaching_services: [],
      visa_services: [],
      admission_services: [],
      allied_services: [],
      interested_countries: [],
      visa_locked: false,
      lead_temperature: "warm",
      is_cold_pool: false,
      notes_locked: false,
      created_at: "",
      updated_at: "",
      lead_source: "Referral",
    });
    expect(draft.lead_source).toBe("Referral");
  });
});
