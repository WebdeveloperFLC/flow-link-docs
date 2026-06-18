import { supabase } from "@/integrations/supabase/client";
import { appendClientActivityLog } from "@/lib/clientActivityLog";

/** Move client to visa_refused pipeline stage after a formal refusal outcome. */
export async function moveClientToVisaRefusedStage(
  clientId: string,
  pipelineId: string,
): Promise<boolean> {
  const { data: refusedStage } = await supabase
    .from("pipeline_stages")
    .select("id, label")
    .eq("pipeline_id", pipelineId)
    .eq("key", "visa_refused")
    .maybeSingle();
  if (!refusedStage?.id) return false;

  const { error } = await supabase
    .from("clients")
    .update({
      current_stage_id: refusedStage.id,
      internal_sub_status: "Reviewing refusal",
      internal_sub_status_note: "Case outcome recorded as refused",
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);
  if (error) throw error;

  await appendClientActivityLog({
    clientId,
    action: "stage_changed",
    summary: "Marked as visa refused (case outcome)",
    newValue: refusedStage.label ?? "Visa refused",
  }).catch(() => {});

  return true;
}
