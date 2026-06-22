# Default Documents & Suggestion Rules — Phase A Revision

Generated: 2026-06-22T00:21:05.459Z

> **Status:** Review required before Phase B (document_types expansion).
> **No DB changes. No service conversions.**

## Architecture (locked)

| Layer | Source | Creates upload rows? |
|-------|--------|-------------------|
| **Layer 1 — Default documents** | Per-service standard set (5–15) | Yes — initial Documents tab |
| **Layer 2 — Suggested documents** | Client profile rules → document_types | Yes — additive, deduped by code |
| **Layer 3 — Manual documents** | Counselor picker from document_types | Yes — additive |
| **Document Binder** | Training / guidance HTML | **Never** |
| **Checklist** | QA / submission tasks (future) | **Never** |
| **Eligibility / Red flags / Compliance** | Service Library JSON | **Never** |

### Invalid as document_types (assessment / guidance only)

- Genuine Student (GS) requirement
- Financial capacity
- Principal applicant eligible
- Strong ties to home country
- Relationship genuine
- Weak relationship proof
- CoE / provider issues
- Insufficient financial evidence
- OSHC gaps
- English proficiency
- Financial capacity for full program
- Government visa fee paid
- QA sign-off
- Application lodged
- Client reviewed, signed

---

## 1. Proposed default documents per service

**131 services** — target 5–15 upload documents each.
Only real uploadable files. No eligibility, red flags, milestones, or compliance text.

