/** Service Library rich content stored in service_library.academy_metadata (jsonb). */

export type AcademyTagVariant = "success" | "warning" | "neutral";
export type AcademyKpiTone = "primary" | "warning" | "success" | "violet";

export type ServiceAcademyMetadata = {
  displayName?: string;
  shortDescription?: string;
  version?: string;
  versionStatus?: string;
  reviewStatus?: "active" | "needs_review" | "draft";
  updatedLabel?: string;
  learningLevel?: string;
  learningMinutes?: number;
  policyAlert?: { active?: boolean; date?: string; summary?: string };
  alert?: { title?: string; body?: string };
  tags?: { label: string; variant?: AcademyTagVariant }[];
  chips?: { label: string; variant?: AcademyTagVariant }[];
  kpis?: { label: string; value: string; sub?: string; tone?: AcademyKpiTone }[];
  about?: { label: string; value: string; link?: string; warning?: boolean }[];
  eligibility?: { criterion: string; met?: boolean; note?: string }[];
  redFlagsBanner?: string;
  redFlags?: { title: string; description?: string; fix: string; severity?: string }[];
  faqs?: { q: string; a: string }[];
  compliance?: string[];
  proTips?: string[];
  postApproval?: string[];
  compare?: { columns: string[]; rows: { label: string; values: string[] }[] };
  performance?: {
    ourRate?: number;
    industryRate?: number;
    stats?: { label: string; value: string }[];
  };
  approvalFactors?: { label: string; ours: number; benchmark: number }[];
  timeline?: { weeks: string; title: string }[];
  relatedServices?: { libraryId?: string; label: string }[];
  changelog?: { version: string; date: string; author: string; summary: string }[];
  staffNotes?: { author: string; date: string; text: string }[];
  donts?: { dos?: string[]; donts?: string[]; mistakes?: string[] };
  /** Official links and reference PDFs (shown in Downloads / Resources). */
  resources?: { title: string; url: string; description?: string }[];
  /** In-app knowledge check (shown in Quiz tab). */
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  }[];
};

