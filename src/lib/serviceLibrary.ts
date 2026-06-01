import { supabase } from "@/integrations/supabase/client";
import { REGIONS } from "@/lib/regions";

export const ALLOWED_SERVICE_LIBRARY_COUNTRIES: string[] = [
  ...new Set(REGIONS.flatMap((r) => r.countries)),
].sort();
export const ALLOWED_COUNTRY_SET = new Set(ALLOWED_SERVICE_LIBRARY_COUNTRIES);

export type Override = {
  id: string;
  library_id: string;
  country: string;
  quick_guide_what_to_do: string | null;
  quick_guide_common_mistakes: string | null;
  quick_guide_escalation_rules: string | null;
  quick_guide_important_reminders: string | null;
  checklist_text: string | null;
  process_flow: unknown;
  cost_summary_html: string | null;
  internal_sop_html: string | null;
};

export type Master = {
  id: string;
  service_category: string;
  service: string;
  sub_service: string;
  quick_guide_what_to_do: string | null;
  quick_guide_common_mistakes: string | null;
  quick_guide_escalation_rules: string | null;
  quick_guide_important_reminders: string | null;
  checklist_text: string | null;
  cost_summary_html: string | null;
  internal_sop_html: string | null;
  process_flow: unknown;
  display_order: number;
  is_active: boolean;
};

export type FeeItem = {
  id: string;
  library_id: string;
  country: string | null;
  fee_label: string;
  amount: string | null;
  currency: string | null;
  notes: string | null;
  display_order: number;
};

export type Attachment = {
  id: string;
  library_id: string;
  country: string | null;
  file_name: string;
  file_path: string;
  label: string | null;
  mime_type: string | null;
};

export type ChecklistFile = {
  id: string;
  library_id: string;
  country: string | null;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  version: number;
  is_current: boolean;
  uploaded_by: string | null;
  uploaded_at: string;
  notes: string | null;
};

export type SopTask = {
  id: string;
  library_id: string;
  country: string | null;
  task_text: string;
  sort_order: number;
  is_active: boolean;
};

export type SubmissionItem = {
  id: string;
  library_id: string;
  country: string | null;
  item_key: string;
  item_label: string;
  is_mandatory: boolean;
  sort_order: number;
  is_active: boolean;
};

/** Merge master + per-country override into a single resolved record. */
export function resolveForCountry(master: Master, override: Override | null) {
  return {
    quick_guide_what_to_do: override?.quick_guide_what_to_do ?? master.quick_guide_what_to_do,
    quick_guide_common_mistakes: override?.quick_guide_common_mistakes ?? master.quick_guide_common_mistakes,
    quick_guide_escalation_rules: override?.quick_guide_escalation_rules ?? master.quick_guide_escalation_rules,
    quick_guide_important_reminders: override?.quick_guide_important_reminders ?? master.quick_guide_important_reminders,
    checklist_text: override?.checklist_text ?? master.checklist_text,
    cost_summary_html: override?.cost_summary_html ?? master.cost_summary_html,
    internal_sop_html: override?.internal_sop_html ?? master.internal_sop_html,
    process_flow: override?.process_flow ?? master.process_flow,
  };
}

/** Filter rows that have a per-row country column (NULL = applies to all). */
export function scopeByCountry<T extends { country: string | null }>(rows: T[], country: string | null): T[] {
  if (!country) return rows;
  return rows.filter((r) => r.country == null || r.country === country);
}

/** Strip basic HTML tags to plain text for copy buttons. */
export function htmlToPlain(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** WhatsApp-friendly: bold markers, plain bullets, no HTML. */
export function htmlToWhatsApp(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6])\s*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/(b|strong)>/gi, "*")
    .replace(/<(b|strong)[^>]*>/gi, "*")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Email-friendly HTML (just the rich text as-is, lightly cleaned). */
export function htmlToEmail(html: string | null | undefined): string {
  return (html ?? "").trim();
}

/** Plain-text TSV of fee rows for paste into WhatsApp / email / Sheets. */
export function feeItemsToTsv(items: FeeItem[]): string {
  const header = ["Item", "Amount", "Currency", "Notes"].join("\t");
  const rows = items.map((f) =>
    [f.fee_label, f.amount ?? "", f.currency ?? "", f.notes ?? ""].join("\t"),
  );
  return [header, ...rows].join("\n");
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Resolver for use by counselor view and future Lead/Client Detail pages. */
export async function getServiceLibraryForCombo(args: {
  category: string;
  service: string;
  subService: string;
  country?: string | null;
}) {
  const { data: master, error } = await supabase
    .from("service_library")
    .select("*")
    .eq("service_category", args.category)
    .eq("service", args.service)
    .eq("sub_service", args.subService)
    .maybeSingle();
  if (error || !master) return null;

  const [overrideRes, feesRes, attachRes, filesRes, sopRes, subRes, countriesRes] = await Promise.all([
    args.country
      ? supabase
          .from("service_library_overrides")
          .select("*")
          .eq("library_id", master.id)
          .eq("country", args.country)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("service_library_fee_items").select("*").eq("library_id", master.id).order("display_order"),
    supabase.from("service_library_attachments").select("*").eq("library_id", master.id),
    supabase
      .from("service_library_checklist_files")
      .select("*")
      .eq("library_id", master.id)
      .order("version", { ascending: false }),
    supabase
      .from("service_library_sop_tasks")
      .select("*")
      .eq("library_id", master.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("service_library_submission_checklist")
      .select("*")
      .eq("library_id", master.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("service_library_countries").select("country").eq("library_id", master.id),
  ]);

  const m = master as unknown as Master;
  const o = (overrideRes.data ?? null) as Override | null;
  const resolved = resolveForCountry(m, o);

  return {
    master: m,
    override: o,
    resolved,
    countries: ((countriesRes.data as { country: string }[] | null) ?? []).map((c) => c.country),
    fee_items: scopeByCountry((feesRes.data ?? []) as FeeItem[], args.country ?? null),
    attachments: scopeByCountry((attachRes.data ?? []) as Attachment[], args.country ?? null),
    checklist_files: scopeByCountry((filesRes.data ?? []) as ChecklistFile[], args.country ?? null),
    sop_tasks: scopeByCountry((sopRes.data ?? []) as SopTask[], args.country ?? null),
    submission_items: scopeByCountry((subRes.data ?? []) as SubmissionItem[], args.country ?? null),
  };
}

/** Build a deep link to the public Service Library page for a given combo. */
export function buildShareableLink(args: {
  category: string;
  service: string;
  subService: string;
  country?: string | null;
}): string {
  const url = new URL(window.location.origin + "/service-library");
  url.searchParams.set("category", args.category);
  url.searchParams.set("service", args.service);
  url.searchParams.set("sub", args.subService);
  if (args.country) url.searchParams.set("country", args.country);
  return url.toString();
}