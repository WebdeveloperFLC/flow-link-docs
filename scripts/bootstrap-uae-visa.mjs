#!/usr/bin/env node
/**
 * Bootstrap UAE visa JSON (5 services) from Malta/Portugal/Germany templates.
 * Run: node scripts/bootstrap-uae-visa.mjs
 * Then: node scripts/expand-service-quizzes.mjs
 * Then: node scripts/generate-uae-artifacts.mjs
 */
import fs from "fs";
import path from "path";
import { baseMeta, costBreakdown, miscFlcConsultancy } from "./lib/uae-service-shared.mjs";

const ROOT = path.join(process.cwd(), "content/service-library");

function load(file) {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
  delete data._instructions;
  return data;
}

function save(file, meta) {
  meta.quiz = (meta.quiz ?? []).slice(0, 8).map((q, i) => ({ ...q, level: (i % 3) + 1 }));
  fs.writeFileSync(path.join(ROOT, file), JSON.stringify(meta, null, 2) + "\n");
  console.log(`Created ${file}`);
}

function replaceAll(obj, pairs) {
  let s = JSON.stringify(obj);
  for (const [from, to] of pairs) s = s.split(from).join(to);
  return JSON.parse(s);
}

const COMMON = [
  ["Malta", "United Arab Emirates"],
  ["Maltesey", "UAE"],
  ["Maltese", "UAE"],
  ["Identity Malta", "ICP UAE / GDRFA"],
  ["identitymalta.com", "u.ae/en/icp"],
  ["Schengen", "UAE"],
  ["€75", "AED 1,000+"],
  ["€90", "AED 1,000+"],
  ["€60–90", "AED 500–1,000"],
  ["6–12 weeks", "2–4 weeks"],
  ["APS", "document attestation"],
  ["Ausländerbehörde", "GDRFA / ICP"],
];

// —— Student ——
const student = replaceAll(load("portugal-student-visa.json"), [
  ...COMMON,
  ["Portugal – Student Visa (National D Visa)", "United Arab Emirates – Student Residence Visa"],
  ["Portugal – Student Visa", "United Arab Emirates – Student Residence Visa"],
  ["Portuguese", "English"],
  ["Portuguesey", "UAE"],
  ["Portugal", "United Arab Emirates"],
  ["SEF / AIMA", "GDRFA / ICP"],
  ["vistos.mne.gov.pt", "u.ae/en/icp"],
]);

