## Goal

Fix the Germany "Settle Abroad" questionnaire so it (a) never shows raw developer codes (`common_law`, `lt_6m`, `H+`, `education_docs`, `full`, etc.), (b) has no duplicate questions, (c) follows the section structure and ordering you specified, and (d) feels guided rather than like a government form. Scope is the question pack + renderer; engine/scoring keys stay the same so historical answers still score.

## Approach

Today `assessment_questions.options` is a `string[]` and the renderer prints the raw string. Migrating every row to `{value,label}` objects would break the engine matchers that read string answers. Instead:

1. **Keep the stored answer values** (enum codes) unchanged.
2. **Upgrade the renderer** in `src/pages/assessment/AssessmentRun.tsx` to accept either a `string[]` or a `{value,label}[]` for `options`, and to render `label` while still saving `value`.
3. **Rewrite the Germany question pack** in a new migration so every multi-choice question stores `[{value,label}, …]`, every duplicate is removed, ordering matches the spec, and new fields are added.

### Renderer changes (`AssessmentRun.tsx`)

- Normalise options: `const opts = (q.options ?? []).map(o => typeof o === "string" ? { value: o, label: prettify(o) } : o)`.
- `prettify` only used as a defensive fallback (`b1` → `B1`, `common_law` → `Common-law`) for any legacy string options.
- Update the `select` and `multiselect` branches to render `o.label` and compare against `o.value`. Remove the `capitalize` class.
- Replace the section subtitle copy with the per-section premium titles:
  - 1 · Personal Profile & Germany Eligibility
  - 2 · Education & Qualification Recognition
  - 3 · Language Skills & Communication Readiness
  - 4 · Professional Experience & Germany Employability
  - 5 · Financial Readiness & Settlement Support
  - 6 · Immigration History & Compliance Review
  - 7 · Document Readiness & Upload Preparation
- Add a small `auto-CEFR` derivation: when `de_english_test` ∈ {IELTS, PTE, TOEFL, Duolingo} and `de_english_score` is set, mirror the derived band into `de_english_cefr` via `setWithDerived` (same pattern already used for `de_dob → de_age`). Tables: IELTS 4.0/5.0/5.5/6.5/7.5 → A2/B1/B1/B2/C1/C2, PTE 30/43/59/76/85 → A2/B1/B1/B2/C1/C2, TOEFL iBT 31/57/72/95/110 → A2/B1/B2/C1/C2, Duolingo 60/85/115/135 → A2/B1/B2/C1/C2.

### Database migration (single new file under `supabase/migrations/`)

All rows under `country='Germany'`, `goal='de_chancenkarte'`. Existing answer codes preserved so `chancenkarte.ts` / `engine.ts` keep working.

**Deactivate duplicates** (set `is_active=false`, do not delete to preserve historical answers):
- `de_zab_recognised` (overlaps with `de_recognition_status` + `de_anabin_status`)
- `de_english_level` (replaced by `de_english_cefr`)
- `de_german_level` re-used (kept) — values upgraded to A1…C2 labels
- `de_work_experience_years` (replaced by `de_skilled_experience_years`)
- `de_work_in_shortage` (replaced by auto-detected `de_demand_occupation`, which itself becomes admin/derived only — hidden from UI)
- `de_blocked_account_eur` info text replaced (no hardcoded euro amount in label)
- `de_bluecard_salary_eur` (duplicate of `de_annual_salary_eur`; keep the latter)

**Update existing rows** to use `{value,label}` options (representative; same for every multi-choice question):

