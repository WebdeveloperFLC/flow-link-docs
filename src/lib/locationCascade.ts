import { useCallback, useMemo } from "react";
import { useMasterItems, type MasterItem } from "@/lib/masters";
import {
  GEO_COUNTRY_PRIORITY,
  useGeoLocationsReady,
  getStatesForCountryLabel,
  getCitiesForProvince,
  resolveState,
  buildProvinceCode as geoBuildProvinceCode,
  getAllGeoCountries,
} from "@/lib/geoLocations";

export interface LocationFieldsValue {
  country?: string;
  state_province?: string;
  province_code?: string;
  city?: string;
}

export interface ProvinceOption {
  code: string;
  label: string;
}

export interface CityOption {
  value: string;
  label: string;
}

/** Geo ISO province codes that differ from master_items codes (India). */
export const GEO_TO_MASTER_PROVINCE_ALIAS: Record<string, string> = {
  "IN-CT": "IN-CG",
  "IN-OR": "IN-OD",
  "IN-TG": "IN-TS",
  "IN-UT": "IN-UK",
};

export const MASTER_TO_GEO_PROVINCE_ALIAS: Record<string, string> = Object.fromEntries(
  Object.entries(GEO_TO_MASTER_PROVINCE_ALIAS).map(([geo, master]) => [master, geo]),
);

/** Alternate city labels saved via geo library → canonical master label. */
export const CITY_LABEL_ALIASES: Record<string, string> = {
  Gurgaon: "Gurugram",
  Allahabad: "Prayagraj",
};

export function normalizeMasterProvinceCode(provinceCode?: string | null): string | null {
  if (!provinceCode?.trim()) return null;
  const code = provinceCode.trim();
  return GEO_TO_MASTER_PROVINCE_ALIAS[code] ?? code;
}

export function provinceMetadataCountry(p: MasterItem): string | undefined {
  return (p.metadata as { country?: string } | null)?.country;
}

export function cityMetadataProvinceCode(c: MasterItem): string | undefined {
  return (c.metadata as { province_code?: string } | null)?.province_code;
}

