# Canada Service Library — Content Completion Inventory

**Generated:** 2026-06-17T02:00:48.346Z
**Source:** content/service-library/canada-*.json (repo JSON — DB tables not queried)
**Scope:** All Canada services in `scripts/lib/service-library-ids.mjs` (17 records)

> Read-only inventory. No content was generated or modified.
> DB-only items (submission checklist, visa forms, checklist PDFs, `process_flow`) are flagged but not verified against live Supabase in this run.

## Executive summary

| Metric | Count |
|--------|------:|
| Total Canada services | 17 |
| Ready for production | 0 |
| Requiring minor updates | 1 |
| Requiring major updates | 16 |
| Requiring complete rebuild | 0 |
| Services with generic template FAQs | 17 |
| Critical risk | 0 |
| High risk | 6 |

## Cross-cutting issues (all Canada services)

### Generic template FAQs (bulk-seed pattern)

These FAQ questions appear across multiple Canada services and should be replaced with natural, Canada-specific Q&A:

- **"what is description for this service?"** — 17 Canada services
- **"what is eligible applicants for this service?"** — 17 Canada services
- **"what is key authority for this service?"** — 17 Canada services
- **"what is the processing time?"** — 17 Canada services
- **"what is the government fee?"** — 17 Canada services
- **"what is the required docs?"** — 17 Canada services
- **"what is the consultancy fee?"** — 17 Canada services
- **"what is after approval for this service?"** — 16 Canada services
- **"what is the our approval rate?"** — 16 Canada services
- **"important note on ita not guaranteed?"** — 4 Canada services
- **"important note on rule sensitivity?"** — 3 Canada services

### Duplicate FAQs within Canada catalogue

Total FAQ questions shared by 2+ Canada services: **58**

### Systemic gaps (repo JSON scan)

- **Submission checklist (DB):** All 17 services — not in JSON; requires live DB audit
- **Visa forms (DB):** All 17 services — not in JSON; requires Admin / DB seed
- **Checklist PDFs (DB):** All 17 services — not in JSON; requires Admin upload
- **Template FAQs:** Present in all 17 Canada JSON files (6–10 generic questions each, auto-generated from `about` + KPI labels)

## Priority 1 — High Revenue / High Volume

### Canada – Student Visa (Study Permit — Outside Canada)

| Field | Value |
|-------|-------|
| Service ID | `c35e6051-f40f-47bf-9cac-0a386c47a336` |
| Slug | `canada-student-visa` |
| JSON file | `canada-student-visa.json` |
| Completion score | **92%** |
| Content quality score | **48%** |
| Business importance score | **100%** |
| Risk level | **High** |
| Work category | major updates |
| Last updated | Updated 4 Jun 2026 |
| FAQ count | 30 |
| Red flags count | 6 |
| Pro tips count | 5 |
| Resources count | 6 |
| Sample documents count | 9 |
| Process flow | Complete — 5 timeline steps in metadata |
| Fee information | Partial — KPI fee values only; no itemised feeBreakdown |
| Cost breakdown | Complete — 4 sections (verified: Jun 2026) |
| Verification info | Complete — costs: Jun 2026; applicant rights: Jun 2026; spouse rights: Jun 2026; policy alert: 4 Jun 2026 |

**Missing / below threshold:** Submission checklist (DB); Visa forms (DB); Checklist PDFs (DB)

**Generic template FAQs detected (11):**
- What is Description for this service?
- What is Eligible applicants for this service?
- What is Application streams for this service?
- Important note on Application streams?
- What is Key authority for this service?
- What is After approval for this service?
- What is the Processing time?
- What is the Government fee?
- What is the Our approval rate?
- What is the Required docs?
- What is the Consultancy fee?

**Counsellor guidance gaps:** Template FAQs need Canada-specific rewrite

**Other placeholder content:** What is the Processing time?; What is the Our approval rate?; What is the Required docs?; What is the Consultancy fee?

---

### Canada – Visitor Visa (TRV)

