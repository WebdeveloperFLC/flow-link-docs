import { describe, expect, it } from "vitest";
import { resolveServiceDocumentProfile } from "./resolveServiceDocumentProfile";
import { getProfileDefaultDocuments } from "./visaDocumentProfiles";

describe("Canada Spouse Status Extension defaults", () => {
  it("resolves spouse_dependent profile and seven default codes when catalogue complete", () => {
    const { profileType, country } = resolveServiceDocumentProfile(
      "b2000001-0001-4000-8000-00000000001f::Canada",
    );
    expect(profileType).toBe("spouse_dependent");
    expect(country).toBe("Canada");

    const defaults = getProfileDefaultDocuments(profileType, { country }).map((d) => d.code);
    expect(defaults).toEqual([
      "passport",
      "photograph",
      "visa_forms",
      "marriage_certificate",
      "relationship_proof",
      "principal_status_document",
      "financial_documents",
    ]);
  });
});
