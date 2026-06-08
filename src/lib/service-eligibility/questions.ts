import { supabase } from "@/integrations/supabase/client";
import type { EligibilityQuestion } from "./types";
import { parseQuestionOptions } from "./evaluate";

export async function fetchEligibilityQuestions(libraryId: string): Promise<EligibilityQuestion[]> {
  const { data, error } = await supabase
    .from("service_eligibility_questions")
    .select("*")
    .eq("library_id", libraryId)
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    library_id: row.library_id,
    code: row.code,
    section: row.section,
    label: row.label,
    help_text: row.help_text,
    q_type: row.q_type,
    options: parseQuestionOptions(row.options),
    conditional_on: row.conditional_on as EligibilityQuestion["conditional_on"],
    rule: (row.rule ?? {}) as EligibilityQuestion["rule"],
    prefill_field: row.prefill_field,
    allows_pending_note: row.allows_pending_note ?? false,
    sort_order: row.sort_order ?? 0,
  }));
}

const CLIENT_PREFILL_FIELDS = [
  "passport_expiry",
  "study_permit_expiry",
  "country",
  "country_of_citizenship",
  "country_of_residence",
  "english_test",
  "english_overall",
] as const;

export async function prefillEligibilityFromClient(
  clientId: string,
  questions: EligibilityQuestion[],
): Promise<Record<string, unknown>> {
  const { data: client } = await supabase
    .from("clients")
    .select(CLIENT_PREFILL_FIELDS.join(","))
    .eq("id", clientId)
    .maybeSingle();
  if (!client) return {};

  const answers: Record<string, unknown> = {};
  const today = new Date();

  for (const q of questions) {
    if (!q.prefill_field?.startsWith("clients.")) continue;
    const field = q.prefill_field.replace("clients.", "");
    const val = (client as Record<string, unknown>)[field];
    if (val == null || val === "") continue;

    if (q.q_type === "yes_no" && (field.includes("expiry") || field.includes("date"))) {
      const d = new Date(String(val));
      if (!Number.isNaN(d.getTime())) {
        answers[q.code] = d > today;
      }
    } else if (q.q_type === "date") {
      answers[q.code] = String(val).slice(0, 10);
    }
  }

  return answers;
}

export function buildPublicEligibilityUrl(libraryId: string, country?: string | null): string {
  const p = new URLSearchParams();
  p.set("library_id", libraryId);
  if (country) p.set("country", country);
  return `${window.location.origin}/eligibility/check?${p.toString()}`;
}
