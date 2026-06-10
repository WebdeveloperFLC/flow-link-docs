/** Working rights + full cost breakdown templates by country group and visa archetype. */

const COUNTRY_META = {
  canada: { country: "Canada", currency: "CAD", authority: "IRCC", url: "https://www.canada.ca/en/immigration-refugees-citizenship.html" },
  uk: { country: "United Kingdom", currency: "GBP", authority: "UKVI", url: "https://www.gov.uk/browse/visas-immigration" },
  usa: { country: "United States", currency: "USD", authority: "US Department of State / USCIS", url: "https://travel.state.gov/" },
  australia: { country: "Australia", currency: "AUD", authority: "Home Affairs", url: "https://immi.homeaffairs.gov.au/" },
  germany: { country: "Germany", currency: "EUR", authority: "German missions + Ausländerbehörde", url: "https://www.make-it-in-germany.com/" },
  nz: { country: "New Zealand", currency: "NZD", authority: "Immigration New Zealand", url: "https://www.immigration.govt.nz/" },
  france: { country: "France", currency: "EUR", authority: "French consulate", url: "https://france-visas.gouv.fr/" },
  italy: { country: "Italy", currency: "EUR", authority: "Italian consulate", url: "https://vistoperitalia.esteri.it/" },
  netherlands: { country: "Netherlands", currency: "EUR", authority: "IND", url: "https://ind.nl/" },
  ireland: { country: "Ireland", currency: "EUR", authority: "ISD", url: "https://www.irishimmigration.ie/" },
  spain: { country: "Spain", currency: "EUR", authority: "Spanish consulate", url: "https://www.exteriores.gob.es/" },
  malta: { country: "Malta", currency: "EUR", authority: "Identity Malta", url: "https://identitymalta.com/" },
  finland: { country: "Finland", currency: "EUR", authority: "Migri", url: "https://migri.fi/" },
  sweden: { country: "Sweden", currency: "SEK", authority: "Migrationsverket", url: "https://www.migrationsverket.se/" },
  austria: { country: "Austria", currency: "EUR", authority: "Austrian missions", url: "https://www.bmeia.gv.at/" },
  belgium: { country: "Belgium", currency: "EUR", authority: "Belgian immigration", url: "https://dofi.ibz.be/" },
  denmark: { country: "Denmark", currency: "DKK", authority: "SIRI", url: "https://www.nyidanmark.dk/" },
  portugal: { country: "Portugal", currency: "EUR", authority: "SEF/AIMA", url: "https://imigrante.sef.pt/" },
};

function archetype(file) {
  const f = file.toLowerCase();
  if (/student|study|ausbildung/.test(f)) return "student";
  if (/visitor|super-visa|visitor-record|caips/.test(f)) return "visitor";
  if (/spouse|partner|dependent|owp|sponsorship/.test(f)) return "spouse";
  if (/work-holiday|whv/.test(f)) return "whv";
  if (/post-study|pgwp|graduate|485/.test(f)) return "graduate";
  if (/skilled|express|pnp|oinp|tr-to-pr|migrant|pr|green-card|bowp|work-permit|blue-card|opportunity|job-seeker/.test(f)) return "skilled";
  return "general";
}

function block(summary, details, restrictions, sourceUrl) {
  return { summary, details, restrictions, sourceUrl, lastVerified: "Jun 2026" };
}

