# Document Catalogue & Service Profiles — Phase B Pre-Seed Design

Generated: 2026-06-22T01:01:20.934Z

> **Status:** Review required before Phase B seeding.
> **No DB changes. No fleet conversion. Canada Spouse pilot remains the only converted service.**
> **Three-entity model (locked):** See [DOCUMENT_MANAGEMENT_ARCHITECTURE.md](./DOCUMENT_MANAGEMENT_ARCHITECTURE.md) — Documents → Binders → Submission Packages.

## Approved architecture (locked)

| System | Role | Creates upload rows? |
|--------|------|---------------------|
| **Documents Tab** | Uploadable documents only | Yes (defaults + suggestions + manual) |
| **Document Binder** | Counselor guidance & file prep reference | **Never** |
| **Checklist** | Workflow & QA verification | **Never** |
| **Eligibility** | Assessment criteria | **Never** |
| **Red Flags** | Risk indicators | **Never** |
| **Compliance** | Compliance guidance | **Never** |

### Document layers

1. **Layer 1 — Default documents** — from service profile (+ exceptions)
2. **Layer 2 — Suggested documents** — profile rules with confidence levels
3. **Layer 3 — Manual documents** — counselor picker from `document_types` only

### Catalogue design principle

**Document families, not wording variants.** One code per real upload category.
Counselors upload specific files (wedding photos, bank statements) within the family.

---

## 1. Final proposed `document_types` catalogue

**Estimated final size: 38 codes** (23 existing + 15 new).
**28 variant labels merged** into canonical families (Section 2).

### 1.1 Existing codes (seeded today — 23)

| Code | Label | Family |
|------|-------|--------|
| `academic_transcripts` | Academic Transcripts & Marksheets | education |
| `affidavit_of_support` | Affidavit of Support | financial |
| `birth_certificate` | Birth Certificate | identity |
| `divorce_certificate` | Divorce Certificate | relationship |
| `employment_letter` | Employment Letter | employment |
| `experience_letter` | Experience Letter | employment |
| `financial_documents` | Financial Documents | financial |
| `gic_certificate` | GIC Certificate | financial |
| `ielts_language_test` | English / Language Test Result | language |
| `marriage_certificate` | Marriage Certificate | relationship |
| `medical_report` | Medical Report | health |
| `noc` | No Objection Certificate | employment |
| `offer_letter` | Offer / Admission Letter | education |
| `other` | Other | fallback |
| `passport` | Passport | identity |
| `photograph` | Photograph | identity |
| `police_clearance` | Police Clearance Certificate | compliance_upload |
| `property_documents` | Property Documents | financial |
| `resume` | Resume / CV | employment |
| `sop` | Statement of Purpose / Cover Letter | application |
| `sponsorship_letter` | Sponsorship / Invitation Letter | travel |
| `tuition_fee_receipt` | Tuition Fee Receipt | financial |
| `visa_forms` | Visa Application Form | application |

### 1.2 Proposed new codes (Phase B seed — 15)

| Code | Label | Family | Rationale |
|------|-------|--------|-----------|
| `accommodation_proof` | Accommodation Proof | travel | — |
| `blocked_account_proof` | Blocked Account / Sperrkonto Proof | financial | Germany-specific financial proof |
| `business_registration` | Business Registration | employment | — |
| `cas_letter` | CAS Letter (UK) | education | UK CAS — distinct from generic offer letter |
| `coe` | Confirmation of Enrolment (CoE) | education | Australia CRICOS enrolment — distinct from generic offer letter |
| `diagnostic_score_report` | Diagnostic / Mock Test Score Report | coaching | — |
| `enrollment_agreement` | Enrollment Agreement | coaching | — |
| `entrance_exam_scorecard` | Entrance Exam Scorecard (NEET etc.) | education | — |
| `itr_tax_returns` | ITR / Tax Returns | financial | — |
| `oshc_policy` | OSHC Policy Certificate | health | Insurance policy — not a medical exam |
| `principal_status_document` | Principal Applicant Status Document | relationship | — |
| `relationship_proof` | Relationship Evidence | relationship | Photos, chat logs, joint docs — single family |
| `travel_history_record` | Travel History Record | travel | — |
| `travel_itinerary` | Travel Itinerary | travel | — |
| `visa_refusal_letter` | Visa Refusal Letter | immigration_history | — |

