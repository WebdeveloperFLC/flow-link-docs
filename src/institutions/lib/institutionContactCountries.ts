import { useMemo } from "react";
import { useMasterItems, type MasterItem } from "@/lib/masters";

/** Preferred communication methods for institution contacts (M2.1). */
export const PREFERRED_COMMUNICATION_METHODS = [
  "Email",
  "Phone",
  "WhatsApp",
  "Teams",
  "Zoom",
  "Portal",
] as const;

export type PreferredCommunicationMethod = (typeof PREFERRED_COMMUNICATION_METHODS)[number];

/** CRM countries master (`master_items` list_key = countries), codes align with cf_countries. */
export function useInstitutionContactCountries(): MasterItem[] {
  return useMasterItems("countries");
}

export function countryLabelFromCode(
  code: string | null | undefined,
  countries: MasterItem[],
): string {
  if (!code?.trim()) return "";
  const hit = countries.find((c) => c.code === code);
  return hit?.label ?? code;
}

export function countryCodeFromLabel(
  label: string | null | undefined,
  countries: MasterItem[],
): string | null {
  if (!label?.trim()) return null;
  const hit = countries.find((c) => c.label.toLowerCase() === label.trim().toLowerCase());
  return hit?.code ?? null;
}

/** Common IANA timezone suggestions (optional field). */
export const SUGGESTED_CONTACT_TIMEZONES = [
  "America/Toronto",
  "America/Vancouver",
  "America/Winnipeg",
  "America/Halifax",
  "America/St_Johns",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

export function useInstitutionContactCountryOptions() {
  const countries = useInstitutionContactCountries();
  const priorityLabels = useMemo(
    () => ["India", "Canada", "United Kingdom", "Australia", "United States", "Germany", "United Arab Emirates"],
    [],
  );

  const sorted = useMemo(() => {
    const byLabel = new Map(countries.map((c) => [c.label, c]));
    const priority = priorityLabels.map((l) => byLabel.get(l)).filter(Boolean) as MasterItem[];
    const rest = countries
      .filter((c) => !priorityLabels.includes(c.label))
      .sort((a, b) => a.label.localeCompare(b.label));
    return { priority, rest };
  }, [countries, priorityLabels]);

  return sorted;
}
