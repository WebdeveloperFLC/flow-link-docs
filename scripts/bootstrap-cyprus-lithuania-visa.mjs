#!/usr/bin/env node
/**
 * Bootstrap Cyprus + Lithuania visa JSON from Malta/Portugal templates.
 * Run: node scripts/bootstrap-cyprus-lithuania-visa.mjs
 * Then: node scripts/expand-service-quizzes.mjs
 */
import fs from "fs";
import path from "path";

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
  const s = JSON.stringify(obj);
  let out = s;
  for (const [from, to] of pairs) {
    out = out.split(from).join(to);
  }
  return JSON.parse(out);
}

// —— Cyprus Student ——
const cyprusStudent = replaceAll(load("malta-student-visa.json"), [
  ["Malta – Student Visa (National D Visa)", "Cyprus – Student Visa (Entry Permit + Pink Slip)"],
  ["Malta – Student Visa", "Cyprus – Student Visa (Entry Permit + Pink Slip)"],
  ["Identity Malta", "CRMD Cyprus"],
  ["identitymalta.com", "crmd.moi.gov.cy"],
  ["Maltesey", "Cyprus"],
  ["Maltese", "Cypriot"],
  ["Malta", "Cyprus"],
  ["APS required", "PCC apostille required"],
  ["APS", "PCC apostille"],
  ["admission documentation (India)", "PCC apostilled + Cyprus Embassy attested"],
  ["6–12 weeks", "4–8 weeks"],
  ["€75 + proof of funds", "€60–90 Entry Permit"],
  ["€75", "€60–90"],
  ["Ausländerbehörde", "CRMD district office"],
  ["Anmeldung", "university registration"],
  ["proof of funds", "financial proof (€7,000–€10,000+)"],
  ["required living funds for 2026 (12 × €992/month)", "€7,000–€10,000 bank balance benchmark (no official minimum published)"],
  ["required living funds for 2026 or equivalent", "€7,000–€10,000+ with 3–6 month bank history"],
  ["National visa (Type D) for study at a recognised Maltese university", "Two-stage student route: Entry Permit via VFS India before travel, then Temporary Residence Permit (Pink Slip) at CRMD within 7–10 days of arrival"],
  ["18-month job-seeker", "12-month post-study permit (Master's/PhD only)"],
  ["Opportunity Card", "Post-Study Residence Permit"],
]);

