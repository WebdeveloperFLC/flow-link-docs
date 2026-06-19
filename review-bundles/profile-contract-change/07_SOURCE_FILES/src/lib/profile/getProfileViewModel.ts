import { supabase } from "@/integrations/supabase/client";
import type { ClientRow } from "@/lib/clientRegistration";
import { resolveClientStatusLabel } from "@/lib/clientStatus";
import { fetchAllServiceCatalogue } from "@/lib/leads";
import { fetchMasterItemsAll } from "@/lib/masters";
import { listDocumentRefsForClient } from "@/lib/profile/clientDocumentRefs";
import { buildProfileViewModelFromSources } from "@/lib/profile/normalizeProfile";
import type { ProfileViewModel } from "@/lib/profile/types";

/**
 * Single public loader for profile read model.
 * Normalizes legacy jsonb once, merges client_profile + clients + document refs + services snapshot.
 */
export async function getProfileViewModel(clientId: string): Promise<ProfileViewModel> {
  const [clientRes, profileRes, refs, stageRes, statusItems, catalogue] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
    supabase.from("client_profile").select("*").eq("client_id", clientId).maybeSingle(),
    listDocumentRefsForClient(clientId).catch(() => []),
    supabase
      .from("vw_client_current_stage")
      .select("stage_label, progress_percent")
      .eq("client_id", clientId)
      .maybeSingle(),
    fetchMasterItemsAll("client_statuses").catch(() => []),
    fetchAllServiceCatalogue().catch(() => []),
  ]);

  if (clientRes.error) throw clientRes.error;
  if (profileRes.error) throw profileRes.error;
  if (!clientRes.data) throw new Error(`Client not found: ${clientId}`);

  const client = clientRes.data as unknown as ClientRow;
  let counselorName: string | null = null;
  if (client.assigned_counselor_id) {
    const { data: counselor } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", client.assigned_counselor_id)
      .maybeSingle();
    counselorName = (counselor as { full_name?: string | null } | null)?.full_name ?? null;
  }

  const statusCode = (client as { status?: string | null }).status ?? "in_progress";

  return buildProfileViewModelFromSources({
    client,
    profile: (profileRes.data ?? {}) as Record<string, unknown>,
    documentRefs: refs,
    loadedAt: new Date().toISOString(),
    enrichment: {
      assigned_counselor_name: counselorName,
      client_status_label: resolveClientStatusLabel(statusCode, statusItems),
      catalogue,
      pipeline: stageRes.data
        ? {
            stage_label: (stageRes.data as { stage_label?: string | null }).stage_label ?? null,
            progress_percent: (stageRes.data as { progress_percent?: number | null }).progress_percent ?? null,
          }
        : null,
    },
  });
}
