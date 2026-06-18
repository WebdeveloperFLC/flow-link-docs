import { useMemo } from "react";
import { useMasterItems, type MasterItem } from "@/lib/masters";

export interface LocationFieldsValue {
  country?: string;
  state_province?: string;
  province_code?: string;
  city?: string;
}

export function useLocationCascadeData() {
  const provinces = useMasterItems("location_provinces");
  const cities = useMasterItems("location_cities");

  const countriesWithProvinces = useMemo(() => {
    const set = new Set<string>();
    for (const p of provinces) {
      const c = (p.metadata as { country?: string } | null)?.country;
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [provinces]);

  const provincesForCountry = (country: string) =>
    provinces.filter((p) => (p.metadata as { country?: string } | null)?.country === country);

  const citiesForProvince = (provinceCode: string) =>
    cities.filter((c) => (c.metadata as { province_code?: string } | null)?.province_code === provinceCode);

  const resolveProvince = (country: string, stateProvince?: string, provinceCode?: string): MasterItem | undefined => {
    const list = provincesForCountry(country);
    if (provinceCode) return list.find((p) => p.code === provinceCode);
    if (stateProvince) {
      return list.find((p) => p.label === stateProvince || p.code === stateProvince);
    }
    return undefined;
  };

  return {
    provinces,
    cities,
    countriesWithProvinces,
    provincesForCountry,
    citiesForProvince,
    resolveProvince,
    hasProvincesForCountry: (country: string) => provincesForCountry(country).length > 0,
  };
}
