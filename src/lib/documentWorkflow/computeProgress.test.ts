import { describe, expect, it } from "vitest";
import { computeCaseDocumentProgress } from "./buildEnrichedRequirements";
import type { ApplicationDocumentRequirement } from "./types";

const baseReq = (overrides: Partial<ApplicationDocumentRequirement>): ApplicationDocumentRequirement => ({
  id: "req-1",
  client_service_case_id: "case-1",
  client_id: "client-1",
  source: "manual_add",
  template_item_id: null,
  workflow_template_id: null,
  master_item_code: "passport",
  display_name: "Passport",
  mandatory: true,
  requirement_kind: "document",
  section_key: "other",
  section_label: "Other Documents",
  display_group: null,
  party_scope: "applicant",
  person_id: null,
  is_suppressed: false,
  notes: null,
  sort_order: 10,
  ...overrides,
});

describe("computeCaseDocumentProgress", () => {
  it("optional manual add does not change required/missing counts", () => {
    const before = computeCaseDocumentProgress([
      { ...baseReq({}), matchedDocument: null, displayStatus: "missing", anchorId: "a" } as never,
    ]);
    const after = computeCaseDocumentProgress([
      { ...baseReq({}), matchedDocument: null, displayStatus: "missing", anchorId: "a" } as never,
      {
        ...baseReq({ id: "req-2", master_item_code: "wedding_photos", display_name: "Wedding Photos", mandatory: false }),
        matchedDocument: null,
        displayStatus: "missing",
        anchorId: "b",
      } as never,
    ]);
    expect(before.required).toBe(1);
    expect(after.required).toBe(1);
    expect(after.missing).toBe(1);
    expect(after.completionPct).toBe(0);
  });

  it("required manual add increases required and missing", () => {
    const after = computeCaseDocumentProgress([
      {
        ...baseReq({ mandatory: true }),
        matchedDocument: null,
        displayStatus: "missing",
        anchorId: "a",
      } as never,
      {
        ...baseReq({ id: "req-2", master_item_code: "pcc", display_name: "PCC", mandatory: true }),
        matchedDocument: null,
        displayStatus: "missing",
        anchorId: "b",
      } as never,
    ]);
    expect(after.required).toBe(2);
    expect(after.missing).toBe(2);
    expect(after.completionPct).toBe(0);
  });
});
