# Service Library completeness audit

**Generated:** 2026-06-17T01:51:58.625Z
**Source:** repo JSON (use --live for Supabase DB tables)
**Records scanned:** 131
**Metadata complete (JSON):** 78 · **Metadata gaps:** 53
**Fully complete (incl. DB):** 0 · **Any gaps:** 131

> DB-only checks (fees table, submission checklist, visa forms, checklist PDFs, process_flow) require `--live` or SQL audit.

## Thresholds

| Check | Target |
|-------|--------|
| faqs | 30 |
| quiz | 75 |
| quizMin | 15 |
| redFlags | 5 |
| kpis | 3 |
| resources | 4 |
| proTips | 5 |
| timeline | 4 |
| submissionChecklist | 10 |
| fullCostSections | 4 |
| sampleDocs | 1 |

## Gap frequency (all services)

| Gap | Services affected |
|-----|-------------------|
| db:submission checklist (0/10) | 131 |
| db:visa forms | 95 |
| db:checklist PDFs | 95 |
| db:cost_summary_html (DB) | 36 |
| below:proTips: 4/5 | 35 |
| meta:proTips: 4/5 | 35 |
| db:fees (metadata or service_library_fee_items) | 30 |
| below:redFlags: 3/5 | 30 |
| meta:redFlags: 3/5 | 30 |
| empty:sampleDocs | 25 |
| meta:sampleDocs | 25 |
| below:faqs: 4/30 | 22 |
| meta:faqs: 4/30 | 22 |
| empty:resources | 19 |
| meta:resources | 19 |
| below:resources: 2/4 | 11 |
| meta:resources: 2/4 | 11 |
| below:resources: 1/4 | 10 |
| meta:resources: 1/4 | 10 |
| empty:fullCostBreakdown.sections (<4) | 7 |
| meta:fullCostBreakdown.sections (<4) | 7 |
| below:proTips: 3/5 | 5 |
| meta:proTips: 3/5 | 5 |
| below:redFlags: 4/5 | 3 |
| meta:redFlags: 4/5 | 3 |
| below:faqs: 6/30 | 2 |
| meta:faqs: 6/30 | 2 |
| below:faqs: 5/30 | 2 |
| meta:faqs: 5/30 | 2 |
| below:faqs: 10/30 | 1 |
| meta:faqs: 10/30 | 1 |
| below:resources: 3/4 | 1 |
| meta:resources: 3/4 | 1 |
| below:faqs: 8/30 | 1 |
| meta:faqs: 8/30 | 1 |
| below:faqs: 3/30 | 1 |
| meta:faqs: 3/30 | 1 |
| empty:displayName | 1 |
| empty:shortDescription | 1 |
| empty:version | 1 |
| empty:about | 1 |
| empty:eligibility | 1 |
| empty:redFlags | 1 |
| empty:redFlagsBanner | 1 |
| empty:faqs | 1 |
| empty:compliance | 1 |
| empty:proTips | 1 |
| empty:postApproval | 1 |
| empty:kpis (<3) | 1 |
| empty:quiz | 1 |
| empty:donts | 1 |
| empty:timeline (metadata) | 1 |
| empty:changelog | 1 |
| empty:workingRights.applicant | 1 |
| empty:workingRights.spouse | 1 |
| dates:updatedLabel | 1 |
| db:process_flow (DB) | 1 |
| meta:displayName | 1 |
| meta:shortDescription | 1 |
| meta:version | 1 |
| meta:about | 1 |
| meta:eligibility | 1 |
| meta:redFlags | 1 |
| meta:redFlagsBanner | 1 |
| meta:faqs | 1 |
| meta:compliance | 1 |
| meta:proTips | 1 |
| meta:postApproval | 1 |
| meta:kpis (<3) | 1 |
| meta:quiz | 1 |
| meta:donts | 1 |
| meta:timeline (metadata) | 1 |
| meta:changelog | 1 |
| meta:workingRights.applicant | 1 |
| meta:workingRights.spouse | 1 |
| meta:updatedLabel | 1 |

## Services with metadata gaps (JSON content)

### south-korea-student-visa.json

