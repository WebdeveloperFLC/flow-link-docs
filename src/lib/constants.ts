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
  "Photograph",
  "Other",
] as const;

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  counselor: "Counselor",
  documentation: "Documentation Team",
  viewer: "Viewer",
};

export const ROLE_COLORS: Record<string, string> = {
  admin: "bg-secondary text-secondary-foreground",
  counselor: "bg-primary text-primary-foreground",
  documentation: "bg-accent text-accent-foreground border border-primary/20",
  viewer: "bg-muted text-muted-foreground",
};

export function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9]/g, "");
}

export function buildDocumentName(docType: string, clientName: string, version: number, ext: string) {
  const cleanType = docType.replace(/\s+/g, "");
  const cleanClient = sanitizeName(clientName);
  const v = version > 1 ? `_v${version}` : "";
  return `${cleanType}_${cleanClient}${v}.${ext}`;
}