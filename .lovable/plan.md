## Scope
Restructure only `src/pages/ServiceLibrary.tsx` (counselor view). No DB changes, no admin page changes, no changes to `serviceLibrary.ts` resolvers. Category remains hidden metadata, derived from the selected sub-service when needed.

## New layout

Top of page: a single compact filter card with three sequential pickers (Country, Service, Sub Service). No left sidebar / records tree / category filter / global search box.

```text
[ Country ▾ ]  →  [ Service ▾ ]  →  [ Sub Service ▾ ]
```

Below the filter card, render based on selection state:

1. No country: show only `Country` picker + message "Please select Country, Service and Sub Service to view details."
2. Country selected, no service: show `Country` + `Service` pickers (Service options scoped to that country). Same message.
3. Service selected, no sub-service: also show `Sub Service` picker (scoped to country + service). Same message.
4. All three selected: hide the message, render the full detail panel (Quick Guide, Mandatory Submission Checklist, Checklist, Files, Fees, Cost Summary, Process Flow, Counselor SOP, Internal Admin SOP, country-specific notes) exactly as today.

## Behavior details

- Selection cascade: changing Country resets Service + Sub Service; changing Service resets Sub Service.
- Each picker shows only options derived from the current upstream selection, computed from the existing `service_library` + `service_library_countries` query (already loaded). Filter the country list against `ALLOWED_COUNTRY_SET` as today.
- Resolve the canonical master by `(country, service, sub_service)` from the loaded list; its `service_category` is read internally and passed to `RecordDetail` / `buildShareableLink` — never shown as a navigation control.
- URL params: keep `country`, `service`, `sub` in the query string for shareable links. Drop `category` from URL writing; if a legacy `category` param arrives, ignore it (category is derived from the resolved master).
- Remove the records list panel, the free-text search input, and the category select entirely from the counselor page.
- If multiple masters share the same (country, service, sub-service) — shouldn't happen post-dedupe, but defensively — pick the first and continue.

## Empty / loading states

- While the masters query is loading: show a spinner inside the filter card area, keep detail hidden.
- If a selected combo resolves to no master (e.g. stale URL): show the same prompt message and clear sub-service.

## Files touched

- `src/pages/ServiceLibrary.tsx` — rewrite the page shell: replace the two-column grid with a single-column flow (filter card on top, detail below). Keep `RecordDetail` and helper components (`Panel`, `Field`, `FilterSelect`) as-is; just stop rendering `RecordDetail` until all three filters are set, and remove the sidebar/list/search/category UI. Update the cascade reset handlers and the URL-sync `useEffect` accordingly.

No other files change.
