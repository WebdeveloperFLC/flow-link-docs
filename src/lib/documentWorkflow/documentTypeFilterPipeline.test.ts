import { describe, expect, it } from "vitest";
import {
  filterDocumentTypesForAdd,
  groupDocumentTypesByCategory,
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
    item("marriage_certificate", "Marriage Certificate"),
    item("marksheet_10", "10th Marksheet"),
    item("marksheet_12", "12th Marksheet"),
    item("passport", "Passport"),
    item("police_clearance", "Police Clearance Certificate"),
  ];

  it("keeps all active types after relevance (sort-only)", () => {
    const counts = inspectDocumentTypeFilterPipeline(
      catalog,
      "",
      new Set(["passport"]),
      "canada::spouse",
      "Canada - Spouse / Dependent Visitor Visa",
    );
    expect(counts.masterActiveTotal).toBe(5);
    expect(counts.onChecklistCount).toBe(1);
    expect(counts.afterRelevance).toBe(5);
    expect(counts.afterSearch).toBe(5);
    expect(counts.uiRendered).toBe(5);
    expect(counts.renderedGroupCount).toBeGreaterThan(1);
    expect(counts.profile).toBe("spouse_dependent");
  });

  it("ranks relationship first but does not hide academic", () => {
    const results = filterDocumentTypesForAdd(
      catalog,
      "",
      "canada::spouse",
      "Canada - Spouse / Dependent Visitor Visa",
    );
    expect(results.some((i) => i.code === "marksheet_10")).toBe(true);
    expect(results.some((i) => i.code === "marksheet_12")).toBe(true);
    expect(results[0]?.code).toBe("marriage_certificate");
  });

  it("search filters to matches only", () => {
    const counts = inspectDocumentTypeFilterPipeline(
      catalog,
      "10th",
      new Set(),
      "canada::spouse",
      "Canada - Spouse / Dependent Visitor Visa",
    );
    expect(counts.afterRelevance).toBe(5);
    expect(counts.afterSearch).toBe(1);
    expect(counts.uiRendered).toBe(1);
  });

  it("renders all category groups for large catalogue", () => {
    const large: MasterItem[] = [];
    for (let i = 0; i < 30; i++) large.push(item(`academic_${i}`, `${i}th Marksheet`));
    for (let i = 0; i < 12; i++) large.push(item(`financial_${i}`, `Bank Statement ${i}`, { category: "financial" }));
    for (let i = 0; i < 7; i++) large.push(item(`relationship_${i}`, `Relationship Doc ${i}`));
    for (let i = 0; i < 5; i++) large.push(item(`identity_${i}`, `Identity Doc ${i}`, { category: "identity" }));

    const filtered = filterDocumentTypesForAdd(
      large,
      "",
      "canada::spouse",
      "Canada - Spouse / Dependent Visitor Visa",
    );
    const grouped = groupDocumentTypesByCategory(filtered, "spouse_dependent");
    const counts = inspectDocumentTypeFilterPipeline(
      large,
      "",
      new Set(),
      "canada::spouse",
      "Canada - Spouse / Dependent Visitor Visa",
    );

    expect(filtered.length).toBe(54);
    expect(grouped.length).toBeGreaterThanOrEqual(4);
    expect(counts.uiRendered).toBe(54);
    expect(counts.renderedGroupCount).toBeGreaterThanOrEqual(4);
  });
});