### 1.3 Fallback & manual-only

- `other` — manual-add fallback only; **never** in default or suggested sets

---

## 2. Family merges applied

The following variants **must not** be seeded as separate `document_types`:

### `relationship_proof`

- **Drop:** `wedding_photos`, `relationship_photos`, `engagement_photos`
- **Keep:** `relationship_proof`
- **Rationale:** Relationship evidence is one upload family; counselors upload photos within relationship_proof.

### `financial_documents`

- **Drop:** `bank_statement`, `personal_bank_statement`, `sponsor_bank_statement`, `joint_bank_statement`, `salary_slips`
- **Keep:** `financial_documents`
- **Rationale:** Bank statements and salary slips are financial evidence — use financial_documents unless a future rule requires split.

### `ielts_language_test`

- **Drop:** `english_test_result`, `language_test_result`, `ielts_trf`, `pte_scorecard`
- **Keep:** `ielts_language_test`
- **Rationale:** Single language-test family; display label covers TRF/scorecard variants.

### `sop`

- **Drop:** `cover_letter`, `statement_of_purpose`
- **Keep:** `sop`
- **Rationale:** SOP and cover letter are the same document family.

### `visa_refusal_letter`

- **Drop:** `visa_refusal`, `refusal_letter`
- **Keep:** `visa_refusal_letter`
- **Rationale:** Single refusal-letter family.

### `travel_history_record`

- **Drop:** `travel_history`
- **Keep:** `travel_history_record`
- **Rationale:** Single travel-history upload family.

### `academic_transcripts`

- **Drop:** `marksheet_10`, `marksheet_12`, `degree_certificate`, `school_marksheets`
- **Keep:** `academic_transcripts`
- **Rationale:** Marksheets and degree certs are academic evidence — upload under academic_transcripts.

### `offer_letter`

- **Drop:** `mbbs_admission_letter`, `admission_letter`
- **Keep:** `offer_letter`
- **Rationale:** Admission/offer letters share one family.

### `entrance_exam_scorecard`

- **Drop:** `mbbs_neet_scorecard`, `neet_scorecard`
- **Keep:** `entrance_exam_scorecard`
- **Rationale:** Entrance exam scorecards (NEET etc.) — one family, not exam-specific codes.

### Deferred

- **Drop:** `national_id`, `aadhaar`, `pan_card`
- **Rationale:** Defer — add identity family only if operational need confirmed; not in Phase B seed.
- **Action:** defer

---

## 3. Suggestion confidence levels

| Level | Behavior |
|-------|----------|
| **HIGH** | Auto-add to **Suggested Documents** section |
| **MEDIUM** | Show **recommendation banner** for counselor review |
| **LOW** | Informational only — counselor decides manually; **never** auto-create upload rows |

### 3.1 Global suggestion rules

| Rule | Field | Condition | Suggest | Confidence |
|------|-------|-----------|---------|------------|
| SR-01 | `marital_status` | Married | `marriage_certificate`, `relationship_proof` | **HIGH** |
| SR-02 | `marital_status` | Divorced | `divorce_certificate` | **HIGH** |
| SR-03 | `travel_history` | Has prior international travel | `travel_history_record` | **HIGH** |
| SR-04 | `prior_visa_refusal` | Yes | `visa_refusal_letter` | **HIGH** |
| SR-08 | `has_dependants` | Yes | `birth_certificate` | **HIGH** |
| SR-09 | `criminal_record` | Yes / required | `police_clearance` | **HIGH** |
| SR-10 | `medical_required` | Yes | `medical_report` | **HIGH** |
| SR-05 | `employment_status` | Employed | `employment_letter`, `financial_documents` | **MEDIUM** |
| SR-06 | `employment_status` | Self-employed / Business owner | `business_registration`, `itr_tax_returns` | **MEDIUM** |
| SR-07 | `sponsor` | Has sponsor (not self-funded) | `affidavit_of_support`, `financial_documents` | **MEDIUM** |
| SR-11 | `property_owner` | Yes | `property_documents` | **MEDIUM** |
| SR-L01 | `travel_pattern` | Complex travel pattern | `travel_history_record` | **LOW** |
| SR-L02 | `education_gap` | Study gap > 2 years | `employment_letter`, `sop` | **LOW** |
| SR-L03 | `employment_gap` | Employment gap > 1 year | `employment_letter`, `financial_documents` | **LOW** |