- **ID:** `b2000001-0001-4000-8000-0000000000ec`
- **File:** south-korea-student-visa.json
- **Category:** visa_immigration
- **Countries:** South Korea
- **Issues (metadata):** 22
- **Counts:** FAQs 0, Quiz 0, Red flags 0, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** displayName, shortDescription, version, about, eligibility, redFlags, redFlagsBanner, faqs, compliance, proTips, postApproval, kpis (<3), resources, quiz, sampleDocs, donts, timeline (metadata), changelog, workingRights.applicant, workingRights.spouse, fullCostBreakdown.sections (<4)
- **Missing verification dates:** updatedLabel
- **DB / operational gaps:** process_flow (DB), cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10), visa forms, checklist PDFs

### Duolingo English Test

- **ID:** `b2000001-0001-4000-8000-0000000000b8`
- **File:** coaching-duolingo-english-test.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5, resources: 1/4
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### French Language (General / Custom)

- **ID:** `b2000001-0001-4000-8000-0000000000ba`
- **File:** coaching-french-language-general.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** resources, sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### French Language A1

- **ID:** `b2000001-0001-4000-8000-0000000000bb`
- **File:** coaching-french-language-a1.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** resources, sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### French Language A2

- **ID:** `b2000001-0001-4000-8000-0000000000bc`
- **File:** coaching-french-language-a2.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** resources, sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### French Language B1

- **ID:** `b2000001-0001-4000-8000-0000000000bd`
- **File:** coaching-french-language-b1.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** resources, sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### French Language B2

- **ID:** `b2000001-0001-4000-8000-0000000000be`
- **File:** coaching-french-language-b2.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** resources, sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### French Language C1

- **ID:** `b2000001-0001-4000-8000-0000000000bf`
- **File:** coaching-french-language-c1.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** resources, sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### French Language C2

- **ID:** `b2000001-0001-4000-8000-0000000000c0`
- **File:** coaching-french-language-c2.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** resources, sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### German A2 Crash (with books)

- **ID:** `b2000001-0001-4000-8000-0000000000c3`
- **File:** coaching-german-a2-crash.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** resources, sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### German A2 Regular (with books)

- **ID:** `b2000001-0001-4000-8000-0000000000c2`
- **File:** coaching-german-a2-regular.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** resources, sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### German B1 Regular (with books)

- **ID:** `b2000001-0001-4000-8000-0000000000c4`
- **File:** coaching-german-b1-regular.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** resources, sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### German B1 Speaking

- **ID:** `b2000001-0001-4000-8000-0000000000c5`
- **File:** coaching-german-b1-speaking.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** resources, sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### German Language A1 Crash Course

- **ID:** `b2000001-0001-4000-8000-0000000000c6`
- **File:** coaching-german-language-a1-crash.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** resources, sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### German Language A1 Regular

- **ID:** `b2000001-0001-4000-8000-0000000000c1`
- **File:** coaching-german-language-a1-regular.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** resources, sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### German Language B2 Regular

- **ID:** `(unmapped)`
- **File:** coaching-german-language-b2-regular.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** resources, sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### GMAT

- **ID:** `b2000001-0001-4000-8000-0000000000cb`
- **File:** coaching-gmat.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5, resources: 1/4
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### GRE

- **ID:** `b2000001-0001-4000-8000-0000000000ca`
- **File:** coaching-gre.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5, resources: 1/4
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### IELTS Academic Regular (without books)

- **ID:** `b2000001-0001-4000-8000-000000000075`
- **File:** coaching-ielts-academic-regular-nb.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** resources, sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### IELTS General Crash Course

- **ID:** `b2000001-0001-4000-8000-000000000077`
- **File:** coaching-ielts-gt-crash.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** resources, sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### IELTS General Regular (without books)

- **ID:** `b2000001-0001-4000-8000-000000000076`
- **File:** coaching-ielts-gt-regular-nb.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** resources, sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### PTE Academic

- **ID:** `b2000001-0001-4000-8000-0000000000b5`
- **File:** coaching-pte-academic.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 6, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** sampleDocs
- **Below threshold:** faqs: 6/30, redFlags: 3/5, proTips: 4/5, resources: 1/4
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### SAT

- **ID:** `b2000001-0001-4000-8000-0000000000cc`
- **File:** coaching-sat.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 4, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** sampleDocs
- **Below threshold:** faqs: 4/30, redFlags: 3/5, proTips: 4/5, resources: 1/4
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### Spoken English (with books)

