import { supabase } from "@/integrations/supabase/client";
import type { MasterItem } from "@/lib/masters";
import { countryCodeFromLabel } from "./institutionContactCountries";

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
): boolean {
  return countryCodeFromLabel(countryName, countries) === "CA";
}