| Field | Value |
|-------|-------|
| Service ID | `b2000001-0001-4000-8000-000000000011` |
| Slug | `canada-visitor-visa` |
| JSON file | `canada-visitor-visa.json` |
| Completion score | **92%** |
| Content quality score | **42%** |
| Business importance score | **95%** |
| Risk level | **High** |
| Work category | major updates |
| Last updated | Updated 6 Jun 2026 |
| FAQ count | 30 |
| Red flags count | 6 |
| Pro tips count | 5 |
| Resources count | 5 |
| Sample documents count | 6 |
| Process flow | Complete — 5 timeline steps in metadata |
| Fee information | Partial — KPI fee values only; no itemised feeBreakdown |
| Cost breakdown | Complete — 4 sections (verified: Jun 2026) |
| Verification info | Complete — costs: Jun 2026; applicant rights: Jun 2026; spouse rights: Jun 2026; policy alert: 6 Jun 2026 |

**Missing / below threshold:** Submission checklist (DB); Visa forms (DB); Checklist PDFs (DB)

**Generic template FAQs detected (11):**
- What is Description for this service?
- What is Eligible applicants for this service?
- What is Single vs multiple entry for this service?
- Important note on Single vs multiple entry?
- What is Key authority for this service?
- What is After approval for this service?
- What is the Processing time?
- What is the Government fee?
- What is the Our approval rate?
- What is the Required docs?
- What is the Consultancy fee?

**Counsellor guidance gaps:** Template FAQs need Canada-specific rewrite

**Other placeholder content:** What is Eligible applicants for this service?; What is Single vs multiple entry for this service?; Important note on Single vs multiple entry?; What is the Processing time?; What is the Our approval rate?; What is the Required docs?; What is the Consultancy fee?

---

### Canada – Spouse / Partner Sponsorship

| Field | Value |
|-------|-------|
| Service ID | `b2000001-0001-4000-8000-000000000012` |
| Slug | `canada-spouse-visa` |
| JSON file | `canada-spouse-visa.json` |
| Completion score | **92%** |
| Content quality score | **44%** |
| Business importance score | **88%** |
| Risk level | **High** |
| Work category | major updates |
| Last updated | Updated 6 Jun 2026 |
| FAQ count | 30 |
| Red flags count | 6 |
| Pro tips count | 5 |
| Resources count | 5 |
| Sample documents count | 6 |
| Process flow | Complete — 5 timeline steps in metadata |
| Fee information | Partial — KPI fee values only; no itemised feeBreakdown |
| Cost breakdown | Complete — 4 sections (verified: Jun 2026) |
| Verification info | Complete — costs: Jun 2026; applicant rights: Jun 2026; spouse rights: Jun 2026; policy alert: 6 Jun 2026 |

**Missing / below threshold:** Submission checklist (DB); Visa forms (DB); Checklist PDFs (DB)

**Generic template FAQs detected (11):**
- What is Description for this service?
- What is Eligible applicants for this service?
- What is Inland vs outland for this service?
- Important note on Inland vs outland?
- What is Key authority for this service?
- What is After approval for this service?
- What is the Processing time?
- What is the Government fee?
- What is the Our approval rate?
- What is the Required docs?
- What is the Consultancy fee?

**Counsellor guidance gaps:** Template FAQs need Canada-specific rewrite

**Other placeholder content:** What is Eligible applicants for this service?; What is After approval for this service?; What is the Processing time?; What is the Our approval rate?; What is the Required docs?; What is the Consultancy fee?

---

### Canada – Post-Graduation Work Permit (PGWP)

| Field | Value |
|-------|-------|
| Service ID | `b2000001-0001-4000-8000-000000000014` |
| Slug | `canada-pgwp` |
| JSON file | `canada-pgwp.json` |
| Completion score | **92%** |
| Content quality score | **48%** |
| Business importance score | **84%** |
| Risk level | **High** |
| Work category | major updates |
| Last updated | Updated 6 Jun 2026 |
| FAQ count | 30 |
| Red flags count | 6 |
| Pro tips count | 5 |
| Resources count | 5 |
| Sample documents count | 5 |
| Process flow | Complete — 4 timeline steps in metadata |
| Fee information | Partial — KPI fee values only; no itemised feeBreakdown |
| Cost breakdown | Complete — 4 sections (verified: Jun 2026) |
| Verification info | Complete — costs: Jun 2026; applicant rights: Jun 2026; spouse rights: Jun 2026; policy alert: 6 Jun 2026 |

**Missing / below threshold:** Submission checklist (DB); Visa forms (DB); Checklist PDFs (DB)

