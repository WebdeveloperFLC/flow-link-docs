## Goal

On `/institutions/review`, add a **Country** filter dropdown next to Program level, and make the **Search** box do real multi-field, multi-token matching instead of behaving like a title-only search.

## Changes (frontend only — `src/institutions/pages/CourseReviewPage.tsx`)

1. **Country filter**
   - New state `countryFilter` (default `"all"`).
   - Populate options from distinct `country_name` values on `upi_courses_staging` (one query alongside `loadAux`, plus an `"Unspecified"` bucket for null).
   - Apply to the Supabase query: `countryFilter === "unspecified"` → `.is("country_name", null)`; otherwise `.eq("country_name", countryFilter)`.
   - Render as a `Select` between Program level and the spacer, matching the existing filter styling.

2. **Multi-field, multi-token search**
   - Replace the current `JSON.stringify(row)` hack with an explicit haystack built per row from the fields users actually search:
     `course_title, course_description, campus_name, city, state_province, country_name, currency, intake_months, ielts_overall, toefl_overall, pte_overall, duolingo_overall, gpa_requirement, is_pgwp_eligible (Yes/No), review_status, source_url, source_identifier, institution name (via instName), level name (via levelName), and stringified metadata`.
   - Split the query on whitespace; a row matches only if **every** token is a substring of the haystack (AND semantics). Empty query → return all.
   - Keep it client-side over the already-loaded `rows` (no extra round-trips).

3. **Reset selection when filters change**
   - Include `countryFilter` in the `useEffect` dependency list that calls `load()` so country changes refetch and clear selection like the others.

4. **Empty-state copy**
   - Update the "no rows" message to mention country too: e.g. *"No programs match the current filters. Try clearing Country / Level / Status or the search box."*

## Out of scope

- No backend, edge function, migration, or schema changes.
- No changes to the Edit sheet, publishing, or extraction pipeline.
- Country values are taken as-is from `country_name`; no normalization in this pass (can be a follow-up if duplicates like "Canada" vs "canada" appear).

## Technical notes

- Distinct countries query: `supabase.from("upi_courses_staging").select("country_name").not("country_name", "is", null).limit(1000)` then de-dup + sort in JS. If we hit the 1000-row cap and miss countries, we can switch to an RPC later — fine for now.
- Haystack is memoized inside the existing `visibleRows` `useMemo` so re-renders stay cheap.
