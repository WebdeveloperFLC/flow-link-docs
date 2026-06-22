/**
 * Standard binder categories (locked — simplified document workflow).
 * Binders are logical collections; generated PDFs are versioned outputs only.
 */
export const STANDARD_BINDER_CATEGORIES = [
  {
    key: "personal_documents",
    label: "Personal Documents",
    description: "Passport, photographs, birth certificates, national ID",
  },
  {
    key: "academic_documents",
    label: "Academic Documents",
    description: "Transcripts, marksheets, offer letters, CoE, CAS",
  },
  {
    key: "financial_documents",
    label: "Financial Documents",
    description: "Bank statements, ITR, GIC, proof of funds",
  },
  {
    key: "employment_documents",
    label: "Employment Documents",
    description: "Employment letters, experience letters, resume, NOC",
  },
  {
    key: "relationship_documents",
    label: "Relationship Documents",
    description: "Marriage certificate, relationship proof, wedding photos, chat history",
  },
  {
    key: "sponsor_documents",
    label: "Sponsor Documents",
    description: "Affidavit of support, sponsor financials, sponsor ID",
  },
  {
    key: "travel_documents",
    label: "Travel Documents",
    description: "Travel history, itineraries, refusal letters, invitations",
  },
  {
    key: "application_forms",
    label: "Application Forms",
    description: "Completed visa forms and signed declarations",
  },
] as const;

export type StandardBinderCategoryKey = (typeof STANDARD_BINDER_CATEGORIES)[number]["key"];

export const STANDARD_BINDER_LABEL_BY_KEY = Object.fromEntries(
  STANDARD_BINDER_CATEGORIES.map((b) => [b.key, b.label]),
) as Record<StandardBinderCategoryKey, string>;