| code | new options |
|---|---|
| `de_marital` | Single, Married, Common-law, Separated, Divorced, Widowed |
| `de_highest_education` | Secondary school, Vocational qualification, Diploma, Bachelor's degree, Master's degree, PhD |
| `de_recognition_status` | Fully recognized, Partially recognized, Recognition not started, Not required, Unsure |
| `de_anabin_status` | "Yes — Fully recognized (H+)", "Yes — Partially recognized (H+/-)", "Yes — Not recognized (H-)", "No, not checked", "Unsure" — values stay `H+ / H+- / H- / unknown / unsure` |
| `de_german_level` | None, A1, A2, B1, B2, C1, C2 |
| `de_english_cefr` | Basic (A1), Elementary (A2), Intermediate (B1), Upper-intermediate (B2), Advanced (C1), Proficient (C2) |
| `de_english_test` | IELTS, PTE Academic, TOEFL iBT, Duolingo, Other |
| `de_german_test_provider` | Goethe, telc, ÖSD, TestDaF, DSH, Other |
| `de_previous_stay_duration` | Less than 3 months, 3–6 months, 6–12 months, More than 1 year |
| `de_germany_study_duration` | Never studied in Germany, Less than 6 months, 6–12 months, More than 1 year |
| `de_family_relations` | Parent, Sibling, Spouse, Child, Other relative, None |
| `de_move_intent` | Immediately, Within 6 months, Within 1 year, Just exploring |
| `de_documents_ready` | Updated resume / CV, Valid passport, Educational documents, Work experience letters |
| `de_partner_language` | None, German A1, German B1, English B2, Both German & English |
| `de_employer_contact` | Not started, Early conversations, Interview stage, Verbal offer, Signed contract |
| `de_js_plan` | I already have employer leads, I need to network, Not sure yet |

**Reorder Section 2 (Education)** to: highest education → field of study → institution → country → graduation year → study mode → total duration → Anabin → recognition status → regulated profession → vocational (conditional).

**New / restructured questions (additions, all with friendly labels):**

Section 2 — Education:
- `de_field_of_study` (text) — Field of study / specialization
- `de_institution_name` (text) — Institution / university name
- `de_graduation_year` (number) — Year of graduation
- `de_study_mode` (select) — Full-time, Part-time, Distance learning, Hybrid
- `de_degree_duration_band` (select) — 1 year, 2 years, 3 years, 4 years, 5+ years (replaces awkward `de_degree_duration_years` for UI; numeric kept hidden for engine fallback)
- `de_vocational_field` (text, conditional on `de_vocational_qualification=true`)
- `de_apprenticeship_completed` (boolean, conditional)
- `de_vocational_certificate_available` (boolean, conditional)

Section 3 — Language:
- `de_speaks_german` (boolean) — gates `de_german_level`, `de_german_test_provider`
- `de_german_test_year` (number, conditional on test provider != none)
- `de_currently_learning_german` (boolean)
- `de_german_target_level` (select, conditional on learning=true) — A1…C2
- `de_took_english_test` (boolean) — gates `de_english_test` + `de_english_score`
- `de_english_self_assessed` (select, shown when no test) — Basic / Intermediate / Advanced / Fluent
- `de_native_language` (text)

Section 4 — Work:
- `de_employment_status` (select) — Employed, Self-employed, Student, Unemployed
- `de_employment_type` (select) — Full-time, Part-time, Contract, Internship
- `de_industry` (select) — IT, Healthcare, Engineering, Hospitality, Logistics, Finance, Education, Manufacturing, Construction, Other
- `de_skilled_experience_band` (select) — Less than 1 year, 1–2 years, 3–5 years, 5+ years (mirrors to `de_skilled_experience_years` for the engine)
- `de_work_education_match` (select) — Fully related, Partially related, Not related
- `de_current_salary_eur` (number, optional)
- `de_resume_ready` (multiselect) — Updated CV, LinkedIn profile, German-style CV, Experience letters
- `de_applying_to_germany_jobs` (boolean)
- `de_management_experience_years` made conditional on `de_employment_status in (employed, self-employed)` AND industry-leaning roles, plus a `de_has_management_role` boolean gate.
- `de_demand_occupation` becomes derived-only (hidden from UI; still set by the existing `detectShortageOccupation` logic in `chancenkarte.ts`).

Section 5 — Funds:
- Strip hardcoded "€12 324" from label, replace with neutral help text: "Germany generally requires proof of sufficient living funds through a blocked account or equivalent financial support."
- `de_funds_source` (multiselect) — Personal savings, Family support, Sponsor support, Education loan, Business income, Salary income, Other
- `de_funds_liquid` (select) — Yes, No, Partially
- `de_dependents_join` (boolean) — Will family accompany you?
- `de_dependents_spouse`, `de_dependents_children_count` (number) — conditional
- `de_financial_readiness` (select) — Fully prepared, Partially prepared, Need financial planning guidance
- `de_financial_docs_ready` (multiselect) — Bank statements, Income proof, Sponsor documents, Tax returns
- Rename `de_monthly_budget_eur` label to "How much monthly living budget can you support for Germany? (€)"