**Generic template FAQs detected (11):**
- What is Description for this service?
- What is Eligible applicants for this service?
- What is Duration rules for this service?
- Important note on Duration rules?
- What is Key authority for this service?
- What is After approval for this service?
- What is the Processing time?
- What is the Government fee?
- What is the Our approval rate?
- What is the Required docs?
- What is the Consultancy fee?

**Counsellor guidance gaps:** Template FAQs need Canada-specific rewrite

**Other placeholder content:** What is the Processing time?; What is the Our approval rate?; What is the Required docs?; What is the Consultancy fee?

---

### Canada – Express Entry (Permanent Residence)

| Field | Value |
|-------|-------|
| Service ID | `b2000001-0001-4000-8000-000000000013` |
| Slug | `canada-express-entry-pr` |
| JSON file | `canada-express-entry-pr.json` |
| Completion score | **92%** |
| Content quality score | **44%** |
| Business importance score | **81%** |
| Risk level | **High** |
| Work category | major updates |
| Last updated | Updated 6 Jun 2026 |
| FAQ count | 30 |
| Red flags count | 6 |
| Pro tips count | 5 |
| Resources count | 5 |
| Sample documents count | 7 |
| Process flow | Complete — 4 timeline steps in metadata |
| Fee information | Partial — KPI fee values only; no itemised feeBreakdown |
| Cost breakdown | Complete — 4 sections (verified: Jun 2026) |
| Verification info | Complete — costs: Jun 2026; applicant rights: Jun 2026; spouse rights: Jun 2026; policy alert: 6 Jun 2026 |

**Missing / below threshold:** Submission checklist (DB); Visa forms (DB); Checklist PDFs (DB)

**Generic template FAQs detected (10):**
- What is Description for this service?
- What is Eligible applicants for this service?
- Important note on ITA not guaranteed?
- What is Key authority for this service?
- What is After approval for this service?
- What is the Processing time?
- What is the Government fee?
- What is the Our approval rate?
- What is the Required docs?
- What is the Consultancy fee?

**Counsellor guidance gaps:** Template FAQs need Canada-specific rewrite

**Other placeholder content:** What is Description for this service?; What is Eligible applicants for this service?; What is After approval for this service?; What is the Processing time?; What is the Government fee?; What is the Our approval rate?; What is the Required docs?; What is the Consultancy fee?

---

### Canada – Work Permit (LMIA & LMIA-Exempt)

| Field | Value |
|-------|-------|
| Service ID | `b2000001-0001-4000-8000-000000000015` |
| Slug | `canada-work-permit` |
| JSON file | `canada-work-permit.json` |
| Completion score | **92%** |
| Content quality score | **58%** |
| Business importance score | **80%** |
| Risk level | **High** |
| Work category | major updates |
| Last updated | Updated 6 Jun 2026 |
| FAQ count | 30 |
| Red flags count | 6 |
| Pro tips count | 5 |
| Resources count | 5 |
| Sample documents count | 5 |
| Process flow | Complete — 4 timeline steps in metadata |
| Fee information | Partial — KPI fee values only; no itemised feeBreakdown |
| Cost breakdown | Complete — 4 sections (verified: Jun 2026) |
| Verification info | Complete — costs: Jun 2026; applicant rights: Jun 2026; spouse rights: Jun 2026; policy alert: 6 Jun 2026 |

**Missing / below threshold:** Submission checklist (DB); Visa forms (DB); Checklist PDFs (DB)

**Generic template FAQs detected (10):**
- What is Description for this service?
- What is Eligible applicants for this service?
- Important note on LMIA process?
- What is Key authority for this service?
- What is After approval for this service?
- What is the Processing time?
- What is the Government fee?
- What is the Our approval rate?
- What is the Required docs?
- What is the Consultancy fee?

**Counsellor guidance gaps:** Template FAQs need Canada-specific rewrite

**Other placeholder content:** What is the Our approval rate?

---

## Priority 2 — Medium Revenue / Medium Volume

### Canada – Study Permit Extension

