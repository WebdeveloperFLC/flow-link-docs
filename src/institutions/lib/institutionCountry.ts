import { supabase } from "@/integrations/supabase/client";
import type { MasterItem } from "@/lib/masters";
import { countryCodeFromLabel } from "./institutionContactCountries";

/** Mirrors fn_upi_institution_is_canada name aliases (M1). */
export function isCanadaCountryName(countryName: string | null | undefined): boolean {
  const norm = (countryName ?? "").trim().toLowerCase();
  return norm === "canada" || norm === "ca" || norm === "can";
}

export async function resolveInstitutionCountryFromLabel(
  label: string,
  countries: MasterItem[],
): Promise<{ country_name: string; country_id: string | null }> {
  const trimmed = label.trim();
  const hit = countries.find((c) => c.label.toLowerCase() === trimmed.toLowerCase());
  const country_name = hit?.label ?? trimmed;
  const code = hit?.code ?? countryCodeFromLabel(country_name, countries);
  if (!code) return { country_name, country_id: null };

  const { data, error } = await supabase
    .from("upi_countries")
    .select("id")
    .eq("iso_alpha2", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { country_name, country_id: data?.id ?? null };
}

export function isInstitutionCanada(
  countryName: string | null | undefined,
  countries: MasterItem[],
  countryIsoAlpha2?: string | null,
): boolean {
  if (countryIsoAlpha2 === "CA") return true;
  if (isCanadaCountryName(countryName)) return true;
  return countryCodeFromLabel(countryName, countries) === "CA";
}

export async function fetchUpiCountryIso(countryId: string | null | undefined): Promise<string | null> {
  if (!countryId) return null;
  const { data, error } = await supabase
    .from("upi_countries")
    .select("iso_alpha2")
    .eq("id", countryId)
    .maybeSingle();
  if (error) return null;
  return data?.iso_alpha2 ?? null;
}