Object.assign(cyprusStudent, {
  shortDescription: "CRMD Cyprus · VFS India · Entry Permit → Pink Slip within 7 days",
  updatedLabel: "Updated 10 Jun 2026",
  learningMinutes: 24,
  policyAlert: {
    active: true,
    date: "10 Jun 2026",
    summary: "Cyprus is NOT Schengen — Pink Slip does not allow EU travel. Confirm fees at visa.vfsglobal.com/cyprus/india.",
  },
  alert: {
    title: "Two-stage visa + NOT Schengen",
    body: "Entry Permit before travel; Pink Slip within 7–10 days of arrival. Cyprus residence permit does NOT allow Schengen travel without a separate visa. Confirm institution is in South Cyprus (EU), not TRNC.",
  },
  tags: [
    { label: "Active service", variant: "success" },
    { label: "PCC apostille critical", variant: "warning" },
    { label: "4–8 weeks", variant: "neutral" },
    { label: "VFS appointment", variant: "neutral" },
    { label: "NOT Schengen", variant: "warning" },
  ],
  chips: [
    { label: "4–8 weeks", variant: "neutral" },
    { label: "€60–90 Entry Permit", variant: "neutral" },
    { label: "Pink Slip 7 days", variant: "warning" },
    { label: "NOT Schengen travel", variant: "warning" },
  ],
  kpis: [
    { label: "Processing time", value: "4–8w", sub: "Entry Permit via VFS India", tone: "primary" },
    { label: "Government fee", value: "€60–90", sub: "+ Pink Slip €70–140 after arrival", tone: "warning" },
    { label: "Our approval rate", value: "90%", sub: "~78% benchmark", tone: "success" },
    { label: "Required docs", value: "18", sub: "+ PCC apostille & medical panel", tone: "violet" },
    { label: "Consultancy fee", value: "See fee tab", sub: "+ govt & third-party", tone: "primary" },
  ],
  about: [
    { label: "Description", value: "Two-stage student immigration: (1) Entry Permit obtained from India via VFS Global or university-assisted CRMD route before travel; (2) Temporary Residence Permit (Pink Slip) at local CRMD within 7–10 days of arrival in Cyprus." },
    { label: "Eligible applicants", value: "Unconditional offer from CRMD-recognised institution · Full-time study (min. 12 credits/semester) · PCC apostilled + Cyprus Embassy attested · Medical panel (HIV, Hep B/C, Syphilis, TB — 4-month validity) · Financial proof €7,000–€10,000+" },
    { label: "Proof of funds", value: "No official published minimum; benchmark €7,000–€10,000 in bank with 3–6 months history. Tuition deposit (€2,000–€5,000) typically required before offer confirmation.", warning: true },
    { label: "Key authority", value: "CRMD Cyprus (crmd.moi.gov.cy) · VFS Global Cyprus India (visa.vfsglobal.com/cyprus/india) · Cyprus Embassy in India (PCC attestation)" },
    { label: "After approval", value: "Travel on Entry Permit; register at university on first working day; apply for Pink Slip at CRMD within 7–10 days; register with GHS (gesy.org.cy); renew Pink Slip annually." },
    { label: "TRNC warning", value: "North Cyprus (TRNC) institutions are NOT EU-recognised. Degrees from TRNC cannot be used for EU employment or NMC licensing in India. Always confirm South Cyprus (Republic of Cyprus) institution.", warning: true },
  ],
  eligibility: [
    { criterion: "Unconditional offer from CRMD-recognised institution", met: true },
    { criterion: "PCC apostilled (MEA) + Cyprus Embassy attested", met: false, note: "Start immediately — allow 4–6 weeks" },
    { criterion: "Medical panel (HIV, Hep B/C, Syphilis, TB — valid 4 months)", met: false, note: "Time tests for application date" },
    { criterion: "Financial proof €7,000–€10,000+", met: false, note: "3–6 months bank history; sponsor acceptable" },
    { criterion: "Proof of accommodation in Cyprus", met: false },
    { criterion: "Tuition deposit paid (university receipt)", met: false },
    { criterion: "Valid passport (1+ year beyond arrival)", met: true },
    { criterion: "English proficiency or university waiver", met: true, note: "IELTS 5.5–6.5 typical; some waive" },
  ],
  redFlagsBanner: "After refusal, address PCC/medical/financial gaps before rebooking. Never advise TRNC institutions as EU-equivalent.",
  redFlags: [
    { title: "PCC not apostilled or attested", description: "PCC submitted without MEA apostille or Cyprus Embassy attestation.", fix: "PCC → MEA apostille (VFS can assist) → Cyprus Embassy attestation; allow 4–6 weeks", severity: "Very common" },
    { title: "TRNC institution (North Cyprus)", description: "Student enrolled at TRNC university expecting EU degree recognition.", fix: "Redirect to South Cyprus EU-recognised institutions only; disclose NMC/EU limitations for TRNC", severity: "Very common" },
    { title: "Expired medical tests", description: "Medical panel older than 4 months at application.", fix: "Repeat tests at government hospital 2–3 months before filing", severity: "Common" },
    { title: "Pink Slip delay after arrival", description: "Student did not apply at CRMD within 7–10 days.", fix: "Register at university day 1; university arranges CRMD appointment immediately", severity: "High" },
    { title: "Schengen travel misconception", description: "Client believes Cyprus permit allows EU travel.", fix: "Explain Cyprus is NOT Schengen; separate Schengen visa needed for France/Germany/etc.", severity: "Common" },
    { title: "Insufficient financial proof", description: "Bank balance below €7,000 or inconsistent history.", fix: "Show consistent savings; sponsor letter + sponsor bank statement if applicable", severity: "Common" },
  ],
  proTips: [
    "Start PCC process the day offer letter arrives — longest lead item",
    "Book VFS appointment 8–12 weeks before intended travel",
    "Time medical tests for 4-month validity window",
    "Confirm institution at moec.gov.cy — South Cyprus only",
    "Warn clients: Cyprus Pink Slip ≠ Schengen travel document",
  ],
  postApproval: [
    "Register at university on first working day after arrival",
    "Apply for Pink Slip at CRMD within 7–10 days (university assists)",
    "Open Cyprus bank account; register with GHS at gesy.org.cy",
    "Discuss 12-month post-study permit for Master's/PhD graduates",
  ],
  timeline: [
    { weeks: "1–2", title: "Offer letter, start PCC apostille process" },
    { weeks: "2–6", title: "PCC attestation, medical tests, document compilation" },
    { weeks: "6–10", title: "VFS appointment & Entry Permit submission" },
    { weeks: "4–8", title: "Entry Permit processing" },
    { weeks: "Arrival", title: "Pink Slip at CRMD within 7–10 days" },
  ],
  resources: [
    { title: "CRMD Cyprus — Civil Registry & Migration", url: "https://crmd.moi.gov.cy/", description: "Official student permit authority" },
    { title: "VFS Global — Cyprus India", url: "https://visa.vfsglobal.com/cyprus/india", description: "Appointments, fees, document checklist" },
    { title: "EU Immigration Portal — Student Cyprus", url: "https://home-affairs.ec.europa.eu/policies/migration-and-asylum/eu-immigration-portal/student-cyprus_en", description: "EU official student residence guidance" },
    { title: "Cyprus Ministry of Education", url: "https://www.moec.gov.cy/", description: "Verify institution recognition" },
    { title: "GHS — General Healthcare System", url: "https://www.gesy.org.cy/", description: "Student healthcare registration after Pink Slip" },
  ],
  staffNotes: [
    { author: "Documentation team", date: "10 Jun 2026", text: "PCC apostille + Cyprus Embassy attestation is the bottleneck — never promise intake without PCC timeline confirmation." },
    { author: "Compliance", date: "10 Jun 2026", text: "Always distinguish South Cyprus (EU) from TRNC. UNIC Medical School is South Cyprus; CIU/NEU in North are NOT EU-recognised." },
  ],
  changelog: [
    { version: "v1.0", date: "10 Jun 2026", author: "Service Library", summary: "Initial Cyprus student visa content from FLC Study in Cyprus 2026 guide." },
  ],
  workingRights: {
    applicant: {
      summary: "20 hours/week during semester; 38 hours/week during school holidays — sector-restricted (restaurants, cleaning, retail, healthcare, agriculture, manufacturing, food delivery, etc.). Employment contract must be certified by Department of Labour.",
      details: ["Minimum wage from Jan 2026: €979/month (0–6 months), €1,088/month (6+ months)", "Pro-rated at 20 hrs/week: approx. €490–€545/month"],
      restrictions: ["Work only in permitted sectors", "Contract must be Labour-office certified", "Cannot rely on work income alone for living costs"],
      sourceUrl: "https://home-affairs.ec.europa.eu/",
      lastVerified: "Jun 2026",
    },
    spouse: {
      summary: "Dependants may apply for separate residence permits; additional funds and accommodation proof required.",
      details: ["Marriage/birth certificates apostilled", "Sponsor must show sufficient means for dependants"],
      restrictions: ["Dependants may not have automatic work rights"],
      sourceUrl: "https://crmd.moi.gov.cy/",
      lastVerified: "Jun 2026",
    },
  },
  fullCostBreakdown: {
    title: "Full cost breakdown — Cyprus – Student Visa (Entry Permit + Pink Slip)",
    currency: "EUR",
    lastVerified: "Jun 2026",
    disclaimer: "Indicative costs for counselor discussions only. Verify at VFS and university before quoting.",
    sourceUrl: "https://visa.vfsglobal.com/cyprus/india",
    sections: [
      { id: "fees", label: "Government & visa fees", items: [
        { label: "Entry Permit (VFS/Embassy)", amount: 75, range: "€60–90", unit: "per applicant", currency: "EUR", applicable: true },
        { label: "Pink Slip (TRP) after arrival", range: "€70–140", unit: "at CRMD", currency: "EUR", applicable: true },
        { label: "VFS service charge", range: "Check VFS site", notes: "Separate from visa fee", currency: "EUR", applicable: true },
        { label: "Medical panel (pre-visa)", range: "€100–250", notes: "Government hospital preferred", currency: "EUR", applicable: true },
      ]},
      { id: "tuition", label: "Tuition & education costs", items: [
        { label: "Private university tuition", range: "€7,000–13,000", unit: "per year", notes: "UNIC, EUC, UCLan Cyprus", currency: "EUR", applicable: true },
        { label: "Public university (UCY)", range: "€3,400–6,800", unit: "per year", notes: "Competitive international intake", currency: "EUR", applicable: true },
        { label: "Tuition deposit", range: "€2,000–5,000", notes: "Required before enrollment confirmation", currency: "EUR", applicable: true },
        { label: "Scholarships", range: "30–50%", notes: "Merit-based at private universities", currency: "EUR", applicable: true },
      ]},
      { id: "living", label: "Living costs", items: [
        { label: "Monthly living (Nicosia)", range: "€500–800", unit: "per month", currency: "EUR" },
        { label: "Monthly living (Limassol)", range: "€700–1,000", unit: "per month", currency: "EUR" },
        { label: "Accommodation", range: "€250–600", unit: "per month", notes: "Shared flat or university dorm", currency: "EUR" },
        { label: "Financial proof benchmark", range: "€7,000–10,000", notes: "Bank balance for visa", currency: "EUR" },
      ]},
      { id: "misc", label: "Miscellaneous", items: [
        { label: "Future Link consultancy fee", range: "See Fees tab", notes: "Service package dependent" },
        { label: "PCC apostille + attestation", range: "₹3,000–8,000", notes: "MEA + embassy" },
        { label: "Flight to Cyprus", range: "₹35,000–80,000", notes: "Season dependent" },
        { label: "Document translation", range: "₹2,000–10,000", notes: "Certified English translation" },
      ]},
    ],
    totals: [{ label: "Indicative first year (private university)", value: "€14,000–20,000", notes: "Tuition + living + visa fees. With 30% scholarship: ~€12,000–17,000." }],
  },
});