function workingRights(group, type) {
  const m = COUNTRY_META[group];
  if (!m) return null;

  const templates = {
    canada: {
      student: {
        applicant: block(
          "Study permit holders may work on-campus anytime. Off-campus work is allowed up to 24 hours per week during regular academic sessions and full-time during scheduled breaks, subject to permit conditions.",
          [
            "Co-op work requires a co-op work permit in addition to study permit.",
            "Work must not start before permit conditions allow — verify printed remarks.",
            "PGWP is a separate application after eligible program completion.",
          ],
          ["Cannot work for ineligible employers if restricted on permit", "Must remain enrolled and making progress at DLI"],
          "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work.html",
        ),
        spouse: block(
          "Spouse/common-law partner may qualify for an open work permit (SOWP) when the student is in an eligible program at a designated learning institution in Canada.",
          [
            "Eligibility depends on program level, duration, and current IRCC policy for SOWP.",
            "Partner applies separately; relationship and principal status must be documented.",
          ],
          ["Not automatic — assess program eligibility before promising spouse work rights"],
          "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/special-instructions/spousal.html",
        ),
      },
      visitor: {
        applicant: block(
          "Visitor visa (TRV) / super visa generally does not authorize work in Canada. Super visa allows extended stays with parents/grandparents of citizens/PRs but still no employment.",
          ["Business visitor activities are limited — distinguish from work requiring work permit.", "Super visa requires medical insurance and sponsor income proof."],
          ["Employment without authorization is illegal", "Study beyond short course may need study permit"],
          m.url,
        ),
        spouse: block(
          "Spouse accompanying on visitor status cannot work unless they separately obtain an eligible work permit or change status.",
          ["If spouse intends to work, assess study permit + SOWP or work permit pathways instead of visitor."],
          ["Visitor record does not grant work rights"],
          m.url,
        ),
      },
      spouse: {
        applicant: block(
          "Inland/outland spousal sponsorship leads to open work permit (SOWP) options while application is in processing, if eligible.",
          ["Principal applicant may receive bridging open work permit in eligible inland cases.", "Conditions printed on permit must be followed."],
          ["Work only after valid permit issued — not during unauthorized status"],
          "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship.html",
        ),
        spouse: block(
          "Canadian citizen/permanent resident sponsor does not need work authorization in Canada. Foreign partner receives open work permit when SOWP approved.",
          ["Dependent children may have separate study/work rules — assess age and status."],
          [],
          m.url,
        ),
      },
      skilled: {
        applicant: block(
          "Employer-specific or open work permits authorize work per conditions on the permit (employer, occupation, location, expiry).",
          ["LMIA-exempt streams (IEC, PGWP, BOWP, IEC, intra-company) have specific rules.", "PR applicants with maintained status may qualify for BOWP."],
          ["Working outside permit conditions is unauthorized employment"],
          "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada.html",
        ),
        spouse: block(
          "Spouse/partner of skilled worker or PR applicant often eligible for open work permit (SOWP) during processing or after PR stage.",
          ["PNP nominations may include employment restrictions affecting open permits — verify nomination letter."],
          [],
          m.url,
        ),
      },
      graduate: {
        applicant: block(
          "Post-graduation work permit (PGWP) or post-study pathways authorize open work in Canada for a fixed period after eligible study.",
          ["PGWP length tied to program duration; apply within 180 days of program completion letter.", "Maintain legal status while applying."],
          ["Cannot extend PGWP beyond maximum allowed length except in limited policy windows"],
          "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation.html",
        ),
        spouse: block(
          "Spouse may apply for open work permit while principal holds valid PGWP, subject to current SOWP policy.",
          [],
          [],
          m.url,
        ),
      },
      whv: {
        applicant: block(
          "IEC working holiday permits authorize temporary work with any employer (open) for the permit validity period, with program quotas and age limits.",
          ["Must hold valid IEC participation letter and work permit before starting employment."],
          ["Employer-specific restrictions rare but check permit"],
          m.url,
        ),
        spouse: block(
          "Spouse is not typically included on IEC working holiday — separate visa required.",
          [],
          ["WHV is individual youth mobility program"],
          m.url,
        ),
      },
    },
    uk: {
      student: {
        applicant: block(
          "Student Route visa allows limited work during term (typically 20 hours/week) and full-time in vacations for degree-level courses; rules vary by course level and sponsor.",
          ["Check CAS and visa vignette for exact work conditions.", "Cannot work as professional sportsperson or doctor/dentist in training unless permitted."],
          ["Self-employment and business activity restricted"],
          "https://www.gov.uk/student-visa",
        ),
        spouse: block(
          "Dependants (partner/children) may apply if course meets postgraduate level/duration thresholds; dependants can usually work without hourly cap.",
          ["Verify current dependant eligibility rules before quoting spouse work rights."],
          [],
          "https://www.gov.uk/visa-to-remain-in-the-uk-partner",
        ),
      },
      visitor: {
        applicant: block("Standard Visitor visa does not permit employment or long-term study in the UK.", ["Permitted activities: tourism, limited business meetings, short courses up to 6 months."], ["Paid work prohibited"], "https://www.gov.uk/standard-visitor"),
        spouse: block("Partner on visitor visa cannot work. Separate visa required for employment.", [], [], "https://www.gov.uk/standard-visitor"),
      },
      spouse: {
        applicant: block("Partner visa (Spouse/FLR) allows work and study without restriction once granted.", ["Initial entry may be on route to ILR after qualifying period."], [], "https://www.gov.uk/uk-family-visa"),
        spouse: block("British/settled sponsor already has full work rights in UK.", [], [], m.url),
      },
      skilled: {
        applicant: block("Skilled Worker visa ties employment to licensed sponsor and occupation on CoS.", ["Can work supplementary hours in same occupation in some cases.", "Switching employers requires new CoS and may need new visa application."], ["Cannot work outside sponsored role without permission"], "https://www.gov.uk/skilled-worker-visa"),
        spouse: block("Dependants of Skilled Worker can usually work without restriction.", [], [], m.url),
      },
      graduate: {
        applicant: block("Graduate Route provides 2 years (3 for PhD) open work after eligible UK study.", ["Must apply before student visa expires.", "No sponsorship required during Graduate Route."], [], "https://www.gov.uk/graduate-visa"),
        spouse: block("Dependants who already hold dependant visa may continue subject to Graduate Route rules.", [], [], m.url),
      },
    },
    usa: {
      student: {
        applicant: block("F-1 students may work on-campus up to 20 hours/week while school is in session; CPT/OPT require authorization.", ["OPT: 12 months standard; STEM extension possible.", "Must maintain full course load and valid I-20."], ["Off-campus work without CPT/OPT is unauthorized"], "https://studyinthestates.dhs.gov/"),
        spouse: block("F-2 spouse cannot work in the United States. May study part-time recreationally only.", ["F-2 children cannot work."], ["No employment authorization for F-2"], m.url),
      },
      visitor: {
        applicant: block("B1/B2 visitor visa prohibits US employment. Limited business visitor activities only.", [], ["Paid work by foreign employer while in US still restricted for many activities"], "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visitor.html"),
        spouse: block("Spouse on B2 cannot work.", [], [], m.url),
      },
      spouse: {
        applicant: block("CR-1/IR-1 immigrant visa grants permanent residence and unrestricted work authorization upon entry/adjustment.", ["K-1 fiancé visa requires EAD after marriage/AOS for work."], [], "https://travel.state.gov/content/travel/en/immigration.html"),
        spouse: block("US citizen petitioner has full work rights.", [], [], m.url),
      },
      skilled: {
        applicant: block("H-1B and other work visas authorize employment only for petitioning employer in approved role.", ["Portability rules apply after I-140 in some cases."], ["Unauthorized work violates status"], "https://www.uscis.gov/working-in-the-united-states"),
        spouse: block("H-4 spouse may apply for EAD if principal has approved I-140 or extended H-1B in certain cases.", [], [], m.url),
      },
    },
    australia: {
      student: {
        applicant: block("Subclass 500 students may work 48 hours per fortnight during study period and unlimited hours during breaks (verify current condition).", ["Work cannot start before course begins.", "Must maintain enrolment and OSHC."], [], "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500"),
        spouse: block("Student dependant partners (subclass 500 subsequent entrant) can usually work up to 48 hours per fortnight; rules change — verify.", [], [], m.url),
      },
      visitor: {
        applicant: block("Visitor visa (subclass 600) generally prohibits work.", ["Some streams allow limited business visitor activities."], ["Paid work not allowed"], m.url),
        spouse: block("Partner on visitor visa cannot work.", [], [], m.url),
      },
      spouse: {
        applicant: block("Partner visa (820/801) includes work rights while application is processing (bridging visa with work rights when eligible).", [], [], "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-onshore"),
        spouse: block("Australian citizen/PR sponsor has full work rights.", [], [], m.url),
      },
      skilled: {
        applicant: block("Skilled migration and employer-sponsored visas authorize work per visa conditions and occupation list.", [], [], m.url),
        spouse: block("Most skilled/partner streams include full work rights for dependants.", [], [], m.url),
      },
      graduate: {
        applicant: block("Subclass 485 temporary graduate visa provides full work rights after eligible Australian study.", ["Apply within completion window.", "Stream depends on qualification and location."], [], "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-graduate-485"),
        spouse: block("Dependants included in 485 application have same work rights.", [], [], m.url),
      },
      whv: {
        applicant: block("Working Holiday (417/462) allows short-term work with any employer; 6-month employer limit may apply; India uses subclass 462 ballot.", [], ["Second WHM has regional work requirement"], m.url),
        spouse: block("WHM is individual — dependants not included.", [], [], m.url),
      },
    },
    germany: {
      student: {
        applicant: block("Student residence permit allows 140 full days or 280 half days of work per year; mini-jobs may have separate rules.", ["Must notify Ausländerbehörde for some employment changes.", "Internships tied to studies may be exempt from day counts."], [], "https://www.make-it-in-germany.com/en/visa-residence/procedure/student-visa"),
        spouse: block("Spouse on family reunion residence permit may work after approval; labor market access depends on permit wording and qualifications.", [], [], m.url),
      },
      visitor: {
        applicant: block("Schengen Type C visa does not permit employment in Germany.", [], [], m.url),
        spouse: block("Spouse on Schengen short stay cannot work.", [], [], m.url),
      },
      spouse: {
        applicant: block("Family reunion visa leads to residence permit; spouse may access labor market after integration requirements and permit conditions.", ["German A1 may be required at visa stage; higher levels for citizenship pathways."], [], m.url),
        spouse: block("German citizen/EU spouse has free labor market access in Germany.", [], [], m.url),
      },
      skilled: {
        applicant: block("Skilled worker (§18a/§18b), EU Blue Card, Opportunity Card, and Job Seeker have distinct work/search rights — follow permit type.", ["Blue Card tied to salary threshold and employer.", "Opportunity Card allows job search, not automatic employment."], [], m.url),
        spouse: block("Spouse of skilled worker typically receives residence with labor market access after arrival registration.", [], [], m.url),
      },
    },
    nz: {
      student: {
        applicant: block("Student visa may allow part-time work during study and full-time in holidays if conditions on visa allow.", ["Check visa label and INZ conditions.", "Must attend approved education provider."], [], "https://www.immigration.govt.nz/new-zealand-visas/apply-for-a-visa/about-visa/student-visa"),
        spouse: block("Partner of student may qualify for partner of student work visa if relationship genuine and funds adequate.", [], [], m.url),
      },
      visitor: {
        applicant: block("Visitor visa does not allow employment.", [], [], m.url),
        spouse: block("Partner on visitor visa cannot work.", [], [], m.url),
      },
      spouse: {
        applicant: block(
          "Partnership-based work and residence visas authorize employment in New Zealand once the visa is granted and conditions are met.",
          [
            "Partner of a New Zealander work visa allows work for any employer while partnership is assessed.",
            "Residence pathway may follow after qualifying period of living together in genuine partnership.",
            "Evidence of relationship, cohabitation, and financial interdependence is critical.",
          ],
          ["Cannot work on visitor visa while awaiting partnership visa unless interim work visa granted"],
          "https://www.immigration.govt.nz/new-zealand-visas/apply-for-a-visa/about-visa/partnership-based-visa",
        ),
        spouse: block(
          "New Zealand citizen or resident partner already has unrestricted right to work and live in New Zealand.",
          ["Sponsor must meet character requirements and may need to support partner financially during processing."],
          [],
          m.url,
        ),
      },
      skilled: {
        applicant: block(
          "Skilled Migrant Category and Accredited Employer Work Visa (AEWV) authorize employment with the nominated employer and role.",
          [
            "AEWV tied to accredited employer and job description on offer.",
            "Skilled Migrant uses points-based selection — job offer and salary thresholds apply.",
            "Must comply with visa conditions including employer and occupation.",
          ],
          ["Working outside approved role may breach visa conditions"],
          m.url,
        ),
        spouse: block(
          "Partner of AEWV or skilled worker may apply for Partner of a Worker work visa with open work rights when eligible.",
          ["Partner included in SMC residence application receives work rights with resident visa when granted."],
          [],
          m.url,
        ),
      },
      graduate: {
        applicant: block(
          "Post-study work visa provides open work rights for any employer after completing an eligible NZ qualification.",
          [
            "Apply within the allowed window after qualification completion.",
            "Open work — not tied to a single employer.",
            "Can support pathway to Skilled Migrant or employer-sponsored residence.",
          ],
          ["Must hold eligible qualification from approved provider"],
          "https://www.immigration.govt.nz/new-zealand-visas/apply-for-a-visa/about-visa/post-study-work-visa",
        ),
        spouse: block(
          "Partner may apply for Partner of a Worker work visa while principal holds valid post-study work visa.",
          ["Relationship and living together evidence required."],
          [],
          m.url,
        ),
      },
    },
  };

  // Schengen EU countries use simplified templates
  const euStudent = {
    applicant: block(
      `Long-stay national student visa for ${m.country} allows limited part-time work (typically up to 20 hours/week or per local law) after residence permit is issued.`,
      ["Verify exact hours with local immigration office after arrival.", "Cannot rely on work income alone for residence renewal."],
      ["Work not allowed until residence permit issued in many cases"],
      m.url,
    ),
    spouse: block(
      `Spouse/partner may apply for family reunion; work rights depend on ${m.country} residence permit conditions.`,
      ["Often requires proof of accommodation, integration, and sufficient income of sponsor."],
      [],
      m.url,
    ),
  };
  const euVisitor = {
    applicant: block(`Schengen Type C short-stay visa does not permit employment in ${m.country}.`, ["Tourism and limited business meetings only."], ["Paid work prohibited"], m.url),
    spouse: block("Spouse on Schengen visitor cannot work.", [], [], m.url),
  };

  if (["france", "italy", "netherlands", "ireland", "spain", "malta", "finland", "sweden", "austria", "belgium", "denmark", "portugal"].includes(group)) {
    const eu = { student: euStudent, visitor: euVisitor, spouse: euStudent, skilled: euStudent, graduate: euStudent, general: euStudent };
    return eu[type] ?? eu.general;
  }

  const country = templates[group];
  if (!country) return null;
  return country[type] ?? country.skilled ?? country.general ?? null;
}

