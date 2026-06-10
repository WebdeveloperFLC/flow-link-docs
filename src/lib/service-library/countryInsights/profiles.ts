import type { CountryProfile } from "./types";

/** Destination-country profiles for Service Library "Country & costs" tab. */
export const COUNTRY_PROFILES: Record<string, CountryProfile> = {
  Canada: {
    country: "Canada",
    facts: [
      { label: "Capital", value: "Ottawa" },
      { label: "Currency", value: "Canadian dollar (CAD)" },
      { label: "Immigration authority", value: "Immigration, Refugees and Citizenship Canada (IRCC)" },
      { label: "Official languages", value: "English and French (bilingual federal system)" },
      { label: "Time zones", value: "Six zones — Atlantic to Pacific (plan biometrics and deadlines in local time)" },
      { label: "Healthcare", value: "Provincial public health insurance after qualifying residence; private coverage often required on arrival" },
      { label: "Indian student context", value: "Major DLI destinations: Ontario, BC, Alberta, Quebec (French programs)" },
      { label: "Climate note", value: "Winters vary sharply by province — counsel clients on clothing and housing heating costs" },
    ],
    costOfLiving: {
      currency: "CAD",
      lastVerified: "Jun 2026",
      summary: "Living costs vary by city. Toronto and Vancouver are highest; prairie and smaller cities are lower.",
      sourceUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents/financial-support.html",
      items: [
        { label: "IRCC living funds (study permit, 1 person outside Quebec)", amount: "20,635", unit: "per year", notes: "Verify current IRCC table; excludes tuition" },
        { label: "IRCC living funds (study permit, 1 person in Quebec)", amount: "15,078", unit: "per year", notes: "Quebec amounts differ" },
        { label: "Shared accommodation (major city)", range: "700–1,400", unit: "per month" },
        { label: "Groceries (single person)", range: "300–550", unit: "per month" },
        { label: "Public transit pass (major city)", range: "100–180", unit: "per month" },
        { label: "Mobile phone plan", range: "45–80", unit: "per month" },
        { label: "Utilities (if not included in rent)", range: "80–150", unit: "per month" },
      ],
      notes: [
        "Proof-of-funds must be credible and seasoned — sudden large deposits are a common refusal factor.",
        "GIC (SDS when available) covers part of living funds but does not replace all eligibility requirements.",
      ],
    },
  },
  "United Kingdom": {
    country: "United Kingdom",
    facts: [
      { label: "Capital", value: "London" },
      { label: "Currency", value: "Pound sterling (GBP)" },
      { label: "Immigration authority", value: "UK Visas and Immigration (UKVI) / Home Office" },
      { label: "Healthcare surcharge", value: "Immigration Health Surcharge (IHS) payable with most long-term visas" },
      { label: "Regions", value: "England, Scotland, Wales, Northern Ireland — rules mostly UK-wide for visas" },
      { label: "Indian applicant note", value: "VFS centres in India; CAS required for student route before apply" },
    ],
    costOfLiving: {
      currency: "GBP",
      lastVerified: "Jun 2026",
      summary: "London costs significantly exceed other UK cities. Student maintenance uses London vs outside-London bands.",
      sourceUrl: "https://www.gov.uk/student-visa/money",
      items: [
        { label: "Student maintenance (London)", amount: "1,334", unit: "per month (9 months)", notes: "Verify on gov.uk" },
        { label: "Student maintenance (outside London)", amount: "1,023", unit: "per month (9 months)" },
        { label: "Shared room (London)", range: "600–1,100", unit: "per month" },
        { label: "Shared room (regional city)", range: "400–700", unit: "per month" },
        { label: "Groceries", range: "150–280", unit: "per month" },
        { label: "Transport (London Oyster/Travelcard)", range: "120–180", unit: "per month" },
      ],
      notes: ["28-day funds rule: money must be held for 28 consecutive days ending within 31 days of application."],
    },
  },
  "United States": {
    country: "United States",
    facts: [
      { label: "Capital", value: "Washington, D.C." },
      { label: "Currency", value: "US dollar (USD)" },
      { label: "Immigration authority", value: "US Department of State (consular) · USCIS (status in US)" },
      { label: "Visa interview", value: "Most Indian applicants attend embassy/consulate interview" },
      { label: "Healthcare", value: "Employer or university-sponsored insurance typical; no universal public system for visitors" },
      { label: "SEVIS", value: "F-1/M-1 students pay SEVIS I-901 fee; I-20 drives program dates" },
    ],
    costOfLiving: {
      currency: "USD",
      lastVerified: "Jun 2026",
      summary: "Costs vary enormously by state and city (coastal metros vs Midwest/South).",
      sourceUrl: "https://studyinthestates.dhs.gov/",
      items: [
        { label: "F-1 living expenses (university estimate)", range: "12,000–25,000", unit: "per year", notes: "Use I-20 living line" },
        { label: "Shared housing (college town)", range: "500–1,200", unit: "per month" },
        { label: "Shared housing (major metro)", range: "1,000–2,500", unit: "per month" },
        { label: "Health insurance (student)", range: "1,500–3,500", unit: "per year" },
        { label: "Groceries", range: "250–450", unit: "per month" },
      ],
      notes: ["I-20 financials must align with bank statements and sponsor affidavits."],
    },
  },
  Australia: {
    country: "Australia",
    facts: [
      { label: "Capital", value: "Canberra" },
      { label: "Currency", value: "Australian dollar (AUD)" },
      { label: "Immigration authority", value: "Department of Home Affairs" },
      { label: "Online lodgement", value: "ImmiAccount for most visas" },
      { label: "Genuine student (GS)", value: "Student visas assessed for genuine temporary entrant / student intent" },
      { label: "Healthcare", value: "Overseas Student Health Cover (OSHC) mandatory for students" },
    ],
    costOfLiving: {
      currency: "AUD",
      lastVerified: "Jun 2026",
      summary: "Sydney and Melbourne are most expensive; regional areas lower but confirm course location funds.",
      sourceUrl: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
      items: [
        { label: "Student visa financial capacity (primary)", amount: "29,710", unit: "per year living", notes: "Verify current Home Affairs amount" },
        { label: "Partner additional", amount: "10,394", unit: "per year", notes: "If dependant included" },
        { label: "Child additional", amount: "4,449", unit: "per year each", notes: "If dependant included" },
        { label: "Shared rent (major city)", range: "250–450", unit: "per week" },
        { label: "OSHC (single)", range: "500–700", unit: "per year" },
      ],
      notes: ["Include travel, tuition, and OSHC in total funds narrative."],
    },
  },
  Germany: {
    country: "Germany",
    facts: [
      { label: "Capital", value: "Berlin" },
      { label: "Currency", value: "Euro (EUR)" },
      { label: "Immigration authority", value: "German missions abroad + local Ausländerbehörde after arrival" },
      { label: "Blocked account", value: "Sperrkonto commonly used to prove living funds for students/job seekers" },
      { label: "Healthcare", value: "Statutory (public) health insurance required for most long stays" },
      { label: "Language", value: "Many programs English-taught; daily life German helps integration" },
    ],
    costOfLiving: {
      currency: "EUR",
      lastVerified: "Jun 2026",
      summary: "Blocked account amount sets baseline; Munich/Frankfurt cost more than eastern cities.",
      sourceUrl: "https://www.make-it-in-germany.com/en/visa-residence/procedure/block-account",
      items: [
        { label: "Blocked account (student baseline)", amount: "11,904", unit: "per year", notes: "€992/month — verify current requirement" },
        { label: "Shared room (Berlin/Munich)", range: "400–750", unit: "per month" },
        { label: "Shared room (smaller city)", range: "300–500", unit: "per month" },
        { label: "Public transport semester ticket", range: "200–350", unit: "per semester" },
        { label: "Health insurance (student)", range: "120–130", unit: "per month" },
      ],
      notes: ["Tuition often low at public universities; still budget Semesterbeitrag and living costs."],
    },
  },
  "New Zealand": {
    country: "New Zealand",
    facts: [
      { label: "Capital", value: "Wellington" },
      { label: "Currency", value: "New Zealand dollar (NZD)" },
      { label: "Immigration authority", value: "Immigration New Zealand (INZ)" },
      { label: "Online applications", value: "Most visas lodged via INZ portal" },
      { label: "Healthcare", value: "Eligible migrants access public system per visa conditions; insurance may be required initially" },
      { label: "Indian context", value: "Strong student and skilled pathways; partnership evidence heavily scrutinised" },
    ],
    costOfLiving: {
      currency: "NZD",
      lastVerified: "Jun 2026",
      summary: "Auckland most expensive; verify INZ funds table for visa type.",
      sourceUrl: "https://www.immigration.govt.nz/",
      items: [
        { label: "Student living costs (typical INZ evidence)", amount: "20,000", unit: "per year", notes: "Plus tuition" },
        { label: "Shared flat (Auckland)", range: "200–350", unit: "per week" },
        { label: "Shared flat (Christchurch/Dunedin)", range: "150–250", unit: "per week" },
        { label: "Groceries", range: "100–180", unit: "per week" },
        { label: "Transport", range: "40–150", unit: "per month" },
      ],
      notes: ["Funds must be genuinely available — explain source and history."],
    },
  },
  France: {
    country: "France",
    facts: [
      { label: "Capital", value: "Paris" },
      { label: "Currency", value: "Euro (EUR)" },
      { label: "Visa type", value: "Long-stay national visa (VLS-TS) for study; Schengen Type C for short visits" },
      { label: "Campus France", value: "Many Indian student files pass through Campus France process" },
      { label: "Healthcare", value: "Registration for French social security after arrival for long stays" },
    ],
    costOfLiving: {
      currency: "EUR",
      lastVerified: "Jun 2026",
      summary: "Paris highest; regional university cities more affordable.",
      items: [
        { label: "Proof of funds (student, baseline)", amount: "11,904", unit: "per year", notes: "€992/month guideline — verify embassy" },
        { label: "Room (Paris)", range: "500–900", unit: "per month" },
        { label: "Room (regional city)", range: "350–600", unit: "per month" },
        { label: "Groceries", range: "200–350", unit: "per month" },
        { label: "Schengen short-stay daily minimum", amount: "120", unit: "per day", notes: "Visitor visa evidence" },
      ],
      notes: ["APS credential verification required for many Indian academic files."],
    },
  },
  Italy: {
    country: "Italy",
    facts: [
      { label: "Capital", value: "Rome" },
      { label: "Currency", value: "Euro (EUR)" },
      { label: "Immigration authority", value: "Italian consulate (visa) + Questura (permesso di soggiorno after arrival)" },
      { label: "Student visa", value: "Long-stay D visa for study; permesso renewal at local Questura" },
      { label: "Healthcare", value: "Registration with Italian NHS (SSN) after residence permit for long stays" },
      { label: "Indian context", value: "Dichiarazione di valore / CIMEA may be required for academic recognition" },
    ],
    costOfLiving: {
      currency: "EUR",
      lastVerified: "Jun 2026",
      summary: "Northern cities (Milan, Rome) cost more than southern university towns.",
      items: [
        { label: "Student living funds guideline", amount: "11,904", unit: "per year", notes: "€992/month — verify embassy" },
        { label: "Room (Milan/Rome)", range: "450–800", unit: "per month" },
        { label: "Room (smaller city)", range: "300–550", unit: "per month" },
        { label: "Groceries", range: "200–350", unit: "per month" },
        { label: "Public transport pass", range: "25–40", unit: "per month" },
      ],
      notes: ["Verify current embassy financial requirements and accommodation declaration."],
    },
  },
  Netherlands: { country: "Netherlands", facts: [{ label: "Capital", value: "Amsterdam" }, { label: "Currency", value: "Euro (EUR)" }, { label: "Authority", value: "IND (Immigration and Naturalisation Service)" }], costOfLiving: { currency: "EUR", lastVerified: "Jun 2026", items: [{ label: "Student proof of funds (IND guideline)", amount: "14,866", unit: "per year", notes: "Verify current IND amount" }, { label: "Room (Amsterdam)", range: "600–1,000", unit: "per month" }], notes: [] } },
  Ireland: { country: "Ireland", facts: [{ label: "Capital", value: "Dublin" }, { label: "Currency", value: "Euro (EUR)" }, { label: "Authority", value: "Irish Immigration Service Delivery (ISD)" }], costOfLiving: { currency: "EUR", lastVerified: "Jun 2026", items: [{ label: "Student funds (without Dublin)", amount: "10,000", unit: "per year" }, { label: "Student funds (Dublin)", amount: "12,000", unit: "per year" }, { label: "Rent (Dublin)", range: "600–1,200", unit: "per month" }], notes: [] } },
  Spain: {
    country: "Spain",
    facts: [
      { label: "Capital", value: "Madrid" },
      { label: "Currency", value: "Euro (EUR)" },
      { label: "Immigration authority", value: "Spanish consulate + extranjería after arrival" },
      { label: "Student route", value: "Long-stay student visa (Tipo D) for programs over 90 days" },
      { label: "Healthcare", value: "Public health card (tarjeta sanitaria) after registration for long stays" },
    ],
    costOfLiving: {
      currency: "EUR",
      lastVerified: "Jun 2026",
      summary: "Madrid and Barcelona are priciest; Andalusia and smaller cities more affordable.",
      items: [
        { label: "Student living baseline", amount: "11,904", unit: "per year", notes: "Verify consulate amount" },
        { label: "Room (Madrid/Barcelona)", range: "400–750", unit: "per month" },
        { label: "Room (regional city)", range: "300–500", unit: "per month" },
        { label: "Groceries", range: "180–300", unit: "per month" },
      ],
      notes: ["Bank statements and accommodation proof required at visa stage."],
    },
  },
  Malta: { country: "Malta", facts: [{ label: "Capital", value: "Valletta" }, { label: "Currency", value: "Euro (EUR)" }], costOfLiving: { currency: "EUR", lastVerified: "Jun 2026", items: [{ label: "Student living estimate", range: "800–1,100", unit: "per month" }], notes: [] } },
  Finland: { country: "Finland", facts: [{ label: "Capital", value: "Helsinki" }, { label: "Currency", value: "Euro (EUR)" }], costOfLiving: { currency: "EUR", lastVerified: "Jun 2026", items: [{ label: "Student funds (Finnish Immigration)", amount: "9,600", unit: "per year", notes: "Verify current Migri amount" }, { label: "Room (Helsinki)", range: "400–700", unit: "per month" }], notes: [] } },
  Sweden: { country: "Sweden", facts: [{ label: "Capital", value: "Stockholm" }, { label: "Currency", value: "Swedish krona (SEK)" }], costOfLiving: { currency: "SEK", lastVerified: "Jun 2026", items: [{ label: "Student maintenance (Migrationsverket)", amount: "102,000", unit: "per year", notes: "Verify current SEK amount" }, { label: "Room (Stockholm)", range: "4,500–8,500", unit: "per month" }], notes: [] } },
  Austria: { country: "Austria", facts: [{ label: "Capital", value: "Vienna" }, { label: "Currency", value: "Euro (EUR)" }], costOfLiving: { currency: "EUR", lastVerified: "Jun 2026", items: [{ label: "Student funds guideline", amount: "12,000", unit: "per year" }, { label: "Room (Vienna)", range: "400–700", unit: "per month" }], notes: [] } },
  Belgium: { country: "Belgium", facts: [{ label: "Capital", value: "Brussels" }, { label: "Currency", value: "Euro (EUR)" }], costOfLiving: { currency: "EUR", lastVerified: "Jun 2026", items: [{ label: "Student living estimate", amount: "11,500", unit: "per year" }, { label: "Room (Brussels)", range: "450–750", unit: "per month" }], notes: [] } },
  Denmark: { country: "Denmark", facts: [{ label: "Capital", value: "Copenhagen" }, { label: "Currency", value: "Danish krone (DKK)" }], costOfLiving: { currency: "DKK", lastVerified: "Jun 2026", items: [{ label: "Student funds (Danish Agency)", amount: "72,000", unit: "per year", notes: "Verify current DKK amount" }], notes: [] } },
  Portugal: { country: "Portugal", facts: [{ label: "Capital", value: "Lisbon" }, { label: "Currency", value: "Euro (EUR)" }], costOfLiving: { currency: "EUR", lastVerified: "Jun 2026", items: [{ label: "Student living estimate", amount: "9,120", unit: "per year" }, { label: "Room (Lisbon)", range: "400–650", unit: "per month" }], notes: [] } },
};

export function resolveCountryProfile(country: string | null | undefined): CountryProfile | null {
  if (!country) return null;
  return COUNTRY_PROFILES[country] ?? null;
}

export function factsTitleFor(country: string): string {
  return `Facts about ${country}`;
}