| Field | Value |
|-------|-------|
| Service ID | `b2000001-0001-4000-8000-000000000018` |
| Slug | `canada-study-permit-extension` |
| JSON file | `canada-study-permit-extension.json` |
| Completion score | **92%** |
| Content quality score | **54%** |
| Business importance score | **70%** |
| Risk level | **Medium** |
| Work category | major updates |
| Last updated | Updated 6 Jun 2026 |
| FAQ count | 30 |
| Red flags count | 7 |
| Pro tips count | 6 |
| Resources count | 6 |
| Sample documents count | 8 |
| Process flow | Complete — 4 timeline steps in metadata |
| Fee information | Partial — KPI fee values only; no itemised feeBreakdown |
| Cost breakdown | Complete — 4 sections (verified: Jun 2026) |
| Verification info | Complete — costs: Jun 2026; applicant rights: Jun 2026; spouse rights: Jun 2026; policy alert: 6 Jun 2026 |

**Missing / below threshold:** Submission checklist (DB); Visa forms (DB); Checklist PDFs (DB)

**Generic template FAQs detected (10):**
- What is Description for this service?
- What is Eligible applicants for this service?
- Important note on Maintained status?
- What is Key authority for this service?
- What is After approval for this service?
- What is the Processing time?
- What is the Government fee?
- What is the Our approval rate?
- What is the Required docs?
- What is the Consultancy fee?

**Counsellor guidance gaps:** Template FAQs need Canada-specific rewrite

**Other placeholder content:** What is the Our approval rate?; What is the Required docs?; What is the Consultancy fee?

---

### Canada – Super Visa (Parents & Grandparents)

| Field | Value |
|-------|-------|
| Service ID | `b2000001-0001-4000-8000-000000000016` |
| Slug | `canada-super-visa` |
| JSON file | `canada-super-visa.json` |
| Completion score | **92%** |
| Content quality score | **46%** |
| Business importance score | **63%** |
| Risk level | **Medium** |
| Work category | major updates |
| Last updated | Updated 6 Jun 2026 |
| FAQ count | 30 |
| Red flags count | 6 |
| Pro tips count | 5 |
| Resources count | 5 |
| Sample documents count | 5 |
| Process flow | Complete — 4 timeline steps in metadata |
| Fee information | Partial — KPI fee values only; no itemised feeBreakdown |
| Cost breakdown | Complete — 4 sections (verified: Jun 2026) |
| Verification info | Complete — costs: Jun 2026; applicant rights: Jun 2026; spouse rights: Jun 2026; policy alert: 6 Jun 2026 |

**Missing / below threshold:** Submission checklist (DB); Visa forms (DB); Checklist PDFs (DB)

**Generic template FAQs detected (10):**
- What is Description for this service?
- What is Eligible applicants for this service?
- Important note on Insurance requirement?
- What is Key authority for this service?
- What is After approval for this service?
- What is the Processing time?
- What is the Government fee?
- What is the Our approval rate?
- What is the Required docs?
- What is the Consultancy fee?

**Counsellor guidance gaps:** Template FAQs need Canada-specific rewrite

**Other placeholder content:** What is Description for this service?; What is Eligible applicants for this service?; Important note on Insurance requirement?; What is the Processing time?; What is the Our approval rate?; What is the Required docs?; What is the Consultancy fee?

---

### Canada – Spouse / Dependent Open Work Permit

| Field | Value |
|-------|-------|
| Service ID | `b2000001-0001-4000-8000-00000000001b` |
| Slug | `canada-spouse-dependent-owp` |
| JSON file | `canada-spouse-dependent-owp.json` |
| Completion score | **92%** |
| Content quality score | **52%** |
| Business importance score | **59%** |
| Risk level | **Medium** |
| Work category | major updates |
| Last updated | Updated 6 Jun 2026 |
| FAQ count | 30 |
| Red flags count | 7 |
| Pro tips count | 6 |
| Resources count | 6 |
| Sample documents count | 8 |
| Process flow | Complete — 4 timeline steps in metadata |
| Fee information | Partial — KPI fee values only; no itemised feeBreakdown |
| Cost breakdown | Complete — 4 sections (verified: Jun 2026) |
| Verification info | Complete — costs: Jun 2026; applicant rights: Jun 2026; spouse rights: Jun 2026; policy alert: 6 Jun 2026 |

**Missing / below threshold:** Submission checklist (DB); Visa forms (DB); Checklist PDFs (DB)

