import { describe, expect, it } from "vitest";
import type { MasterItem } from "@/lib/masters";
import {
  citiesForProvinceFromMasters,
  normalizeCityLabel,
  normalizeMasterProvinceCode,
  provincesForCountryFromMasters,
  resolveCityLabel,
  resolveProvinceFromMasters,
  shouldPreferGeoProvinces,
} from "@/lib/locationCascade";

const INDIAN_PROVINCES: MasterItem[] = [
  {
    id: "p-mh",
    list_key: "location_provinces",
    code: "IN-MH",
    label: "Maharashtra",
    metadata: { country: "India", country_code: "IN" },
    is_active: true,
    sort_order: 240,
  },
  {
    id: "p-cg",
    list_key: "location_provinces",
    code: "IN-CG",
    label: "Chhattisgarh",
    metadata: { country: "India", country_code: "IN" },
    is_active: true,
    sort_order: 150,
  },
  {
    id: "p-hr",
    list_key: "location_provinces",
    code: "IN-HR",
    label: "Haryana",
    metadata: { country: "India", country_code: "IN" },
    is_active: true,
    sort_order: 180,
  },
];

const INDIAN_CITIES: MasterItem[] = [
  {
    id: "c-mumbai",
    list_key: "location_cities",
    code: "IN-MH-mumbai",
    label: "Mumbai",
    metadata: { country: "India", province_code: "IN-MH" },
    is_active: true,
    sort_order: 1059,
  },
  {
    id: "c-gurugram",
    list_key: "location_cities",
    code: "IN-HR-gurugram",
    label: "Gurugram",
    metadata: { country: "India", province_code: "IN-HR" },
    is_active: true,
    sort_order: 1031,
  },
];

describe("locationCascade", () => {
  it("resolves Maharashtra by master province code", () => {
    const resolved = resolveProvinceFromMasters(INDIAN_PROVINCES, "India", undefined, "IN-MH");
    expect(resolved).toEqual({ code: "IN-MH", label: "Maharashtra" });
  });

  it("maps legacy geo Chhattisgarh code IN-CT to master IN-CG", () => {
    expect(normalizeMasterProvinceCode("IN-CT")).toBe("IN-CG");
    const resolved = resolveProvinceFromMasters(INDIAN_PROVINCES, "India", undefined, "IN-CT");
    expect(resolved?.code).toBe("IN-CG");
    expect(resolved?.label).toBe("Chhattisgarh");
  });

  it("resolves Chhattisgarh by state label", () => {
    const resolved = resolveProvinceFromMasters(INDIAN_PROVINCES, "India", "Chhattisgarh", undefined);
    expect(resolved?.code).toBe("IN-CG");
  });

  it("lists Mumbai for IN-MH province", () => {
    const cities = citiesForProvinceFromMasters(INDIAN_CITIES, "IN-MH");
    expect(cities.map((c) => c.label)).toContain("Mumbai");
  });

  it("normalizes Gurgaon to Gurugram and resolves in city list", () => {
    expect(normalizeCityLabel("Gurgaon")).toBe("Gurugram");
    const cities = citiesForProvinceFromMasters(INDIAN_CITIES, "IN-HR");
    expect(resolveCityLabel("Gurgaon", cities)).toBe("Gurugram");
    expect(cities.some((c) => c.label === "Gurugram")).toBe(true);
  });

  it("round-trips India Maharashtra Mumbai save payload", () => {
    const saved = {
      country: "India",
      province_code: "IN-MH",
      state_province: "Maharashtra",
      city: "Mumbai",
    };
    const province = resolveProvinceFromMasters(
      INDIAN_PROVINCES,
      saved.country,
      saved.state_province,
      saved.province_code,
    );
    const cities = citiesForProvinceFromMasters(INDIAN_CITIES, province!.code);
    const city = resolveCityLabel(saved.city, cities);

    expect(province).toEqual({ code: "IN-MH", label: "Maharashtra" });
    expect(city).toBe("Mumbai");
  });

  it("filters provinces by country", () => {
    const india = provincesForCountryFromMasters(INDIAN_PROVINCES, "India");
    expect(india.length).toBe(3);
    expect(provincesForCountryFromMasters(INDIAN_PROVINCES, "Canada")).toEqual([]);
  });

  it("prefers geo when master seed is sparse (Australia demo has 1 province, geo has many)", () => {
    expect(shouldPreferGeoProvinces("India", 36, 36)).toBe(false);
    expect(shouldPreferGeoProvinces("Australia", 1, 8)).toBe(true);
    expect(shouldPreferGeoProvinces("Canada", 2, 13)).toBe(true);
    expect(shouldPreferGeoProvinces("Nepal", 0, 7)).toBe(true);
  });
});
