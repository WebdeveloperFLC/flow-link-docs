## Goal

Fix UX problems in the Germany (Settle Abroad) assessment questionnaire: duplicate marital status, irrelevant spouse questions for single applicants, vague labels, weak inputs, missing relocation-readiness questions, and unprofessional section copy. Keep changes scoped to the Germany question pack, the questionnaire renderer, and the Chancenkarte rule that depends on those answers.

## Changes

### 1. Database — Germany question pack (new migration)

A new migration cleans up duplicates and reshapes the personal section. Existing answer keys are reused where safe so that already-collected data still scores.

- **Drop / deactivate** these duplicate or replaced rows:
  - `de_marital_status` (duplicate — "Marital status (detailed)")
  - `de_spouse_qualification` (vague "basic conditions" wording)
  - `de_previous_stay_months` (replaced by yes/no + duration)
  - `de_age` (replaced by date of birth, age derived)
  - `de_family_in_germany` boolean (replaced by multiselect of relations)
  - `de_studied_in_germany` boolean (replaced by duration select)

- **Keep** `de_marital` as the single marital field with options `single, married, common_law, separated, divorced, widowed` and move it to `order_index = 3`.

- **Add / update** the following rows (all `country='Germany'`, `goal='de_chancenkarte'`):

| code | type | label | options | conditional_on | order |
|---|---|---|---|---|---|
| `de_dob` | `date` | Date of birth | — | — | 10 |
| `de_partner_join` | `boolean` | Will your spouse/partner also apply for Germany immigration with you? | — | `{"de_marital":["married","common_law"]}` | 30 |
| `de_partner_qualification` | `boolean` | Does your spouse/partner have a recognised qualification? | — | `{"de_partner_join":true}` | 31 |
| `de_partner_language` | `select` | Spouse/partner language ability | `["none","german_a1","german_b1","english_b2","both"]` | `{"de_partner_join":true}` | 32 |
| `de_partner_skilled_experience` | `boolean` | Does your spouse/partner have skilled work experience? | — | `{"de_partner_join":true}` | 33 |
| `de_previous_germany_stay` | `boolean` | Have you previously stayed in Germany legally? | — | — | 50 |
| `de_previous_stay_duration` | `select` | Total duration stayed in Germany | `["lt_3m","3_6m","6_12m","gt_1y"]` | `{"de_previous_germany_stay":true}` | 51 |
| `de_germany_study_duration` | `select` | Have you ever studied in Germany? | `["no","lt_6m","6_12m","gt_1y"]` | — | 52 |
| `de_family_relations` | `multiselect` | Immediate family members living in Germany | `["parent","sibling","spouse","child","other","none"]` | — | 53 |
| `de_move_intent` | `select` | When are you planning to move to Germany? | `["immediately","within_6_months","within_1_year","exploring"]` | — | 60 |
| `de_documents_ready` | `multiselect` | Documents you currently have ready | `["resume","passport","education_docs","experience_letters"]` | — | 61 |

### 2. Chancenkarte rule update (in `de_chancenkarte_rules` table)

The "Germany connection" factor currently references the dropped keys. The migration updates that rule's `tiers` JSONB to read the new answer keys, scoring the same way (one point each, capped by `max_points`):

```text
- de_germany_study_duration_in ["lt_6m","6_12m","gt_1y"]   → 1 pt "Studied in Germany"
- de_previous_germany_stay = true AND
  de_previous_stay_duration_in ["6_12m","gt_1y"]            → 1 pt "Previous stay ≥ 6 months"
- de_family_relations_in ["parent","sibling","spouse","child","other"] → 1 pt "Close family in Germany"
```

The "spouse joint application" tier is rewritten:

```text
- de_partner_join = true AND de_partner_qualification = true → 1 pt "Spouse joint application"
```

No change to other factors (age, language, qualification, experience, shortage, funds).

### 3. Engine code

- `src/lib/assessment/germany/pathways.ts` (and Deno mirror `supabase/functions/_shared/germany/engine.ts`): age is now derived from `de_dob`. Add a small helper that returns `Number(answers.de_age) || ageFromDob(answers.de_dob)`. The `_gte` / `_in` matcher already handles the new rule clauses.

### 4. Questionnaire renderer (`src/pages/assessment/AssessmentRun.tsx`)

- Add a `date` branch to `renderInput` that renders a native `<input type="date">` styled with `flc-input`. When the user changes `de_dob`, also mirror the derived integer age into `answers.de_age` so the existing live Chancenkarte panel keeps scoring without a round-trip.
- Replace the section-subtitle string `Section {n} of {N} · answer what you can, skip what you can't.` with `Section {n} of {N} · {currentSection.label}` to remove the apologetic copy.
- Conditional rendering already supports `{ key: [values] }` (see `showQ`); no change needed for the new spouse / stay-duration conditions.

### 5. Out of scope

- No changes to Canada questions, scoring, or PDF.
- No changes to admin rule editor UI (rules remain editable from `/germany-rules`).
- No backfill of historical answers (old `de_age` / `de_previous_stay_months` answers continue to score via the engine fallback).

## Files touched

- New SQL migration under `supabase/migrations/` (questions + rule JSON update).
- `src/pages/assessment/AssessmentRun.tsx` (date input, age mirror, section subtitle).
- `src/lib/assessment/germany/pathways.ts` + `supabase/functions/_shared/germany/engine.ts` (age-from-DOB fallback).