**Generic template FAQs detected (10):**
- What is Description for this service?
- What is Eligible applicants for this service?
- Important note on Rule sensitivity?
- What is Key authority for this service?
- What is After approval for this service?
- What is the Processing time?
- What is the Government fee?
- What is the Our approval rate?
- What is the Required docs?
- What is the Consultancy fee?

**Counsellor guidance gaps:** Template FAQs need Canada-specific rewrite

**Other placeholder content:** What is the Processing time?; What is the Our approval rate?; What is the Required docs?; What is the Consultancy fee?

---

### Canada – OINP (Ontario Provincial Nominee)

| Field | Value |
|-------|-------|
| Service ID | `b2000001-0001-4000-8000-00000000001c` |
| Slug | `canada-oinp` |
| JSON file | `canada-oinp.json` |
| Completion score | **92%** |
| Content quality score | **44%** |
| Business importance score | **59%** |
| Risk level | **Medium** |
| Work category | major updates |
| Last updated | Updated 10 Jun 2026 |
| FAQ count | 30 |
| Red flags count | 6 |
| Pro tips count | 5 |
| Resources count | 5 |
| Sample documents count | 7 |
| Process flow | Complete — 4 timeline steps in metadata |
| Fee information | Partial — KPI fee values only; no itemised feeBreakdown |
| Cost breakdown | Complete — 4 sections (verified: Jun 2026) |
| Verification info | Complete — costs: Jun 2026; applicant rights: Jun 2026; spouse rights: Jun 2026; policy alert: 6 Jun 2026 |

**Missing / below threshold:** Submission checklist (DB); Visa forms (DB); Checklist PDFs (DB)

**Generic template FAQs detected (10):**
- What is Description for this service?
- What is Eligible applicants for this service?
- Important note on ITA not guaranteed?
- What is Key authority for this service?
- What is After approval for this service?
- What is the Processing time?
- What is the Government fee?
- What is the Our approval rate?
- What is the Required docs?
- What is the Consultancy fee?

**Counsellor guidance gaps:** Template FAQs need Canada-specific rewrite

**Other placeholder content:** What is Description for this service?; What is Eligible applicants for this service?; What is After approval for this service?; What is the Processing time?; What is the Government fee?; What is the Our approval rate?; What is the Required docs?; What is the Consultancy fee?

---

### Canada – Provincial Nominee Program (PNP)

| Field | Value |
|-------|-------|
| Service ID | `b2000001-0001-4000-8000-00000000001d` |
| Slug | `canada-pnp-program` |
| JSON file | `canada-pnp-program.json` |
| Completion score | **92%** |
| Content quality score | **44%** |
| Business importance score | **56%** |
| Risk level | **Medium** |
| Work category | major updates |
| Last updated | Updated 10 Jun 2026 |
| FAQ count | 30 |
| Red flags count | 6 |
| Pro tips count | 5 |
| Resources count | 5 |
| Sample documents count | 7 |
| Process flow | Complete — 4 timeline steps in metadata |
| Fee information | Partial — KPI fee values only; no itemised feeBreakdown |
| Cost breakdown | Complete — 4 sections (verified: Jun 2026) |
| Verification info | Complete — costs: Jun 2026; applicant rights: Jun 2026; spouse rights: Jun 2026; policy alert: 6 Jun 2026 |

**Missing / below threshold:** Submission checklist (DB); Visa forms (DB); Checklist PDFs (DB)

**Generic template FAQs detected (10):**
- What is Description for this service?
- What is Eligible applicants for this service?
- Important note on ITA not guaranteed?
- What is Key authority for this service?
- What is After approval for this service?
- What is the Processing time?
- What is the Government fee?
- What is the Our approval rate?
- What is the Required docs?
- What is the Consultancy fee?

**Counsellor guidance gaps:** Template FAQs need Canada-specific rewrite

**Other placeholder content:** What is Description for this service?; What is Eligible applicants for this service?; What is After approval for this service?; What is the Processing time?; What is the Government fee?; What is the Our approval rate?; What is the Required docs?; What is the Consultancy fee?

---

### Canada – Spouse / Dependent Status Extension

