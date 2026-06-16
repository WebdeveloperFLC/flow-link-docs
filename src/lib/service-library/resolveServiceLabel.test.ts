import { describe, expect, it } from "vitest";
import type { ServiceCatalogueItem } from "@/lib/leads";
import {
  buildServiceLabelMap,
  findCatalogueItemForStoredCode,
  isUuidServiceCode,
  parseStoredServiceCode,
  resolveServiceLabelSync,
} from "@/lib/service-library/resolveServiceLabel";

const LIB_ID = "a1111111-1111-4111-8111-111111111111";
const VARIANT_CODE = `${LIB_ID}::Canada::express`;
const PARENT_CODE = `${LIB_ID}::Canada`;

function mockCatalogue(): ServiceCatalogueItem[] {
  return [
    {
      id: VARIANT_CODE,
      service_code: VARIANT_CODE,
      library_id: LIB_ID,
      service_name: "Canada Study Permit – Express Entry",
      master_key: "visa_immigration",
      country_tag: "Canada",
      fee_inr: 50000,
      pricing_type: "FIXED",
    } as ServiceCatalogueItem,
  ];
}

describe("resolveServiceLabel", () => {
  it("parses variant stored codes", () => {
    const parsed = parseStoredServiceCode(VARIANT_CODE);
    expect(parsed.libraryId).toBe(LIB_ID);
    expect(parsed.country).toBe("Canada");
    expect(parsed.variantKey).toBe("express");
  });

  it("detects UUID-based stored codes", () => {
    expect(isUuidServiceCode(VARIANT_CODE)).toBe(true);
    expect(isUuidServiceCode("study_visa_canada")).toBe(false);
  });

  it("finds catalogue row for variant code", () => {
    const item = findCatalogueItemForStoredCode(VARIANT_CODE, mockCatalogue());
    expect(item?.service_name).toBe("Canada Study Permit – Express Entry");
  });

  it("resolves human label instead of raw UUID code", () => {
    const label = resolveServiceLabelSync(VARIANT_CODE, mockCatalogue());
    expect(label).toBe("Canada Study Permit – Express Entry");
    expect(label).not.toContain(LIB_ID);
  });

  it("buildServiceLabelMap resolves all codes", () => {
    const map = buildServiceLabelMap([VARIANT_CODE, PARENT_CODE], mockCatalogue());
    expect(map.get(VARIANT_CODE)).toBe("Canada Study Permit – Express Entry");
    expect(map.get(PARENT_CODE)).not.toBe(PARENT_CODE);
  });
});
