import { describe, expect, it } from "vitest";
import { filterDocumentTypesForAdd } from "./documentTypeFilterPipeline";
import { scoreDocumentTypeMatch } from "./searchDocumentTypes";
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
    expect(scoreDocumentTypeMatch(items[0], "pcc", "general")).toBeGreaterThan(0);
    expect(
      filterDocumentTypesForAdd(items, "marriage", new Set(), null, null).some(
        (i) => i.code === "passport",
      ),
    ).toBe(false);
  });

  it("excludes already-added codes", () => {
    const items = [item("passport", "Passport"), item("photograph", "Photograph")];
    const filtered = filterDocumentTypesForAdd(items, "photo", new Set(["photograph"]), null, null);
    expect(filtered.some((i) => i.code === "photograph")).toBe(false);
  });

  it("matches category name in search", () => {
    const items = [item("marksheet_12", "12th Marksheet"), item("passport", "Passport")];
    const filtered = filterDocumentTypesForAdd(items, "academic", new Set(), null, null);
    expect(filtered.some((i) => i.code === "marksheet_12")).toBe(true);
    expect(filtered.some((i) => i.code === "passport")).toBe(false);
  });
});