Object.assign(student, baseMeta(
  "United Arab Emirates – Student Residence Visa",
  "KHDA / SPEA / ADEK · University sponsorship · Dubai, Sharjah, Abu Dhabi · India route",
  22,
), {
  policyAlert: {
    active: true,
    date: "10 Jun 2026",
    summary: "Student visa requires licensed institution sponsorship. Confirm emirate authority (GDRFA Dubai, Sharjah, Abu Dhabi) before quoting fees.",
  },
  alert: {
    title: "Licensed institution + emirate authority",
    body: "Verify university/college is licensed in the target emirate (KHDA Dubai, SPEA Sharjah, ADEK Abu Dhabi). Unlicensed agents or TR-only offers are a compliance risk.",
  },
  tags: [
    { label: "Active service", variant: "success" },
    { label: "Institution sponsorship", variant: "warning" },
    { label: "2–4 weeks", variant: "neutral" },
    { label: "Emirates ID after arrival", variant: "neutral" },
    { label: "Dubai · Sharjah · Abu Dhabi", variant: "neutral" },
  ],
  chips: [
    { label: "2–4 weeks", variant: "neutral" },
    { label: "₹15,000 consultancy", variant: "neutral" },
    { label: "University sponsor", variant: "success" },
    { label: "Medical + Emirates ID", variant: "warning" },
  ],
  kpis: [
    { label: "Processing time", value: "2–4w", sub: "After complete file + sponsor NOC", tone: "primary" },
    { label: "Government fee", value: "AED 1,000+", sub: "+ visa typing & medical", tone: "warning" },
    { label: "Our approval rate", value: "92%", sub: "~80% benchmark", tone: "success" },
    { label: "Required docs", value: "16", sub: "+ attestation & sponsor letter", tone: "violet" },
    { label: "Consultancy fee", value: "₹15,000", sub: "+ govt & third-party", tone: "primary" },
  ],
  about: [
    { label: "Description", value: "Student residence visa for full-time study at a UAE-licensed university or college in Dubai, Sharjah, or Abu Dhabi. Institution acts as sponsor; entry permit issued from India, then Emirates ID and residence stamping after arrival and medical." },
    { label: "Eligible applicants", value: "Unconditional admission from licensed institution · Tuition/deposit paid per offer · Passport 6+ months validity · Medical fitness · Security clearance · Indian documents attested (MOFA UAE where required)" },
    { label: "Emirate authorities", value: "Dubai: GDRFA Dubai + KHDA · Sharjah: GDRFA Sharjah + SPEA · Abu Dhabi: ICP / ADEK — route depends on campus location", warning: true },
    { label: "Proof of funds", value: "Tuition payment receipt + living support per institution guidelines; sponsor may require bank statements or sponsor undertaking.", warning: true },
    { label: "Key authority", value: "ICP UAE (u.ae/en/icp) · GDRFA (emirate) · VFS Global UAE India · Licensed university/college" },
    { label: "After approval", value: "Enter UAE on entry permit; complete medical; apply Emirates ID; residence visa stamping; register with institution. Part-time work may require university NOC (typically max 15 hrs/week in term)." },
  ],
  eligibility: [
    { criterion: "Admission from KHDA/SPEA/ADEK-licensed institution", met: true },
    { criterion: "Tuition deposit or payment receipt", met: false, note: "Required before visa processing" },
    { criterion: "Passport valid 6+ months", met: true },
    { criterion: "Indian documents attested (MOFA UAE as required)", met: false, note: "Allow 2–4 weeks" },
    { criterion: "Medical fitness test (UAE-approved)", met: false, note: "After arrival or as directed" },
    { criterion: "Institution visa processing fee paid", met: false },
    { criterion: "Security clearance / GDRFA approval", met: false, note: "Institution submits" },
    { criterion: "Accommodation proof in UAE", met: false },
  ],
  redFlagsBanner: "After refusal, address sponsor file gaps before rebooking. Never use unlicensed institutions or visa runners.",
  redFlags: [
    { title: "Unlicensed college or fake admission", description: "Institution not on KHDA/SPEA/ADEK list.", fix: "Verify license on official emirate education portal before fees", severity: "Very common" },
    { title: "Tuition not paid before visa", description: "Sponsor cannot proceed without payment proof.", fix: "Collect university receipt matching offer letter", severity: "Very common" },
    { title: "Wrong emirate authority", description: "Dubai file submitted for Sharjah campus.", fix: "Match GDRFA/ICP to physical campus emirate", severity: "Common" },
    { title: "Attestation incomplete", description: "Indian degree/marksheets not MOFA attested.", fix: "MEA → UAE Embassy India → MOFA UAE chain", severity: "Common" },
    { title: "Emirates ID delay", description: "Student did not complete medical/ID after arrival.", fix: "Institution PRO timeline — complete within 30 days", severity: "High" },
    { title: "Prior UAE overstay", description: "Hidden overstay or absconding record.", fix: "GDRFA history check; disclose and remediate fines", severity: "High" },
  ],
  faqs: [
    { q: "Can we guarantee UAE student visa approval?", a: "No. GDRFA/ICP decides based on sponsor file and security checks. Never promise approval." },
    { q: "Which emirate authority for Dubai students?", a: "GDRFA Dubai with KHDA-licensed institution sponsorship." },
    { q: "Can students work part-time?", a: "Limited part-time work with university NOC — verify current MOHRE rules; not full-time employment." },
    { q: "How to apply from India?", a: "Institution-sponsored entry permit via GDRFA/ICP channels; VFS or embassy attestation for documents as required." },
    { q: "What after arrival?", a: "Medical test, Emirates ID biometrics, residence visa stamping, university registration." },
  ],
  proTips: [
    "Confirm campus emirate before quoting GDRFA fees",
    "Start MOFA attestation when offer letter arrives",
    "Use institution PRO for filing — avoid freelance visa runners",
    "Warn clients: UAE student visa is not a work permit",
  ],
  postApproval: [
    "Complete medical and Emirates ID within institution timeline",
    "Register for orientation on first week",
    "Discuss dependent visa separately if spouse plans to join",
  ],
  timeline: [
    { weeks: "1–2", title: "Offer letter, tuition payment, attestation start" },
    { weeks: "2–3", title: "Institution submits to GDRFA/ICP" },
    { weeks: "3–4", title: "Entry permit issued — travel to UAE" },
    { weeks: "Arrival", title: "Medical, Emirates ID, residence stamping" },
  ],
  resources: [
    { title: "ICP UAE — Federal Authority", url: "https://u.ae/en/icp", description: "Visa and residency services" },
    { title: "GDRFA Dubai", url: "https://www.gdrfad.gov.ae/", description: "Dubai visas and residency" },
    { title: "KHDA Dubai", url: "https://www.khda.gov.ae/", description: "Licensed Dubai institutions" },
    { title: "ADEK Abu Dhabi", url: "https://www.adek.gov.ae/", description: "Abu Dhabi education licensing" },
    { title: "VFS Global — UAE", url: "https://visa.vfsglobal.com/", description: "Verify India application centre" },
  ],
  staffNotes: [
    { author: "Documentation team", date: "10 Jun 2026", text: "Match emirate to campus — Dubai/Sharjah/Abu Dhabi have different GDRFA/ICP workflows." },
  ],
  workingRights: {
    applicant: {
      summary: "Part-time work possible with university NOC during studies — typically capped around 15 hours/week in academic term; verify MOHRE and institution policy.",
      details: ["Full-time employment requires separate work permit", "Internships may need additional approvals"],
      restrictions: ["Cannot work without NOC", "Sector restrictions may apply"],
      sourceUrl: "https://u.ae/en/icp",
      lastVerified: "Jun 2026",
    },
    spouse: { summary: "Dependants may apply for separate residence visa sponsored by student if institution and salary/funds criteria met.", details: [], restrictions: [], sourceUrl: "https://u.ae/en/icp", lastVerified: "Jun 2026" },
  },
  fullCostBreakdown: costBreakdown(
    "Full cost breakdown — UAE Student Residence Visa",
    [
      { id: "fees", label: "Government & visa fees", items: [
        { label: "Entry permit / visa issuance", range: "AED 1,000–3,000", unit: "approx.", currency: "AED", applicable: true, notes: "Varies by emirate and institution" },
        { label: "Emirates ID + medical", range: "AED 500–1,000", currency: "AED", applicable: true },
        { label: "Visa change / stamping", range: "AED 500–1,500", currency: "AED", applicable: true },
      ]},
      { id: "tuition", label: "Tuition & education", items: [
        { label: "Undergraduate tuition (UAE)", range: "AED 35,000–60,000", unit: "per year", currency: "AED", applicable: true },
        { label: "Postgraduate tuition", range: "AED 45,000–90,000", unit: "per year", currency: "AED", applicable: true },
        { label: "Institution visa processing", range: "AED 2,000–5,000", currency: "AED", applicable: true },
      ]},
      { id: "living", label: "Living costs", items: [
        { label: "Accommodation (shared)", range: "AED 1,500–3,500", unit: "per month", currency: "AED" },
        { label: "Food & transport", range: "AED 800–1,500", unit: "per month", currency: "AED" },
      ]},
      { id: "misc", label: "Miscellaneous", items: [
        ...miscFlcConsultancy("₹15,000"),
        { label: "Document attestation (India)", range: "₹5,000–15,000", notes: "MEA + UAE Embassy" },
        { label: "Flight to UAE", range: "₹25,000–55,000", notes: "Season dependent" },
      ]},
    ],
    [{ label: "Indicative first year", value: "AED 55,000–100,000+", notes: "Tuition + living + visa fees excluding consultancy." }],
    "https://u.ae/en/icp",
  ),
  relatedServices: [
    { label: "UAE — Spouse / Dependent Visa", libraryId: "b2000001-0001-4000-8000-0000000000d8" },
    { label: "UAE — Visitor Visa", libraryId: "b2000001-0001-4000-8000-0000000000d9" },
  ],
});
save("uae-student-visa.json", student);

