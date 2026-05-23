import type { PersonRole } from "@/lib/casePeople";

/** A checklist item template that a role expects by default. */
export interface RolePresetItem {
  /** Document type label — must align with master `document_types` so uploads can be linked. */
  name: string;
  mandatory: boolean;
  notes?: string;
}

/**
 * Role-aware default checklist presets.
 *
 * - Applicant uses the workflow template only (no preset) — preserves current behaviour.
 * - Non-applicants get an opinionated default checklist appropriate for their role.
 * - Synthetic ids are derived as `preset:{role}:{slug(name)}` at use-time.
 */
export const ROLE_PRESETS: Record<PersonRole, RolePresetItem[]> = {
  applicant: [],
  co_applicant: [
    { name: "Passport", mandatory: true },
    { name: "Photograph", mandatory: true },
    { name: "Academic Transcripts", mandatory: true },
    { name: "Degree Certificate", mandatory: true },
    { name: "Work Experience Letter", mandatory: false },
    { name: "CV / Resume", mandatory: true },
    { name: "IELTS Scorecard", mandatory: false },
  ],
  dependant: [
    { name: "Birth Certificate", mandatory: true },
    { name: "Passport", mandatory: true },
    { name: "Photograph", mandatory: true },
    { name: "Parent ID Proof", mandatory: true },
    { name: "School Letter", mandatory: false },
    { name: "Medical Report", mandatory: false },
  ],
  sponsor: [
    { name: "ID Proof", mandatory: true },
    { name: "Address Proof", mandatory: true },
    { name: "Bank Statements", mandatory: true, notes: "Last 6 months" },
    { name: "ITR / Tax Returns", mandatory: true, notes: "Last 3 years" },
    { name: "Salary Slips", mandatory: false },
    { name: "Employment Letter", mandatory: false },
    { name: "Relationship Proof", mandatory: true },
    { name: "Affidavit of Support", mandatory: true },
  ],
  co_sponsor: [
    { name: "ID Proof", mandatory: true },
    { name: "Address Proof", mandatory: true },
    { name: "Bank Statements", mandatory: true, notes: "Last 6 months" },
    { name: "ITR / Tax Returns", mandatory: true, notes: "Last 3 years" },
    { name: "Salary Slips", mandatory: false },
    { name: "Employment Letter", mandatory: false },
    { name: "Affidavit of Support", mandatory: true },
  ],
};

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function presetItemId(role: PersonRole, name: string): string {
  return `preset:${role}:${slug(name)}`;
}