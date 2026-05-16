export const COUNTRIES = [
  "Canada", "United Kingdom", "United States", "Germany", "Australia",
  "New Zealand", "Ireland", "France", "Netherlands", "Italy",
] as const;

export const APPLICATION_TYPES = [
  "Student Visa (SDS)",
  "Student Visa (Non-SDS)",
  "Permanent Residency",
  "University Admission",
  "Work Permit",
  "Visitor Visa",
  "Spousal Sponsorship",
] as const;

export const DOCUMENT_TYPES = [
  "Passport",
  "Birth Certificate",
  "SOP",
  "Resume",
  "Academic Transcripts",
  "Financial Documents",
  "Visa Forms",
  "Offer Letter",
  "GIC Certificate",
  "Tuition Fee Receipt",
  "Medical Report",
  "IELTS / Language Test",
  "English Language Proficiency Test",
  "Provincial Attestation Letter",
  "Photograph",
  "Marriage Certificate",
  "Divorce Certificate",
  "Police Clearance",
  "Affidavit of Support",
  "Sponsorship Letter",
  "Property Documents",
  "Employment Letter",
  "Experience Letter",
  "No Objection Certificate",
  "Other",
] as const;

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  commission_admin: "Commission admin",
  counselor: "Edit",
  documentation: "Edit",
  telecaller: "Telecaller",
  viewer: "Viewer",
};

export const ROLE_COLORS: Record<string, string> = {
  admin: "bg-secondary text-secondary-foreground",
  commission_admin: "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 dark:text-emerald-300",
  counselor: "bg-primary text-primary-foreground",
  documentation: "bg-accent text-accent-foreground border border-primary/20",
  telecaller: "bg-amber-500/15 text-amber-700 border border-amber-500/30 dark:text-amber-300",
  viewer: "bg-muted text-muted-foreground",
};

export function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9]/g, "");
}

/** Today's date in YYYY-MM-DD using the user's local timezone. */
function todayPrefix(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildDocumentName(docType: string, clientName: string, version: number, ext: string) {
  const cleanType = sanitizeName(docType);
  const cleanClient = sanitizeName(clientName);
  const v = version > 1 ? `_v${version}` : "";
  return `${todayPrefix()}_${cleanType}_${cleanClient}${v}.${ext}`;
}

/**
 * Person-aware filename: `{YYYY-MM-DD}_{Type}_{Role}_{PersonName}_v{n}.{ext}`.
 * For shared documents pass roleLabel="Shared" and personName="" (omitted).
 */
export function buildPersonDocumentName(
  docType: string,
  roleLabel: string,
  personName: string,
  version: number,
  ext: string,
) {
  const cleanType = sanitizeName(docType);
  const cleanRole = sanitizeName(roleLabel);
  const cleanPerson = sanitizeName(personName);
  const v = version > 1 ? `_v${version}` : "";
  const tail = cleanPerson ? `_${cleanPerson}` : "";
  return `${todayPrefix()}_${cleanType}_${cleanRole}${tail}${v}.${ext}`;
}