---

## 4. Binder types (logical collections)

Binders organize uploaded documents into submission-ready sections. A binder is **not** a PDF.
See [DOCUMENT_MANAGEMENT_ARCHITECTURE.md](./DOCUMENT_MANAGEMENT_ARCHITECTURE.md) for full rules (OUTDATED status, manual rebuild, version audit).

| Key | Label | Typical document codes |
|-----|-------|--------------------------|
| `identity` | Identity Binder | `passport`, `photograph`, `birth_certificate` |
| `relationship` | Relationship Binder | `marriage_certificate`, `relationship_proof`, `principal_status_document`, `divorce_certificate` |
| `financial` | Financial Binder | `financial_documents`, `gic_certificate`, `blocked_account_proof`, `affidavit_of_support`, `property_documents`, `itr_tax_returns` |
| `employment` | Employment Binder | `employment_letter`, `experience_letter`, `resume`, `noc`, `business_registration` |
| `academic` | Academic Binder | `academic_transcripts`, `offer_letter`, `coe`, `cas_letter`, `entrance_exam_scorecard`, `tuition_fee_receipt` |
| `travel` | Travel Binder | `travel_history_record`, `travel_itinerary`, `visa_refusal_letter`, `sponsorship_letter`, `accommodation_proof` |
| `forms` | Forms Binder | `visa_forms` |
| `supporting_documents` | Supporting Documents Binder | `sop`, `medical_report`, `oshc_policy`, `police_clearance`, `ielts_language_test` |

---

## 5. Service profiles (master templates)

Individual services **inherit** from one profile and add **exceptions only**.
131 services map to 7 profiles — not 131 independent document definitions.

### Student Visa (`student_visa`)

#### Default documents

| Code | Mandatory | Status | Label |
|------|-----------|--------|-------|
| `passport` | yes | existing | Passport |
| `photograph` | yes | existing | Photograph |
| `visa_forms` | yes | existing | Visa Application Form |
| `offer_letter` | yes | existing | Offer / Admission Letter |
| `academic_transcripts` | yes | existing | Academic Transcripts & Marksheets |
| `financial_documents` | yes | existing | Financial Documents |
| `ielts_language_test` | yes | existing | English / Language Test Result |

#### Profile exceptions (country / slug)

| Match pattern | Adds |
|---------------|------|
| Australia student services | `coe` (req), `oshc_policy` (req) |
| UK student services | `cas_letter` (req) |
| Canada student services | `gic_certificate` |
| Germany student services | `blocked_account_proof` (req) |

#### Required document families

- `identity`
- `application`
- `education`
- `financial`
- `language`

#### Default binders & package order

- **Default binders:** Identity Binder → Academic Binder → Financial Binder → Forms Binder → Supporting Documents Binder
- **Default package order:** 1. Supporting Documents Binder; 2. Academic Binder; 3. Financial Binder; 4. Forms Binder

#### Suggestion rules

