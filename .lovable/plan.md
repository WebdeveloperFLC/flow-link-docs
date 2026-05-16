## What's going on

I checked the database and the publish function directly:

- `upi_courses_staging` has **575 pending_review, 4 approved, 0 published, 0 rejected**.
- `upi-publish-courses` has **zero invocation logs** — the Publish button has never actually been clicked successfully against any row.
- The function itself works (I called it directly and it returned 200 OK).
- `cf_courses` has 20 rows (your existing seed data) — none from the staging pipeline yet.

So the reason you don't see anything when you filter by "published" is that **nothing has actually been published yet**. You likely either:
- Changed the **status filter** dropdown to "published" (that just filters the view, it doesn't publish anything), or
- Used the edit sheet to change `review_status` to "published" manually (which only writes the column — it doesn't push to CourseFinder), or
- Clicked the small Upload (↑) icon but didn't notice the toast / error.

The publish action that actually pushes to CourseFinder is the **Bulk Publish button** (appears when rows are selected) and the **Upload (↑) icon** in each row's Actions column. There's no clear separation in the UI today between "change a label" and "push to CourseFinder", which is exactly the confusion.

## Fix — three small UI changes

### 1. Make Publish the only way to set status="published"

- Remove `published` from the manual status dropdown in the Edit sheet. Status `published` is owned by the system — only the publish function should set it.
- Keep `pending_review / approved / rejected / needs_update` as the manually editable set.

### 2. Make the Publish workflow visible

- When `statusFilter === "published"`, show an info banner at the top: *"These programs are live in Course Finder."* with a button **View in Course Finder →** linking to `/courses`.
- Add a small **"Open in Course Finder"** link in each published row's Actions cell (uses the stored `published_course_id`).
- Disable the row-level Publish button unless `review_status === 'approved'` and tooltip it: *"Approve this row first"*.

### 3. Surface publish errors / counts loudly

- After invoking `upi-publish-courses`, show:
  - Success: green toast with **"Published N programs to Course Finder"** + a "View" action that opens `/courses`.
  - Partial failure: warning toast listing the first 2 errors so you can see *why* a row failed (missing institution, missing country, etc.) instead of a silent "0 published".
  - Network/function error: red toast with the error message.

That way the next time you click Bulk Publish on the 4 approved Seneca rows, you'll get a clear "Published 4 → View in Course Finder" and see them on `/courses` filtered by Canada immediately.

## Files changed

- `src/institutions/pages/CourseReviewPage.tsx` — banner when filter = published, "Open in Course Finder" link per row, disabled Publish for non-approved, richer toast.
- Edit-sheet status options in the same file — drop `published` from manual choices.

No backend / DB / edge function changes needed.

## Acceptance

- Filtering by `published` either shows a non-empty list **or** an explicit "Nothing published yet — approve rows, then click Bulk Publish" empty state.
- Clicking Bulk Publish on the 4 approved rows produces a toast with a count and a "View in Course Finder" action; the rows then appear under the published filter and at `/courses`.
- The Edit sheet no longer lets a user fake "published" status without actually pushing to CourseFinder.