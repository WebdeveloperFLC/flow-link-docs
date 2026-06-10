import { supabase } from "@/integrations/supabase/client";
import { syncInstitutionToCourseFinder } from "./syncCourseFinderInstitution";

export const INSTITUTION_LOGOS_BUCKET = "institution-logos";

export function institutionLogoPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(INSTITUTION_LOGOS_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/** Push logo_url to matching cf_universities row so Course Finder updates immediately. */
export async function syncInstitutionLogoToCourseFinder(
  institutionId: string,
  logoUrl: string | null,
): Promise<void> {
  await syncInstitutionToCourseFinder(institutionId, { logo_url: logoUrl });
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