// —— Spouse Dependent ——
const spouse = replaceAll(load("germany-spouse-visa.json"), [
  ...COMMON,
  ["Germany – Family Reunion (Spouse) Visa", "United Arab Emirates – Spouse / Dependent Visa"],
  ["Germany – Spouse Visa", "United Arab Emirates – Spouse / Dependent Visa"],
  ["German", "UAE"],
  ["Germany", "United Arab Emirates"],
]);

Object.assign(spouse, baseMeta(
  "United Arab Emirates – Spouse / Dependent Visa",
  "Resident sponsor · Salary & Ejari · Dubai, Sharjah, Abu Dhabi · India route",
  20,
), {
  policyAlert: { active: true, date: "10 Jun 2026", summary: "Dependent visa requires resident sponsor meeting salary/accommodation rules. Verify GDRFA/ICP criteria for sponsor emirate." },
  alert: { title: "Sponsor eligibility critical", body: "Sponsor must hold valid UAE residence visa with minimum salary (typically AED 4,000+ for spouse — verify current GDRFA rule) and Ejari-registered accommodation." },
  tags: [
    { label: "Active service", variant: "success" },
    { label: "Sponsor salary", variant: "warning" },
    { label: "2–4 weeks", variant: "neutral" },
    { label: "Marriage attestation", variant: "warning" },
  ],
  chips: [
    { label: "₹30,000 consultancy", variant: "neutral" },
    { label: "Ejari required", variant: "warning" },
    { label: "Resident sponsor", variant: "success" },
  ],
  kpis: [
    { label: "Processing time", value: "2–4w", sub: "After complete sponsor file", tone: "primary" },
    { label: "Government fee", value: "AED 1,000+", sub: "+ medical & Emirates ID", tone: "warning" },
    { label: "Our approval rate", value: "90%", sub: "~78% benchmark", tone: "success" },
    { label: "Required docs", value: "14", sub: "+ attested marriage cert", tone: "violet" },
    { label: "Consultancy fee", value: "₹30,000", sub: "+ govt & third-party", tone: "primary" },
  ],
  about: [
    { label: "Description", value: "Residence visa for spouse or eligible dependants of a UAE resident sponsor in Dubai, Sharjah, or Abu Dhabi. Applied from India with attested relationship documents." },
    { label: "Eligible applicants", value: "Legally married spouse or eligible dependants · Sponsor with valid UAE residence · Minimum salary threshold · Ejari-registered tenancy · Attested marriage/birth certificates" },
    { label: "Sponsor salary rule", value: "Minimum salary typically AED 4,000+ for spouse sponsorship — verify current GDRFA/ICP emirate rule before filing.", warning: true },
    { label: "Key authority", value: "GDRFA (emirate) · ICP UAE · Sponsor employer PRO or typing centre" },
    { label: "After approval", value: "Dependent enters on entry permit; completes medical; Emirates ID; residence stamping." },
  ],
  eligibility: [
    { criterion: "Sponsor holds valid UAE residence visa", met: true },
    { criterion: "Sponsor salary meets minimum (AED 4,000+ typical)", met: false, note: "Verify emirate rule" },
    { criterion: "Ejari-registered accommodation", met: false },
    { criterion: "Attested marriage certificate (MOFA UAE)", met: false, note: "MEA → UAE Embassy → MOFA UAE" },
    { criterion: "Dependent passport 6+ months valid", met: true },
    { criterion: "Relationship proof genuine and documented", met: true },
  ],
  redFlagsBanner: "Salary or Ejari gaps are the top refusal reasons — verify sponsor file before dependent travels.",
  redFlags: [
    { title: "Salary below threshold", description: "Sponsor salary under GDRFA minimum.", fix: "Salary certificate from employer; verify rule", severity: "Very common" },
    { title: "No Ejari", description: "Tenancy not registered.", fix: "Register Ejari before application", severity: "Very common" },
    { title: "Unattested marriage cert", description: "Certificate not legalised for UAE.", fix: "Full attestation chain from India", severity: "Common" },
    { title: "Sponsor on visit visa", description: "Visit visa holder cannot sponsor dependants.", fix: "Sponsor must convert to residence first", severity: "High" },
  ],
  faqs: [
    { q: "Can a student sponsor spouse?", a: "Depends on institution and emirate — many students cannot sponsor until employment visa; assess case-by-case." },
    { q: "What salary is required?", a: "Typically AED 4,000+ for spouse — verify current GDRFA Dubai/Sharjah/Abu Dhabi rule." },
    { q: "Can dependent work?", a: "May apply for work permit separately if eligible — not automatic on dependent visa." },
  ],
  proTips: ["Collect sponsor salary certificate and Ejari early", "Attest marriage certificate before India exit", "Match application to sponsor's emirate GDRFA"],
  resources: [
    { title: "GDRFA Dubai", url: "https://www.gdrfad.gov.ae/", description: "Dependent visa services" },
    { title: "ICP UAE", url: "https://u.ae/en/icp", description: "Federal residency" },
  ],
  fullCostBreakdown: costBreakdown(
    "Full cost breakdown — UAE Spouse / Dependent Visa",
    [
      { id: "fees", label: "Government & visa fees", items: [
        { label: "Dependent entry permit", range: "AED 1,000–2,500", currency: "AED", applicable: true },
        { label: "Medical + Emirates ID", range: "AED 500–900", currency: "AED", applicable: true },
        { label: "Residence stamping", range: "AED 500–1,200", currency: "AED", applicable: true },
      ]},
      { id: "misc", label: "Miscellaneous", items: [
        ...miscFlcConsultancy("₹30,000"),
        { label: "Marriage certificate attestation", range: "₹8,000–20,000", notes: "India + UAE MOFA" },
      ]},
    ],
    [],
    "https://www.gdrfad.gov.ae/",
  ),
  relatedServices: [{ label: "UAE — Student Residence Visa", libraryId: "b2000001-0001-4000-8000-0000000000cf" }],
});
save("uae-spouse-dependent-visa.json", spouse);

