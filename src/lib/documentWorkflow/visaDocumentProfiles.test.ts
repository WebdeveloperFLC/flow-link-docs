import { describe, expect, it } from "vitest";
import {
  buildProfileDocumentPlan,
  getProfileDefaultDocuments,
  getSuggestedDocuments,
  resolveVisaProfile,
} from "./visaDocumentProfiles";

const CATALOGUE = new Set([
  "passport",
  "photograph",
  "visa_forms",
  "academic_transcripts",
  "ielts_language_test",
  "offer_letter",
  "financial_documents",
  "sop",
  "marriage_certificate",
  "sponsorship_letter",
  "affidavit_of_support",
  "coe",
  "oshc_policy",
]);

describe("visaDocumentProfiles", () => {
  it("resolves Australia student profile", () => {
    expect(
      resolveVisaProfile({
        templateName: "Australia – Student Visa (Subclass 500)",
        serviceCode: "b2000001::Australia",
      }),
    ).toBe("student_visa");
  });

  it("student defaults include SOP and country additions for Australia", () => {
    const docs = getProfileDefaultDocuments("student_visa", {
      templateName: "Australia Student Visa",
      country: "Australia",
    }).map((d) => d.code);
    expect(docs).toContain("passport");
    expect(docs).toContain("sop");
    expect(docs).toContain("coe");
    expect(docs).toContain("oshc_policy");
  });

  it("suggests marriage docs when client is married", () => {
    const suggestions = getSuggestedDocuments("visitor_visa", {
      marital_status: "Married",
    }).map((d) => d.code);
    expect(suggestions).toContain("marriage_certificate");
    expect(suggestions).toContain("relationship_proof");
  });

  it("suggests sponsor docs when sponsor present", () => {
    const suggestions = getSuggestedDocuments("student_visa", {
      sponsor: "Father",
    }).map((d) => d.code);
    expect(suggestions).toContain("sponsorship_letter");
    expect(suggestions).toContain("affidavit_of_support");
    expect(suggestions).toContain("financial_documents");
  });

  it("filters plan to catalogue codes only", () => {
    const plan = buildProfileDocumentPlan(
      { templateName: "Australia Student Visa" },
      { marital_status: "Married", sponsor: "Father" },
      CATALOGUE,
    );
    expect(plan.every((d: { code: string }) => CATALOGUE.has(d.code))).toBe(true);
    expect(plan.some((d: { code: string }) => d.code === "relationship_proof")).toBe(false);
  });
});