| Rule | Trigger | Suggest | Confidence | Behavior |
|------|---------|---------|------------|----------|
| SR-S01 | Course requires language test | `ielts_language_test` | **HIGH** | Auto-add to **Suggested Documents** section |
| SR-S02 | Australia service | `coe`, `oshc_policy` | **HIGH** | Auto-add to **Suggested Documents** section |
| SR-S03 | UK service | `cas_letter` | **HIGH** | Auto-add to **Suggested Documents** section |
| SR-S04 | Canada service | `gic_certificate` | **MEDIUM** | Show **recommendation banner** for counselor review |
| SR-S05 | Germany service | `blocked_account_proof` | **HIGH** | Auto-add to **Suggested Documents** section |

### Visitor Visa (`visitor_visa`)

#### Default documents

| Code | Mandatory | Status | Label |
|------|-----------|--------|-------|
| `passport` | yes | existing | Passport |
| `photograph` | yes | existing | Photograph |
| `visa_forms` | yes | existing | Visa Application Form |
| `financial_documents` | yes | existing | Financial Documents |
| `travel_itinerary` | no | proposed | Travel Itinerary |
| `employment_letter` | no | existing | Employment Letter |

#### Profile exceptions (country / slug)

| Match pattern | Adds |
|---------------|------|
| Canada Super Visa | `medical_report` (req), `affidavit_of_support` (req) |

#### Required document families

- `identity`
- `application`
- `financial`

#### Default binders & package order

- **Default binders:** Identity Binder → Financial Binder → Travel Binder → Employment Binder → Forms Binder
- **Default package order:** 1. Supporting Documents Binder; 2. Identity Binder; 3. Financial Binder; 4. Travel Binder; 5. Forms Binder

#### Suggestion rules

| Rule | Trigger | Suggest | Confidence | Behavior |
|------|---------|---------|------------|----------|
| SR-V01 | Visiting family | `sponsorship_letter`, `accommodation_proof` | **MEDIUM** | Show **recommendation banner** for counselor review |

### Spouse / Dependent (`spouse_dependent`)

#### Default documents

| Code | Mandatory | Status | Label |
|------|-----------|--------|-------|
| `passport` | yes | existing | Passport |
| `photograph` | yes | existing | Photograph |
| `visa_forms` | yes | existing | Visa Application Form |
| `marriage_certificate` | yes | existing | Marriage Certificate |
| `relationship_proof` | yes | proposed | Relationship Evidence |
| `financial_documents` | yes | existing | Financial Documents |

#### Profile exceptions (country / slug)

| Match pattern | Adds |
|---------------|------|
| Dependent / visitor-with-principal | `principal_status_document` (req) |
| Spouse OWP / extension / work | `employment_letter` |

#### Required document families

- `identity`
- `application`
- `relationship`
- `financial`

#### Default binders & package order

- **Default binders:** Identity Binder → Relationship Binder → Financial Binder → Employment Binder → Forms Binder
- **Default package order:** 1. Supporting Documents Binder; 2. Identity Binder; 3. Relationship Binder; 4. Financial Binder; 5. Forms Binder

#### Suggestion rules

| Rule | Trigger | Suggest | Confidence | Behavior |
|------|---------|---------|------------|----------|
| SR-P01 | Spouse / partner service | `relationship_proof` | **HIGH** | Auto-add to **Suggested Documents** section |
| SR-P02 | Dependent / visitor-with-principal | `principal_status_document` | **HIGH** | Auto-add to **Suggested Documents** section |

### Work Permit (`work_permit`)

#### Default documents

| Code | Mandatory | Status | Label |
|------|-----------|--------|-------|
| `passport` | yes | existing | Passport |
| `photograph` | yes | existing | Photograph |
| `visa_forms` | yes | existing | Visa Application Form |
| `employment_letter` | yes | existing | Employment Letter |
| `experience_letter` | no | existing | Experience Letter |
| `resume` | yes | existing | Resume / CV |
| `academic_transcripts` | no | existing | Academic Transcripts & Marksheets |
| `police_clearance` | no | existing | Police Clearance Certificate |

#### Profile exceptions (country / slug)

| Match pattern | Adds |
|---------------|------|
| Canada work permit services | `offer_letter` |

#### Required document families

- `identity`
- `application`
- `employment`

#### Default binders & package order

