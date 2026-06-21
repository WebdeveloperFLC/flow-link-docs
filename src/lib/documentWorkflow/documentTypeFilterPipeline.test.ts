import { describe, expect, it } from "vitest";
import {
  buildAddDocumentPickerItems,
  inspectDocumentTypeFilterPipeline,
} from "./documentTypeFilterPipeline";
import type { MasterItem } from "@/lib/masters";

const item = (code: string, label: string, meta: Record<string, unknown> = {}): MasterItem => ({
  id: code,
  list_key: "document_types",
  code,
  label,
  metadata: meta,
  is_active: true,
  sort_order: 0,
});

describe("documentTypeFilterPipeline", () => {
  const catalog = [
    item("passport", "Passport"),
    item("marriage_certificate", "Marriage Certificate"),
    item("marksheet_10", "10th Marksheet"),
    item("marksheet_12", "12th Marksheet"),
    item("police_clearance", "Police Clearance Certificate"),
  ];

  const checklist = [
    {
      master_item_code: "valid_passport_bio_page_and_relevant_visa_stamp_",
      display_name: "Valid passport — bio page and relevant visa/stamp pages",
    },
    item("marriage_certificate", "Marriage Certificate"),
  ].map((r) =>
    "master_item_code" in r
      ? r
      : { master_item_code: r.code, display_name: r.label },
  );

  it("excludes duplicate families from default picker", () => {
    const counts = inspectDocumentTypeFilterPipeline(
      catalog,
      "",
      checklist,
      "canada::spouse",
      "Canada - Spouse / Dependent Visitor Visa",
    );
    expect(counts.masterActiveTotal).toBe(5);
    expect(counts.afterExclusion).toBe(3);
    expect(counts.afterDuplicateFiltering).toBe(3);
    expect(counts.uiRendered).toBe(3);
    expect(counts.duplicateFamilyCodes).toContain("passport");
    expect(counts.duplicateFamilyCodes).toContain("marriage_certificate");
  });

  it("shows disabled duplicates when searching", () => {
    const rows = buildAddDocumentPickerItems(catalog, "passport", checklist, "canada::spouse", "Canada - Spouse / Dependent Visitor Visa");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.duplicateFamily).toBe(true);
    expect(rows[0]?.item.code).toBe("passport");
  });

  it("renders all category groups for large catalogue", () => {
    const large: MasterItem[] = [];
    for (let i = 0; i < 30; i++) large.push(item(`academic_${i}`, `${i}th Marksheet`));
    for (let i = 0; i < 12; i++) large.push(item(`financial_${i}`, `Bank Statement ${i}`, { category: "financial" }));
    for (let i = 0; i < 7; i++) large.push(item(`relationship_${i}`, `Relationship Doc ${i}`));
    for (let i = 0; i < 5; i++) large.push(item(`identity_${i}`, `Identity Doc ${i}`, { category: "identity" }));

    const counts = inspectDocumentTypeFilterPipeline(
      large,
      "",
      [],
      "canada::spouse",
      "Canada - Spouse / Dependent Visitor Visa",
    );
    expect(counts.masterActiveTotal).toBe(54);
    expect(counts.afterExclusion).toBe(54);
    expect(counts.uiRendered).toBe(54);
    expect(counts.renderedGroupCount).toBeGreaterThanOrEqual(4);
  });
});