| Field | Value |
|-------|-------|
| Service ID | `b2000001-0001-4000-8000-00000000001f` |
| Slug | `canada-spouse-dependent-extension` |
| JSON file | `canada-spouse-dependent-extension.json` |
| Completion score | **92%** |
| Content quality score | **52%** |
| Business importance score | **55%** |
| Risk level | **Medium** |
| Work category | major updates |
| Last updated | Updated 10 Jun 2026 |
| FAQ count | 30 |
| Red flags count | 7 |
| Pro tips count | 6 |
| Resources count | 6 |
| Sample documents count | 8 |
| Process flow | Complete — 4 timeline steps in metadata |
| Fee information | Partial — KPI fee values only; no itemised feeBreakdown |
| Cost breakdown | Complete — 4 sections (verified: Jun 2026) |
| Verification info | Complete — costs: Jun 2026; applicant rights: Jun 2026; spouse rights: Jun 2026; policy alert: 6 Jun 2026 |

**Missing / below threshold:** Submission checklist (DB); Visa forms (DB); Checklist PDFs (DB)

**Generic template FAQs detected (10):**
- What is Description for this service?
- What is Eligible applicants for this service?
- Important note on Rule sensitivity?
- What is Key authority for this service?
- What is After approval for this service?
- What is the Processing time?
- What is the Government fee?
- What is the Our approval rate?
- What is the Required docs?
- What is the Consultancy fee?

**Counsellor guidance gaps:** Template FAQs need Canada-specific rewrite

**Other placeholder content:** What is the Processing time?; What is the Our approval rate?; What is the Required docs?; What is the Consultancy fee?

---

### Canada – Temporary Resident to PR Pathway

| Field | Value |
|-------|-------|
| Service ID | `b2000001-0001-4000-8000-00000000001e` |
| Slug | `canada-tr-to-pr` |
| JSON file | `canada-tr-to-pr.json` |
| Completion score | **92%** |
| Content quality score | **44%** |
| Business importance score | **53%** |
| Risk level | **Medium** |
| Work category | major updates |
| Last updated | Updated 10 Jun 2026 |
| FAQ count | 30 |
| Red flags count | 6 |
| Pro tips count | 5 |
| Resources count | 5 |
| Sample documents count | 7 |
| Process flow | Complete — 4 timeline steps in metadata |
| Fee information | Partial — KPI fee values only; no itemised feeBreakdown |
| Cost breakdown | Complete — 4 sections (verified: Jun 2026) |
| Verification info | Complete — costs: Jun 2026; applicant rights: Jun 2026; spouse rights: Jun 2026; policy alert: 6 Jun 2026 |

**Missing / below threshold:** Submission checklist (DB); Visa forms (DB); Checklist PDFs (DB)

**Generic template FAQs detected (10):**
- What is Description for this service?
- What is Eligible applicants for this service?
- Important note on ITA not guaranteed?
- What is Key authority for this service?
- What is After approval for this service?
- What is the Processing time?
- What is the Government fee?
- What is the Our approval rate?
- What is the Required docs?
- What is the Consultancy fee?

**Counsellor guidance gaps:** Template FAQs need Canada-specific rewrite

**Other placeholder content:** What is Description for this service?; What is Eligible applicants for this service?; What is After approval for this service?; What is the Processing time?; What is the Government fee?; What is the Our approval rate?; What is the Required docs?; What is the Consultancy fee?

---

### Canada – Spouse / Dependent Visitor Visa

| Field | Value |
|-------|-------|
| Service ID | `b2000001-0001-4000-8000-000000000020` |
| Slug | `canada-spouse-dependent-visitor` |
| JSON file | `canada-spouse-dependent-visitor.json` |
| Completion score | **92%** |
| Content quality score | **52%** |
| Business importance score | **50%** |
| Risk level | **Medium** |
| Work category | major updates |
| Last updated | Updated 10 Jun 2026 |
| FAQ count | 30 |
| Red flags count | 7 |
| Pro tips count | 6 |
| Resources count | 6 |
| Sample documents count | 8 |
| Process flow | Complete — 4 timeline steps in metadata |
| Fee information | Partial — KPI fee values only; no itemised feeBreakdown |
| Cost breakdown | Complete — 4 sections (verified: Jun 2026) |
| Verification info | Complete — costs: Jun 2026; applicant rights: Jun 2026; spouse rights: Jun 2026; policy alert: 6 Jun 2026 |

**Missing / below threshold:** Submission checklist (DB); Visa forms (DB); Checklist PDFs (DB)

