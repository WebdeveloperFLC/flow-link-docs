import { describe, expect, it } from "vitest";
import {
  clientToProfilePatch,
  mergeProfileFillEmpty,
} from "@/lib/clientProfileSync";

describe("clientToProfilePatch", () => {
  it("maps registration identity fields to client_profile columns", () => {
    const patch = clientToProfilePatch({
      date_of_birth: "2000-01-15",
      gender: "Male",
      marital_status: "Single",
      country_of_citizenship: "India",
      passport_number: "Z1234567",
      passport_expiry: "2030-12-31",
    });
    expect(patch).toEqual({
      date_of_birth: "2000-01-15",
      gender: "Male",
      marital_status: "Single",
      nationality: "India",
      passport_number: "Z1234567",
      passport_expiry: "2030-12-31",
    });
  });

  it("includes spouse name from family member", () => {
    expect(clientToProfilePatch({}, "Jane Doe").spouse_name).toBe("Jane Doe");
  });

  it("extracts graduation year from date-shaped year_of_passing", () => {
    expect(clientToProfilePatch({ year_of_passing: "2024-06-30" }).graduation_year).toBe(2024);
  });
});

describe("mergeProfileFillEmpty", () => {
  it("fills only empty profile fields", () => {
    const merged = mergeProfileFillEmpty(
      { gender: "Female", nationality: null },
      { gender: "Male", nationality: "India", date_of_birth: "2000-01-01" },
    );
    expect(merged).toEqual({
      nationality: "India",
      date_of_birth: "2000-01-01",
    });
  });
});