- **Default binders:** Identity Binder → Employment Binder → Academic Binder → Financial Binder → Forms Binder
- **Default package order:** 1. Supporting Documents Binder; 2. Employment Binder; 3. Academic Binder; 4. Financial Binder; 5. Forms Binder

#### Suggestion rules

| Rule | Trigger | Suggest | Confidence | Behavior |
|------|---------|---------|------------|----------|
| SR-W01 | Skilled worker / work permit | `experience_letter`, `noc` | **MEDIUM** | Show **recommendation banner** for counselor review |

### Permanent Residence (`permanent_residence`)

#### Default documents

| Code | Mandatory | Status | Label |
|------|-----------|--------|-------|
| `passport` | yes | existing | Passport |
| `photograph` | yes | existing | Photograph |
| `visa_forms` | yes | existing | Visa Application Form |
| `employment_letter` | yes | existing | Employment Letter |
| `experience_letter` | yes | existing | Experience Letter |
| `resume` | yes | existing | Resume / CV |
| `academic_transcripts` | yes | existing | Academic Transcripts & Marksheets |
| `police_clearance` | yes | existing | Police Clearance Certificate |
| `ielts_language_test` | no | existing | English / Language Test Result |

#### Required document families

- `identity`
- `application`
- `employment`
- `education`
- `compliance_upload`

#### Default binders & package order

- **Default binders:** Identity Binder → Employment Binder → Academic Binder → Financial Binder → Travel Binder → Forms Binder → Supporting Documents Binder
- **Default package order:** 1. Supporting Documents Binder; 2. Identity Binder; 3. Employment Binder; 4. Academic Binder; 5. Financial Binder; 6. Forms Binder

#### Suggestion rules

| Rule | Trigger | Suggest | Confidence | Behavior |
|------|---------|---------|------------|----------|
| SR-W01 | Skilled worker / work permit | `experience_letter`, `noc` | **MEDIUM** | Show **recommendation banner** for counselor review |
| SR-PR01 | PR / skilled migration | `police_clearance`, `ielts_language_test` | **HIGH** | Auto-add to **Suggested Documents** section |

### Coaching (`coaching`)

#### Default documents

| Code | Mandatory | Status | Label |
|------|-----------|--------|-------|
| `enrollment_agreement` | yes | proposed | Enrollment Agreement |
| `passport` | no | existing | Passport |
| `diagnostic_score_report` | no | proposed | Diagnostic / Mock Test Score Report |

#### Required document families

- `coaching`
- `identity`

#### Default binders & package order

- **Default binders:** Identity Binder → Supporting Documents Binder
- **Default package order:** 1. Supporting Documents Binder; 2. Identity Binder

#### Suggestion rules

| Rule | Trigger | Suggest | Confidence | Behavior |
|------|---------|---------|------------|----------|
| SR-C01 | Coaching enrollment | `diagnostic_score_report` | **MEDIUM** | Show **recommendation banner** for counselor review |

### MBBS (`mbbs`)

#### Default documents

| Code | Mandatory | Status | Label |
|------|-----------|--------|-------|
| `passport` | yes | existing | Passport |
| `photograph` | yes | existing | Photograph |
| `academic_transcripts` | yes | existing | Academic Transcripts & Marksheets |
| `entrance_exam_scorecard` | yes | proposed | Entrance Exam Scorecard (NEET etc.) |
| `offer_letter` | yes | existing | Offer / Admission Letter |
| `financial_documents` | yes | existing | Financial Documents |

#### Required document families

- `identity`
- `education`
- `financial`

#### Default binders & package order

- **Default binders:** Identity Binder → Academic Binder → Financial Binder → Supporting Documents Binder
- **Default package order:** 1. Supporting Documents Binder; 2. Academic Binder; 3. Financial Binder; 4. Identity Binder

#### Suggestion rules

| Rule | Trigger | Suggest | Confidence | Behavior |
|------|---------|---------|------------|----------|
| SR-M01 | MBBS admission | `entrance_exam_scorecard`, `offer_letter` | **HIGH** | Auto-add to **Suggested Documents** section |