- **ID:** `b2000001-0001-4000-8000-0000000000b9`
- **File:** coaching-spoken-english.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 3, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** resources, sampleDocs
- **Below threshold:** faqs: 3/30, redFlags: 3/5, proTips: 4/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### TOEFL iBT

- **ID:** `b2000001-0001-4000-8000-0000000000b6`
- **File:** coaching-toefl-ibt.json
- **Category:** coaching
- **Issues (metadata):** 5
- **Counts:** FAQs 5, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** sampleDocs
- **Below threshold:** faqs: 5/30, redFlags: 3/5, proTips: 4/5, resources: 1/4
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### CELPIP General

- **ID:** `b2000001-0001-4000-8000-0000000000b7`
- **File:** coaching-celpip-general.json
- **Category:** coaching
- **Issues (metadata):** 4
- **Counts:** FAQs 8, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** faqs: 8/30, redFlags: 3/5, proTips: 4/5, resources: 1/4
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### IELTS Academic Crash Course

- **ID:** `b2000001-0001-4000-8000-000000000073`
- **File:** coaching-ielts-academic-crash.json
- **Category:** coaching
- **Issues (metadata):** 4
- **Counts:** FAQs 4, Quiz 75, Red flags 4, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** faqs: 4/30, redFlags: 4/5, proTips: 3/5, resources: 3/4
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### Singapore – Short-Term Visit / Visitor

- **ID:** `b2000001-0001-4000-8000-0000000000e8`
- **File:** singapore-visitor-visa.json
- **Category:** visa_immigration
- **Countries:** Singapore
- **Issues (metadata):** 4
- **Counts:** FAQs 30, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** fullCostBreakdown.sections (<4)
- **Below threshold:** redFlags: 3/5, proTips: 3/5, resources: 2/4
- **DB / operational gaps:** cost_summary_html (DB), submission checklist (0/10), visa forms, checklist PDFs

### United Arab Emirates – Spouse / Dependent Visa

- **ID:** `b2000001-0001-4000-8000-0000000000d8`
- **File:** uae-spouse-dependent-visa.json
- **Category:** visa_immigration
- **Countries:** UAE
- **Issues (metadata):** 4
- **Counts:** FAQs 30, Quiz 75, Red flags 4, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** fullCostBreakdown.sections (<4)
- **Below threshold:** redFlags: 4/5, proTips: 3/5, resources: 2/4
- **DB / operational gaps:** cost_summary_html (DB), submission checklist (0/10), visa forms, checklist PDFs

### United Arab Emirates – Visitor Visa (Tourist / Short Stay)

- **ID:** `b2000001-0001-4000-8000-0000000000d9`
- **File:** uae-visitor-visa.json
- **Category:** visa_immigration
- **Countries:** UAE
- **Issues (metadata):** 4
- **Counts:** FAQs 30, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** fullCostBreakdown.sections (<4)
- **Below threshold:** redFlags: 3/5, proTips: 3/5, resources: 2/4
- **DB / operational gaps:** cost_summary_html (DB), submission checklist (0/10), visa forms, checklist PDFs

### IELTS General Regular (with books)

- **ID:** `b2000001-0001-4000-8000-000000000074`
- **File:** coaching-ielts-gt-regular.json
- **Category:** coaching
- **Issues (metadata):** 3
- **Counts:** FAQs 5, Quiz 75, Red flags 4, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** faqs: 5/30, redFlags: 4/5, proTips: 3/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### Singapore – Employment Pass / S Pass (Work Pass)

- **ID:** `b2000001-0001-4000-8000-0000000000ea`
- **File:** singapore-employment-pass.json
- **Category:** visa_immigration
- **Countries:** Singapore
- **Issues (metadata):** 3
- **Counts:** FAQs 30, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** fullCostBreakdown.sections (<4)
- **Below threshold:** redFlags: 3/5, resources: 2/4
- **DB / operational gaps:** cost_summary_html (DB), submission checklist (0/10), visa forms, checklist PDFs

### United Arab Emirates – Employment / Work Permit

