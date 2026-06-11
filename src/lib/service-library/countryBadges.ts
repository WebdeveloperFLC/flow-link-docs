import { findCountry } from "@/lib/countries";

/** ISO-style badges for Service Library sidebar (not first-two-chars of country name). */
const COUNTRY_BADGE: Record<string, string> = {
  Canada: "CA",
  "United Kingdom": "UK",
  "United States": "US",
  Australia: "AU",
  "New Zealand": "NZ",
  Germany: "DE",
  Ireland: "IE",
  France: "FR",
  Italy: "IT",
  Spain: "ES",
  Netherlands: "NL",
  Sweden: "SE",
  Switzerland: "CH",
  Austria: "AT",
  Belgium: "BE",
  Poland: "PL",
  Malta: "MT",
  Cyprus: "CY",
  Portugal: "PT",
  Finland: "FI",
  Denmark: "DK",
  Norway: "NO",
  Hungary: "HU",
  Lithuania: "LT",
  Latvia: "LV",
  Estonia: "EE",
  Georgia: "GE",
  Russia: "RU",
  Romania: "RO",
  Serbia: "RS",
  Turkey: "TR",
  "United Arab Emirates": "AE",
  Singapore: "SG",
  Malaysia: "MY",
  Japan: "JP",
  "South Korea": "KR",
  Uzbekistan: "UZ",
  Kazakhstan: "KZ",
  Kyrgyzstan: "KG",
  Philippines: "PH",
  China: "CN",
  India: "IN",
};

/** Priority order for visa country sections in the sidebar. */
export const VISA_COUNTRY_PRIORITY = [
  "Canada",
  "United Kingdom",
  "United States",
  "Australia",
  "Germany",
  "New Zealand",
  "Ireland",
  "United Arab Emirates",
  "France",
  "Netherlands",
  "Italy",
  "Spain",
  "Malta",
  "Finland",
  "Sweden",
  "Austria",
  "Belgium",
  "Denmark",
  "Portugal",
];

export function countryBadgeCode(country: string): string {
  return COUNTRY_BADGE[country] ?? country.slice(0, 2).toUpperCase();
}

export function countryFlagEmoji(country: string): string {
  return findCountry(country)?.flag ?? "";
}

export function sortVisaCountries(countries: string[]): string[] {
  const set = new Set(countries);
  const priority = VISA_COUNTRY_PRIORITY.filter((c) => set.has(c));
  const rest = countries.filter((c) => !VISA_COUNTRY_PRIORITY.includes(c)).sort((a, b) => a.localeCompare(b));
  return [...priority, ...rest];
}
