import { supabase } from "@/integrations/supabase/client";

export async function logActivity(
  action: string,
  entityType?: string,
  entityId?: string,
  details?: Record<string, unknown>,
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("activity_logs").insert({
    user_id: user.id,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    details: (details ?? {}) as never,
  });
}