/** Bulk JSON template for Service Library admin. */
export const SERVICE_LIBRARY_METADATA_TEMPLATE: ServiceAcademyMetadata = {
  displayName: "Canada – Student Visa (Study Permit)",
  shortDescription: "IRCC study permit · SDS & Non-SDS pathways",
  version: "v2.4",
  versionStatus: "Live",
  reviewStatus: "active",
  updatedLabel: "Updated 28 May",
  learningLevel: "Beginner",
  learningMinutes: 15,
  policyAlert: {
    active: true,
    date: "28 May 2025",
    summary: "Canada govt fee updated — verify fee quote before sharing with clients.",
  },
  alert: {
    title: "SDS stream paused",
    body: "Route eligible clients through Non-SDS until further notice.",
  },
  tags: [
    { label: "Active service", variant: "success" },
    { label: "SDS paused", variant: "warning" },
    { label: "8–12 weeks", variant: "neutral" },
    { label: "87% approval", variant: "success" },
  ],
  chips: [
    { label: "8–12 weeks", variant: "neutral" },
    { label: "SDS paused", variant: "warning" },
    { label: "₹18,500", variant: "neutral" },
    { label: "87% approval", variant: "success" },
    { label: "14 docs", variant: "neutral" },
    { label: "IRCC – Online", variant: "neutral" },
  ],
  kpis: [
    { label: "Processing time", value: "8–12w", sub: "Increased", tone: "primary" },
    { label: "Government fee", value: "CAD $150", sub: "Updated May '25", tone: "warning" },
    { label: "Our approval rate", value: "87%", sub: "72% Industry", tone: "success" },
    { label: "Required docs", value: "14", sub: "+3 conditional", tone: "violet" },
    { label: "Consultancy fee", value: "₹18,500", sub: "+₹9,215 govt", tone: "primary" },
  ],
  about: [
    {
      label: "Description",
      value: "Study permit for designated learning institutions (DLIs) in Canada.",
    },
    { label: "Eligible applicants", value: "DLI acceptance · Proof of funds · Biometrics" },
    { label: "SDS stream", value: "Paused — use Non-SDS", warning: true },
  ],
  eligibility: [
    { criterion: "Letter of acceptance (DLI)", met: true },
    { criterion: "Proof of financial support", met: true },
    { criterion: "Biometrics completed", met: false, note: "Within 30 days of BIL" },
  ],
  redFlagsBanner:
    "If refused, do not reapply with same documents. Address the specific refusal reason first.",
  redFlags: [
    {
      title: "Insufficient / unseasoned financial proof",
      description: "Funds recently deposited or not aligned with income.",
      fix: "4–6 months seasoned funds + GIC + sponsor ITR",
      severity: "Very common",
    },
  ],
  faqs: [{ q: "Can client switch SDS to Non-SDS?", a: "Yes when SDS is paused. Re-quote fees." }],
  compliance: ["RCIC supervision for paid representation", "Client consent on file"],
  proTips: ["Book biometrics within 30 days of BIL letter."],
  postApproval: ["Maintain full-time enrollment at DLI", "Apply for PGWP within 180 days"],
  performance: {
    ourRate: 87,
    industryRate: 72,
    stats: [
      { label: "Files this year", value: "143" },
      { label: "Approved", value: "124" },
    ],
  },
  approvalFactors: [
    { label: "Our rate vs Industry", ours: 87, benchmark: 72 },
    { label: "Financial proof", ours: 82, benchmark: 68 },
  ],
  timeline: [
    { weeks: "1–2", title: "Document collection" },
    { weeks: "8–12", title: "IRCC processing" },
  ],
  changelog: [
    { version: "v2.4", date: "28 May 2025", author: "Admin", summary: "Govt fee update" },
  ],
  staffNotes: [{ author: "Admin", date: "28 May 2025", text: "Initial service library content." }],
  donts: {
    dos: ["Verify DLI before application"],
    donts: ["Do not promise SDS timelines while paused"],
    mistakes: ["Insufficient funds documentation"],
  },
};

/** @deprecated Use SERVICE_LIBRARY_METADATA_TEMPLATE */
export const ACADEMY_METADATA_TEMPLATE = SERVICE_LIBRARY_METADATA_TEMPLATE;

export function emptyServiceLibraryMetadata(): ServiceAcademyMetadata {
  return {};
}

/** @deprecated */
export const emptyAcademyMetadata = emptyServiceLibraryMetadata;

export function normalizeAcademyMetadata(raw: unknown): ServiceAcademyMetadata {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as ServiceAcademyMetadata;
}

/** Deep-merge override onto base (override wins). */
export function mergeAcademyMetadata(
  base: ServiceAcademyMetadata,
  patch: ServiceAcademyMetadata,
): ServiceAcademyMetadata {
  const out: ServiceAcademyMetadata = { ...base, ...patch };
  if (patch.donts) out.donts = { ...base.donts, ...patch.donts };
  if (patch.performance) out.performance = { ...base.performance, ...patch.performance };
  if (patch.policyAlert) out.policyAlert = { ...base.policyAlert, ...patch.policyAlert };
  if (patch.alert) out.alert = { ...base.alert, ...patch.alert };
  if (patch.compare) out.compare = patch.compare;
  return out;
}

export function parseAcademyMetadataJson(text: string): ServiceAcademyMetadata {
  const parsed = JSON.parse(text) as unknown;
  return normalizeAcademyMetadata(parsed);
}

export function exportAcademyMetadataJson(meta: ServiceAcademyMetadata): string {
  return JSON.stringify(meta, null, 2);
}

/** One item per line ↔ string array for form fields */
export function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function arrayToLines(arr: string[] | undefined): string {
  return (arr ?? []).join("\n");
}