// —— Visitor ——
const visitor = replaceAll(load("malta-visitor-visa.json"), COMMON);
Object.assign(visitor, baseMeta(
  "United Arab Emirates – Visitor Visa (Tourist / Short Stay)",
  "Dubai · Sharjah · Abu Dhabi · 30/60/90 days · Single & multiple entry · India route",
  16,
), {
  policyAlert: { active: true, date: "10 Jun 2026", summary: "Visitor visa fees vary by emirate, duration, and entry type. Confirm variant before quoting." },
  alert: { title: "Select correct duration & entry type", body: "Dubai 30/60/90 day single vs multiple entry have different government and consultancy fees. Sharjah and Abu Dhabi variants use separate sponsor channels." },
  tags: [
    { label: "Active service", variant: "success" },
    { label: "6 Dubai variants", variant: "neutral" },
    { label: "Sharjah & Abu Dhabi", variant: "neutral" },
    { label: "2–5 days", variant: "neutral" },
  ],
  chips: [
    { label: "₹5,000–7,500", variant: "neutral" },
    { label: "30/60/90 days", variant: "neutral" },
    { label: "Single & multiple", variant: "warning" },
  ],
  kpis: [
    { label: "Processing time", value: "2–5d", sub: "E-visa / sponsor typing", tone: "primary" },
    { label: "Government fee", value: "AED 200–1,000", sub: "By duration & emirate", tone: "warning" },
    { label: "Our approval rate", value: "94%", sub: "~85% benchmark", tone: "success" },
    { label: "Required docs", value: "8", sub: "+ passport scan", tone: "violet" },
    { label: "Consultancy fee", value: "₹5,000–7,500", sub: "See Fees tab variants", tone: "primary" },
  ],
  about: [
    { label: "Description", value: "Short-stay visitor/tourist visa for UAE via Dubai, Sharjah, or Abu Dhabi routes from India. Available in 30, 60, and 90-day durations with single or multiple entry. Applied through authorised sponsor/typing centre or ICP e-visa where eligible." },
    { label: "Eligible applicants", value: "Tourism, family visit, or short business trip · Valid passport · Sponsor or authorised agent · Return travel plan · No UAE employment intent on visitor visa" },
    { label: "Dubai variants", value: "30/60/90 days — single entry and multiple entry (see Fees tab for Future Link consultancy by variant).", warning: false },
    { label: "Sharjah & Abu Dhabi", value: "Separate emirate sponsor routes with comparable duration tiers — consultancy from ₹4,500–7,500.", warning: true },
    { label: "Key authority", value: "ICP UAE · GDRFA Dubai · Sharjah / Abu Dhabi immigration · Authorised UAE sponsor or agent" },
    { label: "After approval", value: "Travel within visa validity; respect entry type and duration; overstay fines apply (AED 50/day approx. — verify current rate)." },
  ],
  eligibility: [
    { criterion: "Valid passport (6+ months)", met: true },
    { criterion: "Passport scan and photo per spec", met: true },
    { criterion: "Confirmed duration and entry type (30/60/90, single/multiple)", met: true },
    { criterion: "Emirate route selected (Dubai / Sharjah / Abu Dhabi)", met: true },
    { criterion: "Return/onward travel plan", met: true },
    { criterion: "No prior UAE overstay or ban", met: true, note: "GDRFA history check" },
    { criterion: "Sponsor or authorised agent engaged", met: false },
  ],
  redFlagsBanner: "Wrong entry type or emirate route is the most common rework — confirm variant before payment.",
  redFlags: [
    { title: "Employment on visitor visa", description: "Client intends to work.", fix: "Redirect to employment visa route", severity: "Very common" },
    { title: "Prior overstay", description: "Fine or ban not cleared.", fix: "GDRFA fine payment before reapply", severity: "High" },
    { title: "Wrong variant purchased", description: "Needed multiple entry but bought single.", fix: "Match variant to travel plan before filing", severity: "Common" },
  ],
  faqs: [
    { q: "Difference between single and multiple entry?", a: "Single allows one entry during validity; multiple allows re-entries within validity period — confirm sponsor terms." },
    { q: "Can visitor visa be extended?", a: "Extensions may be possible in UAE through sponsor — verify current GDRFA/ICP rules; do not overstay." },
    { q: "Dubai vs Sharjah visa?", a: "Must match intended emirate of stay and sponsor; not interchangeable for all purposes." },
  ],
  proTips: ["Confirm 30 vs 60 vs 90 days before payment", "Multiple entry costs more — use only if client needs re-entry", "Check GDRFA overstay history first"],
  resources: [
    { title: "ICP UAE eServices", url: "https://u.ae/en/icp", description: "Tourist e-visa information" },
    { title: "GDRFA Dubai", url: "https://www.gdrfad.gov.ae/", description: "Dubai visit visas" },
  ],
  fullCostBreakdown: costBreakdown(
    "Full cost breakdown — UAE Visitor Visa",
    [
      { id: "fees", label: "Government & sponsor fees (indicative)", items: [
        { label: "30 days single (Dubai)", range: "AED 200–350", currency: "AED", applicable: true },
        { label: "30 days multiple (Dubai)", range: "AED 500–700", currency: "AED", applicable: true },
        { label: "60 days single", range: "AED 400–600", currency: "AED", applicable: true },
        { label: "60 days multiple", range: "AED 700–950", currency: "AED", applicable: true },
        { label: "90 days single", range: "AED 700–900", currency: "AED", applicable: true },
        { label: "90 days multiple", range: "AED 900–1,200", currency: "AED", applicable: true },
      ]},
      { id: "misc", label: "Future Link consultancy (INR)", items: [
        { label: "Dubai 30D single/multiple", range: "₹5,000", notes: "Per applicant" },
        { label: "Dubai 60D single/multiple", range: "₹6,000", notes: "Per applicant" },
        { label: "Dubai 90D single", range: "₹7,000", notes: "Per applicant" },
        { label: "Dubai 90D multiple", range: "₹7,500", notes: "Per applicant" },
        { label: "Sharjah variants", range: "₹4,500–7,000", notes: "By duration/entry" },
        { label: "Abu Dhabi variants", range: "₹5,000–7,500", notes: "By duration/entry" },
      ]},
    ],
    [],
    "https://u.ae/en/icp",
  ),
});
save("uae-visitor-visa.json", visitor);

