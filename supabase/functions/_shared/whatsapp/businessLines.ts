import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const DEFAULT_HELPLINE_LINE_ID = "a0000000-0000-4000-8000-000000000001";

export type BusinessLine = {
  id: string;
  label: string;
  meta_waba_id: string | null;
  meta_phone_number_id: string;
  display_phone: string | null;
  line_type: "helpline" | "counselor";
  assigned_user_id: string | null;
  is_default: boolean;
  active: boolean;
};

export async function resolveBusinessLine(
  admin: SupabaseClient,
  metaPhoneNumberId: string | null | undefined,
): Promise<BusinessLine | null> {
  const envDefault = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim();

  if (metaPhoneNumberId) {
    const { data } = await admin
      .from("whatsapp_business_lines")
      .select("*")
      .eq("meta_phone_number_id", metaPhoneNumberId)
      .eq("active", true)
      .maybeSingle();
    if (data) return data as BusinessLine;
  }

  if (envDefault) {
    const { data } = await admin
      .from("whatsapp_business_lines")
      .select("*")
      .eq("meta_phone_number_id", envDefault)
      .eq("active", true)
      .maybeSingle();
    if (data) return data as BusinessLine;
  }

  const { data: fallback } = await admin
    .from("whatsapp_business_lines")
    .select("*")
    .eq("is_default", true)
    .eq("active", true)
    .maybeSingle();
  return (fallback as BusinessLine) ?? null;
}

export async function getConversationSendLine(
  admin: SupabaseClient,
  businessLineId: string | null | undefined,
): Promise<{ metaPhoneNumberId: string; line: BusinessLine | null }> {
  const envDefault = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim() || "";

  if (businessLineId) {
    const { data: line } = await admin
      .from("whatsapp_business_lines")
      .select("*")
      .eq("id", businessLineId)
      .eq("active", true)
      .maybeSingle();
    if (line?.meta_phone_number_id && line.meta_phone_number_id !== "CONFIGURE_ME") {
      return { metaPhoneNumberId: line.meta_phone_number_id, line: line as BusinessLine };
    }
  }

  if (envDefault) {
    return { metaPhoneNumberId: envDefault, line: null };
  }

  return { metaPhoneNumberId: "", line: null };
}
