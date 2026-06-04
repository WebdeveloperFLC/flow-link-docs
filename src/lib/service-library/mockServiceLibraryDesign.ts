/** Static mock data for Service Library design preview — no API. */

export type AcademyNavItem = {
  id: string;
  label: string;
  count?: number;
  active?: boolean;
};

export type AcademyNavGroup = {
  key: string;
  label: string;
  items: AcademyNavItem[];
};

export const MOCK_ACADEMY_NAV: AcademyNavGroup[] = [
  {
    key: "services",
    label: "Services",
    items: [
      { id: "visa", label: "Visa & Immigration", count: 12, active: true },
      { id: "education", label: "Education Services", count: 6 },
      { id: "financial", label: "Financial", count: 4 },
    ],
  },
  {
    key: "learning",
    label: "Learning",
    items: [
      { id: "kb", label: "Knowledge Base" },
      { id: "progress", label: "My Progress" },
      { id: "achievements", label: "Achievements" },
    ],
  },
  {
    key: "tools",
    label: "Tools",
    items: [
      { id: "fee-calc", label: "Fee Calculator" },
      { id: "downloads", label: "Downloads" },
    ],
  },
];

export const MOCK_USER = {
  name: "Rajan Mehta",
  role: "Senior Counselor",
  initials: "RM",
};

export const MOCK_POLICY_ALERT = {
  date: "28 May 2025",
  summary: "Canada govt fee updated for study permit applications.",
};

export const MOCK_SERVICE = {
  id: "ca-student",
  country: "Canada",
  countryFlag: "🇨🇦",
  category: "Visa & Immigration",
  breadcrumbTitle: "Canada – Student Visa",
  title: "Canada – Student Visa (Study Permit)",
  subtitle: "IRCC study permit · SDS & Non-SDS pathways",
  version: "v2.4",
  versionStatus: "Live",
  updatedLabel: "Updated 28 May",
  learningLevel: "Beginner",
  learningMinutes: 15,
  tags: [
    { label: "Active service", variant: "success" as const },
    { label: "SDS paused", variant: "warning" as const },
    { label: "8–12 weeks", variant: "neutral" as const },
    { label: "87% approval", variant: "success" as const },
    { label: "Beginner · 15 min", variant: "neutral" as const },
    { label: "IRCC – Online", variant: "neutral" as const },
  ],
};

export const MOCK_KPIS = [
  { label: "Processing time", value: "8–12w", sub: "Increased", tone: "primary" as const },
  { label: "Government fee", value: "CAD $150", sub: "Updated May '25", tone: "warning" as const },
  { label: "Our approval rate", value: "87%", sub: "72% Industry", tone: "success" as const },
  { label: "Required docs", value: "14", sub: "+3 conditional", tone: "violet" as const },
  { label: "Consultancy fee", value: "₹18,500", sub: "+₹9,215 govt", tone: "primary" as const },
];

export const MOCK_ABOUT: { label: string; value: string; link?: string; warning?: boolean }[] = [
  {
    label: "Description",
    value:
      "A study permit allows international students to study at designated learning institutions (DLIs) in Canada.",
  },
  {
    label: "Eligible applicants",
    value: "DLI acceptance · Proof of funds · Clean record · Biometrics · Medical (if required)",
  },
  { label: "Permit duration", value: "Length of study program + 90 days" },
  { label: "Work rights", value: "20 hrs/week on-campus; full-time during breaks" },
  { label: "Application portal", value: "IRCC – Online", link: "https://www.canada.ca/en/immigration-refugees-citizenship.html" },
  { label: "SDS stream", value: "Paused — use Non-SDS until further notice", warning: true },
];

export const MOCK_ELIGIBILITY = [
  { criterion: "Letter of acceptance (DLI)", met: true },
  { criterion: "Proof of financial support", met: true },
  { criterion: "No criminal record", met: true },
  { criterion: "Medical exam (if required)", met: false, note: "Depends on country of residence" },
  { criterion: "English proficiency (IELTS 6.0+)", met: true },
  { criterion: "Biometrics completed", met: false, note: "Within 30 days of BIL" },
];

export const MOCK_PERFORMANCE = {
  ourRate: 87,
  industryRate: 72,
  stats: [
    { label: "Files this year", value: "143" },
    { label: "Approved", value: "124" },
    { label: "Refused", value: "12" },
    { label: "In progress", value: "7" },
    { label: "Revenue (YTD)", value: "₹26L" },
  ],
};

export const MOCK_APPROVAL_FACTORS = [
  { label: "Our rate vs Industry", ours: 87, benchmark: 72 },
  { label: "Financial proof", ours: 82, benchmark: 68 },
];

export const MOCK_TRAINING = {
  percent: 30,
  sectionsRead: 3,
  sectionsTotal: 10,
  sections: [
    { label: "Overview", done: true },
    { label: "Eligibility", done: true },
    { label: "Checklist", done: true },
    { label: "Process flow", done: false },
    { label: "Red flags", done: false },
  ],
};