// —— Work Permit ——
const work = replaceAll(load("germany-skilled-worker.json"), [
  ...COMMON,
  ["Germany – Skilled Worker Visa", "United Arab Emirates – Employment / Work Permit"],
  ["Germany", "United Arab Emirates"],
  ["German", "UAE"],
]);

Object.assign(work, baseMeta(
  "United Arab Emirates – Employment / Work Permit",
  "MOHRE offer · Employer sponsorship · Medical · Emirates ID · India route",
  24,
), {
  policyAlert: { active: true, date: "10 Jun 2026", summary: "Employment visa requires MOHRE-approved work permit and employer sponsorship. Education certificates must be attested for skilled roles." },
  alert: { title: "MOHRE work permit first", body: "Employer obtains MOHRE pre-approval/work permit quota before employee applies entry permit from India." },
  tags: [
    { label: "Active service", variant: "success" },
    { label: "MOHRE approval", variant: "warning" },
    { label: "3–6 weeks", variant: "neutral" },
    { label: "Skilled & free-zone", variant: "neutral" },
  ],
  chips: [
    { label: "₹50,000 consultancy", variant: "neutral" },
    { label: "Employer sponsor", variant: "success" },
    { label: "Certificate attestation", variant: "warning" },
  ],
  kpis: [
    { label: "Processing time", value: "3–6w", sub: "MOHRE + GDRFA + India exit", tone: "primary" },
    { label: "Government fee", value: "AED 3,000+", sub: "+ medical & ID", tone: "warning" },
    { label: "Our approval rate", value: "88%", sub: "~75% benchmark", tone: "success" },
    { label: "Required docs", value: "18", sub: "+ attested degree", tone: "violet" },
    { label: "Consultancy fee", value: "₹50,000", sub: "Skilled MOHRE — see variants", tone: "primary" },
  ],
  about: [
    { label: "Description", value: "Employment residence visa for skilled workers sponsored by a UAE mainland (MOHRE) employer or free-zone company. Includes work permit approval, entry permit from India, medical, and Emirates ID." },
    { label: "Eligible applicants", value: "Valid job offer from licensed UAE employer · MOHRE work permit approval · Education/experience match to role · Medical fitness · Security clearance" },
    { label: "Free-zone route", value: "Free-zone companies use zone authority instead of MOHRE — verify zone-specific process (DMCC, JAFZA, ADGM, etc.).", warning: true },
    { label: "Key authority", value: "MOHRE · GDRFA/ICP (emirate) · Employer PRO · UAE Embassy India (attestation)" },
    { label: "After approval", value: "Enter UAE; medical; Emirates ID; labour card (MOHRE); sign employment contract in UAE." },
  ],
  eligibility: [
    { criterion: "Signed offer from licensed UAE employer", met: true },
    { criterion: "MOHRE work permit / pre-approval obtained", met: false, note: "Employer initiates" },
    { criterion: "Degree/experience attested for UAE", met: false, note: "4–6 weeks" },
    { criterion: "Passport valid 6+ months", met: true },
    { criterion: "Medical fitness (UAE panel)", met: false },
    { criterion: "Role matches qualification (skill level)", met: true },
  ],
  redFlagsBanner: "Fake job offers and visa fee collection without MOHRE approval are fraud patterns — verify employer licence.",
  redFlags: [
    { title: "No MOHRE permit", description: "Employer has not secured work permit.", fix: "Confirm MOHRE application status before travel", severity: "Very common" },
    { title: "Fake offer letter", description: "Unlicensed company or scam.", fix: "Verify trade licence and MOHRE establishment card", severity: "Very common" },
    { title: "Degree skill mismatch", description: "Role not matching attested qualification.", fix: "MOHRE skill level check before filing", severity: "Common" },
  ],
  faqs: [
    { q: "Who pays employment visa costs?", a: "Typically employer per UAE labour law for standard hires — confirm contract terms." },
    { q: "Can visitor convert to employment?", a: "May require exit and re-entry on employment visa — verify GDRFA status change rules." },
    { q: "Free-zone vs mainland?", a: "Different sponsoring authorities — confirm zone before starting attestation." },
  ],
  resources: [
    { title: "MOHRE UAE", url: "https://www.mohre.gov.ae/", description: "Work permits and labour law" },
    { title: "ICP UAE", url: "https://u.ae/en/icp", description: "Residence visa" },
  ],
  fullCostBreakdown: costBreakdown(
    "Full cost breakdown — UAE Employment / Work Permit",
    [
      { id: "fees", label: "Government & labour fees", items: [
        { label: "Work permit (MOHRE)", range: "AED 300–5,000", currency: "AED", applicable: true, notes: "Skill/category dependent" },
        { label: "Entry permit + stamping", range: "AED 1,500–3,500", currency: "AED", applicable: true },
        { label: "Medical + Emirates ID", range: "AED 500–1,000", currency: "AED", applicable: true },
        { label: "Labour card", range: "AED 1,000–2,000", currency: "AED", applicable: true },
      ]},
      { id: "misc", label: "Miscellaneous", items: [
        ...miscFlcConsultancy("₹50,000 skilled MOHRE"),
        { label: "Free-zone package", range: "₹55,000", notes: "Consultancy — zone dependent" },
        { label: "Domestic worker route", range: "₹35,000", notes: "Consultancy — separate category" },
        { label: "Degree attestation", range: "₹10,000–25,000", notes: "India + UAE MOFA" },
      ]},
    ],
    [],
    "https://www.mohre.gov.ae/",
  ),
});
save("uae-work-permit.json", work);