- **ID:** `b2000001-0001-4000-8000-0000000000da`
- **File:** uae-work-permit.json
- **Category:** visa_immigration
- **Countries:** UAE
- **Issues (metadata):** 3
- **Counts:** FAQs 30, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** fullCostBreakdown.sections (<4)
- **Below threshold:** redFlags: 3/5, resources: 2/4
- **DB / operational gaps:** cost_summary_html (DB), submission checklist (0/10), visa forms, checklist PDFs

### United Arab Emirates – Golden Visa (Long-Term Residence)

- **ID:** `b2000001-0001-4000-8000-0000000000db`
- **File:** uae-golden-visa.json
- **Category:** visa_immigration
- **Countries:** UAE
- **Issues (metadata):** 3
- **Counts:** FAQs 30, Quiz 75, Red flags 3, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Empty sections:** fullCostBreakdown.sections (<4)
- **Below threshold:** redFlags: 3/5, resources: 2/4
- **DB / operational gaps:** cost_summary_html (DB), submission checklist (0/10), visa forms, checklist PDFs

### IELTS Academic Regular (with books)

- **ID:** `b2000001-0001-4000-8000-000000000072`
- **File:** coaching-ielts-academic-regular.json
- **Category:** coaching
- **Issues (metadata):** 2
- **Counts:** FAQs 6, Quiz 75, Red flags 5, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** faqs: 6/30, proTips: 4/5
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### Avicenna Batumi Medical University — Georgia

- **ID:** `b2000001-0001-4000-8000-0000000000d7`
- **File:** mbbs-avicenna-batumi.json
- **Category:** mbbs_services
- **Issues (metadata):** 1
- **Counts:** FAQs 31, Quiz 75, Red flags 5, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** proTips: 4/5
- **DB / operational gaps:** submission checklist (0/10)

### Cyprus – National Visitor Visa (Short Stay)

- **ID:** `b2000001-0001-4000-8000-0000000000c9`
- **File:** cyprus-visitor-visa.json
- **Category:** visa_immigration
- **Countries:** Cyprus
- **Issues (metadata):** 1
- **Counts:** FAQs 30, Quiz 75, Red flags 6, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** resources: 2/4
- **DB / operational gaps:** submission checklist (0/10), visa forms, checklist PDFs

### Georgian National University SEU — Georgia

- **ID:** `b2000001-0001-4000-8000-0000000000d5`
- **File:** mbbs-georgian-national-university-seu.json
- **Category:** mbbs_services
- **Issues (metadata):** 1
- **Counts:** FAQs 31, Quiz 75, Red flags 5, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** proTips: 4/5
- **DB / operational gaps:** submission checklist (0/10)

### Hungary – Schengen Visitor Visa (Type C)

- **ID:** `b2000001-0001-4000-8000-0000000000e1`
- **File:** hungary-visitor-visa.json
- **Category:** visa_immigration
- **Countries:** Hungary
- **Issues (metadata):** 1
- **Counts:** FAQs 30, Quiz 75, Red flags 6, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** resources: 2/4
- **DB / operational gaps:** submission checklist (0/10), visa forms, checklist PDFs

### Hungary – Student Residence Permit (National D Visa)

- **ID:** `b2000001-0001-4000-8000-0000000000e0`
- **File:** hungary-student-visa.json
- **Category:** visa_immigration
- **Countries:** Hungary
- **Issues (metadata):** 1
- **Counts:** FAQs 30, Quiz 75, Red flags 6, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** resources: 1/4
- **DB / operational gaps:** submission checklist (0/10), visa forms, checklist PDFs

### IELTS — International English Language Testing System

- **ID:** `b2000001-0001-4000-8000-000000000071`
- **File:** coaching-ielts-test-reference.json
- **Category:** coaching
- **Issues (metadata):** 1
- **Counts:** FAQs 10, Quiz 75, Red flags 6, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** faqs: 10/30
- **DB / operational gaps:** cost_summary_html (DB), fees (metadata or service_library_fee_items), submission checklist (0/10)

### International Black Sea University — Georgia

- **ID:** `b2000001-0001-4000-8000-0000000000d6`
- **File:** mbbs-international-black-sea-university.json
- **Category:** mbbs_services
- **Issues (metadata):** 1
- **Counts:** FAQs 31, Quiz 75, Red flags 5, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** proTips: 4/5
- **DB / operational gaps:** submission checklist (0/10)

### Latvia – Schengen Visitor Visa (Type C)

