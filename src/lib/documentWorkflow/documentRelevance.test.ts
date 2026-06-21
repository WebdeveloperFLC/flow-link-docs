import { describe, expect, it } from "vitest";
import { filterDocumentTypesForSearch } from "./searchDocumentTypes";
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

  it("hides academic for spouse visa until search", () => {
    const spouseDefault = filterDocumentTypesForSearch(
      items,
      "",
      new Set(),
      "canada::spouse",
      "Canada - Spouse / Dependent Visitor Visa",
    );
    expect(spouseDefault.some((i) => i.code === "marksheet_10")).toBe(false);
    expect(spouseDefault.some((i) => i.code === "marriage_certificate")).toBe(true);

    const spouseSearch = filterDocumentTypesForSearch(
      items,
      "10th",
      new Set(),
      "canada::spouse",
      "Canada - Spouse / Dependent Visitor Visa",
    );
    expect(spouseSearch.some((i) => i.code === "marksheet_10")).toBe(true);
  });
});
