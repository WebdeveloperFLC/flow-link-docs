
## Goal

Extend the client registration form (Section 2 "Education & Test Scores") with:

1. **Sectional scores** for every test (English + Other) — not just an overall score.
2. **Multiple education history** entries — not just one row.
3. **Work experience** entries (new sub-section).
4. **Co-applicant parity** — the same education / tests / experience block on each family member.

Constraint from the user: reuse the field names already used at the client stage. No renaming. Same field name in the form, in the DB column, in `prefillFromLead`, in the save payload, and in the reload — so values round-trip on every save/edit/save.

## Storage approach (no renamed fields)

Existing scalar columns stay as-is and remain the "primary" record:
`last_education`, `institution_name`, `year_of_passing`, `percentage_cgpa`,
`english_test`, `english_overall`, `english_test_date`, `english_test_expiry`,
`other_tests` (jsonb).

We extend with jsonb to hold the structured extras using the same names already in the codebase pattern (`other_tests` jsonb is the precedent):

- `english_sections jsonb` — `{ listening, reading, writing, speaking }` (per `english_test`).
- `other_tests` jsonb item shape extended from `{type, score, date}` to `{type, score, date, sections: {...}}` — additive, no rename.
- `education_history jsonb` — array of `{ level, institution, year, percentage_cgpa, country, specialization }`. The form keeps the first row mirrored into the existing scalar columns so legacy reads keep working.
- `work_experience jsonb` — array of `{ company, role, start_date, end_date, currently_working, country, description }`.

Same columns added to `client_family_members` using the identical names, so co-applicants serialize through the same code path.

## Migration

```sql
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS english_sections   jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS education_history  jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS work_experience    jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.client_family_members
  ADD COLUMN IF NOT EXISTS last_education      text,
  ADD COLUMN IF NOT EXISTS institution_name    text,
  ADD COLUMN IF NOT EXISTS year_of_passing     integer,
  ADD COLUMN IF NOT EXISTS percentage_cgpa     text,
  ADD COLUMN IF NOT EXISTS english_test        text,
  ADD COLUMN IF NOT EXISTS english_overall     text,
  ADD COLUMN IF NOT EXISTS english_test_date   date,
  ADD COLUMN IF NOT EXISTS english_test_expiry date,
  ADD COLUMN IF NOT EXISTS english_sections    jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS other_tests         jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS education_history   jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS work_experience     jsonb NOT NULL DEFAULT '[]'::jsonb;
```

No RLS changes (existing policies on both tables already cover these columns).

## Sectional definitions

Single source of truth in `src/lib/testSections.ts` (new):

```text
IELTS    : listening, reading, writing, speaking   (overall)
PTE      : listening, reading, writing, speaking   (overall)
TOEFL    : listening, reading, writing, speaking   (overall)
CELPIP   : listening, reading, writing, speaking   (overall)
Duolingo : (overall only)
GRE      : verbal, quant, awa
GMAT     : verbal, quant, ir, awa
SAT      : math, ebrw
DELF     : listening, reading, writing, speaking
TestDaF  : listening, reading, writing, speaking
```

Used by both the primary form and the co-applicant component.

## Code changes

### `src/lib/clientRegistration.ts`
- Extend `ClientRow` / `ClientDraft`:
  - `english_sections?: Record<string, string>`
  - `other_tests?: Array<{ type: string; score?: string; date?: string; sections?: Record<string, string> }>`
  - `education_history?: Array<{ level?: string; institution?: string; year?: number|null; percentage_cgpa?: string; country?: string; specialization?: string }>`
  - `work_experience?: Array<{ company?: string; role?: string; start_date?: string|null; end_date?: string|null; currently_working?: boolean; country?: string; description?: string }>`
- Extend `FamilyMember` / `FamilyDraft` with the same education / test / experience fields.
- `upsertClientRegistration`: before write, mirror `education_history[0]` → `last_education / institution_name / year_of_passing / percentage_cgpa` so legacy scalars stay in sync. Pass jsonb fields through untouched.

### `src/pages/clients/ClientNew.tsx`
- Replace the single-education grid with an `EducationHistoryList` (add row / remove / reorder). First row writes back to the existing scalar fields.
- English test block: when a test is selected, render the sectional inputs from `testSections.ts` alongside Overall / Date / Expiry. State stored in `f.english_sections`.
- Other tests block: per selected test, render its sectional inputs under the existing Score / Date row. State stored in `otherTests[i].sections`.
- Add a new sub-section "Work Experience" with add/remove rows.
- Reload path (`fetchClient`) already sets `setF(c)` and `setOtherTests(c.other_tests ?? [])` — extend to also restore `english_sections`, `education_history`, `work_experience`. Same on the "lead already converted" branch.

### `src/components/clients/registration/FamilyMembersSection.tsx`
- For each family member row, add a collapsible "Education, Tests & Experience" panel containing the same three blocks as the primary form, bound to the family member's own fields.
- Save through the existing family-member upsert path with the new columns included.
- On load, hydrate the new fields from the row.

### `src/lib/testSections.ts` (new)
- Exports `ENGLISH_SECTIONS` and `OTHER_TEST_SECTIONS` maps + a tiny `<SectionalInputs />` helper used by both primary and co-applicant blocks to keep markup identical.

## Round-trip guarantee

- Field names in React state, in the `ClientDraft` payload, in the DB column, and in the reload are **identical** in every layer (`english_sections`, `education_history`, `work_experience`, `other_tests[i].sections`).
- The first education row is mirrored to the legacy scalar columns on save so older reads (lists, exports, AI summaries) still work.
- Save → reload → save produces the same JSON (verified by reading `fetchClient` output into the same state slots it was saved from).

## Out of scope

- No visual restyle beyond adding the new inputs into the existing Section 2 card.
- No changes to lead-stage forms, RLS, or reports.