Section 6 — Compliance (softer wording):
- `de_criminal_history` re-typed `select`: No / Yes / Prefer to discuss with counselor — label changed to "Have you ever been charged with or convicted of a criminal offence?"
- `de_refusal_history` kept boolean; add `de_refusal_countries` (multiselect, conditional) — Germany, Canada, UK, USA, Schengen, Australia, Other; `de_refusal_reason` (text optional)
- `de_immigration_violations` (select) — No, Yes, Prefer private discussion
- `de_medical_condition` (select) — No, Yes, Prefer private consultation
- `de_passport_validity_known` (select) — Yes, No, Unsure
- `de_health_insurance` label softened to "Do you already have health insurance arrangements for Germany?"
- `de_document_readiness_compliance` (multiselect) — Police clearance, Educational documents, Work references, Financial documents
- `de_identity_consistency` (select) — Yes, No, Unsure
- Section help text (rendered above first question) added via a new optional `help_text` row on the section's lead question: "Your information is kept confidential and is used only to assess immigration pathway suitability."

Section 7 — Documents:
- Rename `de_passport_valid` to "Does your passport have at least 12 months validity remaining?"
- `de_passport_expiry` (date)
- `de_education_docs_ready` (multiselect) — Degree certificates, Transcripts / marksheets, Vocational certificates
- `de_experience_docs_ready` (multiselect) — Experience letters, Employment contracts, Salary slips
- `de_language_docs_ready` (multiselect) — IELTS/PTE/TOEFL result, Goethe / telc / TestDaF certificate
- `de_financial_docs_uploadable` (multiselect) — Bank statements, Savings proof, Sponsor documents
- `de_identity_docs_ready` (multiselect) — Birth certificate, Marriage certificate, Police clearance certificate
- `de_docs_digital_ready` (select) — Yes, No, Partially
- `de_translation_needed` (select) — Yes, No, Unsure
- `de_ocr_opt_in` (boolean)
- The existing top-level `de_documents_ready` (Section 1) is removed in favour of this richer set.

### Conditional reveals (`conditional_on` JSON, already supported by `showQ`)

- All vocational detail questions → `{ "de_vocational_qualification": true }`
- All "spouse/partner" questions → `{ "de_partner_join": true }`
- German level / provider / year / target → `{ "de_speaks_german": true }`
- English test / score → `{ "de_took_english_test": true }`
- English self-assessed → `{ "de_took_english_test": false }`
- German target level → `{ "de_currently_learning_german": true }`
- Dependents spouse / children → `{ "de_dependents_join": true }`
- Refusal country / reason → `{ "de_refusal_history": true }`
- Management years → `{ "de_has_management_role": true }`
- Previous-stay duration → `{ "de_previous_germany_stay": true }`

### Engine compatibility

- `de_demand_occupation` already injected by `detectShortageOccupation` in `chancenkarte.ts` — no change.
- `de_english_cefr` will continue receiving CEFR codes (`A1`…`C2`), but the renderer maps from a `value=A1/label="Basic (A1)"` option, so `chancenkarte.ts`'s `cefrIdx()` keeps working.
- `de_skilled_experience_years` will be auto-derived from `de_skilled_experience_band` via `setWithDerived` (`lt_1`→0.5, `1_2`→1.5, `3_5`→4, `gt_5`→6) so existing Chancenkarte / EU Blue Card rules keep scoring without rule changes.
- `de_germany_study_duration` value list expands to include `never` (mapped from "Never studied in Germany"); the existing `_in ["lt_6m","6_12m","gt_1y"]` matcher continues to ignore it.

### Out of scope

- Reworking `de_chancenkarte_rules` weighting (rules stay; values they read are unchanged).
- Real Anabin/ZAB/APS/embassy integrations (these new fields just collect data for future work).
- A live "readiness score" sidebar for Sections 5–7 (the existing Chancenkarte side panel already renders live; widening it to a generic readiness panel is a follow-up).
- PDF report restructuring.

## Files touched

- New SQL migration under `supabase/migrations/` (deactivate duplicates, update options to `{value,label}` JSON, insert ~35 new questions, reorder).
- `src/pages/assessment/AssessmentRun.tsx` — option normalisation, section subtitle copy, auto-CEFR + experience-band derivation, English self-assessed prettifier fallback.
- No changes to `chancenkarte.ts`, `engine.ts`, `pathways.ts`, or admin pages.