**Generic template FAQs detected (10):**
- What is Description for this service?
- What is Eligible applicants for this service?
- Important note on Rule sensitivity?
- What is Key authority for this service?
- What is After approval for this service?
- What is the Processing time?
- What is the Government fee?
- What is the Our approval rate?
- What is the Required docs?
- What is the Consultancy fee?

**Counsellor guidance gaps:** Template FAQs need Canada-specific rewrite

**Other placeholder content:** What is the Processing time?; What is the Our approval rate?; What is the Required docs?; What is the Consultancy fee?

---

## Priority 3 — Low Volume / Niche

### Canada – BOWP (Bridging Open Work Permit)

| Field | Value |
|-------|-------|
| Service ID | `b2000001-0001-4000-8000-000000000017` |
| Slug | `canada-bowp` |
| JSON file | `canada-bowp.json` |
| Completion score | **92%** |
| Content quality score | **52%** |
| Business importance score | **43%** |
| Risk level | **Medium** |
| Work category | major updates |
| Last updated | Updated 6 Jun 2026 |
| FAQ count | 30 |
| Red flags count | 7 |
| Pro tips count | 6 |
| Resources count | 6 |
| Sample documents count | 8 |
| Process flow | Complete — 4 timeline steps in metadata |
| Fee information | Partial — KPI fee values only; no itemised feeBreakdown |
| Cost breakdown | Complete — 4 sections (verified: Jun 2026) |
| Verification info | Complete — costs: Jun 2026; applicant rights: Jun 2026; spouse rights: Jun 2026; policy alert: 6 Jun 2026 |

**Missing / below threshold:** Submission checklist (DB); Visa forms (DB); Checklist PDFs (DB)

**Generic template FAQs detected (10):**
- What is Description for this service?
- What is Eligible applicants for this service?
- Important note on Eligible PR classes?
- What is Key authority for this service?
- What is After approval for this service?
- What is the Processing time?
- What is the Government fee?
- What is the Our approval rate?
- What is the Required docs?
- What is the Consultancy fee?

**Counsellor guidance gaps:** Template FAQs need Canada-specific rewrite

**Other placeholder content:** What is the Processing time?; What is the Our approval rate?; What is the Required docs?; What is the Consultancy fee?

---

### Canada – Visitor Record (In-Canada Extension)

| Field | Value |
|-------|-------|
| Service ID | `b2000001-0001-4000-8000-000000000019` |
| Slug | `canada-visitor-record` |
| JSON file | `canada-visitor-record.json` |
| Completion score | **92%** |
| Content quality score | **54%** |
| Business importance score | **39%** |
| Risk level | **Medium** |
| Work category | major updates |
| Last updated | Updated 6 Jun 2026 |
| FAQ count | 30 |
| Red flags count | 7 |
| Pro tips count | 6 |
| Resources count | 6 |
| Sample documents count | 8 |
| Process flow | Complete — 4 timeline steps in metadata |
| Fee information | Partial — KPI fee values only; no itemised feeBreakdown |
| Cost breakdown | Complete — 4 sections (verified: Jun 2026) |
| Verification info | Complete — costs: Jun 2026; applicant rights: Jun 2026; spouse rights: Jun 2026; policy alert: 6 Jun 2026 |

**Missing / below threshold:** Submission checklist (DB); Visa forms (DB); Checklist PDFs (DB)

**Generic template FAQs detected (10):**
- What is Description for this service?
- What is Eligible applicants for this service?
- Important note on Important limitation?
- What is Key authority for this service?
- What is After approval for this service?
- What is the Processing time?
- What is the Government fee?
- What is the Our approval rate?
- What is the Required docs?
- What is the Consultancy fee?

**Counsellor guidance gaps:** Template FAQs need Canada-specific rewrite

**Other placeholder content:** What is the Our approval rate?; What is the Required docs?; What is the Consultancy fee?

---

### Canada – CAIPS / GCMS Notes Request

| Field | Value |
|-------|-------|
| Service ID | `b2000001-0001-4000-8000-00000000001a` |
| Slug | `canada-caips-notes` |
| JSON file | `canada-caips-notes.json` |
| Completion score | **92%** |
| Content quality score | **60%** |
| Business importance score | **33%** |
| Risk level | **Medium** |
| Work category | minor updates |
| Last updated | Updated 6 Jun 2026 |
| FAQ count | 30 |
| Red flags count | 7 |
| Pro tips count | 6 |
| Resources count | 6 |
| Sample documents count | 8 |
| Process flow | Complete — 4 timeline steps in metadata |
| Fee information | Partial — KPI fee values only; no itemised feeBreakdown |
| Cost breakdown | Complete — 4 sections (verified: Jun 2026) |
| Verification info | Complete — costs: Jun 2026; applicant rights: Jun 2026; spouse rights: Jun 2026; policy alert: 6 Jun 2026 |

