## Problem

On `/institutions/review`:
1. The Country dropdown only shows **Canada** because it's populated from `upi_courses_staging.country_name`, which is null on most rows. Real country data lives on `upi_institutions.country_name` (Canada, UK, New Zealand, UAE, …).
2. The Course table has no Country column, so reviewers can't see where each program is offered.

## Fix (frontend only — `src/institutions/pages/CourseReviewPage.tsx`)

1. **Source countries from institutions**
   - In `loadAux`, replace the staging `country_name` query with `upi_institutions.select("id, name, country_name")`. Build `countries` from the distinct non-null `country_name` values across institutions (sorted).
   - Extend the existing institutions state shape to keep `country_name` per institution, and build an `instCountry(id)` lookup alongside `instName(id)`.

2. **Country filter now matches by institution**
   - In `load()`, replace the staging `country_name` filter with an `institution_id IN (...)` filter where the IDs are institutions whose `country_name` matches the selected country.
   - Keep `"all"` (no filter) and `"unspecified"` (institutions with null country_name, or rows whose institution has no country). Selected list is computed client-side from the already-loaded institutions, so no extra round-trip.

3. **Add a Country column to the table**
   - New `<th>Country</th>` between Institution and Level.
   - Row cell: `instCountry(r.institution_id) ?? r.country_name ?? "—"` (institution wins; fall back to staging value if institution lookup is missing).
   - Update the empty-state `colSpan` from 11 to 12.

4. **Search haystack**
   - Include `instCountry(r.institution_id)` in the per-row haystack so the search box matches on country too.

## Out of scope

- No backend, edge function, or schema changes. The "United Kingddom" typo in one institution row is data, not a UI bug — separate cleanup.
- No change to how the extractor writes `country_name` onto staging rows.
- No change to publishing, Edit sheet, or other filters.