| Service | Kind | Defaults | Codes |
|---------|------|----------|-------|
| Australia – Skilled Migration (Subclass 189/190/491) | work | 8 | passport, photograph, visa_forms, employment_letter, experience_letter, resume, academic_transcripts, police_clearance |
| Australia – Partner Visa (Subclass 820/801 or 309/100) | spouse | 6 | passport, photograph, visa_forms, marriage_certificate, relationship_proof, financial_documents |
| Australia – Student Visa (Subclass 500) | student | 9 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test, coe, oshc_policy |
| Australia – Temporary Graduate Visa (Subclass 485) | student | 9 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test, coe, oshc_policy |
| Australia – Visitor Visa (Subclass 600) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Australia – Work & Holiday Visa (1 year Work & Travel) | work | 8 | passport, photograph, visa_forms, employment_letter, experience_letter, resume, academic_transcripts, police_clearance |
| Austria – Student Residence Permit (Aufenthaltsbewilligung – Studierender) | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| Austria – Schengen Visitor Visa (Type C) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Belgium – Student Visa (Long Stay / Type D) | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| Belgium – Schengen Visitor Visa (Type C) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Canada – BOWP (Bridging Open Work Permit) | work | 9 | passport, photograph, visa_forms, employment_letter, experience_letter, resume, academic_transcripts, police_clearance, offer_letter |
| Canada – CAIPS / GCMS Notes Request | work | 9 | passport, photograph, visa_forms, employment_letter, experience_letter, resume, academic_transcripts, police_clearance, offer_letter |
| Canada – Express Entry (Permanent Residence) | work | 9 | passport, photograph, visa_forms, employment_letter, experience_letter, resume, academic_transcripts, police_clearance, offer_letter |
| Canada – OINP (Ontario Provincial Nominee) | work | 9 | passport, photograph, visa_forms, employment_letter, experience_letter, resume, academic_transcripts, police_clearance, offer_letter |
| Canada – Post-Graduation Work Permit (PGWP) | student | 8 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test, gic_certificate |
| Canada – Provincial Nominee Program (PNP) | work | 9 | passport, photograph, visa_forms, employment_letter, experience_letter, resume, academic_transcripts, police_clearance, offer_letter |
| Canada – Spouse / Dependent Status Extension | spouse | 8 | passport, photograph, visa_forms, marriage_certificate, relationship_proof, financial_documents, principal_status_document, employment_letter |
| Canada – Spouse / Dependent Open Work Permit | spouse | 8 | passport, photograph, visa_forms, marriage_certificate, relationship_proof, financial_documents, principal_status_document, employment_letter |
| Canada – Spouse / Dependent Visitor Visa | visitor | 8 ✓ manifest | passport, photograph, visa_forms, sponsorship_letter, marriage_certificate, photograph, financial_documents, other |
| Canada – Spouse / Partner Sponsorship | spouse | 6 | passport, photograph, visa_forms, marriage_certificate, relationship_proof, financial_documents |
| Canada – Student Visa (Study Permit — Outside Canada) | student | 8 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test, gic_certificate |
| Canada – Study Permit Extension | student | 8 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test, gic_certificate |
| Canada – Super Visa (Parents & Grandparents) | visitor | 8 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter, medical_report, affidavit_of_support |
| Canada – Temporary Resident to PR Pathway | general | 5 | passport, photograph, visa_forms, financial_documents, resume |
| Canada – Visitor Record (In-Canada Extension) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Canada – Visitor Visa (TRV) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Canada – Work Permit (LMIA & LMIA-Exempt) | work | 9 | passport, photograph, visa_forms, employment_letter, experience_letter, resume, academic_transcripts, police_clearance, offer_letter |
| CELPIP General | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| Duolingo English Test | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| French Language A1 | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| French Language A2 | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| French Language B1 | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| French Language B2 | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| French Language C1 | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| French Language C2 | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| French Language (General / Custom) | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| German A2 Crash (with books) | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| German A2 Regular (with books) | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| German B1 Regular (with books) | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| German B1 Speaking | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| German Language A1 Crash Course | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| German Language A1 Regular | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| German Language B2 Regular | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| GMAT | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| GRE | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| IELTS Academic Crash Course | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| IELTS Academic Regular (with books) | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| IELTS Academic Regular (without books) | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| IELTS General Crash Course | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| IELTS General Regular (with books) | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| IELTS General Regular (without books) | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| IELTS — International English Language Testing System | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| PTE Academic | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| SAT | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| Spoken English (with books) | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| TOEFL iBT | coaching | 3 | enrollment_agreement, passport, diagnostic_score_report |
| Cyprus – Student Visa (Entry Permit + Pink Slip) | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| Cyprus – National Visitor Visa (Short Stay) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Denmark – Residence Permit for Studies (SIRI) | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| Denmark – Schengen Visitor Visa (Type C) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Finland – Family Reunification (Spouse / Join Family) | spouse | 6 | passport, photograph, visa_forms, marriage_certificate, relationship_proof, financial_documents |
| Finland – Residence Permit for Studies (Migri) | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| Finland – Schengen Visitor Visa (Type C) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| France – Student Visa (VLS-TS Étudiant) | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| France – Schengen Visitor Visa (Type C) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Germany – Ausbildung (Vocational Training) | student | 8 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test, blocked_account_proof |
| Germany – EU Blue Card | work | 8 | passport, photograph, visa_forms, employment_letter, experience_letter, resume, academic_transcripts, police_clearance |
| Germany – Job Seeker Visa | work | 8 | passport, photograph, visa_forms, employment_letter, experience_letter, resume, academic_transcripts, police_clearance |
| Germany – Opportunity Card (Chancenkarte) | work | 8 | passport, photograph, visa_forms, employment_letter, experience_letter, resume, academic_transcripts, police_clearance |
| Germany – Skilled Worker Visa (§18a/§18b) | work | 8 | passport, photograph, visa_forms, employment_letter, experience_letter, resume, academic_transcripts, police_clearance |
| Germany – Spouse / Family Reunion Visa | spouse | 6 | passport, photograph, visa_forms, marriage_certificate, relationship_proof, financial_documents |
| Germany – Student Visa (National Visa) | student | 8 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test, blocked_account_proof |
| Germany – Visitor / Schengen Visa (Type C) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Hungary – Family Reunification (Spouse / Join Family) | spouse | 6 | passport, photograph, visa_forms, marriage_certificate, relationship_proof, financial_documents |
| Hungary – Student Residence Permit (National D Visa) | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| Hungary – Schengen Visitor Visa (Type C) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Hungary – Residence Permit for Employment | work | 8 | passport, photograph, visa_forms, employment_letter, experience_letter, resume, academic_transcripts, police_clearance |
| Ireland – Student Permission (Long-Stay 'D' Visa + Stamp 2 / IRP) | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| Ireland – Short Stay Visit Visa (C) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Italy – Student Visa (National D Visa) | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| Italy – Schengen Visitor Visa (Type C) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Latvia – Family Reunification (Spouse / Join Family) | spouse | 6 | passport, photograph, visa_forms, marriage_certificate, relationship_proof, financial_documents |
| Latvia – Student Residence Permit (OCMA/PMLP) + National D Visa | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| Latvia – Schengen Visitor Visa (Type C) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Lithuania – Student Visa (National D Visa) | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| Lithuania – Schengen Visitor Visa (Type C) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Malta – Student Visa (National D Visa) | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| Malta – Schengen Visitor Visa (Type C) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Avicenna Batumi Medical University — Georgia | mbbs | 8 | passport, photograph, academic_transcripts, marksheet_10, marksheet_12, mbbs_neet_scorecard, mbbs_admission_letter, financial_documents |
| Georgian National University SEU — Georgia | mbbs | 8 | passport, photograph, academic_transcripts, marksheet_10, marksheet_12, mbbs_neet_scorecard, mbbs_admission_letter, financial_documents |
| International Black Sea University — Georgia | mbbs | 8 | passport, photograph, academic_transcripts, marksheet_10, marksheet_12, mbbs_neet_scorecard, mbbs_admission_letter, financial_documents |
| Medical University of the Americas — Caribbean | mbbs | 8 | passport, photograph, academic_transcripts, marksheet_10, marksheet_12, mbbs_neet_scorecard, mbbs_admission_letter, financial_documents |
| Saba University School of Medicine — Caribbean | mbbs | 8 | passport, photograph, academic_transcripts, marksheet_10, marksheet_12, mbbs_neet_scorecard, mbbs_admission_letter, financial_documents |
| St. Matthew's University — Caribbean | mbbs | 8 | passport, photograph, academic_transcripts, marksheet_10, marksheet_12, mbbs_neet_scorecard, mbbs_admission_letter, financial_documents |
| Synergy University — Russia | mbbs | 8 | passport, photograph, academic_transcripts, marksheet_10, marksheet_12, mbbs_neet_scorecard, mbbs_admission_letter, financial_documents |
| mbbs-tuition-data | mbbs | 8 | passport, photograph, academic_transcripts, marksheet_10, marksheet_12, mbbs_neet_scorecard, mbbs_admission_letter, financial_documents |
| Netherlands – Student Visa (MVV + Residence Permit) | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| Netherlands – Schengen Visitor Visa (Type C) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| New Zealand – Post Study Work Visa | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| New Zealand – Skilled Migrant Category (SMC) | work | 8 | passport, photograph, visa_forms, employment_letter, experience_letter, resume, academic_transcripts, police_clearance |
| New Zealand – Partner of a New Zealander Visa | spouse | 6 | passport, photograph, visa_forms, marriage_certificate, relationship_proof, financial_documents |
| New Zealand – Student Visa | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| New Zealand – Visitor Visa | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Poland – EU Blue Card / Skilled Worker Residence | work | 8 | passport, photograph, visa_forms, employment_letter, experience_letter, resume, academic_transcripts, police_clearance |
| Poland – Family Reunification (Spouse / Join Family) | spouse | 6 | passport, photograph, visa_forms, marriage_certificate, relationship_proof, financial_documents |
| Poland – Student Visa (National D + Residence for Studies) | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| Poland – Schengen Visitor Visa (Type C) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Portugal – Student Visa (National D Visa) | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| Portugal – Schengen Visitor Visa (Type C) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Singapore – Employment Pass / S Pass (Work Pass) | general | 5 | passport, photograph, visa_forms, financial_documents, resume |
| Singapore – Dependant's Pass / LTVP (Spouse & Dependants) | spouse | 7 | passport, photograph, visa_forms, marriage_certificate, relationship_proof, financial_documents, principal_status_document |
| Singapore – Student's Pass (STP) | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| Singapore – Short-Term Visit / Visitor | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Spain – Student Visa (National D Visa) | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| Spain – Schengen Visitor Visa (Type C) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| Sweden – Residence Permit for Studies | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| Sweden – Schengen Visitor Visa (Type C) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| United Arab Emirates – Golden Visa (Long-Term Residence) | general | 5 | passport, photograph, visa_forms, financial_documents, resume |
| United Arab Emirates – Spouse / Dependent Visa | spouse | 7 | passport, photograph, visa_forms, marriage_certificate, relationship_proof, financial_documents, principal_status_document |
| United Arab Emirates – Student Residence Visa | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| United Arab Emirates – Visitor Visa (Tourist / Short Stay) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| United Arab Emirates – Employment / Work Permit | work | 8 | passport, photograph, visa_forms, employment_letter, experience_letter, resume, academic_transcripts, police_clearance |
| UK – Graduate Route Visa | student | 8 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test, cas_letter |
| UK – Skilled Worker Visa | work | 8 | passport, photograph, visa_forms, employment_letter, experience_letter, resume, academic_transcripts, police_clearance |
| UK – Spouse / Partner Visa (Family) | spouse | 6 | passport, photograph, visa_forms, marriage_certificate, relationship_proof, financial_documents |
| UK – Student Visa (Student Route) | student | 8 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test, cas_letter |
| UK – Visitor Visa (Standard Visitor) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |
| USA – Green Card (Employment & Family) | work | 8 | passport, photograph, visa_forms, employment_letter, experience_letter, resume, academic_transcripts, police_clearance |
| USA – Spouse / Fiancé Visa (K-1 / CR-1 / IR-1) | spouse | 6 | passport, photograph, visa_forms, marriage_certificate, relationship_proof, financial_documents |
| USA – Student Visa (F-1) | student | 7 | passport, photograph, visa_forms, offer_letter, academic_transcripts, financial_documents, ielts_language_test |
| USA – Visitor Visa (B1/B2) | visitor | 6 | passport, photograph, visa_forms, financial_documents, travel_itinerary, employment_letter |

