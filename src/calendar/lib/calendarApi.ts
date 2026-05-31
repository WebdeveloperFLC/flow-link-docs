import { supabase } from "@/integrations/supabase/client";

export function slugify(input: string) {
  return (input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

export async function generateSlug(base: string): Promise<string> {
  const { data, error } = await supabase.rpc("calendar_generate_slug", { _base: base });
  if (error) throw error;
  return (data as string) || slugify(base);
}

export async function transitionEvent(
  eventId: string,
  action: "confirm" | "decline" | "cancel" | "complete",
) {
  const { data, error } = await supabase.rpc("calendar_event_transition", {
    _event_id: eventId,
    _action: action,
  });
  if (error) throw error;
  return data;
}

export function bookingUrl(slug: string) {
  if (typeof window === "undefined") return `/book/${slug}`;
  return `${window.location.origin}/book/${slug}`;
}