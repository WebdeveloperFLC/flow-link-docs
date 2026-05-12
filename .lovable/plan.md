# Fix: Citizenship/residence gating, DOB → age, Back button in all sections

## Problems
1. There is no "Country of citizenship" or "Country of residence" question on the Canada PR assessment. The Family Reunification flow only triggers off `current_status_canada` (PR holder), so a Canadian **citizen** living abroad is never routed there.
2. "Current immigration status in Canada" is always shown — it should only appear when the applicant is **not** Canadian and currently lives in Canada.
3. Age is asked as a free number; there's no date of birth, so the score cannot be tied to an exact age.
4. The **Back** button is disabled the moment the Family Reunification flow opens (`disabled={step === 0 || isFamilyFlow}`), so the user is trapped. Back also feels disabled on section 1 even when the family flow is reachable.

## Scope
Frontend + assessment question seed only. No CRS/FSW engine changes, no PDF changes, no auth/role changes, no Germany flow changes.

## Plan

### 1. New / updated questions (single migration on `assessment_questions`)
Insert (or upsert by `code`) three Canada-pack questions in the `personal` section, all with `is_active=true` and `country='Canada'`:

| code | type | label | order | conditional_on |
|---|---|---|---|---|
| `citizenship_country` | country | Country of citizenship (passport) | 1 | — |
| `country_residence` | country | Country you currently live in | 2 | — |
| `date_of_birth` | date | Date of birth | 8 | — |

Update existing rows:
- `current_status_canada.conditional_on = {"country_residence":"Canada","citizenship_country__not":"Canada"}` — UI will evaluate the `__not` suffix as inequality. Falls back to existing equality for other keys (backward compatible).
- `age.required = false` and label stays — age becomes a derived/optional override of DOB.

No new columns; the `__not` convention lives in `options.conditional_on` JSON only.

### 2. `src/pages/assessment/AssessmentRun.tsx`
- **`showQ`**: extend to handle keys with `__not` suffix (not-equal match) alongside existing equality / array-includes logic. Keep current behaviour for all other questions.
- **`setWithDerived`**: when `date_of_birth` is set to a valid `YYYY-MM-DD`, auto-compute and write `answers.age` (the existing CRS engine input). Mirror logic already used for `de_dob → de_age`.
- **Family flow gate (`isFamilyFlow`)** — extend to:
  ```
  isCanada(country) && (
    goal === "family_sponsorship" ||
    answers.citizenship_country === "Canada" ||
    answers.current_status_canada === "pr_holder" ||
    answers.current_status_canada === "citizen"
  )
  ```
  So a Canadian citizen (regardless of residence) is routed straight to family reunification.
- **Back button** — replace `disabled={step === 0 || isFamilyFlow}` with a smarter handler:
  - If `isFamilyFlow` is active: clicking Back clears the triggers (`citizenship_country` family route + `current_status_canada` if it was `pr_holder/citizen`, and `family.sponsor_status`) so the user returns to the regular questionnaire at the current step. Button is enabled whenever a flow-trigger is set or `step > 0`.
  - Else: existing behaviour (decrement step, disabled only at `step === 0`).
- The disabled state is removed for every section — Back works in section 1 if family flow is active (to exit it), and works in every other section by decrementing step.

### 3. `src/components/assessment/FamilyReunificationFlow.tsx`
- The sponsor-status block at the top stays as a safety net but is **prefilled** from the parent gate (`citizenship_country === "Canada"` → `citizen`, else `pr_holder` if `current_status_canada` says so). No UI restructure.

### 4. Out of scope (explicitly untouched)
- CRS / FSW / PDF / Germany / family evaluation engine
- Existing client records, sessions, leads
- Auth, roles, billing, telephony
- Other working sections — only the Back button condition is touched, behaviour for forward navigation is unchanged

## Files to change
- `supabase/migrations/<new>.sql` — upsert 3 questions, update conditional_on on `current_status_canada`
- `src/pages/assessment/AssessmentRun.tsx` — `showQ`, `setWithDerived`, `isFamilyFlow`, Back button handler
- `src/components/assessment/FamilyReunificationFlow.tsx` — prefill sponsor_status from parent gate (minor)

## Acceptance
- Citizenship = India, residence = Canada → "Current immigration status in Canada" appears.
- Citizenship = Canada (any residence) → Family Reunification flow opens immediately, CRS hidden.
- Entering DOB auto-fills age and the CRS advisory updates.
- Back works on every section, and from the Family Reunification screen it returns to the regular questionnaire by clearing the citizen/PR trigger.