### Reference examples (approved targets)


**Australia Student Visa** (proposed defaults):

    passport, photograph, offer_letter, coe, financial_documents, oshc_policy, ielts_language_test

**Canada Spouse Dependent Visitor** (pilot manifest — note relationship_proof revision):

    passport, photograph, marriage_certificate, relationship_proof, financial_documents, principal_status_document, visa_forms

### Per-service detail (first 10 + pilot + Australia)

#### Canada – Spouse / Dependent Visitor Visa (`canada-spouse-dependent-visitor`)

| Code | Mandatory | Catalogue | Note |
|------|-----------|-----------|------|
| `passport` | yes | existing | Valid passport — bio page and relevant visa/stamp pages |
| `photograph` | yes | existing | Passport-size photographs per embassy / online portal specifications |
| `visa_forms` | yes | existing | Visa application form complete, signed, and reviewed for consistency |
| `sponsorship_letter` | no | existing | Travel itinerary / invitation letter (if visiting family or business) |
| `marriage_certificate` | yes | existing | Marriage certificate — civil proof with certified translation if needed |
| `photograph` | yes | existing | Relationship evidence — photos, communication history, shared documents |
| `financial_documents` | yes | existing | Proof of funds for visit and return travel |
| `other` | yes | existing | Principal applicant status document (work permit / study permit / PR card copy) |

