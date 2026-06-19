import { supabase } from "@/integrations/supabase/client";
import type { EducationEntry } from "@/lib/clientRegistration";
import { ensureClientProfileSynced } from "@/lib/clientProfileSync";

const LEAD_CONVERSION_MARKER = "lead_conversion";

function parseEndYear(year?: string | null): number | null {
  if (!year) return null;
  const match = year.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

function educationRowFromEntry(clientId: string, entry: EducationEntry) {
  return {
    client_id: clientId,
    level: entry.level ?? null,
    institution: entry.institution ?? null,
    end_year: parseEndYear(entry.year),
    gpa_or_percentage: entry.percentage_cgpa ?? null,
    field_of_study: entry.specialization ?? null,
    country: entry.country ?? null,
    city: entry.city ?? null,
    source_file_name: LEAD_CONVERSION_MARKER,
  };
}

/** Seed client_education rows from registration JSON — idempotent, preserves manual/doc rows. */
export async function syncEducationHistoryToClientEducation(
  clientId: string,
  history: EducationEntry[] | undefined,
): Promise<void> {
  const entries = (history ?? []).filter((e) => e.level || e.institution);
  if (!entries.length) return;

  const { data: existing, error: readErr } = await supabase
    .from("client_education")
    .select("id, source_file_name")
    .eq("client_id", clientId);
  if (readErr) {
    console.warn("[clientBackgroundSync] read education failed", readErr);
    return;
  }

  const rows = existing ?? [];
  const conversionIds = rows.filter((r) => r.source_file_name === LEAD_CONVERSION_MARKER).map((r) => r.id);
  const hasNonConversion = rows.some((r) => r.source_file_name !== LEAD_CONVERSION_MARKER);

  if (hasNonConversion && conversionIds.length === 0) return;

  if (conversionIds.length) {
    const { error: delErr } = await supabase.from("client_education").delete().in("id", conversionIds);
    if (delErr) {
      console.warn("[clientBackgroundSync] delete conversion education failed", delErr);
      return;
    }
  }

  const toInsert = entries.map((e) => educationRowFromEntry(clientId, e));
  const { error: insErr } = await supabase.from("client_education").insert(toInsert as never);
  if (insErr) console.warn("[clientBackgroundSync] insert education failed", insErr);
}

/** After lead conversion: clients JSON → client_profile + client_education + test_attempts from source lead. */
export async function syncClientBackgroundAfterConversion(clientId: string): Promise<void> {
  const { data: client, error } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
  if (error || !client) {
    console.warn("[clientBackgroundSync] client read failed", error);
    return;
  }

  const sourceLeadId = (client as { source_lead_id?: string | null }).source_lead_id;
  if (sourceLeadId) {
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("test_attempts, active_attempt_ids")
      .eq("id", sourceLeadId)
      .maybeSingle();
    if (!leadErr && lead) {
      const leadAttempts = (lead as { test_attempts?: unknown }).test_attempts;
      const leadActive = (lead as { active_attempt_ids?: unknown }).active_attempt_ids;
      const clientAttempts = (client as { test_attempts?: unknown }).test_attempts;
      const hasLeadAttempts = Array.isArray(leadAttempts) && leadAttempts.length > 0;
      const clientMissingAttempts =
        !Array.isArray(clientAttempts) || clientAttempts.length === 0;
      if (hasLeadAttempts && clientMissingAttempts) {
        const { error: updErr } = await supabase
          .from("clients")
          .update({
            test_attempts: leadAttempts,
            active_attempt_ids: leadActive ?? {},
          } as never)
          .eq("id", clientId);
        if (updErr) {
          console.warn("[clientBackgroundSync] test_attempts copy failed", updErr);
        }
      }
    }
  }

  await syncEducationHistoryToClientEducation(
    clientId,
    (client.education_history as EducationEntry[] | undefined) ?? [],
  );

  await ensureClientProfileSynced(clientId).catch((e) =>
    console.warn("[clientBackgroundSync] profile sync failed", e),
  );

  const { error: rpcErr } = await supabase.rpc("sync_client_profile_from_client", {
    _client_id: clientId,
  });
  if (rpcErr) console.warn("[clientBackgroundSync] db profile sync failed", rpcErr);
}
