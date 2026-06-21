import { describe, expect, it } from "vitest";
import { buildEnrichedRequirements, computeCaseDocumentProgress } from "./buildEnrichedRequirements";
import type { ApplicationDocumentRequirement } from "./types";
import type { WorkflowDocument } from "./workflowDocument";

const baseReq = (overrides: Partial<ApplicationDocumentRequirement>): ApplicationDocumentRequirement => ({
  id: "req-1",
  client_service_case_id: "case-1",
  client_id: "client-1",
  source: "template",
  template_item_id: "t1",
  workflow_template_id: "wt-1",
  master_item_code: "passport",
  display_name: "Passport",
  mandatory: true,
  requirement_kind: "document",
  section_key: "identity",
  section_label: "Identity",
  display_group: null,
  party_scope: "applicant",
  person_id: null,
  is_suppressed: false,
  notes: null,
  sort_order: 10,
  ...overrides,
});

const baseDoc = (overrides: Partial<WorkflowDocument>): WorkflowDocument => ({
  id: "doc-1",
  client_id: "client-1",
  case_id: "case-1",
  document_type: "Passport",
  custom_type: "Passport",
  master_item_code: "passport",
  file_name: "Passport.pdf",
  storage_path: "c/Passport.pdf",
  mime_type: "application/pdf",
  size_bytes: 1000,
  status: "uploaded",
  version: 1,
  is_active_version: true,
  is_shared: false,
  section_id: null,
  uploaded_at: new Date().toISOString(),
  deleted_at: null,
  person_id: null,
  ...overrides,
});

describe("documentWorkflow matching", () => {
  it("matches by master_item_code and computes progress", () => {
    const reqs = [baseReq({}), baseReq({ id: "req-2", master_item_code: "ielts_language_test", display_name: "IELTS", mandatory: true })];
    const docs = [baseDoc({})];
    const labels = new Map([["passport", "Passport"], ["ielts_language_test", "IELTS"]]);
    const enriched = buildEnrichedRequirements(reqs, docs, labels);
    const progress = computeCaseDocumentProgress(enriched);
    expect(enriched[0].displayStatus).toBe("uploaded");
    expect(enriched[1].displayStatus).toBe("missing");
    expect(progress.required).toBe(2);
    expect(progress.uploaded).toBe(1);
    expect(progress.missing).toBe(1);
    expect(progress.completionPct).toBe(50);
  });
});
