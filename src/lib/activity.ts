import { supabase } from "@/integrations/supabase/client";
import { appendClientActivityLog } from "@/lib/clientActivityLog";

async function resolveClientIdForActivity(
  entityType?: string,
  entityId?: string,
  details?: Record<string, unknown>,
): Promise<string | null> {
  if (entityType === "client" && entityId) return entityId;
  if (details?.client_id && typeof details.client_id === "string") return details.client_id;
  if (entityType === "document" && entityId) {
    const { data } = await supabase
      .from("client_documents")
      .select("client_id")
      .eq("id", entityId)
      .maybeSingle();
    return (data as { client_id?: string } | null)?.client_id ?? null;
  }
  return null;
}

export async function logActivity(
  action: string,
  entityType?: string,
  entityId?: string,
  details?: Record<string, unknown>,
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("activity_logs").insert({
      user_id: user.id,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      details: (details ?? {}) as never,
    });
    if (error) console.warn("activity log failed:", error.message);

    const clientId = await resolveClientIdForActivity(entityType, entityId, details);
    if (clientId) {
      const prev = details?.previous_value ?? details?.previousValue;
      const next = details?.new_value ?? details?.newValue ?? details?.file_name ?? details?.summary;
      await appendClientActivityLog({
        clientId,
        action,
        summary: typeof details?.summary === "string" ? details.summary : action.replace(/[._]/g, " "),
        previousValue: typeof prev === "string" ? prev : null,
        newValue: typeof next === "string" ? next : null,
        metadata: details ?? {},
      });
    }
  } catch (e) {
    console.warn("activity log threw:", e);
  }
}
