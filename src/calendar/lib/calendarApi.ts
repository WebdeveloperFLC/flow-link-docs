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

// Add minutes to "HH:MM[:SS]" time string. Returns "HH:MM:SS".
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

// Diff in minutes between two HH:MM[:SS] times.
export function diffMinutes(start: string, end: string): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map((n) => parseInt(n, 10));
    return h * 60 + m;
  };
  return toMin(end) - toMin(start);
}

export async function uploadBrandingImage(
  userId: string,
  kind: "profile" | "logo",
  file: File,
): Promise<string> {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("calendar-branding")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("calendar-branding").getPublicUrl(path);
  return data.publicUrl;
}