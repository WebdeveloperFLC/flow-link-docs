import { describe, expect, it } from "vitest";
import { splitServiceTitle, stripCountryPrefix } from "@/lib/service-library/serviceDisplayLabels";

describe("stripCountryPrefix", () => {
  it("removes country prefix when browsing within that country", () => {
    expect(
      stripCountryPrefix("Canada – BOWP (Bridging Open Work Permit)", "Canada"),
    ).toBe("BOWP (Bridging Open Work Permit)");
  });

  it("handles hyphen separators", () => {
    expect(stripCountryPrefix("United Kingdom - Student Visa", "United Kingdom")).toBe("Student Visa");
  });

  it("leaves label unchanged when country does not match", () => {
    expect(stripCountryPrefix("Canada – BOWP", "Australia")).toBe("Canada – BOWP");
  });
});

describe("splitServiceTitle", () => {
  it("splits display title using active country context", () => {
    expect(splitServiceTitle("Canada – BOWP (Bridging Open Work Permit)", "Canada")).toEqual({
      country: "Canada",
      name: "BOWP (Bridging Open Work Permit)",
    });
  });

  it("parses country from en-dash when no context country", () => {
    expect(splitServiceTitle("Australia – Student Visa")).toEqual({
      country: "Australia",
      name: "Student Visa",
    });
  });
});