**Missing / below threshold:** Submission checklist (DB); Visa forms (DB); Checklist PDFs (DB)

**Generic template FAQs detected (8):**
- What is Description for this service?
- What is Eligible applicants for this service?
- Important note on Service scope?
- What is Key authority for this service?
- What is the Processing time?
- What is the Government fee?
- What is the Required docs?
- What is the Consultancy fee?

**Counsellor guidance gaps:** Template FAQs need Canada-specific rewrite

**Other placeholder content:** Important note on Service scope?; What is the Processing time?; What is the Required docs?; What is the Consultancy fee?

---

## Recommended completion order

Complete in this sequence to maximise counselor impact and revenue:

1. **Canada – Student Visa (Study Permit — Outside Canada)** (`canada-student-visa`) — major updates, risk High, completion 92%, quality 48%
2. **Canada – Work Permit (LMIA & LMIA-Exempt)** (`canada-work-permit`) — major updates, risk High, completion 92%, quality 58%
3. **Canada – Visitor Visa (TRV)** (`canada-visitor-visa`) — major updates, risk High, completion 92%, quality 42%
4. **Canada – Spouse / Partner Sponsorship** (`canada-spouse-visa`) — major updates, risk High, completion 92%, quality 44%
5. **Canada – Post-Graduation Work Permit (PGWP)** (`canada-pgwp`) — major updates, risk High, completion 92%, quality 48%
6. **Canada – Express Entry (Permanent Residence)** (`canada-express-entry-pr`) — major updates, risk High, completion 92%, quality 44%
7. **Canada – Study Permit Extension** (`canada-study-permit-extension`) — major updates, risk Medium, completion 92%, quality 54%
8. **Canada – Spouse / Dependent Open Work Permit** (`canada-spouse-dependent-owp`) — major updates, risk Medium, completion 92%, quality 52%
9. **Canada – Super Visa (Parents & Grandparents)** (`canada-super-visa`) — major updates, risk Medium, completion 92%, quality 46%
10. **Canada – Spouse / Dependent Status Extension** (`canada-spouse-dependent-extension`) — major updates, risk Medium, completion 92%, quality 52%
11. **Canada – OINP (Ontario Provincial Nominee)** (`canada-oinp`) — major updates, risk Medium, completion 92%, quality 44%
12. **Canada – Spouse / Dependent Visitor Visa** (`canada-spouse-dependent-visitor`) — major updates, risk Medium, completion 92%, quality 52%
13. **Canada – Provincial Nominee Program (PNP)** (`canada-pnp-program`) — major updates, risk Medium, completion 92%, quality 44%
14. **Canada – Temporary Resident to PR Pathway** (`canada-tr-to-pr`) — major updates, risk Medium, completion 92%, quality 44%
15. **Canada – BOWP (Bridging Open Work Permit)** (`canada-bowp`) — major updates, risk Medium, completion 92%, quality 52%
16. **Canada – Visitor Record (In-Canada Extension)** (`canada-visitor-record`) — major updates, risk Medium, completion 92%, quality 54%
17. **Canada – CAIPS / GCMS Notes Request** (`canada-caips-notes`) — minor updates, risk Medium, completion 92%, quality 60%

### Phase plan

**Phase 1 (Week 1–2):** Student Visa, Visitor Visa, Spouse Sponsorship — replace template FAQs, verify IRCC fees/dates, add DB checklists + visa forms
**Phase 2 (Week 3):** PGWP, Work Permit, Express Entry — same FAQ cleanup + pathway-specific red flags
**Phase 3 (Week 4):** Study Permit Extension, Super Visa, Spouse dependent family — dependent workflow content
**Phase 4 (Week 5):** OINP, PNP, TR-to-PR — provincial nomination specifics
**Phase 5 (Week 6):** BOWP, Visitor Record, CAIPS Notes — niche services last
