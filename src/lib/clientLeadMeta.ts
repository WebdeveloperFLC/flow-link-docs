import { supabase } from "@/integrations/supabase/client";
import { appendClientActivityLog } from "@/lib/clientActivityLog";

function formatClientMetaWriteError(error: { message?: string; code?: string; details?: string }, field: string): Error {
  const msg = error.message ?? "Update failed";
  if (
    /client_rating/i.test(msg) &&
    (/schema cache|PGRST204|column.*does not exist|Could not find/i.test(msg) ||
      error.code === "PGRST204" ||
      error.code === "42703")
  ) {
    return new Error(
      "Star rating is not available yet — publish pending migrations in Lovable (client_rating), then hard refresh.",
    );
  }
  if (/42501|row-level security|permission denied/i.test(msg)) {
    return new Error(`You do not have permission to update ${field}.`);
  }
  return new Error(msg);
}

export async function updateClientLeadSource(
  clientId: string,
  leadSource: string | null,
  opts?: { sourceLeadId?: string | null; previousSource?: string | null },
): Promise<void> {
  const cleaned = leadSource?.trim() || null;
  const { error } = await supabase
    .from("clients")
    .update({ lead_source: cleaned } as never)
    .eq("id", clientId);
  if (error) throw error;

  await supabase
    .from("client_profile")
    .update({ lead_source: cleaned } as never)
    .eq("client_id", clientId);

  if (opts?.sourceLeadId) {
    await supabase
      .from("leads")
      .update({ lead_source: cleaned } as never)
      .eq("id", opts.sourceLeadId);
  }

  await appendClientActivityLog({
    clientId,
    leadId: opts?.sourceLeadId ?? null,
    action: "lead_source_changed",
    summary: cleaned ? `Lead source set to ${cleaned}` : "Lead source cleared",
    previousValue: opts?.previousSource ?? null,
    newValue: cleaned,
  }).catch(() => {});
}

export async function updateClientRating(
  clientId: string,
  rating: number | null,
  opts?: { previousRating?: number | null },
): Promise<void> {
  const value = rating != null && rating >= 1 && rating <= 5 ? rating : null;
  const { error: rpcError } = await supabase.rpc("update_client_rating" as never, {
    _client_id: clientId,
    _rating: value,
  } as never);
  if (rpcError) {
    const { error: directError } = await supabase
      .from("clients")
      .update({ client_rating: value } as never)
      .eq("id", clientId);
    const error = directError ?? rpcError;
    throw formatClientMetaWriteError(error, "client rating");
  }

  await appendClientActivityLog({
    clientId,
    action: "client_rating_changed",
    summary: value ? `Client rating set to ${value} stars` : "Client rating cleared",
    previousValue: opts?.previousRating != null ? String(opts.previousRating) : null,
    newValue: value != null ? String(value) : null,
  }).catch(() => {});
}
