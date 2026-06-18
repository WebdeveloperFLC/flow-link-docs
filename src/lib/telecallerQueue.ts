import { supabase } from "@/integrations/supabase/client";

export type LeadStatus = "hot" | "warm" | "cold" | "not_interested" | "converted";

export interface QueueItem {
  id: string;
  client_id: string | null;
  lead_id: string | null;
  campaign_id: string | null;
  assigned_agent_id: string | null;
  priority: number;
  status: string;
  retry_count: number;
  next_call_at: string | null;
  last_called_at: string | null;
  notes: string | null;
  source: string | null;
  lead_status: LeadStatus | null;
  created_at: string;
}

export interface QueueClientRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  country: string;
  application_type: string;
}

export interface QueueLeadRow {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  phone: string | null;
  email: string | null;
  country_of_residence: string | null;
  interested_countries: string[] | null;
  visa_services: string[] | null;
}

export interface QueueContact {
  id: string;
  kind: "client" | "lead";
  full_name: string;
  phone: string | null;
  email: string | null;
  country: string;
  application_type: string;
}

export interface QueueItemWithClient extends QueueItem {
  client: QueueClientRow | null;
  lead: QueueLeadRow | null;
}

export function queueContactFromItem(item: QueueItemWithClient): QueueContact {
  if (item.client) {
    return {
      id: item.client.id,
      kind: "client",
      full_name: item.client.full_name,
      phone: item.client.phone,
      email: item.client.email,
      country: item.client.country,
      application_type: item.client.application_type,
    };
  }
  if (item.lead) {
    const full_name = [item.lead.first_name, item.lead.middle_name, item.lead.last_name]
      .filter(Boolean)
      .join(" ");
    const country =
      item.lead.country_of_residence?.trim() ||
      item.lead.interested_countries?.[0]?.trim() ||
      "—";
    const application_type = item.lead.visa_services?.[0]?.trim() || "Lead";
    return {
      id: item.lead.id,
      kind: "lead",
      full_name: full_name || "Lead",
      phone: item.lead.phone,
      email: item.lead.email,
      country,
      application_type,
    };
  }
  throw new Error("Queue item has no linked client or lead");
}

export async function listMyQueue(opts: { agentId?: string | null; limit?: number } = {}): Promise<QueueItemWithClient[]> {
  let q = supabase
    .from("call_queue_items")
    .select(
      "*, client:clients(id,full_name,phone,email,country,application_type), lead:leads(id,first_name,middle_name,last_name,phone,email,country_of_residence,interested_countries,visa_services)",
    )
    .in("status", ["queued", "callback", "calling"])
    .order("priority", { ascending: false })
    .order("next_call_at", { ascending: true, nullsFirst: true })
    .limit(opts.limit ?? 100);
  if (opts.agentId) q = q.eq("assigned_agent_id", opts.agentId);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as QueueItemWithClient[];
  return rows.filter((row) => row.client || row.lead);
}

export async function updateQueueItem(id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from("call_queue_items").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function setLeadStatus(id: string, lead_status: LeadStatus) {
  await updateQueueItem(id, { lead_status });
}

export async function snoozeItem(id: string, hours = 1) {
  const next = new Date(Date.now() + hours * 3600_000).toISOString();
  await updateQueueItem(id, { status: "callback", next_call_at: next });
}

export async function rescheduleItem(id: string, atIso: string) {
  await updateQueueItem(id, { status: "callback", next_call_at: atIso });
}

export async function markDone(id: string, lead_status?: LeadStatus) {
  await updateQueueItem(id, { status: "done", lead_status: lead_status ?? "converted" });
}

export async function listCampaigns() {
  const { data, error } = await supabase
    .from("call_campaigns")
    .select("id,name,status,assigned_team")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