save("cyprus-student-visa.json", cyprusStudent);

// —— Cyprus Visitor ——
const cyprusVisitor = replaceAll(load("malta-visitor-visa.json"), [
  ["Malta – Schengen Visitor Visa (Type C)", "Cyprus – National Visitor Visa (Short Stay)"],
  ["Malta – Schengen Visitor Visa", "Cyprus – National Visitor Visa (Short Stay)"],
  ["Schengen Type C short-stay visa for tourism, family visits, or business trips to Maltesey up to 90 days per 180-day period", "National short-stay visa for tourism, family visits, or business trips to Cyprus. Cyprus is NOT in the Schengen Area — this visa does NOT allow travel to other Schengen countries."],
  ["Maltesey", "Cyprus"],
  ["Maltese", "Cypriot"],
  ["Malta", "Cyprus"],
  // Do NOT blanket-replace Schengen → breaks visitor copy; patch in fix-cyprus-lithuania-copy.mjs
  ["€90", "€60–90"],
  ["2–4 weeks", "2–4 weeks"],
  ["€30,000+", "€30,000+"],
  ["90/180", "visa validity period"],
]);

Object.assign(cyprusVisitor, {
  shortDescription: "VFS Cyprus India · National short-stay · NOT Schengen — no EU travel",
  updatedLabel: "Updated 10 Jun 2026",
  alert: {
    title: "NOT Schengen — Cyprus only",
    body: "Cyprus national visitor visa allows travel to Cyprus only. It does NOT permit entry to Schengen countries (France, Germany, Italy, etc.). Clients needing EU travel must apply for a separate Schengen visa.",
  },
  tags: [
    { label: "Active service", variant: "success" },
    { label: "NOT Schengen", variant: "warning" },
    { label: "Ties critical", variant: "warning" },
    { label: "2–4 weeks", variant: "neutral" },
    { label: "VFS appointment", variant: "neutral" },
  ],
  chips: [
    { label: "2–4 weeks", variant: "neutral" },
    { label: "€60–90 visa fee", variant: "neutral" },
    { label: "NOT Schengen travel", variant: "warning" },
    { label: "Strong ties", variant: "warning" },
  ],
  kpis: [
    { label: "Processing time", value: "2–4w", sub: "VFS Cyprus India", tone: "primary" },
    { label: "Government fee", value: "€60–90", sub: "+ VFS service charge", tone: "warning" },
    { label: "Our approval rate", value: "78%", sub: "~65% benchmark", tone: "success" },
    { label: "Required docs", value: "10", sub: "+ travel insurance recommended", tone: "violet" },
    { label: "Consultancy fee", value: "See fee tab", sub: "+ govt & VFS", tone: "primary" },
  ],
  about: [
    { label: "Description", value: "National short-stay visitor visa for tourism, family visits, or business trips to the Republic of Cyprus. Applied via VFS Global Cyprus India." },
    { label: "Eligible applicants", value: "Temporary visit purpose · Funds for trip · Strong ties to India · Clean immigration history · Return travel plan" },
    { label: "NOT Schengen", value: "Cyprus is EU but NOT Schengen. This visa allows entry to Cyprus only — not France, Germany, Italy, or other Schengen states.", warning: true },
    { label: "Key authority", value: "Cyprus Embassy/Consulate · VFS Global Cyprus India (visa.vfsglobal.com/cyprus/india)" },
    { label: "After approval", value: "Respect visa validity dates. Overstay affects future Cyprus and Schengen applications." },
  ],
  eligibility: [
    { criterion: "Valid passport (3+ months beyond stay)", met: true },
    { criterion: "Travel medical insurance (recommended)", met: true, note: "€30,000+ coverage advised" },
    { criterion: "Proof of accommodation and itinerary", met: true },
    { criterion: "Proof of funds for trip", met: true },
    { criterion: "Strong ties to India", met: true },
    { criterion: "Cover letter explaining purpose", met: true },
    { criterion: "Biometrics at VFS (if required)", met: false },
  ],
  redFlagsBanner: "After refusal, strengthen ties and address grounds before reapplication. Do not confuse Cyprus visa with Schengen access.",
  resources: [
    { title: "VFS Global — Cyprus India", url: "https://visa.vfsglobal.com/cyprus/india", description: "Appointments, fees, requirements" },
    { title: "CRMD Cyprus", url: "https://crmd.moi.gov.cy/", description: "Immigration authority" },
  ],
  changelog: [{ version: "v1.0", date: "10 Jun 2026", author: "Service Library", summary: "Initial Cyprus national visitor visa counselor content." }],
});

