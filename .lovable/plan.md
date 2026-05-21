# Fix: Program level filter returns no results

## Root cause

`CourseReviewPage` filters by `upi_courses_staging.program_level_id`, but **all 2807 staged rows have `program_level_id = NULL`**.

The extractor returns a free-text `program_level` (e.g. `"Diploma"`, `"Bachelor's"`, `"postgraduate_diploma"`, `"Ontario College Graduate Certificate"`). In `upi-upsert-courses`, `program_level` is not in the `KNOWN` set, so it gets dumped into `metadata` and the FK column is never populated. The dropdown therefore never matches anything.

## Fix

### 1. Resolve level text → `program_level_id` in `upi-upsert-courses`

- Load `upi_program_levels` (`id`, `name`) once per invocation.
- Add a `resolveLevelId(text)` helper with a normalization map covering the variants already in the DB:
  - `bachelor / bachelors / bachelor's / bachelor's degree / undergraduate / bachelor of arts|science|...` → **Bachelor**
  - `master / masters / master's / master of ...` → **Master**
  - `mba` → **MBA**
  - `phd / doctorate / doctoral / dphil` → **PhD / Doctorate**
  - `postdoc / postdoctoral` → **Postdoctoral**
  - `diploma / ontario college diploma / post-diploma` → **Diploma**
  - `advanced diploma / ontario college advanced diploma` → **Advanced Diploma**
  - `certificate / ontario college certificate` → **Certificate**
  - `graduate certificate / ontario college graduate certificate / pg certificate / postgraduate certificate` → **Graduate Certificate**
  - `graduate diploma / postgraduate diploma / postgraduate_diploma / pg diploma` → **Graduate Diploma**
  - `associate / associate degree` → **Associate Degree**
- Strategy: lowercase + strip punctuation, try direct name match, then keyword rules above. If nothing matches, leave `program_level_id` null and keep the raw text in metadata (current behaviour).
- Set `known.program_level_id = resolveLevelId(raw.program_level)` before upsert. Keep raw `program_level` in metadata for traceability.

### 2. Backfill existing 2807 rows (migration)

One-shot SQL migration that updates `upi_courses_staging.program_level_id` from `metadata->>'program_level'` using the same mapping (CASE expression against `lower(regexp_replace(...))`). Items that don't match stay null.

### 3. Minor UX tweak in `CourseReviewPage`

Add an extra option **"Unclassified"** to the Program level dropdown that filters `program_level_id IS NULL`, so the ~487 rows with no detectable level remain reachable from the UI. (Optional — confirms the filter behaviour is intentional.)

## Files

- `supabase/functions/upi-upsert-courses/index.ts` — add `resolveLevelId`, populate `program_level_id`.
- New migration `supabase/migrations/<ts>_backfill_program_level_id.sql` — backfill existing staged rows.
- `src/institutions/pages/CourseReviewPage.tsx` — add "Unclassified" option and handle `null` filter via `.is("program_level_id", null)`.

## Out of scope

No changes to the extractor prompt, dedup logic, or Sources/Documents flow.
