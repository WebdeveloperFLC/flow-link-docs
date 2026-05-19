import { z } from "zod";

export const GENDERS = ["male", "female", "other", "prefer_not_to_say"] as const;
export const MARITAL_STATUSES = ["single", "married", "divorced", "widowed", "separated"] as const;
export const LAST_EDUCATIONS = ["10th", "12th", "under_graduate", "graduate", "other"] as const;

const baseFields = {
  first_name: z.string().trim().min(1, "First name required"),
  last_name: z.string().trim().min(1, "Last name required"),
  middle_name: z.string().trim().optional().nullable(),
  email: z.string().trim().email("Valid email required").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  phone_country_code: z.string().trim().optional().nullable(),
};

export const leadWarmHotSchema = z.object({
  ...baseFields,
  email: z.string().trim().email("Valid email required"),
  phone: z.string().trim().min(6, "Phone required"),
  gender: z.enum(GENDERS, { required_error: "Gender required" }),
  marital_status: z.enum(MARITAL_STATUSES).optional().nullable(),
  country_of_citizenship: z.string().trim().min(1, "Citizenship required"),
  country_of_residence: z.string().trim().min(1, "Residence required"),
  interested_countries: z.array(z.string()).min(1, "Select at least one country"),
  coaching_services: z.array(z.string()).default([]),
  visa_services: z.array(z.string()).default([]),
  admission_services: z.array(z.string()).default([]),
  allied_services: z.array(z.string()).default([]),
  travel_services: z.array(z.string()).default([]),
  visa_locked: z.boolean().default(false),
  visa_lock_reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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
  first_name: z.string().trim().min(1, "First name required"),
  last_name: z.string().trim().min(1, "Last name required"),
  email: z.string().trim().email("Valid email").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  cold_pool_campaign: z.string().optional().nullable(),
  lead_source: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).superRefine((val, ctx) => {
  if (!val.email && !val.phone) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Provide email or phone" });
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "Provide email or phone" });
  }
});

export type LeadWarmHotInput = z.infer<typeof leadWarmHotSchema>;
export type LeadColdInput = z.infer<typeof leadColdSchema>;