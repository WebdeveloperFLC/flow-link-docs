import { describe, expect, it } from "vitest";
import {
  buildInstitutionOfficialResourcesPatch,
  mapPipelineToKnowledgeStatus,
  officialResourcesFromStagingRow,
  readInstitutionOfficialResources,
} from "./officialResources";
import type { UpiCourseStaging, UpiInstitution } from "../types/upi";

function inst(partial: Partial<UpiInstitution> = {}): UpiInstitution {
  return {
    id: "inst-1",
    name: "Test U",
    metadata: {},
    ...partial,
  } as UpiInstitution;
}

function row(partial: Partial<UpiCourseStaging> & { id: string }): UpiCourseStaging {
  return {
    course_title: "MBA",
    review_status: "pending_review",
    metadata: {},
    ...partial,
  } as UpiCourseStaging;
}

describe("readInstitutionOfficialResources", () => {
  it("reads columns and metadata.official_resources", () => {
    const resources = readInstitutionOfficialResources(
      inst({
        website_url: "https://example.edu",
        application_portal_url: "https://example.edu/apply",
        metadata: {
          official_resources: {
            program_listing_url: "https://example.edu/programs",
            last_verified_at: "2026-01-15T00:00:00.000Z",
          },
        },
      }),
    );
    expect(resources.websiteUrl).toBe("https://example.edu");
    expect(resources.programListingUrl).toBe("https://example.edu/programs");
    expect(resources.admissionPageUrl).toBe("https://example.edu/apply");
    expect(resources.lastVerifiedAt).toBe("2026-01-15T00:00:00.000Z");
  });
});

describe("buildInstitutionOfficialResourcesPatch", () => {
  it("writes metadata keys without new columns", () => {
    const base = inst({ metadata: { foo: "bar" } });
    const patch = buildInstitutionOfficialResourcesPatch(base, {
      scholarshipPageUrl: "https://example.edu/scholarships",
    });
    expect((patch.metadata as any).foo).toBe("bar");
    expect((patch.metadata as any).official_resources.scholarship_page_url).toBe(
      "https://example.edu/scholarships",
    );
  });
});

describe("officialResourcesFromStagingRow", () => {
  it("prefers program_url and metadata apply_url", () => {
    const links = officialResourcesFromStagingRow(
      row({
        id: "r1",
        program_url: "https://example.edu/mba",
        metadata: { apply_url: "https://example.edu/apply-mba" },
      }),
    );
    expect(links.programUrl).toBe("https://example.edu/mba");
    expect(links.admissionUrl).toBe("https://example.edu/apply-mba");
  });
});

describe("mapPipelineToKnowledgeStatus", () => {
  it("maps pipeline statuses to inbox labels", () => {
    expect(mapPipelineToKnowledgeStatus("approved")).toBe("Published");
    expect(mapPipelineToKnowledgeStatus("extracted")).toBe("Extracted");
    expect(mapPipelineToKnowledgeStatus("needs_review")).toBe("Needs Approval");
    expect(mapPipelineToKnowledgeStatus(null)).toBe("Pending AI Review");
  });
});