save("cyprus-visitor-visa.json", cyprusVisitor);

// —— Lithuania Student ——
const lithuaniaStudent = replaceAll(load("portugal-student-visa.json"), [
  ["Portugal – Student Visa (National D Visa)", "Lithuania – Student Visa (National D Visa)"],
  ["Portugal – Student Visa", "Lithuania – Student Visa (National D Visa)"],
  ["Portuguese", "Lithuanian"],
  ["Portuguesey", "Lithuania"],
  ["Portugal", "Lithuania"],
  ["SEF / AIMA", "Migration Department (Migracijos departamentas)"],
  ["vistos.mne.gov.pt", "migracija.lt"],
  ["AIMA (formerly SEF)", "Migration Department"],
  ["APS required", "Proof of funds required"],
  ["APS", "proof of funds documentation"],
  ["€992", "€576"],
  ["Ausländerbehörde", "Migration Department (migracija.lt)"],
  ["Anmeldung", "address registration"],
  ["Zulassung", "university admission letter"],
  ["Anabin", "studyinlithuania.lt"],
  ["Federal Foreign Office", "Lithuanian Ministry of Foreign Affairs (urm.lt)"],
  ["admission documentation (India)", "proof of funds (€576/month × 12)"],
]);

Object.assign(lithuaniaStudent, {
  shortDescription: "Lithuanian Embassy/VFS · D visa · migracija.lt after arrival · University acceptance",
  updatedLabel: "Updated 10 Jun 2026",
  alert: {
    title: "Migration Department appointment",
    body: "After arrival, apply for temporary residence permit at Migration Department (migracija.lt) within required deadline.",
  },
  about: [
    { label: "Description", value: "National visa (Type D) for study at a recognised Lithuanian university. After entry, apply for temporary residence permit at Migration Department." },
    { label: "Eligible applicants", value: "University admission letter · Proof of funds · Health insurance · Motivation letter · Valid passport · Language proficiency as required" },
    { label: "Proof of funds", value: "Typically €576/month (12 months = €6,912) or equivalent. Verify current amount on migracija.lt before quoting.", warning: true },
    { label: "Key authority", value: "Lithuanian Embassy/Consulate in India · VFS Global Lithuania · Migration Department (migracija.lt) after arrival" },
    { label: "After approval", value: "Enter Lithuania; register address; apply for temporary residence permit at Migration Department within visa validity." },
  ],
  eligibility: [
    { criterion: "Admission from recognised Lithuanian institution", met: true },
    { criterion: "Proof of funds (€576/month × 12)", met: false, note: "Verify current amount on migracija.lt" },
    { criterion: "Health insurance (travel + statutory)", met: false },
    { criterion: "Motivation letter and CV", met: true },
    { criterion: "Language proficiency (as required)", met: true, note: "English or Lithuanian per program" },
    { criterion: "Valid passport", met: true },
  ],
  resources: [
    { title: "Migration Department — migracija.lt", url: "https://www.migracija.lt/", description: "Residence permits and requirements" },
    { title: "Study in Lithuania", url: "https://www.studyinlithuania.lt/", description: "Official study portal" },
    { title: "VFS Global — Lithuania", url: "https://visa.vfsglobal.com/", description: "Verify India centre and fees" },
    { title: "Ministry of Foreign Affairs", url: "https://www.urm.lt/", description: "Visa policy overview" },
  ],
  changelog: [{ version: "v1.0", date: "10 Jun 2026", author: "Service Library", summary: "Initial Lithuania student visa counselor content." }],
  fullCostBreakdown: {
    title: "Full cost breakdown — Lithuania – Student Visa (National D Visa)",
    currency: "EUR",
    lastVerified: "Jun 2026",
    disclaimer: "Indicative costs — verify on migracija.lt and embassy before quoting.",
    sourceUrl: "https://www.migracija.lt/",
    sections: [
      { id: "fees", label: "Government & visa fees", items: [
        { label: "National D visa", range: "€60–120", unit: "per applicant", currency: "EUR", applicable: true },
        { label: "Residence permit", range: "€28–114", notes: "After arrival", currency: "EUR", applicable: true },
      ]},
      { id: "tuition", label: "Tuition & education costs", items: [
        { label: "Undergraduate tuition", range: "€1,500–5,000", unit: "per year", notes: "Public universities lower", currency: "EUR", applicable: true },
        { label: "Postgraduate tuition", range: "€2,000–8,000", unit: "per year", currency: "EUR", applicable: true },
      ]},
      { id: "living", label: "Living costs", items: [
        { label: "Living funds (embassy guideline)", range: "€6,912", unit: "per year", notes: "€576/month × 12", currency: "EUR" },
        { label: "Accommodation (Vilnius)", range: "€250–500", unit: "per month", currency: "EUR" },
        { label: "Food & transport", range: "€200–350", unit: "per month", currency: "EUR" },
      ]},
      { id: "misc", label: "Miscellaneous", items: [
        { label: "Future Link consultancy fee", range: "See Fees tab", notes: "Service package dependent" },
        { label: "Flight to Lithuania", range: "₹40,000–90,000", notes: "Season dependent" },
      ]},
    ],
    totals: [{ label: "Indicative first year", value: "€10,000–18,000", notes: "Tuition + living + visa fees." }],
  },
});

