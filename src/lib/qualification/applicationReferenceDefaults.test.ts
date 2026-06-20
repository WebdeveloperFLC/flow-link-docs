import { describe, expect, it } from "vitest";
import { getDefaultReferenceTypes } from "./applicationReferenceDefaults";

describe("getDefaultReferenceTypes", () => {
  it("returns Canada defaults", () => {
    expect(getDefaultReferenceTypes("Canada")).toEqual([
      "Application ID",
      "Student ID",
      "Offer/LOA Number",
      "Portal ID",
    ]);
  });

  it("returns USA defaults", () => {
    expect(getDefaultReferenceTypes("United States")).toEqual([
      "Application ID",
      "Student ID",
      "I-20 Number",
      "SEVIS ID",
      "Portal ID",
    ]);
  });

  it("returns UK defaults", () => {
    expect(getDefaultReferenceTypes("UK")).toContain("CAS Number");
  });

  it("returns Australia defaults", () => {
    expect(getDefaultReferenceTypes("Australia")).toContain("CoE Number");
  });

  it("returns Germany defaults", () => {
    expect(getDefaultReferenceTypes("Germany")).toContain("Admission Number");
  });

  it("returns Ireland defaults", () => {
    expect(getDefaultReferenceTypes("Ireland")).toEqual([
      "Application ID",
      "Student ID",
      "Offer Number",
    ]);
  });

  it("returns France defaults", () => {
    expect(getDefaultReferenceTypes("France")).toContain("Campus France Reference");
  });

  it("falls back to generic defaults for unknown countries", () => {
    expect(getDefaultReferenceTypes("Singapore")).toEqual([
      "Application ID",
      "Student ID",
      "Portal ID",
    ]);
  });
});
