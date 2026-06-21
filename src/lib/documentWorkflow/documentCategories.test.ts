import { describe, expect, it } from "vitest";
import { resolveDocumentCategory, formatDocumentWithCategory } from "./documentCategories";
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

describe("documentCategories", () => {
  it("classifies relationship and academic labels", () => {
    expect(resolveDocumentCategory(item("marriage_certificate", "Marriage Certificate"))).toBe("relationship");
    expect(resolveDocumentCategory(item("marksheet_10", "10th Marksheet"))).toBe("academic");
    expect(formatDocumentWithCategory(item("police_clearance", "Police Clearance Certificate"))).toContain("(Police)");
  });
});