---

## 6. Service inheritance map

| Profile | Services | With exceptions |
|---------|----------|-----------------|
| Coaching | 29 | 0 |
| MBBS | 8 | 0 |
| Permanent Residence | 6 | 0 |
| Spouse / Dependent | 15 | 5 |
| Student Visa | 31 | 9 |
| Visitor Visa | 28 | 1 |
| Work Permit | 14 | 3 |

### 6.1 Reference inheritance examples

#### Australia Student Visa

- **Profile:** `student_visa`
- **Source:** profile_inheritance
- **Inherits:** `passport`, `photograph`, `visa_forms`, `offer_letter`, `academic_transcripts`, `financial_documents`, `ielts_language_test`
- **Adds:** `coe`, `oshc_policy`
- **Effective defaults:** `passport`, `photograph`, `visa_forms`, `offer_letter`, `academic_transcripts`, `financial_documents`, `ielts_language_test`, `coe`, `oshc_policy`

#### UK Student Visa

- **Profile:** `student_visa`
- **Source:** profile_inheritance
- **Inherits:** `passport`, `photograph`, `visa_forms`, `offer_letter`, `academic_transcripts`, `financial_documents`, `ielts_language_test`
- **Adds:** `cas_letter`
- **Effective defaults:** `passport`, `photograph`, `visa_forms`, `offer_letter`, `academic_transcripts`, `financial_documents`, `ielts_language_test`, `cas_letter`

#### Germany Student Visa

- **Profile:** `student_visa`
- **Source:** profile_inheritance
- **Inherits:** `passport`, `photograph`, `visa_forms`, `offer_letter`, `academic_transcripts`, `financial_documents`, `ielts_language_test`
- **Adds:** `blocked_account_proof`
- **Effective defaults:** `passport`, `photograph`, `visa_forms`, `offer_letter`, `academic_transcripts`, `financial_documents`, `ielts_language_test`, `blocked_account_proof`

#### Canada Spouse Dependent Visitor (pilot)

- **Profile:** `spouse_dependent`
- **Source:** document_manifest
- **Inherits:** `passport`, `photograph`, `visa_forms`, `marriage_certificate`, `relationship_proof`, `financial_documents`
- **Adds:** `sponsorship_letter`, `other`
- **Effective defaults:** `passport`, `photograph`, `visa_forms`, `sponsorship_letter`, `marriage_certificate`, `photograph`, `financial_documents`, `other`

---

## 7. Catalogue size summary

| Metric | Count |
|--------|-------|
| Existing codes (today) | 23 |
| Proposed new codes (Phase B) | 15 |
| **Final catalogue size** | **38** |
| Variant labels merged (not seeded) | 28 |
| Previous Phase A estimate (before merges) | ~44 |
| Reduction from family-merge policy | ~6 codes avoided |

---

## 8. Pilot note (Canada Spouse Dependent Visitor)

Pilot `document_manifest[]` still maps `relationship_evidence` → `photograph` and `principal_status` → `other`.
Phase C will align manifest to profile after catalogue seed:

- `relationship_evidence` → `relationship_proof`
- `principal_status_document` → `principal_status_document`

**Fleet conversion remains blocked** until pilot UAT + this design approved.

---

## 9. Next steps (blocked until approval)

1. **Review** [DOCUMENT_MANAGEMENT_ARCHITECTURE.md](./DOCUMENT_MANAGEMENT_ARCHITECTURE.md) — three-entity model
2. **Review** final catalogue (Section 1) and family merges (Section 2)
3. **Review** 7 service profiles, binders, and confidence-level rules (Sections 3–5)
4. **Approve** Phase B seed migration for **15 proposed codes only**
5. **Complete** Canada Spouse pilot UAT on new case
6. **Phase C** — align pilot manifest + roll `document_manifest[]` via profile inheritance
7. **Phase E/F** — binder collections + submission packages (post-catalogue)

**No seeding, no fleet conversion until sign-off.**