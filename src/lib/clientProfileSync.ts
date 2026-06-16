import { supabase } from "@/integrations/supabase/client";
import type { ClientRow } from "@/lib/clientRegistration";

/** Map registration (`clients`) fields → profile tab (`client_profile`) columns. */
export function clientToProfilePatch(
  client: Partial<ClientRow>,
  spouseName?: string | null,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (client.date_of_birth) patch.date_of_birth = client.date_of_birth;
  if (client.gender) patch.gender = client.gender;
  if (client.marital_status) patch.marital_status = client.marital_status;
  if (client.country_of_citizenship) patch.nationality = client.country_of_citizenship;
  if (client.passport_number) patch.passport_number = client.passport_number;
  if (client.passport_expiry) patch.passport_expiry = client.passport_expiry;
  if (client.country_of_residence) patch.address_country = client.country_of_residence;
  if (client.email_alternate) patch.email_alt = client.email_alternate;
  if (client.phone_alternate) patch.phone_alt = client.phone_alternate;
  if (client.last_education) patch.highest_qualification = client.last_education;
  if (client.institution_name) patch.institution_name = client.institution_name;
  if (client.year_of_passing != null) patch.graduation_year = client.year_of_passing;
  if (client.percentage_cgpa) patch.gpa_or_percentage = client.percentage_cgpa;
  if (client.english_overall) patch.ielts_overall = client.english_overall;
  if (client.english_test_date) patch.ielts_test_date = client.english_test_date;
  const sections = client.english_sections;
  if (sections?.listening) patch.ielts_listening = sections.listening;
  if (sections?.reading) patch.ielts_reading = sections.reading;
  if (sections?.writing) patch.ielts_writing = sections.writing;
  if (sections?.speaking) patch.ielts_speaking = sections.speaking;
  if (spouseName?.trim()) patch.spouse_name = spouseName.trim();
  if (client.sponsor) patch.sponsor = client.sponsor;
  if (client.sponsor_other) patch.sponsor_other = client.sponsor_other;
  if (client.start_timeline) patch.start_timeline = client.start_timeline;
  if (client.has_budget) patch.has_budget = client.has_budget;
  if (client.budget_currency) patch.budget_currency = client.budget_currency;
  if (client.budget_min != null) patch.budget_min = client.budget_min;
  if (client.budget_max != null) patch.budget_max = client.budget_max;
  if (client.interested_countries?.length) patch.interested_countries = client.interested_countries;
  if (client.lead_source) patch.lead_source = client.lead_source;
  if (client.counselor_notes) patch.counselor_notes = client.counselor_notes;
  return patch;
}

export function mergeProfileFillEmpty(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(incoming)) {
    if (v === null || v === undefined || v === "") continue;
    const cur = existing?.[k];
    if (cur === null || cur === undefined || cur === "") {
      patch[k] = v;
    }
  }
  return patch;
}

/** UI fallback when profile row is empty but registration data exists on `clients`. */
export function clientToProfileFallback(
  client: Partial<ClientRow>,
  spouseName?: string | null,
): Record<string, string> {
  const patch = clientToProfilePatch(client, spouseName);
  return Object.fromEntries(
    Object.entries(patch).map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)]),
  );
}

async function fetchSpouseName(clientId: string): Promise<string | null> {
  const { data } = await supabase
    .from("client_family_members")
    .select("first_name, last_name")
    .eq("primary_client_id", clientId)
    .eq("relationship", "spouse")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
  return name || null;
}

/**
 * Copy registration data from `clients` into `client_profile` without overwriting
 * values already set (e.g. document extraction or manual profile edits).
 */
export async function ensureClientProfileSynced(clientId: string): Promise<boolean> {
  const [{ data: client }, { data: profile }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
    supabase.from("client_profile").select("*").eq("client_id", clientId).maybeSingle(),
  ]);
  if (!client) return false;

  const spouseName = await fetchSpouseName(clientId);
  const incoming = clientToProfilePatch(client as unknown as ClientRow, spouseName);
  const patch = mergeProfileFillEmpty(profile as Record<string, unknown> | null, incoming);
  if (Object.keys(patch).length === 0) return false;

  if (profile) {
    const { error } = await supabase
      .from("client_profile")
      .update(patch as never)
      .eq("client_id", clientId);
    if (error) {
      console.warn("[clientProfileSync] update failed", error);
      return false;
    }
    return true;
  }

  const { error } = await supabase
    .from("client_profile")
    .insert({ client_id: clientId, ...patch } as never);
  if (error) {
    console.warn("[clientProfileSync] insert failed", error);
    return false;
  }
  return true;
}
