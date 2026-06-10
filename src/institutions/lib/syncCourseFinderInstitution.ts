import { supabase } from "@/integrations/supabase/client";

const COUNTRY_MAP: Record<string, string> = {
  canada: "CA",
  "united states": "US",
  usa: "US",
  uk: "GB",
  "united kingdom": "GB",
  australia: "AU",
  "new zealand": "NZ",
  ireland: "IE",
  germany: "DE",
};

function countryCode(name: string | null | undefined): string {
  const t = (name ?? "").toLowerCase().trim();
  return COUNTRY_MAP[t] ?? "CA";
}

/** Sync logo, partner flag, and FK link to cf_universities. */
export async function syncInstitutionToCourseFinder(
  institutionId: string,
  patch: { logo_url?: string | null; is_partner?: boolean },
): Promise<void> {
  const { data: inst } = await supabase
    .from("upi_institutions")
    .select("name, country_name, is_partner, logo_url")
    .eq("id", institutionId)
    .maybeSingle();
  if (!inst?.name) return;

  const code = countryCode(inst.country_name);
  const update = {
    ...patch,
    logo_url: patch.logo_url !== undefined ? patch.logo_url : inst.logo_url,
    is_partner: patch.is_partner !== undefined ? patch.is_partner : inst.is_partner ?? false,
    upi_institution_id: institutionId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("cf_universities").update(update).eq("upi_institution_id", institutionId);
  if (!error) return;

  await supabase.from("cf_universities").update(update).eq("country_code", code).ilike("name", inst.name);
}