function fullCostBreakdown(group, type, displayName) {
  const m = COUNTRY_META[group];
  if (!m) return null;

  const disclaimer =
    "Indicative costs for counselor discussions only. Government fees, tuition, and living amounts change — verify on official websites before quoting clients. Exchange rates affect INR equivalents.";

  const feeItems = {
    canada: {
      student: [
        { label: "Study permit application", amount: 235, unit: "per applicant" },
        { label: "Biometrics", amount: 85, unit: "per applicant" },
        { label: "Medical exam (if required)", range: "INR 5,000–8,000", notes: "Panel physician" },
      ],
      visitor: [
        { label: "Visitor visa (TRV)", amount: 100, unit: "per applicant" },
        { label: "Biometrics", amount: 85, unit: "per applicant" },
        { label: "Super visa (if applicable)", amount: 100, notes: "Plus medical insurance" },
      ],
      spouse: [
        { label: "Spousal sponsorship processing", amount: 1080, notes: "Principal applicant" },
        { label: "Right of permanent residence fee", amount: 575, notes: "If not yet paid" },
        { label: "Biometrics", amount: 85, unit: "per person" },
      ],
      skilled: [
        { label: "PR / work permit fees", range: "155–650", notes: "Varies by stream" },
        { label: "Biometrics", amount: 85 },
        { label: "Medical & police", range: "Varies", notes: "Third party" },
      ],
      graduate: [
        { label: "PGWP application", amount: 255 },
        { label: "Biometrics (if required)", amount: 85 },
      ],
      whv: [{ label: "IEC participation", range: "Varies by pool", notes: "Plus CAD 172 work permit" }],
      general: [{ label: "Government fees", range: "See IRCC fee list", notes: "Verify online" }],
    },
    uk: {
      student: [
        { label: "Student visa application", amount: 490, unit: "per applicant" },
        { label: "Immigration Health Surcharge", range: "£776/year", notes: "Per year of visa" },
        { label: "Priority/VFS services", range: "Optional", notes: "VAC surcharge" },
      ],
      visitor: [{ label: "Standard Visitor visa", amount: 115 }, { label: "Priority services", range: "Optional" }],
      spouse: [{ label: "Partner visa", amount: 1840, notes: "Plus IHS" }, { label: "IHS", range: "£1,035/year" }],
      skilled: [{ label: "Skilled Worker visa", amount: 719, notes: "Up to 3 years" }, { label: "IHS", range: "Per year" }],
      graduate: [{ label: "Graduate Route", amount: 822 }, { label: "IHS", range: "If applicable" }],
    },
    usa: {
      student: [
        { label: "MRV visa fee (F-1)", amount: 185 },
        { label: "SEVIS I-901", amount: 350 },
        { label: "Visa issuance (if applicable)", range: "Reciprocity", notes: "Country-specific" },
      ],
      visitor: [{ label: "B1/B2 MRV fee", amount: 185 }],
      spouse: [{ label: "Immigrant visa fees", range: "325–345", notes: "Plus affidavit of support" }],
      skilled: [{ label: "Petition fees (H-1B etc.)", range: "460–780", notes: "Employer often pays" }],
    },
    australia: {
      student: [{ label: "Subclass 500 base", amount: 710 }, { label: "Health exam", range: "Varies" }],
      visitor: [{ label: "Subclass 600", range: "190–495", notes: "Stream dependent" }],
      spouse: [{ label: "Partner visa (onshore)", amount: 8850, notes: "High fee — payment plan may apply" }],
      skilled: [{ label: "Skilled visa charges", range: "4,640+", notes: "Primary applicant" }],
      graduate: [{ label: "Subclass 485", amount: 1930 }],
      whv: [{ label: "Subclass 417/462", amount: 635 }],
    },
    germany: {
      student: [
        { label: "National visa fee", amount: 75 },
        { label: "Blocked account setup", range: "€11,904/year", notes: "Living funds" },
        { label: "Semester contribution", range: "€150–400", notes: "University" },
      ],
      visitor: [{ label: "Schengen Type C", amount: 80 }],
      spouse: [{ label: "Family reunion visa", amount: 75 }, { label: "German language course (if required)", range: "Varies" }],
      skilled: [{ label: "National visa / Blue Card", amount: 75 }, { label: "Recognition of qualifications", range: "Varies" }],
    },
    nz: {
      student: [{ label: "Student visa", amount: 375 }, { label: "Medical/police", range: "Varies" }],
      visitor: [{ label: "Visitor visa", amount: 211 }],
      spouse: [{ label: "Partnership resident", amount: 1670 }],
      skilled: [{ label: "Skilled Migrant / AEWV", range: "585–4,890", notes: "Stream dependent" }],
      graduate: [{ label: "Post-study work visa", amount: 700 }],
    },
  };

  const tuitionItems = {
    student: [
      { label: "Tuition (undergraduate, indicative)", range: "Mid-range for destination", notes: "Use offer letter amount" },
      { label: "Tuition deposit already paid", range: "Per LOA/CAS", notes: "Deduct from total funds" },
      { label: "Books & materials", range: "500–1,500", unit: "per year", notes: "Program dependent" },
    ],
    spouse: [
      { label: "Tuition", applicable: false },
      { label: "Settlement / integration costs", range: "Varies", notes: "Language tests, document legalisation" },
    ],
    visitor: [{ label: "Tuition", applicable: false, notes: "Not applicable for visitor visa" }],
    skilled: [{ label: "Credential recognition / skills assessment", range: "Varies", notes: "If required for license" }],
    graduate: [{ label: "Tuition", applicable: false, notes: "Program already completed" }],
    whv: [{ label: "Tuition", applicable: false }],
    general: [{ label: "Program fees", range: "Per offer letter", notes: "If applicable" }],
  };

  const livingItems = {
    canada: [
      { label: "Living funds (IRCC guideline, 1 person)", amount: 20635, unit: "per year", notes: "Outside Quebec" },
      { label: "Accommodation", range: "700–1,400", unit: "per month" },
      { label: "Food & personal", range: "300–550", unit: "per month" },
    ],
    uk: [
      { label: "Maintenance funds (London)", amount: 1334, unit: "per month × 9" },
      { label: "Maintenance funds (outside London)", amount: 1023, unit: "per month × 9" },
    ],
    usa: [
      { label: "Living expenses (I-20 line)", range: "12,000–25,000", unit: "per year" },
      { label: "Health insurance", range: "1,500–3,500", unit: "per year" },
    ],
    australia: [
      { label: "Living costs (Home Affairs)", amount: 29710, unit: "per year" },
      { label: "OSHC", range: "500–700", unit: "per year" },
    ],
    germany: [
      { label: "Blocked account", amount: 11904, unit: "per year" },
      { label: "Rent & utilities", range: "400–750", unit: "per month" },
    ],
    nz: [
      { label: "Living funds (INZ typical)", amount: 20000, unit: "per year" },
      { label: "Rent", range: "150–350", unit: "per week" },
    ],
  };

  const euLiving = [
    { label: "Living funds (embassy guideline)", range: "€9,000–12,000", unit: "per year" },
    { label: "Accommodation", range: "€350–900", unit: "per month" },
    { label: "Food & transport", range: "€250–450", unit: "per month" },
  ];

  const miscItems = [
    { label: "Future Link consultancy fee", range: "See Fees tab", notes: "Service package dependent" },
    { label: "Flight / travel", range: "₹40,000–1,20,000", notes: "Season and route" },
    { label: "Document translation / notary", range: "₹2,000–15,000" },
    { label: "Courier & VFS premium services", range: "Optional" },
    { label: "Forex / transfer charges", range: "Bank dependent", notes: "GIC, blocked account, tuition transfers" },
  ];

  const gFees = feeItems[group] ?? feeItems.canada;
  const fees = gFees[type] ?? gFees.general ?? gFees.student;

  const living =
    livingItems[group] ??
    (["france", "italy", "netherlands", "ireland", "spain", "malta", "finland", "sweden", "austria", "belgium", "denmark", "portugal"].includes(group)
      ? euLiving
      : [{ label: "Living costs", range: "Verify embassy guideline" }]);

  const tuition = tuitionItems[type] ?? tuitionItems.general;

  return {
    title: `Full cost breakdown — ${displayName ?? m.country}`,
    currency: m.currency,
    lastVerified: "Jun 2026",
    disclaimer,
    sourceUrl: m.url,
    sections: [
      { id: "fees", label: "Government & visa fees", items: fees.map((i) => ({ ...i, currency: m.currency, applicable: i.applicable !== false })) },
      { id: "tuition", label: "Tuition & education costs", items: tuition.map((i) => ({ ...i, currency: m.currency, applicable: i.applicable !== false })) },
      { id: "living", label: "Living costs", items: living.map((i) => ({ ...i, currency: m.currency })) },
      { id: "misc", label: "Miscellaneous", items: miscItems },
    ],
    totals: [
      {
        label: "Indicative first-year budget (excl. tuition band)",
        value: "Counselor to calculate from sections above",
        notes: "Always cross-check LOA/CAS/Offer of Place and official fee pages before client commitment.",
      },
    ],
  };
}

export function countryGroupFromFile(file) {
  const base = file.replace(/\.json$/, "").split("-")[0];
  return base in COUNTRY_META ? base : null;
}

export function buildInsightsForFile(file, displayName) {
  const group = countryGroupFromFile(file);
  if (!group) return null;
  const type = archetype(file);
  const wr = workingRights(group, type);
  const fc = fullCostBreakdown(group, type, displayName);
  if (!wr && !fc) return null;
  return {
    workingRights: wr,
    fullCostBreakdown: fc,
  };
}
