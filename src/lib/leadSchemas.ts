import { z } from "zod";

export const GENDERS = ["male", "female", "other", "prefer_not_to_say"] as const;
export const MARITAL_STATUSES = ["single", "married", "divorced", "widowed", "separated"] as const;
export const LAST_EDUCATIONS = ["10th", "12th", "under_graduate", "graduate", "other"] as const;

/** CRM forms often store empty selects as `null`; coerce before Zod string checks. */
const nullToEmpty = (v: unknown) => (v == null ? "" : v);
const nullToUndefined = (v: unknown) => (v == null || v === "" ? undefined : v);

const reqString = (message: string) =>
  z.preprocess(nullToEmpty, z.string().trim().min(1, message));

const optString = () =>
  z.preprocess(nullToEmpty, z.string().trim().optional().or(z.literal("")));

const LEAD_FIELD_LABELS: Record<string, string> = {
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  phone: "Phone",
  gender: "Gender",
  country_of_citizenship: "Country of citizenship",
  country_of_residence: "Country of residence",
  interested_countries: "Interested countries",
  coaching_services: "Services",
  visa_lock_reason: "Visa lock reason",
  followup_channel: "Follow-up channel",
};

/** First human-readable validation message (never raw "Expected string, received null"). */
export function formatLeadValidationError(
  error: z.ZodError,
  fallback = "Complete required lead fields",
): string {
  const issue = error.errors[0];
  if (!issue) return fallback;
  const key = issue.path[0];
  const label =
    typeof key === "string"
      ? LEAD_FIELD_LABELS[key] ?? key.replace(/_/g, " ")
      : "field";
  if (
    issue.message === "Required" ||
    issue.message === "Expected string, received null" ||
    issue.message.startsWith("Expected string")
  ) {
    return `${label} is required`;
  }
  if (issue.message.startsWith("Invalid enum")) {
    return `${label} is required`;
  }
  return issue.message;
}

const baseFields = {
  first_name: reqString("First name required"),
  last_name: reqString("Last name required"),
  middle_name: z.preprocess(nullToEmpty, z.string().trim().optional().or(z.literal(""))),
  email: optString(),
  phone: optString(),
  phone_country_code: z.preprocess(nullToEmpty, z.string().trim().optional().or(z.literal(""))),
};

export const leadWarmHotSchema = z.object({
  ...baseFields,
  email: z.preprocess(nullToEmpty, z.string().trim().email("Valid email required")),
  phone: z.preprocess(nullToEmpty, z.string().trim().min(6, "Phone required")),
  gender: z.preprocess(
    nullToUndefined,
    z.enum(GENDERS, { required_error: "Gender required", invalid_type_error: "Gender required" }),
  ),
  marital_status: z.preprocess(
    nullToUndefined,
    z.enum(MARITAL_STATUSES).optional(),
  ),
  country_of_citizenship: reqString("Citizenship required"),
  country_of_residence: reqString("Residence required"),
  interested_countries: z.array(z.string()).min(1, "Select at least one country"),
  coaching_services: z.array(z.string()).default([]),
  visa_services: z.array(z.string()).default([]),
  admission_services: z.array(z.string()).default([]),
  allied_services: z.array(z.string()).default([]),
  travel_services: z.array(z.string()).default([]),
  visa_locked: z.boolean().default(false),
  visa_lock_reason: z.preprocess(nullToEmpty, z.string().trim().optional().or(z.literal(""))),
  notes: z.preprocess(nullToEmpty, z.string().trim().optional().or(z.literal(""))),
  next_followup_at: z.string().optional().nullable(),
  followup_channel: z.preprocess(nullToUndefined, z.string().optional()),
  followup_note: z.preprocess(nullToEmpty, z.string().trim().optional().or(z.literal(""))),
}).superRefine((val, ctx) => {
  const total =
    (val.coaching_services?.length ?? 0) +
    (val.visa_services?.length ?? 0) +
    (val.admission_services?.length ?? 0) +
    (val.allied_services?.length ?? 0) +
    (val.travel_services?.length ?? 0);
  if (total === 0 && !val.visa_locked) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["coaching_services"], message: "Select at least one service (or lock visa)" });
  }
  if (val.visa_locked && !val.visa_lock_reason?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["visa_lock_reason"], message: "Reason required when visa is locked" });
  }
});

export const leadColdSchema = z.object({
  first_name: reqString("First name required"),
  last_name: reqString("Last name required"),
  email: z.preprocess(
    nullToEmpty,
    z.string().trim().email("Valid email").optional().or(z.literal("")),
  ),
  phone: optString(),
  cold_pool_campaign: z.preprocess(nullToEmpty, z.string().trim().optional().or(z.literal(""))),
  lead_source: z.preprocess(nullToEmpty, z.string().trim().optional().or(z.literal(""))),
  notes: z.preprocess(nullToEmpty, z.string().trim().optional().or(z.literal(""))),
  next_followup_at: z.string().optional().nullable(),
  followup_channel: z.preprocess(nullToUndefined, z.string().optional()),
  followup_note: z.preprocess(nullToEmpty, z.string().trim().optional().or(z.literal(""))),
}).superRefine((val, ctx) => {
  if (!val.email && !val.phone) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Provide email or phone" });
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "Provide email or phone" });
  }
});

export type LeadWarmHotInput = z.infer<typeof leadWarmHotSchema>;
export type LeadColdInput = z.infer<typeof leadColdSchema>;