export function countriesWithMasterProvinces(provinces: MasterItem[]): string[] {
  const set = new Set<string>();
  for (const p of provinces) {
    const c = provinceMetadataCountry(p);
    if (c) set.add(c);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function isMasterBackedCountry(country: string, masterCountries: Set<string>): boolean {
  return masterCountries.has(country);
}

export function provincesForCountryFromMasters(
  provinces: MasterItem[],
  country: string,
): ProvinceOption[] {
  return provinces
    .filter((p) => provinceMetadataCountry(p) === country)
    .map((p) => ({ code: p.code, label: p.label }));
}

export function citiesForProvinceFromMasters(
  cities: MasterItem[],
  provinceCode: string,
): CityOption[] {
  const normalized = normalizeMasterProvinceCode(provinceCode) ?? provinceCode;
  return cities
    .filter((c) => {
      const pc = cityMetadataProvinceCode(c);
      return pc === normalized || pc === provinceCode;
    })
    .map((c) => ({ value: c.label, label: c.label }));
}

export function resolveProvinceFromMasters(
  provinces: MasterItem[],
  country: string,
  stateProvince?: string | null,
  provinceCode?: string | null,
): ProvinceOption | undefined {
  const list = provincesForCountryFromMasters(provinces, country);
  const normalized = normalizeMasterProvinceCode(provinceCode);
  if (normalized) {
    const byCode = list.find((p) => p.code === normalized);
    if (byCode) return byCode;
  }
  if (provinceCode?.trim()) {
    const byRaw = list.find((p) => p.code === provinceCode.trim());
    if (byRaw) return byRaw;
  }
  if (stateProvince?.trim()) {
    const norm = stateProvince.trim().toLowerCase();
    return list.find(
      (p) => p.label.toLowerCase() === norm || p.code.toLowerCase() === norm,
    );
  }
  return undefined;
}

export function normalizeCityLabel(city?: string | null): string {
  if (!city?.trim()) return "";
  const trimmed = city.trim();
  return CITY_LABEL_ALIASES[trimmed] ?? trimmed;
}

export function resolveCityLabel(
  city: string | undefined | null,
  cities: CityOption[],
): string {
  if (!city?.trim()) return "";
  const normalized = normalizeCityLabel(city);
  const match = cities.find(
    (c) =>
      c.label.toLowerCase() === normalized.toLowerCase() ||
      c.label.toLowerCase() === city.trim().toLowerCase(),
  );
  return match?.label ?? normalized;
}

/**
 * Unified location cascade: master_items for curated countries (India, Canada, …),
 * country-state-city npm fallback for all others.
 */
export function useLocationCascadeData(_countryLabel?: string) {
  const provinces = useMasterItems("location_provinces");
  const cities = useMasterItems("location_cities");
  const geoReady = useGeoLocationsReady();

  const masterCountries = useMemo(
    () => new Set(countriesWithMasterProvinces(provinces)),
    [provinces],
  );

  const isMasterBacked = useCallback(
    (country: string) => isMasterBackedCountry(country, masterCountries),
    [masterCountries],
  );

  const countries = useMemo(() => {
    const masterList = countriesWithMasterProvinces(provinces);
    const geoNames = geoReady ? getAllGeoCountries().map((c) => c.name) : [];
    const all = new Set([...masterList, ...geoNames]);
    const priority = GEO_COUNTRY_PRIORITY.filter((c) => all.has(c));
    const rest = Array.from(all)
      .filter((c) => !GEO_COUNTRY_PRIORITY.includes(c))
      .sort((a, b) => a.localeCompare(b));
    return { priority, rest };
  }, [provinces, geoReady]);

  const provincesForCountry = useCallback(
    (country: string): ProvinceOption[] => {
      if (isMasterBacked(country)) {
        return provincesForCountryFromMasters(provinces, country);
      }
      if (!geoReady) return [];
      return getStatesForCountryLabel(country).map((s) => ({
        code: geoBuildProvinceCode(country, s.isoCode),
        label: s.name,
      }));
    },
    [provinces, geoReady, isMasterBacked],
  );

  const citiesForProvince = useCallback(
    (country: string, provinceCode: string): CityOption[] => {
      if (isMasterBacked(country)) {
        return citiesForProvinceFromMasters(cities, provinceCode);
      }
      if (!geoReady) return [];
      return getCitiesForProvince(country, provinceCode).map((c) => ({
        value: c.name,
        label: c.name,
      }));
    },
    [cities, geoReady, isMasterBacked],
  );

  const resolveProvince = useCallback(
    (country: string, stateProvince?: string, provinceCode?: string): ProvinceOption | undefined => {
      if (isMasterBacked(country)) {
        return resolveProvinceFromMasters(provinces, country, stateProvince, provinceCode);
      }
      if (!geoReady) return undefined;
      const state = resolveState(country, stateProvince, provinceCode);
      if (!state) return undefined;
      return {
        code: geoBuildProvinceCode(country, state.isoCode),
        label: state.name,
      };
    },
    [provinces, geoReady, isMasterBacked],
  );

  const hasProvincesForCountry = useCallback(
    (country: string) => provincesForCountry(country).length > 0,
    [provincesForCountry],
  );

  const buildProvinceCode = useCallback(
    (country: string, codeOrIso: string) => {
      if (isMasterBacked(country)) return codeOrIso;
      return geoBuildProvinceCode(country, codeOrIso);
    },
    [isMasterBacked],
  );

  const ready = geoReady || provinces.length > 0;

  return {
    ready,
    countries,
    provincesForCountry,
    citiesForProvince,
    resolveProvince,
    hasProvincesForCountry,
    buildProvinceCode,
    isMasterBacked,
  };
}
