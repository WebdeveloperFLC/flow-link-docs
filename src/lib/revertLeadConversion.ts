import { supabase } from "@/integrations/supabase/client";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import { appendClientActivityLog } from "@/lib/clientActivityLog";
import { fetchLead } from "@/lib/leads";

const GRACE_HOURS = 24;

export type RevertLeadConversionResult = {
  leadId: string;
  clientId: string;
  reverted: boolean;
};

/** Unlink a lead from its client file within the grace window (Wave 3 — CRM-10 full). */
export async function revertLeadConversion(opts: {
  leadId: string;
  reason?: string;
}): Promise<RevertLeadConversionResult> {
  const lead = await fetchLead(opts.leadId);
  if (!lead) throw new Error("Lead not found");
  if (!lead.converted_to_client_id) throw new Error("Lead is not linked to a client");

  const convertedAt = lead.converted_at ? new Date(lead.converted_at).getTime() : null;
  if (convertedAt != null) {
    const ageMs = Date.now() - convertedAt;
    if (ageMs > GRACE_HOURS * 3600000) {
      throw new Error(`Conversion can only be unlinked within ${GRACE_HOURS} hours`);
    }
  }

  const clientId = lead.converted_to_client_id;

  const { error: leadErr } = await supabase
    .from("leads")
    .update({
      status: "qualified",
      converted_to_client_id: null,
      converted_at: null,
    } as never)
    .eq("id", lead.id);
  if (leadErr) throw leadErr;

  const { error: clientErr } = await supabase
    .from("clients")
    .update({ source_lead_id: null } as never)
    .eq("id", clientId);
  if (clientErr) {
    throw new Error(formatSupabaseError(clientErr, "Lead unlinked but client link could not be cleared"));
  }

  await appendClientActivityLog({
    clientId,
    action: "lead_conversion_reverted",
    summary: "Lead conversion unlinked",
    newValue: lead.lead_number,
    metadata: {
      source_lead_id: lead.id,
      reason: opts.reason?.trim() || null,
    },
  }).catch(() => {});

  return { leadId: lead.id, clientId, reverted: true };
}

export function canRevertLeadConversion(lead: {
  converted_to_client_id?: string | null;
  converted_at?: string | null;
}): boolean {
  if (!lead.converted_to_client_id) return false;
  if (!lead.converted_at) return true;
  return Date.now() - new Date(lead.converted_at).getTime() <= GRACE_HOURS * 3600000;
}
