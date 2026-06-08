/**
 * Official government visa / immigration forms per Service Library slug.
 * file_path is the official URL (PDF or online portal).
 */
export const VISA_FORMS_CATALOG = {
  "canada-student-visa": [
    {
      form_code: "IMM 1294",
      title: "Application for Study Permit Made Outside of Canada",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm1294e.pdf",
      mime: "application/pdf",
      notes: "Primary study permit application — complete online via IRCC portal when applying digitally",
    },
    {
      form_code: "IMM 5645",
      title: "Family Information",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm5645e.pdf",
      mime: "application/pdf",
      notes: "Required for many countries including India",
    },
    {
      form_code: "IMM 5707",
      title: "Family Information (Extended)",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm5707e.pdf",
      mime: "application/pdf",
      notes: "Use when IMM 5645 does not apply to applicant country",
    },
    {
      form_code: "IRCC Portal",
      title: "IRCC secure account — apply online",
      url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/account.html",
      mime: "text/html",
      notes: "Most study permit applications are submitted online",
    },
  ],
  "canada-visitor-visa": [
    {
      form_code: "IMM 5257",
      title: "Application for Visitor Visa (Temporary Resident Visa)",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm5257e.pdf",
      mime: "application/pdf",
    },
    {
      form_code: "IMM 5645",
      title: "Family Information",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm5645e.pdf",
      mime: "application/pdf",
    },
    {
      form_code: "IMM 5707",
      title: "Family Information (Extended)",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm5707e.pdf",
      mime: "application/pdf",
    },
  ],
  "canada-spouse-visa": [
    {
      form_code: "IMM 1344",
      title: "Application to Sponsor, Sponsorship Agreement and Undertaking",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm1344e.pdf",
      mime: "application/pdf",
    },
    {
      form_code: "IMM 5532",
      title: "Relationship Information and Sponsorship Evaluation",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm5532e.pdf",
      mime: "application/pdf",
    },
    {
      form_code: "IMM 0008",
      title: "Generic Application Form for Canada",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm0008e.pdf",
      mime: "application/pdf",
    },
  ],
  "canada-express-entry-pr": [
    {
      form_code: "IMM 0008",
      title: "Generic Application Form for Canada (PR)",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm0008e.pdf",
      mime: "application/pdf",
    },
    {
      form_code: "IMM 5669",
      title: "Schedule A — Background / Declaration",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm5669e.pdf",
      mime: "application/pdf",
    },
    {
      form_code: "Express Entry",
      title: "Express Entry profile — create or sign in",
      url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile.html",
      mime: "text/html",
    },
  ],
  "canada-pgwp": [
    {
      form_code: "IMM 5710",
      title: "Application to Change Conditions, Extend Stay or Remain in Canada (Work Permit)",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm5710e.pdf",
      mime: "application/pdf",
      notes: "PGWP applied from inside Canada",
    },
  ],
  "canada-work-permit": [
    {
      form_code: "IMM 1295",
      title: "Application for Work Permit Made Outside of Canada",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm1295e.pdf",
      mime: "application/pdf",
    },
    {
      form_code: "IMM 5488",
      title: "Document Checklist — Worker (IMM 5488)",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm5488e.pdf",
      mime: "application/pdf",
    },
  ],
  "canada-super-visa": [
    {
      form_code: "IMM 5257",
      title: "Application for Visitor Visa (Super Visa pathway)",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm5257e.pdf",
      mime: "application/pdf",
    },
    {
      form_code: "IMM 5645",
      title: "Family Information",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm5645e.pdf",
      mime: "application/pdf",
    },
  ],
  "canada-bowp": [
    {
      form_code: "IMM 5710",
      title: "Application to Change Conditions / Extend Stay (BOWP)",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm5710e.pdf",
      mime: "application/pdf",
    },
  ],
  "canada-study-permit-extension": [
    {
      form_code: "IMM 5709",
      title: "Application to Change Conditions, Extend Stay — Study Permit",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm5709e.pdf",
      mime: "application/pdf",
    },
  ],
  "canada-visitor-record": [
    {
      form_code: "IMM 5708",
      title: "Application to Change Conditions or Extend Stay — Visitor",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm5708e.pdf",
      mime: "application/pdf",
    },
  ],
  "canada-caips-notes": [
    {
      form_code: "IMM 5563",
      title: "Request for GCMS / CAIPS / Notes",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm5563e.pdf",
      mime: "application/pdf",
      notes: "Access to Information — verify current IRCC ATIP process",
    },
  ],
  "canada-spouse-dependent-owp": [
    {
      form_code: "IMM 5710",
      title: "Open Work Permit for Spouse/Common-law Partner",
      url: "https://www.canada.ca/content/dam/ircc/migration/ircc/english/pdf/kits/forms/imm5710e.pdf",
      mime: "application/pdf",
    },
  ],
  "uk-student-visa": [
    {
      form_code: "Student route",
      title: "Apply for a Student visa — GOV.UK",
      url: "https://www.gov.uk/student-visa/apply",
      mime: "text/html",
    },
    {
      form_code: "Appendix Student",
      title: "Immigration Rules — Student route",
      url: "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-student",
      mime: "text/html",
    },
  ],
  "uk-visitor-visa": [
    {
      form_code: "Standard Visitor",
      title: "Apply for a Standard Visitor visa",
      url: "https://www.gov.uk/standard-visitor/apply",
      mime: "text/html",
    },
  ],
  "uk-spouse-visa": [
    {
      form_code: "Appendix FM",
      title: "Family visa — partner route apply",
      url: "https://www.gov.uk/uk-family-visa/partner-spouse",
      mime: "text/html",
    },
  ],
  "uk-skilled-worker": [
    {
      form_code: "Skilled Worker",
      title: "Apply for a Skilled Worker visa",
      url: "https://www.gov.uk/skilled-worker-visa/apply",
      mime: "text/html",
    },
  ],
  "uk-graduate-route": [
    {
      form_code: "Graduate route",
      title: "Apply for a Graduate visa",
      url: "https://www.gov.uk/graduate-visa/apply",
      mime: "text/html",
    },
  ],
  "usa-student-visa": [
    {
      form_code: "DS-160",
      title: "Online Nonimmigrant Visa Application (DS-160)",
      url: "https://ceac.state.gov/genniv/",
      mime: "text/html",
    },
    {
      form_code: "SEVIS",
      title: "SEVIS fee payment — FMJfee.com",
      url: "https://www.fmjfee.com/",
      mime: "text/html",
    },
  ],
  "usa-visitor-visa": [
    {
      form_code: "DS-160",
      title: "Online Nonimmigrant Visa Application (DS-160)",
      url: "https://ceac.state.gov/genniv/",
      mime: "text/html",
    },
  ],
  "usa-spouse-visa": [
    {
      form_code: "I-130",
      title: "Petition for Alien Relative (USCIS I-130)",
      url: "https://www.uscis.gov/i-130",
      mime: "text/html",
    },
    {
      form_code: "DS-260",
      title: "Immigrant Visa Application (DS-260)",
      url: "https://travel.state.gov/content/travel/en/us-visas/immigrate/the-immigrant-visa-process/step-1-submit-a-petition/step-2-begin-nvc-processing/step-3-collect-financial-evidence-and-civil-documents/step-4-complete-online-immigrant-visa-application-ds-260.html",
      mime: "text/html",
    },
  ],
  "usa-green-card": [
    {
      form_code: "I-485",
      title: "Application to Register Permanent Residence (I-485)",
      url: "https://www.uscis.gov/i-485",
      mime: "text/html",
    },
    {
      form_code: "I-693",
      title: "Report of Medical Examination (I-693)",
      url: "https://www.uscis.gov/i-693",
      mime: "text/html",
    },
  ],
  "australia-student-visa": [
    {
      form_code: "Form 500",
      title: "Student visa (subclass 500) — apply online",
      url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
      mime: "text/html",
    },
    {
      form_code: "Form 956",
      title: "Appointment of a registered migration agent",
      url: "https://immi.homeaffairs.gov.au/form-listing/forms/956.pdf",
      mime: "application/pdf",
    },
  ],
  "australia-visitor-visa": [
    {
      form_code: "Form 1419",
      title: "Application for a Visitor visa",
      url: "https://immi.homeaffairs.gov.au/form-listing/forms/1419.pdf",
      mime: "application/pdf",
    },
    {
      form_code: "Visitor 600",
      title: "Visitor visa (subclass 600) — apply online",
      url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600",
      mime: "text/html",
    },
  ],
  "australia-spouse-visa": [
    {
      form_code: "Partner 820/801",
      title: "Partner visa — onshore pathway",
      url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-onshore",
      mime: "text/html",
    },
    {
      form_code: "Form 888",
      title: "Statutory declaration by a supporting witness",
      url: "https://immi.homeaffairs.gov.au/form-listing/forms/888.pdf",
      mime: "application/pdf",
    },
  ],
  "australia-skilled-migration": [
    {
      form_code: "SkillSelect",
      title: "SkillSelect — Expression of Interest",
      url: "https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect",
      mime: "text/html",
    },
    {
      form_code: "Form 80",
      title: "Personal particulars for character assessment",
      url: "https://immi.homeaffairs.gov.au/form-listing/forms/80.pdf",
      mime: "application/pdf",
    },
  ],
  "australia-work-holiday": [
    {
      form_code: "Subclass 417/462",
      title: "Working Holiday visa — Home Affairs",
      url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-417",
      mime: "text/html",
    },
    {
      form_code: "Form 1150",
      title: "Application for a Visitor visa — Tourist stream (reference)",
      url: "https://immi.homeaffairs.gov.au/form-listing/forms/1150.pdf",
      mime: "application/pdf",
      notes: "Verify current WHM application process on immi.homeaffairs.gov.au",
    },
  ],
  "australia-subclass-485": [
    {
      form_code: "Subclass 485",
      title: "Temporary Graduate visa — apply online",
      url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-graduate-485",
      mime: "text/html",
    },
  ],
  "germany-student-visa": [
    {
      form_code: "National visa",
      title: "National visa application form (German missions)",
      url: "https://videx.diplo.de/videx/visum-erfassung/#/videx-lang",
      mime: "text/html",
      notes: "VIDEX online form for long-stay national visa",
    },
    {
      form_code: "Checklist",
      title: "Student visa requirements — Make it in Germany",
      url: "https://www.make-it-in-germany.com/en/visa-entry/studying/student-visa",
      mime: "text/html",
    },
  ],
  "germany-visitor-visa": [
    {
      form_code: "Schengen visa",
      title: "Schengen visa application (short stay)",
      url: "https://videx.diplo.de/videx/visum-erfassung/#/videx-lang",
      mime: "text/html",
    },
  ],
  "germany-spouse-visa": [
    {
      form_code: "Family reunion",
      title: "Family reunion visa — requirements",
      url: "https://www.make-it-in-germany.com/en/visa-entry/living-permanently/family-reunion",
      mime: "text/html",
    },
    {
      form_code: "VIDEX",
      title: "National visa application (VIDEX)",
      url: "https://videx.diplo.de/videx/visum-erfassung/#/videx-lang",
      mime: "text/html",
    },
  ],
  "germany-opportunity-card": [
    {
      form_code: "Chancenkarte",
      title: "Opportunity Card (Chancenkarte) — official info",
      url: "https://www.make-it-in-germany.com/en/visa-entry/working/opportunity-card",
      mime: "text/html",
    },
    {
      form_code: "VIDEX",
      title: "National visa application (VIDEX)",
      url: "https://videx.diplo.de/videx/visum-erfassung/#/videx-lang",
      mime: "text/html",
    },
  ],
  "germany-job-seeker": [
    {
      form_code: "Job seeker",
      title: "Job seeker visa — requirements",
      url: "https://www.make-it-in-germany.com/en/visa-entry/working/job-seeker",
      mime: "text/html",
    },
    {
      form_code: "VIDEX",
      title: "National visa application (VIDEX)",
      url: "https://videx.diplo.de/videx/visum-erfassung/#/videx-lang",
      mime: "text/html",
    },
  ],
  "nz-student-visa": [
    {
      form_code: "Student visa",
      title: "Apply for a student visa — Immigration NZ",
      url: "https://www.immigration.govt.nz/new-zealand-visas/apply-for-a-visa/about-visa/student-visa",
      mime: "text/html",
    },
    {
      form_code: "INZ 1012",
      title: "Student visa application form (PDF)",
      url: "https://www.immigration.govt.nz/documents/forms-and-guides/inz1012.pdf",
      mime: "application/pdf",
    },
  ],
  "nz-visitor-visa": [
    {
      form_code: "Visitor visa",
      title: "Apply for a visitor visa — Immigration NZ",
      url: "https://www.immigration.govt.nz/new-zealand-visas/apply-for-a-visa/about-visa/visitor-visa",
      mime: "text/html",
    },
    {
      form_code: "INZ 1017",
      title: "Visitor visa application form (PDF)",
      url: "https://www.immigration.govt.nz/documents/forms-and-guides/inz1017.pdf",
      mime: "application/pdf",
    },
  ],
  "nz-spouse-visa": [
    {
      form_code: "Partnership visa",
      title: "Partnership-based visa — Immigration NZ",
      url: "https://www.immigration.govt.nz/new-zealand-visas/apply-for-a-visa/about-visa/partnership-based-visa",
      mime: "text/html",
    },
    {
      form_code: "INZ 1178",
      title: "Partnership-based temporary visa application",
      url: "https://www.immigration.govt.nz/documents/forms-and-guides/inz1178.pdf",
      mime: "application/pdf",
    },
  ],
  "nz-skilled-migrant": [
    {
      form_code: "SMC",
      title: "Skilled Migrant Category — Immigration NZ",
      url: "https://www.immigration.govt.nz/new-zealand-visas/apply-for-a-visa/about-visa/skilled-migrant-category-resident-visa",
      mime: "text/html",
    },
    {
      form_code: "INZ 1000",
      title: "Residence application (general)",
      url: "https://www.immigration.govt.nz/documents/forms-and-guides/inz1000.pdf",
      mime: "application/pdf",
    },
  ],
  "nz-post-study-work": [
    {
      form_code: "Post-study work",
      title: "Post-study work visa — Immigration NZ",
      url: "https://www.immigration.govt.nz/new-zealand-visas/apply-for-a-visa/about-visa/post-study-work-visa",
      mime: "text/html",
    },
  ],
};