#### Canada – Student Visa (Study Permit — Outside Canada) (`canada-student-visa`)

| Code | Mandatory | Catalogue | Note |
|------|-----------|-----------|------|
| `passport` | yes | existing | Passport |
| `photograph` | yes | existing | Photograph |
| `visa_forms` | yes | existing | Visa Application Form |
| `offer_letter` | yes | existing | Offer Letter / LOA |
| `academic_transcripts` | yes | existing | Academic Transcripts |
| `financial_documents` | yes | existing | Financial Documents (general bundle) |
| `ielts_language_test` | yes | existing | English / Language Test Result |
| `gic_certificate` | no | existing | GIC Certificate |

#### Germany – Student Visa (National Visa) (`germany-student-visa`)

| Code | Mandatory | Catalogue | Note |
|------|-----------|-----------|------|
| `passport` | yes | existing | Passport |
| `photograph` | yes | existing | Photograph |
| `visa_forms` | yes | existing | Visa Application Form |
| `offer_letter` | yes | existing | Offer Letter / LOA |
| `academic_transcripts` | yes | existing | Academic Transcripts |
| `financial_documents` | yes | existing | Financial Documents (general bundle) |
| `ielts_language_test` | yes | existing | English / Language Test Result |
| `blocked_account_proof` | yes | proposed | proposed code |

#### UK – Student Visa (Student Route) (`uk-student-visa`)