// —— Golden Visa ——
const golden = replaceAll(load("usa-green-card.json"), [
  ...COMMON,
  ["USA – Green Card (Employment & Family)", "United Arab Emirates – Golden Visa (Long-Term Residence)"],
  ["United States", "United Arab Emirates"],
  ["US ", "UAE "],
]);

Object.assign(golden, baseMeta(
  "United Arab Emirates – Golden Visa (Long-Term Residence)",
  "5–10 year residence · Investor · Talent · Property · Entrepreneur · India route",
  26,
), {
  policyAlert: { active: true, date: "10 Jun 2026", summary: "Golden Visa categories have distinct investment/salary thresholds. Verify ICP category criteria before quoting." },
  alert: { title: "Category-specific thresholds", body: "Investor, real estate (AED 2M+), talented professional, entrepreneur, scientist, and outstanding student routes have different evidence requirements." },
  tags: [
    { label: "Active service", variant: "success" },
    { label: "5–10 year residence", variant: "success" },
    { label: "6+ categories", variant: "neutral" },
    { label: "4–8 weeks", variant: "neutral" },
  ],
  chips: [
    { label: "₹65,000–95,000", variant: "neutral" },
    { label: "Long-term", variant: "success" },
    { label: "ICP nomination", variant: "warning" },
  ],
  kpis: [
    { label: "Processing time", value: "4–8w", sub: "After complete category file", tone: "primary" },
    { label: "Government fee", value: "AED 2,000+", sub: "+ medical & ID", tone: "warning" },
    { label: "Our approval rate", value: "82%", sub: "~68% benchmark", tone: "success" },
    { label: "Required docs", value: "20+", sub: "Category-specific", tone: "violet" },
    { label: "Consultancy fee", value: "₹65,000–95,000", sub: "By category — Fees tab", tone: "primary" },
  ],
  about: [
    { label: "Description", value: "Long-term UAE residence visa (typically 5 or 10 years) for investors, property owners, entrepreneurs, talented professionals, scientists, and outstanding students without employer sponsorship requirement in many categories." },
    { label: "Eligible categories", value: "Investor/partner · Real estate (AED 2M+ property) · Entrepreneur · Talented professional (salary AED 30k+/15k+ with conditions) · Scientist/researcher · Outstanding student (95%+ / top graduates)" },
    { label: "Property route", value: "Own fully paid property worth AED 2 million+ (mortgage rules apply — verify ICP current criteria).", warning: true },
    { label: "Key authority", value: "ICP UAE Golden Visa services · Emirate-specific nomination (GDRFA, ADRO, etc.)" },
    { label: "After approval", value: "Medical, Emirates ID, long-term residence stamping; sponsor self or family dependants per category rules." },
  ],
  eligibility: [
    { criterion: "Qualifying category identified (investor/talent/property/etc.)", met: true },
    { criterion: "Threshold investment/salary/achievement met", met: false, note: "Category-specific" },
    { criterion: "Passport valid 6+ months", met: true },
    { criterion: "Clean UAE immigration history", met: true },
    { criterion: "Medical fitness", met: false },
    { criterion: "Category-specific evidence bundle complete", met: false, note: "Bank letters, title deed, salary certs, awards" },
  ],
  redFlagsBanner: "Property valuation and mortgage status are common Golden Visa failure points — verify with ICP before client commits.",
  redFlags: [
    { title: "Property below AED 2M threshold", description: "Title deed value insufficient.", fix: "ICP valuation check before purchase", severity: "Very common" },
    { title: "Salary threshold not met", description: "Talent route salary under minimum.", fix: "Salary certificate + bank credits 6 months", severity: "Common" },
    { title: "Incomplete investment proof", description: "Partner/investor capital not evidenced.", fix: "Audited statements and MOFA docs", severity: "Common" },
  ],
  faqs: [
    { q: "Can Golden Visa holder work anywhere?", a: "Many categories allow self-sponsorship; verify work rights for specific Golden Visa type." },
    { q: "Can family be included?", a: "Spouse and children often sponsored under main holder — verify category rules." },
    { q: "Property off-plan eligible?", a: "Rules vary — fully paid and handover status matter; verify ICP current policy." },
  ],
  resources: [
    { title: "ICP Golden Visa", url: "https://u.ae/en/icp", description: "Official long-term residence" },
    { title: "UAE Government Portal", url: "https://u.ae/", description: "Golden Visa overview" },
  ],
  fullCostBreakdown: costBreakdown(
    "Full cost breakdown — UAE Golden Visa",
    [
      { id: "fees", label: "Government fees", items: [
        { label: "Golden Visa issuance", range: "AED 2,000–5,000", currency: "AED", applicable: true },
        { label: "Medical + Emirates ID", range: "AED 500–1,000", currency: "AED", applicable: true },
        { label: "Dependent addition", range: "AED 1,000–3,000", unit: "per dependant", currency: "AED", applicable: true },
      ]},
      { id: "investment", label: "Category thresholds (not FLC fees)", items: [
        { label: "Real estate route", range: "AED 2,000,000+", notes: "Property value minimum — verify ICP", currency: "AED", applicable: true },
        { label: "Investor/partner capital", range: "AED 500,000–2,000,000+", notes: "Category dependent", currency: "AED", applicable: true },
        { label: "Talent salary (typical)", range: "AED 15,000–30,000+", unit: "per month", notes: "Category dependent", currency: "AED", applicable: true },
      ]},
      { id: "misc", label: "Future Link consultancy (INR)", items: [
        { label: "Investor / partner", range: "₹95,000", notes: "Full case management" },
        { label: "Real estate (property)", range: "₹85,000", notes: "Title deed + ICP file" },
        { label: "Entrepreneur", range: "₹90,000", notes: "Business plan + nomination" },
        { label: "Talented professional", range: "₹75,000", notes: "Salary + achievement evidence" },
        { label: "Scientist / researcher", range: "₹80,000", notes: "Academic credentials" },
        { label: "Outstanding student", range: "₹65,000", notes: "University nomination" },
      ]},
    ],
    [],
    "https://u.ae/en/icp",
  ),
});
save("uae-golden-visa.json", golden);

console.log("Done. Run: node scripts/expand-service-quizzes.mjs && node scripts/generate-uae-artifacts.mjs");
