import { useCallback, useEffect, useMemo, useState } from "react";
import type { ICity, ICountry, IState } from "country-state-city";

/** Map app country labels (master / legacy) → ISO alpha-2. */
const COUNTRY_LABEL_TO_ISO: Record<string, string> = {
  "United States of America": "US",
  UK: "GB",
  "U.K.": "GB",
  "Great Britain": "GB",
  Russia: "RU",
  "South Korea": "KR",
  "North Korea": "KP",
  "Viet Nam": "VN",
  "Czech Republic": "CZ",
  "Côte d'Ivoire": "CI",
};

export const GEO_COUNTRY_PRIORITY = [
  "India",
  "Canada",
  "United Kingdom",
  "Australia",
  "United States",
  "Germany",
  "United Arab Emirates",
];

type GeoModule = typeof import("country-state-city");

let geoModule: GeoModule | null = null;
let geoLoadPromise: Promise<GeoModule> | null = null;
let nameToIso: Map<string, string> | null = null;
let isoToCountry: Map<string, ICountry> | null = null;

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildIndexes(mod: GeoModule) {
  nameToIso = new Map<string, string>();
  isoToCountry = new Map<string, ICountry>();
  for (const c of mod.Country.getAllCountries()) {
    isoToCountry.set(c.isoCode, c);
    nameToIso.set(normalizeName(c.name), c.isoCode);
    if (c.name.includes(",")) {
      nameToIso.set(normalizeName(c.name.split(",")[0]!), c.isoCode);
    }
  }
  for (const [label, iso] of Object.entries(COUNTRY_LABEL_TO_ISO)) {
    nameToIso.set(normalizeName(label), iso);
  }
}

/** Lazy-load geo dataset (code-split chunk, ~8MB). */
export async function loadGeoModule(): Promise<GeoModule> {
  if (geoModule) return geoModule;
  if (!geoLoadPromise) {
    geoLoadPromise = import("country-state-city").then((mod) => {
      geoModule = mod;
      buildIndexes(mod);
      return mod;
    });
  }
  return geoLoadPromise;
}

export function resolveCountryIso(countryLabel?: string | null): string | null {
  if (!countryLabel?.trim() || !nameToIso || !geoModule) return null;
  const direct = nameToIso.get(normalizeName(countryLabel));
  if (direct) return direct;
  const partial = geoModule.Country.getAllCountries().find(
    (c) =>
      normalizeName(c.name) === normalizeName(countryLabel) ||
      c.name.toLowerCase().includes(countryLabel.trim().toLowerCase()),
  );
  return partial?.isoCode ?? null;
}

export function getAllGeoCountries(): ICountry[] {
  return geoModule?.Country.getAllCountries() ?? [];
}

export function getStatesForCountryLabel(countryLabel: string): IState[] {
  const iso = resolveCountryIso(countryLabel);
  if (!iso || !geoModule) return [];
  return geoModule.State.getStatesOfCountry(iso) ?? [];
}

export function resolveStateIso(countryLabel: string, provinceCode?: string | null): string | null {
  if (!provinceCode?.trim()) return null;
  const code = provinceCode.trim();
  const countryIso = resolveCountryIso(countryLabel);
  if (!countryIso) return code.includes("-") ? code.split("-").pop() ?? null : code;
  if (code.startsWith(`${countryIso}-`)) return code.slice(countryIso.length + 1);
  if (code.includes("-")) return code.split("-").pop() ?? null;
  return code;
}

export function buildProvinceCode(countryLabel: string, stateIso: string): string {
  const countryIso = resolveCountryIso(countryLabel);
  return countryIso ? `${countryIso}-${stateIso}` : stateIso;
}

export function getCitiesForProvince(countryLabel: string, provinceCode?: string | null): ICity[] {
  const countryIso = resolveCountryIso(countryLabel);
  const stateIso = resolveStateIso(countryLabel, provinceCode);
  if (!countryIso || !stateIso || !geoModule) return [];
  return geoModule.City.getCitiesOfState(countryIso, stateIso) ?? [];
}

export function resolveState(
  countryLabel: string,
  stateProvince?: string | null,
  provinceCode?: string | null,
): IState | undefined {
  const states = getStatesForCountryLabel(countryLabel);
  const stateIso = resolveStateIso(countryLabel, provinceCode);
  if (stateIso) {
    const byIso = states.find((s) => s.isoCode === stateIso);
    if (byIso) return byIso;
  }
  if (stateProvince?.trim()) {
    const norm = normalizeName(stateProvince);
    return states.find((s) => normalizeName(s.name) === norm || s.isoCode === stateProvince.trim());
  }
  return undefined;
}

export function useGeoLocationsReady(): boolean {
  const [ready, setReady] = useState(!!geoModule);
  useEffect(() => {
    if (geoModule) {
      setReady(true);
      return;
    }
    loadGeoModule().then(() => setReady(true)).catch(() => setReady(false));
  }, []);
  return ready;
}

export interface LocationFieldsValue {
  country?: string;
  state_province?: string;
  province_code?: string;
  city?: string;
}

export function useLocationCascadeData(countryLabel?: string) {
  const ready = useGeoLocationsReady();

  const priorityCountries = useMemo(() => {
    if (!ready) return { priority: [] as ICountry[], rest: [] as ICountry[] };
    const countries = getAllGeoCountries();
    const byName = new Map(countries.map((c) => [c.name, c]));
    const priority = GEO_COUNTRY_PRIORITY.map((name) => byName.get(name)).filter(Boolean) as ICountry[];
    const rest = countries.filter((c) => !GEO_COUNTRY_PRIORITY.includes(c.name)).sort((a, b) => a.name.localeCompare(b.name));
    return { priority, rest };
  }, [ready]);

  const provincesForCountry = useCallback(
    (country: string): IState[] => (ready ? getStatesForCountryLabel(country) : []),
    [ready],
  );

  const citiesForProvince = useCallback(
    (country: string, provinceCode: string) => (ready ? getCitiesForProvince(country, provinceCode) : []),
    [ready],
  );

  const resolveProvince = useCallback(
    (country: string, stateProvince?: string, provinceCode?: string) =>
      ready ? resolveState(country, stateProvince, provinceCode) : undefined,
    [ready],
  );

  const hasProvincesForCountry = useCallback(
    (country: string) => ready && getStatesForCountryLabel(country).length > 0,
    [ready],
  );

  return {
    ready,
    priorityCountries,
    provincesForCountry,
    citiesForProvince,
    resolveProvince,
    hasProvincesForCountry,
    buildProvinceCode,
  };
}
