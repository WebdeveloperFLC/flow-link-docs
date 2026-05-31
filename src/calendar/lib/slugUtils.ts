import { supabase } from "@/integrations/supabase/client";

export function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

export function isValidSlug(s: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
}

export async function suggestProfileSlug(base: string): Promise<string> {
  const clean = slugify(base) || "user";
  const { data, error } = await (supabase as any).rpc("fn_suggest_profile_slug", { _base: clean });
  if (error) throw error;
  return (data as string) || clean;
}

export async function suggestMeetingSlug(userId: string, base: string): Promise<string> {
  const clean = slugify(base) || "meeting";
  const { data, error } = await (supabase as any).rpc("fn_suggest_meeting_slug", {
    _user: userId,
    _base: clean,
  });
  if (error) throw error;
  return (data as string) || clean;
}

export function buildBookingUrl(userSlug: string, meetingSlug?: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return meetingSlug
    ? `${origin}/book/${userSlug}/${meetingSlug}`
    : `${origin}/book/${userSlug}`;
}

export function buildVisitorPortalUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/appointment/${token}`;
}