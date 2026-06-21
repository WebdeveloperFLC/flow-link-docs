import { describe, expect, it } from "vitest";
import { filterDocumentTypesForAdd } from "./documentTypeFilterPipeline";
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

describe("document relevance in Add Document", () => {
  const items = [
    item("marriage_certificate", "Marriage Certificate"),
    item("marksheet_10", "10th Marksheet"),
    item("passport", "Passport"),
  ];

  it("shows all types for spouse visa; academic ranked after relationship", () => {
    const spouseDefault = filterDocumentTypesForAdd(
      items,
      "",
      [],
      "canada::spouse",
      "Canada - Spouse / Dependent Visitor Visa",
    );
    expect(spouseDefault.some((i) => i.code === "marksheet_10")).toBe(true);
    expect(spouseDefault.some((i) => i.code === "marriage_certificate")).toBe(true);
    expect(spouseDefault[0]?.code).toBe("marriage_certificate");

    const spouseSearch = filterDocumentTypesForAdd(
      items,
      "10th",
      [],
      "canada::spouse",
      "Canada - Spouse / Dependent Visitor Visa",
    );
    expect(spouseSearch.some((i) => i.code === "marksheet_10")).toBe(true);
    expect(spouseSearch).toHaveLength(1);
  });
});
