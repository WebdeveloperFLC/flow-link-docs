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
  director: "Director",
};

export const ROLE_COLORS: Record<string, string> = {
  admin: "bg-secondary text-secondary-foreground",
  commission_admin: "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 dark:text-emerald-300",
  counselor: "bg-primary text-primary-foreground",
  documentation: "bg-accent text-accent-foreground border border-primary/20",
  telecaller: "bg-amber-500/15 text-amber-700 border border-amber-500/30 dark:text-amber-300",
  viewer: "bg-muted text-muted-foreground",
  director: "bg-slate-500/15 text-slate-800 dark:text-slate-300",
};

export function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9]/g, "");
}

/**
 * Sanitize a filename stem while PRESERVING the user's original identity.
 * Keeps letters, digits, dot, hyphen, underscore. Spaces → underscore.
 * Strips any path separators or unsafe characters. Caps length so the final
 * storage path stays well under the 1024-char limit. Never returns "".
 */
export function sanitizeOriginalStem(name: string): string {
  const noExt = name.replace(/\.[^.]+$/, "");
  const cleaned = noExt
    .replace(/[\\/]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/^[._-]+/, "")
    .replace(/[._-]+$/, "")
    .slice(0, 80);
  return cleaned || "document";
}

/**
 * Preserve the original uploaded filename as the document's identity.
 * Appends `_v{n}` only when this is not the first version of the same slot,
 * so multiple uploads of the same name never collide silently.
 * Returns the basename WITHOUT extension (callers add `.pdf`).
 */
export function buildPreservedDocumentName(originalName: string, version: number): string {
  const stem = sanitizeOriginalStem(originalName);
  return version > 1 ? `${stem}_v${version}` : stem;
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