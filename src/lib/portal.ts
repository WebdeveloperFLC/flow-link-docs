import { supabase } from "@/integrations/supabase/client";

export async function getMyPortalClientId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("client_portal_links")
    .select("client_id, is_primary")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.client_id ?? null;
}

export const STAGE_ORDER = ["Enquiry","Profile","Documents","Assessment","Submission","Decision"] as const;
export type Stage = typeof STAGE_ORDER[number];

export function stageProgressPercent(stage: string | null | undefined): number {
  if (!stage) return 0;
  const idx = STAGE_ORDER.findIndex((s) => s.toLowerCase() === stage.toLowerCase());
  if (idx < 0) return 10;
  return Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
}

export const DEFAULT_DOCUMENT_TYPES = [
  "Passport","Academic Transcripts","SOP","LOR","IELTS Score","Resume/CV",
  "Bank Statement","Birth Certificate","Photograph","Visa Application Form",
];