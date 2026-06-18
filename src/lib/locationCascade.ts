import { useCallback, useMemo } from "react";
import { useMasterItems, type MasterItem } from "@/lib/masters";
import {
  GEO_COUNTRY_PRIORITY,
  useGeoLocationsReady,
  getStatesForCountryLabel,
  getCitiesForProvince,
  buildProvinceCode as geoBuildProvinceCode,
  getAllGeoCountries,
  normalizeCountryLabel,
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

/** UK geo data lists councils/cities as states — use the four nations only. */
export const GEO_STATE_LABEL_ALLOWLIST: Record<string, string[]> = {
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
};

export function filterGeoProvinces(country: string, provinces: ProvinceOption[]): ProvinceOption[] {
  const allow = GEO_STATE_LABEL_ALLOWLIST[country];
  if (!allow?.length) return provinces;
  const allowed = new Set(allow.map((l) => l.toLowerCase()));
  const filtered = provinces.filter((p) => allowed.has(p.label.toLowerCase()));
  return filtered.length ? filtered : provinces;
}

/** India = masters only. All others = geo when available (never sparse demo masters). */
export function shouldPreferGeoProvinces(
  country: string,
  masterProvinceCount: number,
  geoProvinceCount: number,
): boolean {
  if (country === "India") return false;
  if (geoProvinceCount === 0) return false;
  if (masterProvinceCount === 0) return true;
  // Demo master seed has 1–2 entries; real geo admin divisions are authoritative.
  return masterProvinceCount <= 2 && geoProvinceCount >= 3;
}

export function resolveProvincesForCountry(input: {
  country: string;
  masterProvinces: MasterItem[];
  geoReady: boolean;
  geoStatesForCountry: (country: string) => { isoCode: string; name: string }[];
  buildProvinceCode: (country: string, isoCode: string) => string;
}): ProvinceOption[] {
  const country = normalizeCountryLabel(input.country);
  if (!country) return [];

  const masterList = isMasterBackedCountry(country, new Set(countriesWithMasterProvinces(input.masterProvinces)))
    ? provincesForCountryFromMasters(input.masterProvinces, country)
    : [];

  if (country === "India") {
    return masterList;
  }

  if (!input.geoReady) {
    return [];
  }

  const rawGeo = input.geoStatesForCountry(country).map((s) => ({
    code: input.buildProvinceCode(country, s.isoCode),
    label: s.name,
  }));
  const geoList = filterGeoProvinces(country, rawGeo);

  if (shouldPreferGeoProvinces(country, masterList.length, geoList.length)) {
    return geoList;
  }
  if (geoList.length) return geoList;
  return masterList;
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

/** Geo cities for a province, merged with master-only labels (India aliases). */
export function resolveCitiesForProvince(input: {
  country: string;
  provinceCode: string;
  masterCities: MasterItem[];
  geoReady: boolean;
  geoCitiesForProvince: (country: string, provinceCode: string) => { name: string }[];
}): CityOption[] {
  const country = normalizeCountryLabel(input.country);
  if (!input.provinceCode?.trim()) return [];

  const masterList =
    country === "India"
      ? citiesForProvinceFromMasters(input.masterCities, input.provinceCode)
      : [];

  if (!input.geoReady) {
    return masterList;
  }

  const geoList = input.geoCitiesForProvince(country, input.provinceCode).map((c) => {
    const label = normalizeCityLabel(c.name) || c.name;
    return { value: label, label };
  });

  if (!geoList.length) {
    return masterList;
  }

  const seen = new Set(geoList.map((c) => c.label.toLowerCase()));
  for (const mc of masterList) {
    if (!seen.has(mc.label.toLowerCase())) {
      geoList.push(mc);
      seen.add(mc.label.toLowerCase());
    }
  }

  return geoList.sort((a, b) => a.label.localeCompare(b.label));
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
    (countryLabel: string): ProvinceOption[] =>
      resolveProvincesForCountry({
        country: countryLabel,
        masterProvinces: provinces,
        geoReady,
        geoStatesForCountry: getStatesForCountryLabel,
        buildProvinceCode: geoBuildProvinceCode,
      }),
    [provinces, geoReady],
  );

  const useGeoForCountry = useCallback(
    (countryLabel: string): boolean => {
      const country = normalizeCountryLabel(countryLabel);
      return !!country && country !== "India" && geoReady;
    },
    [geoReady],
  );

  const citiesForProvince = useCallback(
    (countryLabel: string, provinceCode: string): CityOption[] =>
      resolveCitiesForProvince({
        country: countryLabel,
        provinceCode,
        masterCities: cities,
        geoReady,
        geoCitiesForProvince: getCitiesForProvince,
      }),
    [cities, geoReady],
  );

  const resolveProvince = useCallback(
    (countryLabel: string, stateProvince?: string, provinceCode?: string): ProvinceOption | undefined => {
      const country = normalizeCountryLabel(countryLabel);
      const list = resolveProvincesForCountry({
        country,
        masterProvinces: provinces,
        geoReady,
        geoStatesForCountry: getStatesForCountryLabel,
        buildProvinceCode: geoBuildProvinceCode,
      });
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
    },
    [provinces, geoReady],
  );

  const hasProvincesForCountry = useCallback(
    (countryLabel: string) => provincesForCountry(countryLabel).length > 0,
    [provincesForCountry],
  );

  const buildProvinceCode = useCallback(
    (countryLabel: string, codeOrIso: string) => {
      const country = normalizeCountryLabel(countryLabel);
      if (country === "India") return codeOrIso;
      return geoBuildProvinceCode(country, codeOrIso);
    },
    [],
  );

  const ready = geoReady;

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