| Code | Mandatory | Catalogue | Note |
|------|-----------|-----------|------|
| `passport` | yes | existing | Passport |
| `photograph` | yes | existing | Photograph |
| `visa_forms` | yes | existing | Visa Application Form |
| `offer_letter` | yes | existing | Offer Letter / LOA |
| `academic_transcripts` | yes | existing | Academic Transcripts |
| `financial_documents` | yes | existing | Financial Documents (general bundle) |
| `ielts_language_test` | yes | existing | English / Language Test Result |
| `cas_letter` | yes | proposed | proposed code |

#### Australia – Skilled Migration (Subclass 189/190/491) (`australia-skilled-migration`)

| Code | Mandatory | Catalogue | Note |
|------|-----------|-----------|------|
| `passport` | yes | existing | Passport |
| `photograph` | yes | existing | Photograph |
| `visa_forms` | yes | existing | Visa Application Form |
| `employment_letter` | yes | existing | Employment Letter |
| `experience_letter` | no | existing | Experience Letter |
| `resume` | yes | existing | Resume / CV |
| `academic_transcripts` | no | existing | Academic Transcripts |
| `police_clearance` | no | existing | Police Clearance Certificate |

#### Australia – Partner Visa (Subclass 820/801 or 309/100) (`australia-spouse-visa`)

| Code | Mandatory | Catalogue | Note |
|------|-----------|-----------|------|
| `passport` | yes | existing | Passport |
| `photograph` | yes | existing | Photograph |
| `visa_forms` | yes | existing | Visa Application Form |
| `marriage_certificate` | yes | existing | Marriage Certificate |
| `relationship_proof` | yes | proposed | proposed code |
| `financial_documents` | yes | existing | Financial Documents (general bundle) |

#### Australia – Student Visa (Subclass 500) (`Australia-Student-Visa`)

| Code | Mandatory | Catalogue | Note |
|------|-----------|-----------|------|
| `passport` | yes | existing | Passport |
| `photograph` | yes | existing | Photograph |
| `visa_forms` | yes | existing | Visa Application Form |
| `offer_letter` | yes | existing | Offer Letter / LOA |
| `academic_transcripts` | yes | existing | Academic Transcripts |
| `financial_documents` | yes | existing | Financial Documents (general bundle) |
| `ielts_language_test` | yes | existing | English / Language Test Result |
| `coe` | yes | proposed | proposed code |
| `oshc_policy` | yes | proposed | proposed code |

#### Australia – Temporary Graduate Visa (Subclass 485) (`australia-subclass-485`)

| Code | Mandatory | Catalogue | Note |
|------|-----------|-----------|------|
| `passport` | yes | existing | Passport |
| `photograph` | yes | existing | Photograph |
| `visa_forms` | yes | existing | Visa Application Form |
| `offer_letter` | yes | existing | Offer Letter / LOA |
| `academic_transcripts` | yes | existing | Academic Transcripts |
| `financial_documents` | yes | existing | Financial Documents (general bundle) |
| `ielts_language_test` | yes | existing | English / Language Test Result |
| `coe` | yes | proposed | proposed code |
| `oshc_policy` | yes | proposed | proposed code |

#### Australia – Visitor Visa (Subclass 600) (`australia-visitor-visa`)

| Code | Mandatory | Catalogue | Note |
|------|-----------|-----------|------|
| `passport` | yes | existing | Passport |
| `photograph` | yes | existing | Photograph |
| `visa_forms` | yes | existing | Visa Application Form |
| `financial_documents` | yes | existing | Financial Documents (general bundle) |
| `travel_itinerary` | no | proposed | proposed code |
| `employment_letter` | no | existing | Employment Letter |

#### Australia – Work & Holiday Visa (1 year Work & Travel) (`australia-work-holiday`)

| Code | Mandatory | Catalogue | Note |
|------|-----------|-----------|------|
| `passport` | yes | existing | Passport |
| `photograph` | yes | existing | Photograph |
| `visa_forms` | yes | existing | Visa Application Form |
| `employment_letter` | yes | existing | Employment Letter |
| `experience_letter` | no | existing | Experience Letter |
| `resume` | yes | existing | Resume / CV |
| `academic_transcripts` | no | existing | Academic Transcripts |
| `police_clearance` | no | existing | Police Clearance Certificate |

#### Austria – Student Residence Permit (Aufenthaltsbewilligung – Studierender) (`Austria-Student-Visa`)

