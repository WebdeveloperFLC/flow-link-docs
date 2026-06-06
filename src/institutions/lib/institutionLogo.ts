import { supabase } from "@/integrations/supabase/client";

export const INSTITUTION_LOGOS_BUCKET = "institution-logos";

const COUNTRY_MAP: Record<string, string> = {
  canada: "CA",
  "united states": "US",
  usa: "US",
  uk: "GB",
  "united kingdom": "GB",
  australia: "AU",
  "new zealand": "NZ",
  ireland: "IE",
};

function countryCode(name: string | null | undefined): string {
  const t = (name ?? "").toLowerCase().trim();
  return COUNTRY_MAP[t] ?? "CA";
}

export function institutionLogoPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(INSTITUTION_LOGOS_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/** Push logo_url to matching cf_universities row so Course Finder updates immediately. */
export async function syncInstitutionLogoToCourseFinder(
  institutionId: string,
  logoUrl: string | null,
): Promise<void> {
  const { data: inst } = await supabase
    .from("upi_institutions")
    .select("name, country_name")
    .eq("id", institutionId)
    .maybeSingle();
  if (!inst?.name) return;
  const code = countryCode(inst.country_name);
  await supabase
    .from("cf_universities")
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq("country_code", code)
    .ilike("name", inst.name);
}

export async function uploadInstitutionLogo(
  institutionId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${institutionId}/logo.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(INSTITUTION_LOGOS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) throw upErr;
  const publicUrl = institutionLogoPublicUrl(path);
  const { error: dbErr } = await supabase
    .from("upi_institutions")
    .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", institutionId);
  if (dbErr) throw dbErr;
  await syncInstitutionLogoToCourseFinder(institutionId, publicUrl);
  return publicUrl;
}

export async function removeInstitutionLogo(institutionId: string): Promise<void> {
  const { data: files } = await supabase.storage.from(INSTITUTION_LOGOS_BUCKET).list(institutionId);
  if (files?.length) {
    await supabase.storage
      .from(INSTITUTION_LOGOS_BUCKET)
      .remove(files.map((f) => `${institutionId}/${f.name}`));
  }
  await supabase
    .from("upi_institutions")
    .update({ logo_url: null, updated_at: new Date().toISOString() })
    .eq("id", institutionId);
  await syncInstitutionLogoToCourseFinder(institutionId, null);
}

export async function setInstitutionLogoUrl(institutionId: string, logoUrl: string): Promise<void> {
  const trimmed = logoUrl.trim();
  if (!trimmed) throw new Error("Logo URL is required");
  const { error } = await supabase
    .from("upi_institutions")
    .update({ logo_url: trimmed, updated_at: new Date().toISOString() })
    .eq("id", institutionId);
  if (error) throw error;
  await syncInstitutionLogoToCourseFinder(institutionId, trimmed);
}
