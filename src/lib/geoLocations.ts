import { useEffect, useState } from "react";
import type { ICity, ICountry, IState } from "country-state-city";

/** Map app country labels (master / legacy) → ISO alpha-2. */
const COUNTRY_LABEL_TO_ISO: Record<string, string> = {
  "United States of America": "US",
  USA: "US",
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

/** Normalize display labels before geo lookup. */
export function normalizeCountryLabel(country?: string | null): string {
  if (!country?.trim()) return "";
  const trimmed = country.trim();
  const aliases: Record<string, string> = {
    "United States of America": "United States",
    USA: "United States",
    UK: "United Kingdom",
    "U.K.": "United Kingdom",
    "Great Britain": "United Kingdom",
  };
  return aliases[trimmed] ?? trimmed;
}

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
  const normalized = normalizeCountryLabel(countryLabel);
  if (!normalized || !nameToIso || !geoModule) return null;
  const direct = nameToIso.get(normalizeName(normalized));
  if (direct) return direct;
  const partial = geoModule.Country.getAllCountries().find(
    (c) =>
      normalizeName(c.name) === normalizeName(normalized) ||
      c.name.toLowerCase().includes(normalized.toLowerCase()),
  );
  return partial?.isoCode ?? null;
}

export function getAllGeoCountries(): ICountry[] {
  return geoModule?.Country.getAllCountries() ?? [];
}

export function getStatesForCountryLabel(countryLabel: string): IState[] {
  const iso = resolveCountryIso(normalizeCountryLabel(countryLabel));
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
  const country = normalizeCountryLabel(countryLabel);
  const countryIso = resolveCountryIso(country);
  const stateIso = resolveStateIso(country, provinceCode);
  if (!countryIso || !stateIso || !geoModule) return [];

  const byState = geoModule.City.getCitiesOfState(countryIso, stateIso) ?? [];
  if (byState.length) return byState;

  const countryCities = geoModule.City.getCitiesOfCountry(countryIso) ?? [];
  const byStateCode = countryCities.filter((c) => c.stateCode === stateIso);
  if (byStateCode.length) return byStateCode;

  return [];
}

export function resolveState(
  countryLabel: string,
  stateProvince?: string | null,
  provinceCode?: string | null,
): IState | undefined {
  const country = normalizeCountryLabel(countryLabel);
  const states = getStatesForCountryLabel(country);
  const stateIso = resolveStateIso(country, provinceCode);
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

