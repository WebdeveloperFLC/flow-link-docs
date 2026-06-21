import { describe, expect, it } from "vitest";
import {
  filterDocumentTypesForAdd,
  inspectDocumentTypeFilterPipeline,
} from "./documentTypeFilterPipeline";
import type { MasterItem } from "@/lib/masters";

const item = (code: string, label: string): MasterItem => ({
  id: code,
  list_key: "document_types",
  code,
  label,
  metadata: {},
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
      new Set(),
      "canada::spouse",
      "Canada - Spouse / Dependent Visitor Visa",
    );
    expect(counts.masterActiveTotal).toBe(5);
    expect(counts.afterExcluded).toBe(5);
    expect(counts.afterRelevance).toBe(5);
    expect(counts.afterSearch).toBe(5);
    expect(counts.profile).toBe("spouse_dependent");
  });

  it("ranks relationship first but does not hide academic", () => {
    const results = filterDocumentTypesForAdd(
      catalog,
      "",
      new Set(),
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
    expect(counts.hiddenBySearch.sort()).toEqual(
      ["marksheet_12", "passport", "police_clearance", "marriage_certificate"].sort(),
    );
  });

  it("excludes codes already on the case checklist", () => {
    const counts = inspectDocumentTypeFilterPipeline(
      catalog,
      "",
      new Set(["passport", "marriage_certificate"]),
      null,
      null,
    );
    expect(counts.afterExcluded).toBe(3);
    expect(counts.hiddenByExcluded.sort()).toEqual(["passport", "marriage_certificate"].sort());
  });
});
