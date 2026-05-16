
## Goal

Make the four KPI cards on `/institutions` clickable so they navigate to the relevant filtered list.

## Mapping

| Card | Action |
|---|---|
| Total institutions | Set filter `all` (highlights "All" pill, scrolls to grid) |
| Partner institutions | Set filter `partners` |
| Courses published | Navigate to `/institutions/review?status=published` |
| Pending review | Navigate to `/institutions/review?status=pending_review` |

`CourseReviewPage` already reads `?status=` from the URL — no change needed there.

## Implementation

Edit `src/institutions/pages/InstitutionsListPage.tsx`:

- Extend each entry in the stats array with either an `onClick` (for filter-on-this-page cards) or a `to` (for navigation cards).
- Wrap each `Card` in a `Link` when `to` is set, otherwise render a `button` so the whole card is keyboard/clickable.
- Add `cursor-pointer hover:shadow-elev-md transition-shadow` styling so they read as interactive.

No other files touched.
