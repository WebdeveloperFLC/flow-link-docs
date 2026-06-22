import { describe, expect, it } from "vitest";
import { resolveProfileTypeFromLibrarySlug, resolveServiceDocumentProfile } from "./resolveServiceDocumentProfile";
import {
  buildDefaultDocumentPlan,
  buildSuggestedDocumentPlan,
  getProfileDefaultDocuments,
  getSuggestedDocuments,
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
  "relationship_proof",
  "principal_status_document",
  "sponsorship_letter",
  "affidavit_of_support",
  "coe",
  "oshc_policy",
  "cas_letter",
  "gic_certificate",
]);

describe("resolveServiceDocumentProfile", () => {
  it("resolves Canada spouse dependent extension from library slug", () => {
    const profile = resolveServiceDocumentProfile(
      "b2000001-0001-4000-8000-00000000001f::Canada",
    );
    expect(profile.profileType).toBe("spouse_dependent");
    expect(profile.country).toBe("Canada");
    expect(profile.librarySlug).toBe("canada-spouse-dependent-extension");
  });

  it("resolves Australia student from library slug", () => {
    const profile = resolveServiceDocumentProfile(
      "b2000001-0001-4000-8000-000000000041::Australia",
    );
    expect(profile.profileType).toBe("student_visa");
    expect(profile.country).toBe("Australia");
  });
});

describe("resolveProfileTypeFromLibrarySlug", () => {
  it("maps spouse slug before visitor", () => {
    expect(resolveProfileTypeFromLibrarySlug("canada-spouse-dependent-visitor")).toBe(
      "spouse_dependent",
    );
  });
});

describe("visaDocumentProfiles", () => {
  it("student defaults include country overrides for Australia", () => {
    const docs = getProfileDefaultDocuments("student_visa", { country: "Australia" }).map(
      (d) => d.code,
    );
    expect(docs).toContain("sop");
    expect(docs).toContain("coe");
    expect(docs).toContain("oshc_policy");
  });

  it("spouse dependent defaults include relationship docs", () => {
    const docs = getProfileDefaultDocuments("spouse_dependent", { country: "Canada" }).map(
      (d) => d.code,
    );
    expect(docs).toContain("marriage_certificate");
    expect(docs).toContain("relationship_proof");
    expect(docs).toContain("principal_status_document");
  });

  it("suggestions are separate from defaults", () => {
    const suggestions = getSuggestedDocuments("visitor_visa", {
      marital_status: "Married",
    }).map((d) => d.code);
    expect(suggestions).toContain("marriage_certificate");
    const defaults = getProfileDefaultDocuments("visitor_visa", { country: "Canada" }).map(
      (d) => d.code,
    );
    expect(defaults).not.toContain("marriage_certificate");
  });

  it("buildSuggestedDocumentPlan excludes existing requirements", () => {
    const plan = buildSuggestedDocumentPlan(
      { profileType: "visitor_visa", country: "Canada" },
      { marital_status: "Married" },
      CATALOGUE,
      new Set(["marriage_certificate"]),
    );
    expect(plan.some((d) => d.code === "marriage_certificate")).toBe(false);
    expect(plan.some((d) => d.code === "relationship_proof")).toBe(true);
  });

  it("buildDefaultDocumentPlan filters to catalogue only", () => {
    const plan = buildDefaultDocumentPlan(
      { profileType: "student_visa", country: "Australia" },
      CATALOGUE,
    );
    expect(plan.every((d) => CATALOGUE.has(d.code))).toBe(true);
  });
});
