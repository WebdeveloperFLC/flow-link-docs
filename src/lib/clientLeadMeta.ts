import { supabase } from "@/integrations/supabase/client";
import { appendClientActivityLog } from "@/lib/clientActivityLog";

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
  const { error } = await supabase
    .from("clients")
    .update({ client_rating: value } as never)
    .eq("id", clientId);
  if (error) throw error;

  await appendClientActivityLog({
    clientId,
    action: "client_rating_changed",
    summary: value ? `Client rating set to ${value} stars` : "Client rating cleared",
    previousValue: opts?.previousRating != null ? String(opts.previousRating) : null,
    newValue: value != null ? String(value) : null,
  }).catch(() => {});
}
