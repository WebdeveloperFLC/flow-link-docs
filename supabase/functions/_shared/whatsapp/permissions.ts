import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const POOL_STATUSES = new Set(["unmatched_ai_intake", "ai_counseling", "awaiting_assignment_confirm", "escalated_admin"]);
const STAFF_ROLES = new Set(["telecaller", "admin", "administrator"]);

export async function whatsappUserCanViewConversation(
  admin: SupabaseClient,
  uid: string,
  conversationId: string,
): Promise<boolean> {
  const { data: conv } = await admin
    .from("whatsapp_conversations")
    .select("id, assigned_user_id, status")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv) return false;

  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", uid);

  const roleSet = new Set((roles ?? []).map((r: { role: string }) => r.role));
  if (roleSet.has("admin") || roleSet.has("administrator")) return true;
  if (conv.assigned_user_id === uid) return true;

  if (!conv.assigned_user_id && POOL_STATUSES.has(conv.status)) {
    return [...roleSet].some((r) => STAFF_ROLES.has(r));
  }

  return false;
}