| Code | Mandatory | Catalogue | Note |
|------|-----------|-----------|------|
| `passport` | yes | existing | Passport |
| `photograph` | yes | existing | Photograph |
| `visa_forms` | yes | existing | Visa Application Form |
| `offer_letter` | yes | existing | Offer Letter / LOA |
| `academic_transcripts` | yes | existing | Academic Transcripts |
| `financial_documents` | yes | existing | Financial Documents (general bundle) |
| `ielts_language_test` | yes | existing | English / Language Test Result |

#### Austria – Schengen Visitor Visa (Type C) (`austria-visitor-visa`)

| Code | Mandatory | Catalogue | Note |
|------|-----------|-----------|------|
| `passport` | yes | existing | Passport |
| `photograph` | yes | existing | Photograph |
| `visa_forms` | yes | existing | Visa Application Form |
| `financial_documents` | yes | existing | Financial Documents (general bundle) |
| `travel_itinerary` | no | proposed | proposed code |
| `employment_letter` | no | existing | Employment Letter |

#### Belgium – Student Visa (Long Stay / Type D) (`Belgium-Student-Visa`)

| Code | Mandatory | Catalogue | Note |
|------|-----------|-----------|------|
| `passport` | yes | existing | Passport |
| `photograph` | yes | existing | Photograph |
| `visa_forms` | yes | existing | Visa Application Form |
| `offer_letter` | yes | existing | Offer Letter / LOA |
| `academic_transcripts` | yes | existing | Academic Transcripts |
| `financial_documents` | yes | existing | Financial Documents (general bundle) |
| `ielts_language_test` | yes | existing | English / Language Test Result |

#### Belgium – Schengen Visitor Visa (Type C) (`belgium-visitor-visa`)

| Code | Mandatory | Catalogue | Note |
|------|-----------|-----------|------|
| `passport` | yes | existing | Passport |
| `photograph` | yes | existing | Photograph |
| `visa_forms` | yes | existing | Visa Application Form |
| `financial_documents` | yes | existing | Financial Documents (general bundle) |
| `travel_itinerary` | no | proposed | proposed code |
| `employment_letter` | no | existing | Employment Letter |

_Full table above covers all 131 services._

---

## 2. Proposed suggestion rules

### 2.1 Global rules (all services)

| Rule | Profile field | Condition | Suggest codes | Catalogue |
|------|---------------|-----------|---------------|-----------|
| SR-01 | `marital_status` | Married | `marriage_certificate`, `relationship_proof`, `wedding_photos` | marriage_certificate (existing), relationship_proof (proposed), wedding_photos (proposed) |
| SR-02 | `marital_status` | Divorced | `divorce_certificate` | divorce_certificate (existing) |
| SR-03 | `travel_history` | Has prior international travel | `travel_history_record` | travel_history_record (proposed) |
| SR-04 | `prior_visa_refusal` | Yes | `visa_refusal_letter` | visa_refusal_letter (proposed) |
| SR-05 | `employment_status` | Employed | `employment_letter`, `salary_slips` | employment_letter (existing), salary_slips (proposed) |
| SR-06 | `employment_status` | Self-employed / Business owner | `business_registration`, `itr_tax_returns` | business_registration (proposed), itr_tax_returns (proposed) |
| SR-07 | `sponsor` | Has sponsor (not self-funded) | `affidavit_of_support`, `bank_statement`, `itr_tax_returns` | affidavit_of_support (existing), bank_statement (proposed), itr_tax_returns (proposed) |
| SR-08 | `has_dependants` | Yes | `birth_certificate` | birth_certificate (existing) |
| SR-09 | `criminal_record` | Yes / required | `police_clearance` | police_clearance (existing) |
| SR-10 | `medical_required` | Yes | `medical_report` | medical_report (existing) |

### 2.2 Service-kind rules (additive)

#### student

| Rule | Trigger | Suggest codes | Catalogue |
|------|---------|---------------|-----------|
| SR-S01 | Course requires language test | `english_test_result` | english_test_result (proposed) |
| SR-S02 | Australia service | `coe`, `oshc_policy` | coe (proposed), oshc_policy (proposed) |
| SR-S03 | UK service | `cas_letter` | cas_letter (proposed) |
| SR-S04 | Canada service | `gic_certificate` | gic_certificate (existing) |
| SR-S05 | Germany service | `blocked_account_proof` | blocked_account_proof (proposed) |

