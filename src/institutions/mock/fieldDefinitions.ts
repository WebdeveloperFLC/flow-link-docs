/**
 * Dynamic field registry. Drives <DynamicFieldGroup /> rendering for every scope.
 * Adding a new field here surfaces it everywhere automatically — no panel change required.
 * Later a DB-backed registry can replace this without touching components.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "percent"
  | "currency"
  | "date"
  | "boolean"
  | "select"
  | "multiselect";

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  group: string;
  helpText?: string;
  options?: string[];
  required?: boolean;
  defaultValue?: any;
  /** Pass current values; return true to show. */
  visibleIf?: (values: Record<string, any>) => boolean;
  /** Return error string when invalid, or null when valid. */
  validate?: (value: any, values: Record<string, any>) => string | null;
}

export type Scope =
  | "agreement"
  | "commission"
  | "claim"
  | "promotion"
  | "campaign"
  | "renewal";

const COUNTRY_OPTIONS = ["India", "Pakistan", "Bangladesh", "Nigeria", "Ghana", "Philippines", "Vietnam", "China", "Sri Lanka", "Nepal"];
const INTAKE_OPTIONS = ["January", "May", "September"];

export const FIELD_DEFINITIONS: Record<Scope, FieldDefinition[]> = {
  agreement: [
    { key: "countries_allowed", label: "Eligible countries", type: "multiselect", group: "Coverage", options: COUNTRY_OPTIONS },
    { key: "minimum_enrolments", label: "Minimum enrolments / year", type: "number", group: "Coverage" },
    { key: "governing_law", label: "Governing law", type: "text", group: "Legal" },
    { key: "termination_notice_days", label: "Termination notice (days)", type: "number", group: "Legal" },
    { key: "claim_deadline_days", label: "Claim deadline (days)", type: "number", group: "Deadlines" },
    { key: "invoice_deadline_days", label: "Invoice deadline (days)", type: "number", group: "Deadlines" },
    { key: "tax_treatment", label: "Tax treatment", type: "text", group: "Finance" },
    { key: "wire_deduction_applies", label: "Wire deduction applies", type: "boolean", group: "Finance" },
    { key: "wire_deduction_amount", label: "Wire deduction (CAD)", type: "currency", group: "Finance", visibleIf: (v) => !!v.wire_deduction_applies },
    { key: "sub_agent_allowed", label: "Sub-agents allowed", type: "boolean", group: "Channel" },
    { key: "b2b_allowed", label: "B2B allowed", type: "boolean", group: "Channel" },
    { key: "clawback_rule", label: "Clawback rule", type: "textarea", group: "Risk" },
    { key: "ai_summary", label: "AI summary", type: "textarea", group: "Notes" },
  ],
  commission: [
    { key: "payment_timing", label: "Payment timing", type: "text", group: "Payout" },
    { key: "payout_basis", label: "Payout basis", type: "select", group: "Payout", options: ["first_semester_tuition", "first_year_tuition", "per_student", "per_intake", "year_one_tuition"] },
    { key: "tax_treatment", label: "Tax treatment", type: "text", group: "Finance" },
    { key: "counselor_incentive", label: "Counselor incentive (CAD)", type: "currency", group: "Channel" },
    { key: "b2b_partner_share_pct", label: "B2B partner share %", type: "percent", group: "Channel" },
    { key: "aggregator", label: "Via aggregator", type: "boolean", group: "Channel" },
    { key: "notes", label: "Notes", type: "textarea", group: "Notes" },
  ],
  claim: [
    { key: "period_label", label: "Period label", type: "text", group: "Cycle", required: true },
    { key: "intake", label: "Intake", type: "select", group: "Cycle", options: INTAKE_OPTIONS },
    { key: "intake_processed", label: "Processed intake", type: "select", group: "Cycle", options: INTAKE_OPTIONS },
    { key: "claim_due_date", label: "Claim due date", type: "date", group: "Deadlines" },
    { key: "invoice_due_date", label: "Invoice due date", type: "date", group: "Deadlines" },
    { key: "tax_amount", label: "Tax amount", type: "currency", group: "Finance" },
    { key: "payment_mode", label: "Payment mode", type: "select", group: "Finance", options: ["wire", "cheque", "ach", "card"] },
    { key: "notes", label: "Notes", type: "textarea", group: "Notes" },
  ],
  promotion: [
    { key: "title", label: "Title", type: "text", group: "Basics", required: true },
    {
      key: "promo_type",
      label: "Promotion Type",
      type: "select",
      group: "Basics",
      required: true,
      options: ["scholarship", "seasonal", "general", "affordable", "high_demand", "fast_track", "work_permit", "coop", "pr_pathway", "low_ielts"],
    },
    {
      key: "source_type",
      label: "Source",
      type: "select",
      group: "Basics",
      options: ["manual", "flyer", "pdf", "email", "website", "spreadsheet"],
    },
    { key: "valid_from", label: "Start Date", type: "date", group: "Validity" },
    { key: "valid_to", label: "End Date", type: "date", group: "Validity" },
    { key: "target_countries", label: "Countries", type: "multiselect", group: "Eligibility", options: COUNTRY_OPTIONS },
    { key: "target_disciplines_csv", label: "Programs (optional)", type: "text", group: "Eligibility", helpText: "Comma-separated program names" },
    { key: "official_url", label: "Official URL (optional)", type: "text", group: "Links" },
    { key: "description", label: "Notes", type: "textarea", group: "Details" },
    { key: "is_active", label: "Active", type: "boolean", group: "Status", defaultValue: true },
  ],
  campaign: [
    { key: "name", label: "Name", type: "text", group: "Basics", required: true },
    { key: "period_from", label: "Period from", type: "date", group: "Validity" },
    { key: "period_to", label: "Period to", type: "date", group: "Validity" },
    { key: "channel", label: "Channel", type: "select", group: "Basics", options: ["email", "whatsapp", "social_post", "brochure", "counselor_note", "internal"] },
    { key: "bonus_logic", label: "Bonus logic", type: "textarea", group: "Payout" },
    { key: "target_countries", label: "Target countries", type: "multiselect", group: "Eligibility", options: COUNTRY_OPTIONS },
    { key: "claim_impact", label: "Claim impact", type: "text", group: "Impact" },
    { key: "renewal_impact", label: "Renewal impact", type: "text", group: "Impact" },
    { key: "is_active", label: "Active", type: "boolean", group: "Status", defaultValue: true },
  ],
  renewal: [
    { key: "fire_at", label: "Fire at", type: "date", group: "Timing" },
    { key: "threshold_days", label: "Threshold (days)", type: "number", group: "Timing" },
    { key: "notes", label: "Notes", type: "textarea", group: "Notes" },
  ],
};

export function getFields(scope: Scope): FieldDefinition[] {
  return FIELD_DEFINITIONS[scope] ?? [];
}

export function groupBy(fields: FieldDefinition[]): Record<string, FieldDefinition[]> {
  const m: Record<string, FieldDefinition[]> = {};
  for (const f of fields) (m[f.group] ??= []).push(f);
  return m;
}