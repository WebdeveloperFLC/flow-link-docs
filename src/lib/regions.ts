import { COUNTRY_LIST, type CountryEntry } from "./countries";

export type Region = {
  key: string;
  label: string;
  countries: string[];
};

export const REGIONS: Region[] = [
  {
    key: "north_america",
    label: "North America",
    countries: ["Canada", "United States"],
  },
  {
    key: "europe",
    label: "Europe",
    countries: [
      "United Kingdom", "Germany", "Ireland", "France", "Italy", "Spain",
      "Netherlands", "Sweden", "Switzerland", "Austria", "Poland", "Malta",
      "Cyprus", "Portugal", "Finland", "Denmark", "Norway", "Hungary",
      "Lithuania", "Latvia", "Estonia", "Georgia", "Russia", "Romania",
      "Serbia", "Turkey",
    ],
  },
  {
    key: "oceania",
    label: "Oceania",
    countries: ["Australia", "New Zealand"],
  },
  {
    key: "middle_east",
    label: "Middle East",
    countries: ["United Arab Emirates"],
  },
  {
    key: "asia",
    label: "Asia",
    countries: [
      "Singapore", "Malaysia", "Japan", "South Korea", "Uzbekistan",
      "Kazakhstan", "Kyrgyzstan", "Philippines", "China",
    ],
  },
];

export const MBBS_PRIORITY: string[] = [
  "Russia", "Georgia", "Uzbekistan", "Kazakhstan", "Kyrgyzstan",
  "Philippines", "China",
];

let _promoted: Set<string> | null = null;
export function getPromotedSet(): Set<string> {
  if (!_promoted) {
    _promoted = new Set(REGIONS.flatMap((r) => r.countries));
  }
  return _promoted;
}

export function isPromoted(country: string): boolean {
  return getPromotedSet().has(country);
}

export function getRegionOf(country: string): Region | null {
  return REGIONS.find((r) => r.countries.includes(country)) ?? null;
}

/** Countries in the master `COUNTRY_LIST` that aren't in any promoted region. */
export function getOtherCountries(): CountryEntry[] {
  const promoted = getPromotedSet();
  return COUNTRY_LIST.filter((c) => !promoted.has(c.name));
}