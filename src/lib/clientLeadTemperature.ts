import { supabase } from "@/integrations/supabase/client";
import { appendClientActivityLog } from "@/lib/clientActivityLog";
import type { LeadTemperature } from "@/lib/leads";

export async function updateClientLeadTemperature(
  clientId: string,
  temperature: LeadTemperature,
  opts?: { sourceLeadId?: string | null; previousTemperature?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("clients")
    .update({ lead_temperature: temperature } as never)
    .eq("id", clientId);
  if (error) throw error;

  if (opts?.sourceLeadId) {
    await supabase
      .from("leads")
      .update({ lead_temperature: temperature } as never)
      .eq("id", opts.sourceLeadId);
  }

  const { data: queue } = await supabase
    .from("call_queue_items")
    .select("id")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (queue?.id) {
    await supabase
      .from("call_queue_items")
      .update({ lead_status: temperature } as never)
      .eq("id", queue.id);
  }

  await appendClientActivityLog({
    clientId,
    leadId: opts?.sourceLeadId ?? null,
    action: "lead_temperature_changed",
    summary: `Lead importance set to ${temperature}`,
    previousValue: opts?.previousTemperature ?? null,
    newValue: temperature,
  }).catch(() => {});

  await supabase.from("client_timeline").insert({
    client_id: clientId,
    event_type: "note",
    summary: `Lead marked ${temperature}`,
    metadata: { lead_status: temperature } as never,
  });
}
