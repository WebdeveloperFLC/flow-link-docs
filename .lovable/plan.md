## Why Google Reviews tab is empty

The earlier seed skipped Google Reviews because the validation trigger requires real `client_id` + `branch_id` (FK-enforced) and you asked not to link to existing modules. Net effect: zero rows with `is_google_review = true`, so the tab shows nothing.

Also, the current schema does not track **which counselor / team member** got the review — only `uploaded_by` (the person who saved the record), which is not the same thing. Without that, monthly per-counselor leaderboards are not possible.

## What to add

### 1. Schema change (one small migration)

Add to `dsh_media`:

- `credited_user_id uuid references auth.users(id)` — the counselor/team member credited for the review
- `review_received_at date` — when the client posted the review (used for monthly grouping; defaults to created_at::date)

Index: `(is_google_review, review_received_at, credited_user_id, branch_id)`.

Validation trigger update: when `is_google_review = true`, require `credited_user_id` and `review_received_at` in addition to existing client/country/branch/service rules.

### 2. Seed Google Reviews mock data

Insert ~8 rows into `dsh_media` with `is_google_review = true`, using **real** branch + client + counselor IDs already in the DB (this is the only way to satisfy the FK + validation trigger). Spread across the last 3 months so the monthly view has something to show.

Fields per row: title, `google_review_url`, `google_review_text`, `google_review_rating` (4–5), `client_id`, `branch_id`, `country_name`, `service_master_key`, `credited_user_id`, `review_received_at`, optional `google_review_screenshot_path` placeholder.

### 3. UI — Add content dialog

In `MediaUploadDialog.tsx`, when the "Google Review" toggle is on, add:

- **Credited counselor / team member** — required Select populated from team members (reuse existing profiles query)
- **Review received on** — required date input
- **Screenshot upload** — optional image picker that uploads to the `dsh-media` storage bucket and stores the path in `google_review_screenshot_path` (≤10 MB, image/* only). Reuses the existing upload code path.

### 4. UI — Google Reviews tab enhancements

In `DigitalSuccessHomePage.tsx` Google Reviews tab, add a small monthly tracker panel above the table:

- Month picker (defaults to current month)
- Two compact tables side by side:
  - **By counselor**: name, review count, average rating
  - **By branch**: branch name, review count, average rating
- Aggregations done client-side from the same `useDshMedia` result filtered by `review_received_at` month, so no extra endpoint needed.

Existing table already shows rating, review text, link and screenshot link — keep as is, just add a "Counselor" column and a "Received" date column.

### 5. Out of scope (Phase 1)

- No analytics dashboards beyond the simple monthly counts
- No automated review-fetch from Google
- No notifications/reminders
- No exports (can add later)

## Technical notes

- Migration is additive (nullable columns + index); existing rows are unaffected.
- Validation trigger update is gated on `is_google_review = true` so non-review rows are not impacted.
- Screenshot uses the existing private `dsh-media` bucket; preview is shown via signed URL on demand (already in `CopyLinkButton`/preview logic — extend with a small "View screenshot" link).
- The monthly leaderboard query uses `review_received_at` rather than `created_at` so back-dated entries are counted in the correct month.