- **ID:** `b2000001-0001-4000-8000-0000000000e5`
- **File:** latvia-visitor-visa.json
- **Category:** visa_immigration
- **Countries:** Latvia
- **Issues (metadata):** 1
- **Counts:** FAQs 30, Quiz 75, Red flags 6, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** resources: 2/4
- **DB / operational gaps:** submission checklist (0/10), visa forms, checklist PDFs

### Latvia – Student Residence Permit (National D Visa)

- **ID:** `b2000001-0001-4000-8000-0000000000e4`
- **File:** latvia-student-visa.json
- **Category:** visa_immigration
- **Countries:** Latvia
- **Issues (metadata):** 1
- **Counts:** FAQs 30, Quiz 75, Red flags 6, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** resources: 1/4
- **DB / operational gaps:** submission checklist (0/10), visa forms, checklist PDFs

### Lithuania – Schengen Visitor Visa (Type C)

- **ID:** `b2000001-0001-4000-8000-0000000000ce`
- **File:** lithuania-visitor-visa.json
- **Category:** visa_immigration
- **Countries:** Lithuania
- **Issues (metadata):** 1
- **Counts:** FAQs 30, Quiz 75, Red flags 6, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** resources: 2/4
- **DB / operational gaps:** submission checklist (0/10), visa forms, checklist PDFs

### Medical University of the Americas — Caribbean

- **ID:** `b2000001-0001-4000-8000-0000000000d3`
- **File:** mbbs-medical-university-americas.json
- **Category:** mbbs_services
- **Issues (metadata):** 1
- **Counts:** FAQs 31, Quiz 75, Red flags 5, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** proTips: 4/5
- **DB / operational gaps:** submission checklist (0/10)

### Poland – Schengen Visitor Visa (Type C)

- **ID:** `b2000001-0001-4000-8000-0000000000dd`
- **File:** poland-visitor-visa.json
- **Category:** visa_immigration
- **Countries:** Poland
- **Issues (metadata):** 1
- **Counts:** FAQs 30, Quiz 75, Red flags 6, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** resources: 2/4
- **DB / operational gaps:** submission checklist (0/10), visa forms, checklist PDFs

### Poland – Student Visa (National D + Residence for Studies)

- **ID:** `b2000001-0001-4000-8000-0000000000dc`
- **File:** poland-student-visa.json
- **Category:** visa_immigration
- **Countries:** Poland
- **Issues (metadata):** 1
- **Counts:** FAQs 30, Quiz 75, Red flags 6, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** resources: 1/4
- **DB / operational gaps:** submission checklist (0/10), visa forms, checklist PDFs

### Saba University School of Medicine — Caribbean

- **ID:** `b2000001-0001-4000-8000-0000000000d1`
- **File:** mbbs-saba-university.json
- **Category:** mbbs_services
- **Issues (metadata):** 1
- **Counts:** FAQs 30, Quiz 75, Red flags 5, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** proTips: 4/5
- **DB / operational gaps:** submission checklist (0/10)

### Singapore – Student's Pass (STP)

- **ID:** `b2000001-0001-4000-8000-0000000000e7`
- **File:** singapore-student-visa.json
- **Category:** visa_immigration
- **Countries:** Singapore
- **Issues (metadata):** 1
- **Counts:** FAQs 30, Quiz 75, Red flags 6, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** proTips: 4/5
- **DB / operational gaps:** submission checklist (0/10), visa forms, checklist PDFs

### St. Matthew's University — Caribbean

- **ID:** `b2000001-0001-4000-8000-0000000000d4`
- **File:** mbbs-st-matthews-university.json
- **Category:** mbbs_services
- **Issues (metadata):** 1
- **Counts:** FAQs 31, Quiz 75, Red flags 5, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** proTips: 4/5
- **DB / operational gaps:** submission checklist (0/10)

### Synergy University — Russia

- **ID:** `b2000001-0001-4000-8000-0000000000d2`
- **File:** mbbs-synergy-university.json
- **Category:** mbbs_services
- **Issues (metadata):** 1
- **Counts:** FAQs 31, Quiz 75, Red flags 5, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** proTips: 4/5
- **DB / operational gaps:** submission checklist (0/10)

### United Arab Emirates – Student Residence Visa

