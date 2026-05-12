# Fix: Searchable country dropdowns + assessment cleanup

## Issues found in the attached report

1. **Nationality (passport country)** and **Country you currently live in** are rendered as plain text inputs in the assessment, so users skip them and the PDF shows "—". They must be **searchable dropdowns with flag emojis**.
2. **Passport validity is asked twice** — `de_passport_validity_known` (select Yes/No/Unsure) and `de_passport_valid` (boolean "≥12 months validity"). The PDF still shows both as "—". Keep the precise one; drop the duplicate.
3. The PDF "Personal" section omits the **Age** line even though we derive it from DOB — should display the derived age next to DOB.

## Changes

### 1. New question type: `country` (searchable dropdown with flags)

**Frontend (`src/pages/assessment/AssessmentRun.tsx`)**
- Add a new branch in `renderInput` for `q.q_type === "country"` that renders a searchable combobox using shadcn `Command` + `Popover`, sourced from `src/lib/countryCodes.ts` (already in the repo — has name + ISO + flag emoji).
- Display selected value as `🇮🇳  India` in the trigger, and each option as `🇮🇳  India` with type-ahead filter on name/code.
- Stored value: the country **name** (string) so existing PDF rendering keeps working.

### 2. Database migration (additive, low risk)

- `UPDATE assessment_questions SET q_type='country' WHERE code IN ('de_nationality','de_current_country')`.
- Deactivate the duplicate passport question: `UPDATE … SET is_active=false WHERE code='de_passport_validity_known'` (keep `de_passport_valid` boolean + `de_passport_expiry` date — these are the precise ones).

### 3. PDF: surface derived Age

**`src/lib/assessmentPdf.ts`** (or whichever renders the Personal block) — when emitting the Personal section for Germany, inject a synthetic "Age" row computed from `de_dob` right after Date of birth, so the report shows the age the scoring engine actually used.

## Files touched

- `src/pages/assessment/AssessmentRun.tsx` — add `country` input renderer (searchable combobox + flag).
- `src/lib/assessmentPdf.ts` — add derived Age row for Germany Personal section.
- New SQL migration — flip `q_type` to `country` for the two fields, deactivate duplicate passport question.

## Out of scope

No scoring engine changes, no new questions, no section reordering — this purely fixes the rendering of nationality/residence and the duplicate passport question that produced the broken PDF.
