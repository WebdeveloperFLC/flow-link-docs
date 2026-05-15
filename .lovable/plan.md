## Goal

Wire the Course Finder "Apply Filter" to live `flc.course` results from the connected Odoo (FLC) instance, and move saved filters from `localStorage` into a Postgres table with proper access control. The existing UI layout and filter sections stay as-is.

## Step 1 — Discover `flc.course` schema (one-time)

Before building the filter mapping, run `odoo-discover` with `action: describe_model`, `model: flc.course` to capture the exact field names (e.g. country, state, study area, level, intake, tuition, currency, waivers). The current UI uses display labels; we need the Odoo technical names to build the search domain.

The plan below assumes typical FLC field names; the actual mapping table will be finalized from the discover response and stored in a single constant on the edge function.

## Step 2 — New edge function: `flc-courses`

`supabase/functions/flc-courses/index.ts` — auth-gated (any logged-in user). Reuses the XML-RPC + JSON-RPC fallback helpers from `odoo-discover`. Reads `ODOO_COURSES_URL/DB/LOGIN/API_KEY` (with fallback to `ODOO_*`).

Actions:

- `search` — body: `{ filters: FilterState, limit, offset, order }`
  - Builds an Odoo domain from the filter payload using a `FILTER_MAP` (UI key → Odoo field + operator).
  - Calls `flc.course.search_read` with a curated `fields` list (name, institute, campus, country, state, city, level, intake, tuition_fee, currency, delivery_mode, ielts/pte/toefl mins, scholarship, application_fee, waivers, etc.).
  - Returns `{ ok, total, courses }`.
- `facets` (optional, for populating dropdowns like Institute, Currency) — returns distinct values via `read_group`.

Domain construction rules:

- Multi-selects (countries, states) → `["country_id.code", "in", [...]]` (use whichever relation field exists).
- Free text (city, institute) → `ilike`.
- Tuition / grade / score min-max → two clauses with `>=` and `<=`.
- Booleans (waivers, STEM, withoutMaths) → only added when `true`.
- Empty strings / empty arrays → skipped (no filter).
- Test scores (English/Language/Aptitude) → applied as "course requirement ≤ user score" so the course is reachable.

## Step 3 — New table: `course_finder_saved_filters`

Migration:

```text
id uuid PK, name text, payload jsonb, owner_id uuid (auth user), 
is_shared boolean default false, created_at, updated_at
```

RLS:

- SELECT: owner OR `is_shared = true` OR admin (`has_role(uid,'admin')`).
- INSERT: any authenticated user (forces `owner_id = auth.uid()`).
- UPDATE / DELETE: owner OR admin.

Trigger: `touch_updated_at` on update.

Only admins may toggle `is_shared = true` (enforced via a CHECK in the UPDATE policy: `is_shared = OLD.is_shared OR has_role(auth.uid(),'admin')`).

## Step 4 — Frontend rewrite of `CourseFinderWizard.tsx`

Keep all existing sections, fields, layout, and styling. Changes:

1. Replace `loadSaved`/`writeSaved` (localStorage) with Supabase queries against `course_finder_saved_filters`. Sidebar lists "My filters" + "Shared filters" (admin-controlled). Save dialog gets an "Share with team" switch (admins only).
2. `apply()` calls `supabase.functions.invoke("flc-courses", { body: { action: "search", filters: f, limit: 50 } })`, sets `results` state and `loading`.
3. Replace the "Connect Odoo course catalogue" placeholder rail with a results list rendering name, institute · campus, country/city, level, intake, tuition (with currency), and any matching waivers as badges. Empty / error / loading states included.
4. Pagination via "Load more" using `offset`.
5. URL param `?saved=<id>` auto-loads a saved filter (so admins can share links).

## Technical notes

- Field-name fragility: `FILTER_MAP` is centralized in the edge function so a single update fixes mismatches once we see the discover output.
- Auth: `flc-courses` requires a logged-in user; no admin gate (course finder is for counselors).
- No changes to `odoo-sync` or other Odoo functions.
- No new packages.

## Files

- `supabase/functions/flc-courses/index.ts` — new
- `supabase/migrations/<ts>_course_finder_saved_filters.sql` — new
- `src/pages/CourseFinderWizard.tsx` — wire apply + saved filters + results rail (UI sections unchanged)

## Open question

Saved-filter sharing: should **any user** be able to mark a filter as "shared with team", or **admins only**? Plan currently assumes admins only. Confirm or override.
