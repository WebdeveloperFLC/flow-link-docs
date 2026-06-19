import { supabase } from "@/integrations/supabase/client";
import { listDocumentRefsForClient } from "@/lib/profile/clientDocumentRefs";
import { buildProfileViewModelFromSources } from "@/lib/profile/normalizeProfile";
import type { ProfileViewModel } from "@/lib/profile/types";
import type { ClientRow } from "@/lib/clientRegistration";

/**
 * Single public loader for profile read model.
 * Normalizes legacy jsonb once, merges client_profile + clients + document refs.
 */
export async function getProfileViewModel(clientId: string): Promise<ProfileViewModel> {
  const [clientRes, profileRes, refs] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
    supabase.from("client_profile").select("*").eq("client_id", clientId).maybeSingle(),
    listDocumentRefsForClient(clientId).catch(() => []),
  ]);

  if (clientRes.error) throw clientRes.error;
  if (profileRes.error) throw profileRes.error;
  if (!clientRes.data) throw new Error(`Client not found: ${clientId}`);

  return buildProfileViewModelFromSources({
    client: clientRes.data as unknown as ClientRow,
    profile: (profileRes.data ?? {}) as Record<string, unknown>,
    documentRefs: refs,
    loadedAt: new Date().toISOString(),
  });
}
