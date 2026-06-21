import { describe, expect, it } from "vitest";
import {
  buildOccupiedDocumentFamilies,
  isDocumentFamilyOnChecklist,
  resolveDocumentFamily,
} from "./documentFamily";
import type { MasterItem } from "@/lib/masters";

const master = (code: string, label: string): MasterItem => ({
  id: code,
  list_key: "document_types",
  code,
  label,
  metadata: {},
  is_active: true,
  sort_order: 0,
});

describe("documentFamily", () => {
  it("matches template passport slug to master passport family", () => {
    expect(
      resolveDocumentFamily(
        "valid_passport_bio_page_and_relevant_visa_stamp_",
        "Valid passport — bio page and relevant visa/stamp pages",
      ),
    ).toBe("passport");
    expect(resolveDocumentFamily("passport", "Passport")).toBe("passport");
  });

  it("blocks passport manual add when template passport row exists", () => {
    const checklist = [
      {
        master_item_code: "valid_passport_bio_page_and_relevant_visa_stamp_",
        display_name: "Valid passport — bio page and relevant visa/stamp pages",
      },
    ];
    const families = buildOccupiedDocumentFamilies(checklist);
    expect(families.has("passport")).toBe(true);
    expect(isDocumentFamilyOnChecklist(master("passport", "Passport"), families)).toBe(true);
  });

  it("matches photograph template slug to photograph family", () => {
    expect(
      resolveDocumentFamily(
        "passport_size_photographs_per_embassy_online_por",
        "Passport-size photographs per embassy / online portal specifications",
      ),
    ).toBe("photograph");
  });
});