- **ID:** `b2000001-0001-4000-8000-0000000000cf`
- **File:** uae-student-visa.json
- **Category:** visa_immigration
- **Countries:** UAE
- **Issues (metadata):** 1
- **Counts:** FAQs 30, Quiz 75, Red flags 6, Fees 0, Checklist items 0, Visa forms 0, Checklist PDFs 0
- **Below threshold:** proTips: 4/5
- **DB / operational gaps:** submission checklist (0/10), visa forms, checklist PDFs

## Shared FAQ questions across services (top 30)

- "what is description for this service?" → 94 services: Canada – Student Visa (Study Permit — Outside Canada), Canada – Visitor Visa (TRV), Canada – Spouse / Partner Sponsorship, Canada – Express Entry (Permanent Residence), Canada – Post-Graduation Work Permit (PGWP)…
- "what is key authority for this service?" → 94 services: Canada – Student Visa (Study Permit — Outside Canada), Canada – Visitor Visa (TRV), Canada – Spouse / Partner Sponsorship, Canada – Express Entry (Permanent Residence), Canada – Post-Graduation Work Permit (PGWP)…
- "what is eligible applicants for this service?" → 93 services: Canada – Student Visa (Study Permit — Outside Canada), Canada – Visitor Visa (TRV), Canada – Spouse / Partner Sponsorship, Canada – Express Entry (Permanent Residence), Canada – Post-Graduation Work Permit (PGWP)…
- "what is after approval for this service?" → 93 services: Canada – Student Visa (Study Permit — Outside Canada), Canada – Visitor Visa (TRV), Canada – Spouse / Partner Sponsorship, Canada – Express Entry (Permanent Residence), Canada – Post-Graduation Work Permit (PGWP)…
- "what is the processing time?" → 86 services: Canada – Student Visa (Study Permit — Outside Canada), Canada – Visitor Visa (TRV), Canada – Spouse / Partner Sponsorship, Canada – Express Entry (Permanent Residence), Canada – Post-Graduation Work Permit (PGWP)…
- "what is the government fee?" → 86 services: Canada – Student Visa (Study Permit — Outside Canada), Canada – Visitor Visa (TRV), Canada – Spouse / Partner Sponsorship, Canada – Express Entry (Permanent Residence), Canada – Post-Graduation Work Permit (PGWP)…
- "what is the required docs?" → 86 services: Canada – Student Visa (Study Permit — Outside Canada), Canada – Visitor Visa (TRV), Canada – Spouse / Partner Sponsorship, Canada – Express Entry (Permanent Residence), Canada – Post-Graduation Work Permit (PGWP)…
- "what is the consultancy fee?" → 86 services: Canada – Student Visa (Study Permit — Outside Canada), Canada – Visitor Visa (TRV), Canada – Spouse / Partner Sponsorship, Canada – Express Entry (Permanent Residence), Canada – Post-Graduation Work Permit (PGWP)…
- "what is the our approval rate?" → 85 services: Canada – Student Visa (Study Permit — Outside Canada), Canada – Visitor Visa (TRV), Canada – Spouse / Partner Sponsorship, Canada – Express Entry (Permanent Residence), Canada – Post-Graduation Work Permit (PGWP)…
- "is valid passport required?" → 31 services: UK – Visitor Visa (Standard Visitor), USA – Visitor Visa (B1/B2), Australia – Visitor Visa (Subclass 600), Germany – Student Visa (National Visa), Germany – Opportunity Card (Chancenkarte)…
- "are books included?" → 23 services: IELTS Academic Regular (with books), IELTS General Regular (with books), IELTS Academic Regular (without books), IELTS General Regular (without books), IELTS General Crash Course…
- "is strong ties to india required?" → 22 services: UK – Visitor Visa (Standard Visitor), USA – Visitor Visa (B1/B2), Australia – Visitor Visa (Subclass 600), Germany – Visitor / Schengen Visa (Type C), New Zealand – Visitor Visa…
- "what if the client has weak ties to india?" → 22 services: UK – Visitor Visa (Standard Visitor), USA – Visitor Visa (B1/B2), Australia – Visitor Visa (Subclass 600), Germany – Visitor / Schengen Visa (Type C), New Zealand – Visitor Visa…
- "why is weak ties to india a problem?" → 22 services: UK – Visitor Visa (Standard Visitor), USA – Visitor Visa (B1/B2), Australia – Visitor Visa (Subclass 600), Germany – Visitor / Schengen Visa (Type C), New Zealand – Visitor Visa…
- "can we guarantee student visa approval?" → 21 services: UK – Student Visa (Student Route), Germany – Student Visa (National Visa), Germany – Ausbildung (Vocational Training), New Zealand – Student Visa, France – Student Visa (VLS-TS)…
- "can visitor work?" → 21 services: UK – Visitor Visa (Standard Visitor), Australia – Visitor Visa (Subclass 600), Germany – Visitor / Schengen Visa (Type C), New Zealand – Visitor Visa, France – Schengen Visitor Visa (Type C)…
- "is proof of funds required?" → 21 services: UK – Visitor Visa (Standard Visitor), Australia – Visitor Visa (Subclass 600), Germany – Visitor / Schengen Visa (Type C), New Zealand – Visitor Visa, France – Schengen Visitor Visa (Type C)…
- "how many mock tests?" → 21 services: IELTS Academic Regular (with books), IELTS Academic Regular (without books), IELTS General Regular (without books), IELTS General Crash Course, French Language (General / Custom)…
- "what after graduation?" → 20 services: Australia – Student Visa (Subclass 500), Germany – Student Visa (National Visa), Germany – Ausbildung (Vocational Training), New Zealand – Student Visa, France – Student Visa (VLS-TS)…
- "who pays the official exam fee?" → 20 services: IELTS Academic Regular (without books), IELTS General Regular (without books), IELTS General Crash Course, French Language (General / Custom), French Language A1…
- "can future link guarantee the target score?" → 20 services: IELTS Academic Regular (without books), IELTS General Regular (without books), IELTS General Crash Course, French Language (General / Custom), French Language A1…
- "can spouse accompany?" → 18 services: Germany – Student Visa (National Visa), Germany – Ausbildung (Vocational Training), France – Student Visa (VLS-TS), Italy – Student Visa (National D Visa), Netherlands – Student Visa (MVV + Residence Permit)…
- "how long to convert to residence permit?" → 18 services: Germany – Student Visa (National Visa), Germany – Ausbildung (Vocational Training), France – Student Visa (VLS-TS), Italy – Student Visa (National D Visa), Netherlands – Student Visa (MVV + Residence Permit)…
- "can i work on student visa?" → 18 services: Germany – Student Visa (National Visa), Germany – Ausbildung (Vocational Training), France – Student Visa (VLS-TS), Italy – Student Visa (National D Visa), Netherlands – Student Visa (MVV + Residence Permit)…
- "is health insurance (travel + statutory) required?" → 18 services: Germany – Student Visa (National Visa), Germany – Ausbildung (Vocational Training), France – Student Visa (VLS-TS), Italy – Student Visa (National D Visa), Netherlands – Student Visa (MVV + Residence Permit)…
- "is motivation letter and cv required?" → 18 services: Germany – Student Visa (National Visa), Germany – Ausbildung (Vocational Training), France – Student Visa (VLS-TS), Italy – Student Visa (National D Visa), Netherlands – Student Visa (MVV + Residence Permit)…
- "is language proficiency (as required) required?" → 18 services: Germany – Student Visa (National Visa), Germany – Ausbildung (Vocational Training), France – Student Visa (VLS-TS), Italy – Student Visa (National D Visa), Netherlands – Student Visa (MVV + Residence Permit)…
- "reapply after refusal?" → 18 services: Germany – Visitor / Schengen Visa (Type C), New Zealand – Visitor Visa, France – Schengen Visitor Visa (Type C), Italy – Schengen Visitor Visa (Type C), Netherlands – Schengen Visitor Visa (Type C)…
- "what is proof of funds for this service?" → 18 services: France – Student Visa (VLS-TS), Italy – Student Visa (National D Visa), Netherlands – Student Visa (MVV + Residence Permit), Spain – Student Visa (National D Visa), Malta – Student Visa (National D Visa)…
- "which embassy to apply?" → 17 services: Germany – Visitor / Schengen Visa (Type C), France – Schengen Visitor Visa (Type C), Italy – Schengen Visitor Visa (Type C), Netherlands – Schengen Visitor Visa (Type C), Spain – Schengen Visitor Visa (Type C)…
