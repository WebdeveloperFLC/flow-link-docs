import { supabase } from "@/integrations/supabase/client";

export async function logActivity(
  action: string,
  entityType?: string,
  entityId?: string,
  details?: Record<string, unknown>,
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("activity_logs").insert({
      user_id: user.id,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      details: (details ?? {}) as never,
    });
    if (error) console.warn("activity log failed:", error.message);
  } catch (e) {
    console.warn("activity log threw:", e);
  }
}