#### spouse

| Rule | Trigger | Suggest codes | Catalogue |
|------|---------|---------------|-----------|
| SR-P01 | Spouse / partner service | `relationship_proof`, `wedding_photos` | relationship_proof (proposed), wedding_photos (proposed) |
| SR-P02 | Dependent / visitor-with-principal | `principal_status_document` | principal_status_document (proposed) |

#### visitor

| Rule | Trigger | Suggest codes | Catalogue |
|------|---------|---------------|-----------|
| SR-V01 | Visiting family | `sponsorship_letter`, `accommodation_proof` | sponsorship_letter (existing), accommodation_proof (proposed) |

#### work

| Rule | Trigger | Suggest codes | Catalogue |
|------|---------|---------------|-----------|
| SR-W01 | Skilled worker / work permit | `experience_letter`, `noc` | experience_letter (existing), noc (existing) |

#### coaching

| Rule | Trigger | Suggest codes | Catalogue |
|------|---------|---------------|-----------|
| SR-C01 | Coaching enrollment | `diagnostic_score_report` | diagnostic_score_report (proposed) |

#### mbbs

| Rule | Trigger | Suggest codes | Catalogue |
|------|---------|---------------|-----------|
| SR-M01 | MBBS admission | `mbbs_neet_scorecard`, `mbbs_admission_letter` | mbbs_neet_scorecard (proposed), mbbs_admission_letter (proposed) |

---

## 3. Catalogue mapping summary

### 3.1 Existing codes used in defaults/suggestions

- `academic_transcripts` — Academic Transcripts
- `affidavit_of_support` — Affidavit of Support
- `birth_certificate` — Birth Certificate
- `divorce_certificate` — Divorce Certificate
- `employment_letter` — Employment Letter
- `experience_letter` — Experience Letter
- `financial_documents` — Financial Documents (general bundle)
- `gic_certificate` — GIC Certificate
- `ielts_language_test` — English / Language Test Result
- `marriage_certificate` — Marriage Certificate
- `medical_report` — Medical Report
- `noc` — No Objection Certificate
- `offer_letter` — Offer Letter / LOA
- `other` — Other
- `passport` — Passport
- `photograph` — Photograph
- `police_clearance` — Police Clearance Certificate
- `resume` — Resume / CV
- `sponsorship_letter` — Sponsorship / Invitation Letter
- `visa_forms` — Visa Application Form

### 3.2 Proposed codes required (minimal set — not seeded yet)

**22 codes** referenced by defaults/suggestions:

- `accommodation_proof` — Accommodation Proof
- `bank_statement` — Bank Statement
- `blocked_account_proof` — Blocked Account / Sperrkonto Proof
- `business_registration` — Business Registration
- `cas_letter` — CAS Letter (UK)
- `coe` — Confirmation of Enrolment (CoE)
- `diagnostic_score_report` — Diagnostic / Mock Test Score Report
- `english_test_result` — English Test Result (TRF/Scorecard)
- `enrollment_agreement` — Enrollment Agreement (Coaching)
- `itr_tax_returns` — ITR / Tax Returns
- `marksheet_10` — 10th Marksheet
- `marksheet_12` — 12th Marksheet
- `mbbs_admission_letter` — MBBS Admission Letter
- `mbbs_neet_scorecard` — NEET Scorecard
- `oshc_policy` — OSHC Policy Certificate
- `principal_status_document` — Principal Applicant Status Document
- `relationship_proof` — Relationship Evidence Pack
- `salary_slips` — Salary Slips
- `travel_history_record` — Travel History Record
- `travel_itinerary` — Travel Itinerary
- `visa_refusal_letter` — Visa Refusal Letter
- `wedding_photos` — Wedding / Relationship Photos

### 3.3 Proposed codes NOT needed (after duplicate merge)

- `english_test_result` — merge into canonical code per Section 4
- `cover_letter` — merge into canonical code per Section 4
- `visa_refusal` — merge into canonical code per Section 4
- `refusal_letter` — merge into canonical code per Section 4
- `travel_history` — merge into canonical code per Section 4
- `statement_of_purpose` — merge into canonical code per Section 4

### 3.4 Net new codes for Phase B (after merge review)

**Estimated 21 codes** to add (not 50+):