export const MOCK_RELATED_SERVICES = [
  { id: "pgwp", label: "PGWP – Post-Grad Work Permit" },
  { id: "sop", label: "SOP Writing Service" },
];

export const MOCK_RED_FLAGS_BANNER =
  "If refused, do not reapply with same documents. Address the specific refusal reason first.";

export const MOCK_RED_FLAGS = [
  {
    num: 1,
    title: "Insufficient / unseasoned financial proof",
    description: "Bank balance recently deposited or not aligned with declared income.",
    fix: "4–6 months seasoned funds + GIC + sponsor ITR + salary slips",
    severity: "Very common",
  },
  {
    num: 2,
    title: "Weak ties to home country",
    description: "Officer not convinced applicant will leave Canada after studies.",
    fix: "SOP must include family, career goals, and employment prospects in home country",
    severity: "Very common",
  },
  {
    num: 3,
    title: "Generic or copied SOP",
    description: "Template language or mismatch with academic history.",
    fix: "Rewrite entirely; explain academic progression and specific institution choice",
    severity: "Common",
  },
  {
    num: 4,
    title: "Undisclosed prior visa refusal",
    description: "Previous refusal not declared on IMM forms.",
    fix: "Always declare and include an explanation letter",
    severity: "Moderate",
  },
  {
    num: 5,
    title: "Unexplained academic or employment gap",
    description: "Timeline gaps without supporting narrative.",
    fix: "Address every gap in SOP with timeline and supporting documents",
    severity: "Moderate",
  },
  {
    num: 6,
    title: "Expired or below-threshold English scores",
    description: "IELTS/PTE outside validity or below program minimum.",
    fix: "Verify IELTS Academic 6.0+ overall within 2 years",
    severity: "Less common",
  },
];

export const MOCK_CHECKLIST = {
  completed: 0,
  total: 14,
  submission: [
    { id: "1", label: "Passport copy (all pages)", mandatory: true, done: false },
    { id: "2", label: "Letter of acceptance (LOA)", mandatory: true, done: false },
    { id: "3", label: "Proof of funds (GIC or bank statements)", mandatory: true, done: false },
    { id: "4", label: "SOP finalized and signed off", mandatory: true, done: false },
    { id: "5", label: "Medical exam receipt (if applicable)", mandatory: false, done: false },
    { id: "6", label: "Biometrics confirmation", mandatory: true, done: false },
  ],
  documentNotes:
    "Ensure LOA is from a DLI with valid PGWP-eligible program. Funds must cover tuition + living expenses for first year.",
};

export const MOCK_PROCESS = [
  { step: 1, title: "Intake & eligibility check", duration: "1–2 days", owner: "Counselor" },
  { step: 2, title: "Document collection", duration: "1–2 weeks", owner: "Client + Counselor" },
  { step: 3, title: "SOP & forms review", duration: "3–5 days", owner: "Documentation" },
  { step: 4, title: "Application submission", duration: "1 day", owner: "Counselor" },
  { step: 5, title: "Biometrics & medical", duration: "2–4 weeks", owner: "Client" },
  { step: 6, title: "Decision & post-approval", duration: "8–12 weeks", owner: "Counselor" },
];

export const MOCK_DOS_DONTS = {
  dos: ["Verify DLI status before application", "Use latest IRCC fee table", "Collect GIC per stream rules"],
  donts: ["Do not promise SDS timelines while paused", "Do not submit without QA review", "Do not use expired biometrics"],
  mistakes: ["Insufficient funds documentation", "SOP not aligned with program", "Missing PAL where required"],
};

export const MOCK_COMPLIANCE = [
  "RCIC supervision required for paid representation",
  "Client consent on file before submission",
  "Fee disclosure per provincial regulations",
];

export const MOCK_FAQS = [
  { q: "Can a client switch from SDS to Non-SDS?", a: "Yes if SDS is paused or criteria not met. Re-quote and update checklist." },
  { q: "Is PAL required?", a: "For UG in participating provinces — verify current IRCC list." },
  { q: "Biometrics validity?", a: "Typically 10 years — confirm on BIL letter." },
];

export const MOCK_INTERNAL_NOTES = [
  { author: "Rajan M.", date: "28 May 2025", text: "Updated govt fee and SDS pause — sync documentation team." },
  { author: "Priya S.", date: "15 May 2025", text: "PAL reminder on UG checklist." },
];

export const MOCK_CHANGELOG = [
  { version: "v2.4", date: "28 May 2025", author: "Rajan Mehta", summary: "Govt fee update; SDS paused alert" },
  { version: "v2.3", date: "12 Apr 2025", author: "Admin", summary: "PAL on checklist" },
];

export const MOCK_DOWNLOADS = [
  { name: "Study permit checklist.pdf", size: "245 KB" },
  { name: "SOP template.docx", size: "48 KB" },
];

/** @deprecated Preview uses ServiceAcademySidebar */
export const MOCK_NAV_SECTIONS = [];
export const MOCK_COUNTRIES = [];
export const MOCK_ACTIVE_COUNT = 12;
export const MOCK_REVIEW_COUNT = 3;
