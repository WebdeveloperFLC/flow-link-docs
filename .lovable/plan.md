## What you're seeing today

You have two parallel systems and nothing connects them yet:

- **UPI (extraction pipeline)** — `upi_institutions`, `upi_institution_sources`, `upi_courses_staging`. This is where Sync now writes. Programs on `/institutions/review` come from `upi_courses_staging`.
- **CourseFinder (student-facing)** — `cf_countries`, `cf_universities`, `cf_courses`. This is what students search on `/courses`. It has zero knowledge of the staging table.

So even though sync extracted 277 Seneca programs, none of them appear in CourseFinder because nothing copies them across.

## What the statuses mean (and what they should do)

The five review statuses are a publishing workflow on the staging table:

- **pending_review** — AI just extracted it, nobody has looked yet. Default for new rows.
- **approved** — A human checked it, data looks right, but it's not live yet.
- **published** — Promoted into `cf_courses` / `cf_universities` so it shows up in CourseFinder.
- **rejected** — Bad extraction (wrong page, duplicate, junk) — hidden from review, kept for audit.
- **needs_update** — Was previously published, then the AI re-extracted and found changes worth re-reviewing.

Today **none** of these statuses actually do anything beyond a label — clicking Publish only flips the column. That's the core gap.

## Fix — three parts

### 1. Make Publish actually push to CourseFinder

New edge function **`upi-publish-courses`** that takes one or more staging row ids and, for each:

- Find or create a `cf_universities` row by `(name, country_code)` — name from `upi_institutions.name`, country_code from a small name→ISO map (Canada → CA, India → IN, etc.), city/province/logo carried from the institution.
- Map staging columns to `cf_courses` columns:

  ```text
  course_title              → name
  program_level (text)      → study_level   (certificate/diploma → "diploma",
                                              bachelor → "undergraduate",
                                              master/pg-dip → "postgraduate",
                                              phd → "phd")
  field_of_study            → field_of_study (snap to closest of 6 known buckets)
  duration_value + unit     → duration_months (years*12, months as-is, weeks/4)
  tuition_fee, currency     → tuition_fee, currency
  intake_months (jsonb)     → intake_months (text[])
  ielts_overall, pte, toefl → same
  has_scholarship           → scholarship_available
  is_coop                   → coop_available
  is_pr_pathway             → pr_friendly
  is_pgwp_eligible          → pgwp_eligible
  is_online                 → mode = 'online' else 'full_time'
  program_url               → apply_url
  course_description        → description
  ```

- Upsert into `cf_courses` keyed on `(university_id, name, study_level)` (add a partial unique index).
- Set staging row `review_status = 'published'` and stamp `published_course_id` with the new cf_courses id.
- Wrap in a per-row try/catch so one bad row doesn't fail the batch.

Wire the existing Publish buttons on `/institutions/review` (single + bulk) to call this function. Replace the current "just update the column" code.

Add a **needs_update** detector: when `upi-upsert-courses` upserts a row whose previous state was `published`, set the new state to `needs_update` (already partly there) and the review page can show a "Re-publish" badge that re-runs the publish step.

### 2. Confirm PGWP column is live

I already added the column (migration ran), updated the AI tool schema, the upsert allowlist, and the review table/edit sheet last turn. If you don't see it yet, hard-refresh the preview — the page was likely cached. Verify by re-running Sync now on the Seneca international list and looking for the "PGWP" column in the review table.

### 3. Smarter AI extraction

The extractor today gets only the homepage markdown and is told "extract courses." Two upgrades:

**a. Two-pass extraction for list pages**

If the source page is a **program list** (heuristic: >40 candidate program titles + few details per one), don't try to extract everything from the list. Instead:

1. Pass 1 — ask the AI for `{ name, url }` pairs only from the list page.
2. Pass 2 — for each program URL (cap at ~25 per sync to stay inside function timeout), fetch via Jina and run the full extraction tool against the program detail page. Detail pages have tuition, intake, IELTS, PGWP — the list page doesn't.

This is the difference between 277 thin rows (today) and 25 rich, high-confidence rows.

**b. Richer tool schema**

Extend the `extract_courses` tool with the fields CourseFinder actually filters on so the AI is told to look for them:

- `field_of_study` enum (Business, IT, Engineering, Health, Hospitality, Arts) — snap rather than free-text
- `specialization` (string, optional)
- `is_pgwp_eligible` (already added)
- `stem_eligible` (boolean)
- `gpa_min`, `backlogs_allowed`, `gap_accepted_years`
- `application_fee`, `intake_year`
- `apply_url` (often different from `program_url`)
- `career_outcomes`, `scholarship_info`, `pr_visa_notes` (short summaries)

Tighten the system prompt: "Prefer the program's official detail page over directories. Never invent numeric fields. If the page lists multiple campuses for the same program, emit one row per campus."

## Files

- `supabase/migrations/<new>` — partial unique index on `cf_courses (university_id, lower(name), study_level)`; country-name → ISO helper table or inline map (inline is fine).
- `supabase/functions/upi-publish-courses/index.ts` — new, performs the mapping and upsert described above.
- `supabase/functions/upi-sync-source/index.ts` — add list-page detection, two-pass crawl, expanded tool schema, tightened system prompt.
- `src/institutions/pages/CourseReviewPage.tsx` — Publish button (single + bulk) invokes `upi-publish-courses` instead of just updating the column; show toast with how many landed in CourseFinder and link to `/courses`.

No changes needed in `CourseFinder.tsx` — once `cf_courses` has the rows, it just works.

## Acceptance

- Clicking **Publish** on an approved Seneca row creates a `cf_universities` row for Seneca (if missing) and a `cf_courses` row, and that program appears on `/courses` filtered by Canada immediately.
- Re-syncing the same source re-extracts richer data and any previously published course flips to **needs_update**; clicking Publish on it updates the CourseFinder row in place.
- The PGWP column is visible in `/institutions/review`, gets populated by the AI for the Seneca international list, and the PGWP filter on `/courses` now matches those published programs.
- A sync against a list URL (Seneca international, Conestoga programs) returns fewer but more complete rows: tuition, intake, IELTS, PGWP populated on most rows instead of just the title.