- `accommodation_proof`
- `bank_statement`
- `blocked_account_proof`
- `business_registration`
- `cas_letter`
- `coe`
- `diagnostic_score_report`
- `enrollment_agreement`
- `itr_tax_returns`
- `marksheet_10`
- `marksheet_12`
- `mbbs_admission_letter`
- `mbbs_neet_scorecard`
- `oshc_policy`
- `principal_status_document`
- `relationship_proof`
- `salary_slips`
- `travel_history_record`
- `travel_itinerary`
- `visa_refusal_letter`
- `wedding_photos`

---

## 4. Duplicates & unnecessary types

### sop vs english_test_result vs ielts_language_test

- **Resolution:** Keep `ielts_language_test` (existing) as canonical English test upload; rename display to 'English Test Result'. Do NOT create separate `english_test_result` if merged.
- **Action:** merge_proposed_into_existing
- **Keep:** `ielts_language_test`
- **Drop / merge:** `english_test_result`

### financial_documents vs bank_statement

- **Resolution:** `bank_statement` is a specific file; `financial_documents` is a bundle category for defaults. Both valid — bank_statement suggested when sponsor/employed rules fire.
- **Action:** keep_both
- **Keep:** `financial_documents`, `bank_statement`

### offer_letter vs coe vs cas_letter

- **Resolution:** Distinct real documents. `offer_letter` = generic LOA; `coe` = Australia CRICOS; `cas_letter` = UK CAS. Do not merge.
- **Action:** keep_all
- **Keep:** `offer_letter`, `coe`, `cas_letter`

### photograph vs wedding_photos vs relationship_proof

- **Resolution:** `photograph` = passport photos; `wedding_photos` = relationship evidence photos; `relationship_proof` = mixed evidence pack (PDF bundle). All distinct uploads.
- **Action:** keep_all
- **Keep:** `photograph`, `wedding_photos`, `relationship_proof`

### medical_report vs oshc_policy

- **Resolution:** OSHC is an insurance policy certificate, not a medical exam. Keep separate — do NOT map OSHC to medical_report.
- **Action:** keep_both
- **Keep:** `medical_report`, `oshc_policy`

### sop vs cover_letter vs statement_of_purpose

- **Resolution:** Merge `sop` (existing) and proposed `cover_letter` under `sop` OR add `cover_letter` only if visitor visas need distinct type.
- **Action:** merge_or_clarify
- **Keep:** `sop`
- **Drop / merge:** `cover_letter`

### visa_refusal vs visa_refusal_letter vs refusal_letter

- **Resolution:** Single code: `visa_refusal_letter` (proposed). Drop metadata-only `visa_refusal` / `refusal_letter` aliases.
- **Action:** consolidate
- **Keep:** `visa_refusal_letter`
- **Drop / merge:** `visa_refusal`, `refusal_letter`

### travel_history vs travel_history_record

- **Resolution:** Single code: `travel_history_record` (proposed).
- **Action:** consolidate
- **Keep:** `travel_history_record`
- **Drop / merge:** `travel_history`

### relationship_evidence mapped to photograph (pilot)

- **Resolution:** Pilot manifest uses `photograph` for relationship_evidence — should use `relationship_proof` when code is seeded.
- **Action:** fix_pilot_on_phase_c
- **Keep:** `relationship_proof`

### gic_certificate vs blocked_account_proof

- **Resolution:** Country-specific financial proof — both valid, suggested by service country not duplicated.
- **Action:** keep_both

### other

- **Resolution:** Keep as manual-add fallback only — never in default sets.
- **Action:** keep_fallback_only

---

## 5. Explicit exclusions from document_types

The following categories must **never** receive a `document_types` code:

- Eligibility criteria (`eligibility[]`)
- Red flags (`redFlags[]`)
- Compliance policy lines (`compliance[]`)
- Checklist / milestone tasks (fee paid, QA sign-off, application lodged)
- Counselor guidance / verification conclusions
- Document Binder section titles used as assessment labels

---

## 6. Next steps (blocked until approval)

1. **Review** this report — confirm default sets per service kind
2. **Approve** net-new catalogue codes (~21, not 50+)
3. **Complete** Canada Spouse pilot UAT on new case
4. **Phase B** — seed approved codes only
5. **Phase C** — `document_manifest[]` per service (after catalogue approved)

**No Phase B, no fleet conversion, no strict validation until sign-off.**