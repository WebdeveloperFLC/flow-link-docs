import type { ConsultancyFeeBreakdownSource, ConsultancyFeePackage } from "./types";

const DISCLAIMER =
  "Future Link standard consultancy fees for the India market (documentation, filing support, counselor oversight). GST extra where applicable. Adjust in Service Library Admin when needed.";

function pkg(id: string, label: string, amountInr: number, notes?: string): ConsultancyFeePackage {
  return {
    id,
    label,
    amountInr,
    unit: "per applicant",
    notes,
  };
}

function consult(libraryId: string, packages: ConsultancyFeePackage[]): ConsultancyFeeBreakdownSource {
  return { libraryId, lastVerified: "Jun 2026", disclaimer: DISCLAIMER, packages };
}

function single(libraryId: string, label: string, amountInr: number, notes?: string): ConsultancyFeeBreakdownSource {
  return consult(libraryId, [pkg("standard", label, amountInr, notes)]);
}

/** India-market consultancy fees — standard to premium agent range. */
export const CONSULTANCY_FEE_BREAKDOWNS: ConsultancyFeeBreakdownSource[] = [
  // —— Canada ——
  consult("b2000001-0001-4000-8000-000000000013", [
    pkg("fsw", "Express Entry — FSW (profile to PR filing)", 145000, "CRS assessment · ECA · language · ITA filing"),
    pkg("cec", "Express Entry — CEC", 145000, "Canadian experience pathway"),
    pkg("ee-pnp", "Express Entry + PNP nomination", 165000, "Provincial nomination strategy + filing"),
  ]),
  consult("c35e6051-f40f-47bf-9cac-0a386c47a336", [
    pkg("fresh-india", "Student visa — fresh case (from India)", 18000, "LOA review · SOP · financials · filing"),
    pkg("rejected-india", "Student visa — refused case (from India)", 28000, "Refusal analysis · strengthened reapply"),
    pkg("fresh-outside", "Student visa — fresh (outside India)", 22000, "Full file prep + IRCC submission"),
    pkg("rejected-outside", "Student visa — refused (outside India)", 38000, "Complex refusal remediation"),
  ]),
  consult("b2000001-0001-4000-8000-000000000011", [
    pkg("1-person", "Visitor visa — 1 applicant", 10000, "TRV documentation + filing"),
    pkg("2-persons", "Visitor visa — 2 applicants", 15000, "Family / couple file"),
    pkg("3-persons", "Visitor visa — 3 applicants", 20000, "Family file"),
    pkg("5-persons", "Visitor visa — 5 applicants", 32000, "Large family group"),
  ]),
  consult("b2000001-0001-4000-8000-000000000012", [
    pkg("spouse", "Spouse / partner PR sponsorship", 155000, "Relationship evidence · inland/outland strategy"),
  ]),
  consult("b2000001-0001-4000-8000-000000000014", [
    pkg("pgwp", "Post-Graduation Work Permit", 18000, "Eligibility check · PGWP application"),
    pkg("pgwp-extension", "PGWP extension", 18000, "Extension / status maintenance"),
  ]),
  consult("b2000001-0001-4000-8000-000000000015", [
    pkg("work-permit", "Work permit application", 55000, "LMIA / exempt category filing support"),
  ]),
  consult("b2000001-0001-4000-8000-000000000016", [
    pkg("1-person", "Super visa — 1 parent", 18000, "Insurance · LICO · invitation package"),
    pkg("2-persons", "Super visa — 2 parents", 32000, "Couple application"),
    pkg("3-persons", "Super visa — 3 applicants", 65000, "Family group"),
  ]),
  consult("b2000001-0001-4000-8000-000000000017", [
    pkg("bowp", "Bridging Open Work Permit", 55000, "AIP / PR-in-processing work rights"),
  ]),
  consult("b2000001-0001-4000-8000-000000000018", [
    pkg("extension", "Study permit extension", 18000, "Enrollment proof · extension filing"),
    pkg("coop-wp", "Study extension + co-op work permit", 22000, "Co-op letter + dual application"),
    pkg("restoration", "Study extension + restoration", 28000, "Out-of-status restoration"),
    pkg("coop-restoration", "Extension + co-op WP + restoration", 35000, "Complex status recovery"),
  ]),
  consult("b2000001-0001-4000-8000-000000000019", [
    pkg("visitor-record", "Visitor record (in Canada)", 15000, "Status extension inside Canada"),
  ]),
  consult("b2000001-0001-4000-8000-00000000001a", [
    pkg("caips", "CAIPS / GCMS notes request", 5000, "File notes retrieval"),
    pkg("docs-note", "Documents note / file review", 4500, "Counselor review of IRCC notes"),
  ]),
  consult("b2000001-0001-4000-8000-00000000001b", [
    pkg("owp", "Spouse open work permit", 45000, "Dependent OWP while PR processes"),
  ]),

  // —— UK ——
  single("b2000001-0001-4000-8000-000000000021", "Student visa (Student Route)", 28000, "CAS · funds · IHS guidance · filing"),
  single("b2000001-0001-4000-8000-000000000022", "Standard visitor visa", 12000, "Visit purpose · ties · VFS filing"),
  single("b2000001-0001-4000-8000-000000000023", "Partner / spouse visa", 95000, "Relationship evidence · financial requirements"),
  single("b2000001-0001-4000-8000-000000000024", "Skilled Worker visa", 55000, "CoS · skill level · dependants guidance"),
  single("b2000001-0001-4000-8000-000000000025", "Graduate Route", 42000, "In-country switch · eligibility review"),

  // —— USA ——
  single("b2000001-0001-4000-8000-000000000031", "F-1 student visa", 32000, "I-20 · DS-160 · SEVIS · interview prep"),
  single("b2000001-0001-4000-8000-000000000032", "B1/B2 visitor visa", 14000, "DS-160 · ties · interview coaching"),
  single("b2000001-0001-4000-8000-000000000033", "Spouse / fiancé visa (CR-1 / K-1)", 175000, "Petition support · NVC · consular prep"),
  single("b2000001-0001-4000-8000-000000000034", "Green card (employment / family)", 250000, "Multi-stage immigrant case management"),

  // —— Australia ——
  single("b2000001-0001-4000-8000-000000000041", "Student visa (Subclass 500)", 42000, "GTE · OSHC · ImmiAccount filing"),
  single("b2000001-0001-4000-8000-000000000042", "Visitor visa (Subclass 600)", 16000, "Tourist stream · genuine visitor"),
  single("b2000001-0001-4000-8000-000000000043", "Partner visa (820/801)", 185000, "Relationship stages · health · character"),
  single("b2000001-0001-4000-8000-000000000044", "Skilled migration (189/190/491)", 145000, "Skills assessment · EOI · invitation strategy"),
  single("b2000001-0001-4000-8000-000000000045", "Temporary Graduate (Subclass 485)", 52000, "Graduate work rights application"),
  single("b2000001-0001-4000-8000-000000000046", "Work & Holiday (417/462)", 22000, "Eligibility · ballot support where applicable"),

  // —— Germany ——
  single("b2000001-0001-4000-8000-000000000051", "Student visa (National D)", 38000, "Admission · blocked account · embassy filing"),
  single("b2000001-0001-4000-8000-000000000052", "Schengen visitor visa (Type C)", 12000, "Itinerary · insurance · VFS filing"),
  single("b2000001-0001-4000-8000-000000000053", "Family reunion (spouse) visa", 75000, "Marriage docs · German language · appointment"),
  single("b2000001-0001-4000-8000-000000000054", "Opportunity Card (Chancenkarte)", 65000, "Points assessment · blocked account"),
  single("b2000001-0001-4000-8000-000000000055", "Job Seeker visa", 60000, "Qualification recognition · job search plan"),

  // —— New Zealand ——
  single("b2000001-0001-4000-8000-000000000061", "Student visa", 35000, "Offer · funds · INZ online filing"),
  single("b2000001-0001-4000-8000-000000000062", "Visitor visa", 16000, "Genuine visitor · ties evidence"),
  single("b2000001-0001-4000-8000-000000000063", "Partnership visa", 135000, "Relationship evidence · residence pathway"),
  single("b2000001-0001-4000-8000-000000000064", "Skilled Migrant Category (SMC)", 175000, "EOI · points · ITA filing"),
  single("b2000001-0001-4000-8000-000000000065", "Post Study Work Visa", 48000, "NZ qualification · work rights"),

  // —— Schengen EU ——
  ...[
    ["b2000001-0001-4000-8000-000000000081", "France", "student"],
    ["b2000001-0001-4000-8000-000000000082", "France", "visitor"],
    ["b2000001-0001-4000-8000-000000000091", "Italy", "student"],
    ["b2000001-0001-4000-8000-000000000092", "Italy", "visitor"],
    ["b2000001-0001-4000-8000-0000000000a1", "Netherlands", "student"],
    ["b2000001-0001-4000-8000-0000000000a2", "Netherlands", "visitor"],
    ["b2000001-0001-4000-8000-0000000000a5", "Spain", "student"],
    ["b2000001-0001-4000-8000-0000000000a6", "Spain", "visitor"],
    ["b2000001-0001-4000-8000-0000000000a7", "Malta", "student"],
    ["b2000001-0001-4000-8000-0000000000a8", "Malta", "visitor"],
    ["b2000001-0001-4000-8000-0000000000a9", "Finland", "student"],
    ["b2000001-0001-4000-8000-0000000000aa", "Finland", "visitor"],
    ["b2000001-0001-4000-8000-0000000000ab", "Sweden", "student"],
    ["b2000001-0001-4000-8000-0000000000ac", "Sweden", "visitor"],
    ["b2000001-0001-4000-8000-0000000000ad", "Austria", "student"],
    ["b2000001-0001-4000-8000-0000000000ae", "Austria", "visitor"],
    ["b2000001-0001-4000-8000-0000000000af", "Belgium", "student"],
    ["b2000001-0001-4000-8000-0000000000b0", "Belgium", "visitor"],
    ["b2000001-0001-4000-8000-0000000000b1", "Denmark", "student"],
    ["b2000001-0001-4000-8000-0000000000b2", "Denmark", "visitor"],
    ["b2000001-0001-4000-8000-0000000000b3", "Portugal", "student"],
    ["b2000001-0001-4000-8000-0000000000b4", "Portugal", "visitor"],
  ].map(([id, country, type]) =>
    type === "student"
      ? single(id as string, `${country} student visa — full service`, 32000, "APS where required · funds · VFS filing")
      : single(id as string, `${country} Schengen visitor visa`, 11000, "Travel plan · insurance · appointment"),
  ),

  // —— Ireland ——
  single("b2000001-0001-4000-8000-0000000000a3", "Stamp 2 student permission", 30000, "Admission · funds · IRP guidance"),
  single("b2000001-0001-4000-8000-0000000000a4", "Short stay visit visa (C)", 12000, "Visit purpose · ties · VFS filing"),
];

export const CONSULTANCY_BY_LIBRARY_ID = new Map(
  CONSULTANCY_FEE_BREAKDOWNS.map((c) => [c.libraryId, c]),
);