save("lithuania-student-visa.json", lithuaniaStudent);

// —— Lithuania Visitor ——
const lithuaniaVisitor = replaceAll(load("malta-visitor-visa.json"), [
  ["Malta – Schengen Visitor Visa (Type C)", "Lithuania – Schengen Visitor Visa (Type C)"],
  ["Malta – Schengen Visitor Visa", "Lithuania – Schengen Visitor Visa (Type C)"],
  ["Maltesey", "Lithuania"],
  ["Maltese", "Lithuanian"],
  ["Malta", "Lithuania"],
  ["identitymalta.com", "migracija.lt"],
]);

Object.assign(lithuaniaVisitor, {
  shortDescription: "Lithuanian Embassy/VFS · Schengen Type C · Tourism, family, business · 90/180 rule",
  updatedLabel: "Updated 10 Jun 2026",
  about: [
    { label: "Description", value: "Schengen Type C short-stay visa for tourism, family visits, or business trips to Lithuania up to 90 days per 180-day period." },
    { label: "Eligible applicants", value: "Temporary visit purpose · Travel insurance €30,000+ · Funds for trip · Strong ties to India · Clean Schengen history" },
    { label: "Main destination rule", value: "Apply at embassy of main Schengen destination. If Lithuania is primary stay, apply via Lithuanian mission/VFS.", warning: true },
    { label: "Key authority", value: "Lithuanian Embassy/Consulate · VFS Global (appointment partner in India)" },
    { label: "After approval", value: "Respect visa validity and 90/180 rule. Overstay affects future Schengen applications." },
  ],
  resources: [
    { title: "Migration Department — migracija.lt", url: "https://www.migracija.lt/", description: "Schengen visa information" },
    { title: "VFS Global — Lithuania", url: "https://visa.vfsglobal.com/", description: "Appointments and fees" },
  ],
  changelog: [{ version: "v1.0", date: "10 Jun 2026", author: "Service Library", summary: "Initial Lithuania Schengen visitor visa counselor content." }],
});

save("lithuania-visitor-visa.json", lithuaniaVisitor);

console.log("Done. Run: node scripts/expand-service-quizzes.mjs");
