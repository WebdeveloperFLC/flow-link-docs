import { describe, expect, it } from "vitest";
import { filterDocumentTypesForSearch, scoreDocumentTypeMatch } from "./searchDocumentTypes";
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

describe("searchDocumentTypes", () => {
  it("matches partial label and alias PCC", () => {
    const items = [
      item("police_clearance", "Police Clearance Certificate"),
      item("passport", "Passport"),
    ];
    expect(scoreDocumentTypeMatch(items[0], "pcc")).toBeGreaterThan(0);
    expect(filterDocumentTypesForSearch(items, "marriage", new Set()).some((i) => i.code === "passport")).toBe(false);
  });

  it("excludes already-added codes", () => {
    const items = [item("passport", "Passport"), item("photograph", "Photograph")];
    const filtered = filterDocumentTypesForSearch(items, "photo", new Set(["photograph"]));
    expect(filtered.some((i) => i.code === "photograph")).toBe(false);
  });
});
