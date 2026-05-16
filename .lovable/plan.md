## Goal

Make every institution detail page a fully isolated workspace (no data leakage across institutions) and gate the entire Institutions section (`Institutions`, `Course Review`, `AI Suggestions`) behind admin-only access.

## Root cause of the current leak

`src/institutions/repositories/index.ts` defines:

```text
mockForInst(rows, id) → if filter yields 0 rows, return ALL rows
```

Because real DB institutions use UUIDs but mock rows are keyed to `mock-inst-seneca`, `mock-inst-conestoga`, etc., the filter always yields 0 and every real institution falls back to the full shared mock dataset. That is why Conestoga, UBC, and others all show Seneca/Centennial records.

Additionally, panels like Agreements/Commissions/Promotions/Campaigns load via `useXxx(id)` which goes through the same repo, so the leak propagates to every tab.

---

## Changes

### 1. New helper — institution-scoped filter

Create `src/institutions/lib/scope.ts`:

- `getInstitutionRecords<T>(institutionId, records)` — strict filter, never falls back to "all".
- `pickMockTemplate(institutionId)` — deterministic hash → one of `mock-inst-seneca | mock-inst-conestoga | mock-inst-centennial | mock-inst-fanshawe | mock-inst-ubc`. Used only when DB is empty AND `USE_MOCK_DATA` is on, so a real UUID still gets a single, stable, isolated mock dataset (not a merged blob).
- `rekeyToInstitution<T>(records, fromId, toId)` — clones records and rewrites `institution_id` so the seeded mock looks like it belongs to the current institution.

### 2. Repositories — strict scoping + per-institution seeding

Edit `src/institutions/repositories/index.ts`:

- Remove the dangerous "filter empty → return all" fallback in `mockForInst`.
- New flow per repo (`agreementsRepo`, `commissionsRepo`, `claimCyclesRepo`, `invoicesRepo`, `promotionsRepo`, `campaignsRepo`, `sourcesMockRepo`, `suggestionsRepo`, `studentsRepo`, `commissionsRepo.rules`):
  1. Query Supabase, filter strictly by `institution_id === institutionId`.
  2. If real rows exist → return them.
  3. Else if `USE_MOCK_DATA` and `institutionId` is set → pick a deterministic template institution via `pickMockTemplate(id)`, take ONLY that template's rows, rekey their `institution_id` to the current id, and return them.
  4. Else → return `[]` so panels render their empty state.
- For child collections (commission rules, invoices by cycle, students by cycle), seed using the same template so child IDs remain consistent within the seeded snapshot.

### 3. Per-institution mock structure

Edit `src/institutions/mock/canadianInstitutions.ts`, `mock/students.ts`, `mock/campaigns.ts`:

- Group the existing rows by `institution_id` (already keyed). No new content needed — the existing per-institution buckets become the "templates" the helper picks from.
- Remove globally-scoped mock rows that have `institution_id: null` (e.g., `cmp-3` "Counselor incentive Q1 2026") from the per-institution paths, or attach them to a specific template so they cannot leak into other institutions.

### 4. Detail page — verify id before rendering

Edit `src/institutions/pages/InstitutionDetailPage.tsx`:

- Early-return a "not found / loading" state if `id` is missing or `inst` not yet loaded (already partially done).
- Every panel (`OverviewPanel`, `AgreementsPanel`, `CommissionsPanel`, `ClaimsPanel`, `PromotionsPanel`, `CampaignsPanel`, `AiSuggestionsPanel`, `AiReviewPanel`, sources/docs sections) receives `institutionId={id}` and renders an empty state when its hook returns `[]`.
- Confirm every create/insert path on this page already sets `institution_id: id` (uploads, sources, campaigns — already correct). Audit the same in panel dialogs (`AgreementsPanel`, `CommissionsPanel`, `ClaimsPanel`, `PromotionsPanel`, `CampaignsPanel`) and patch any insert that omits `institution_id`.

### 5. Empty states

Every panel must render an inline empty card ("No agreements for this institution yet") when its scoped list is empty, instead of borrowing from other institutions. No new styling — reuse existing `<Card>` empty patterns already present in the panels.

### 6. Admin-only access to the Institutions section

- Add `src/institutions/components/InstitutionsProtectedRoute.tsx`:
  - Uses `useAuth()`; while `loading` show a spinner; if `!user` redirect to `/auth`; if `!isAdmin` render an "Access restricted — admin only" card.
- Wrap the four routes in `src/App.tsx`:
  - `/institutions`, `/institutions/review`, `/institutions/suggestions`, `/institutions/:id` → `<InstitutionsProtectedRoute>…</InstitutionsProtectedRoute>` (replacing the existing `ProtectedRoute`).
- Hide the `institutionsNav` group in `src/components/layout/AppLayout.tsx` when `!isAdmin` so non-admins don't see the menu.

Access management itself (grant/revoke admin) already exists via the `user_roles` table + `useAuth().isAdmin`. No DB migration needed for this step — admins assign the `admin` role from the existing Users page.

---

## Out of scope

- No redesign of any tab, panel, or page chrome.
- No new edge functions or DB migrations.
- No changes to CRM modules outside `src/institutions/` (except the two App.tsx route wrappers and the AppLayout nav visibility check).

## QA checklist

1. Open Conestoga → Agreements/Commissions/Claims/Promotions/Campaigns/AI Suggestions only show Conestoga records (or the Conestoga-template mock, never Seneca/Centennial/Fanshawe rows).
2. Open Seneca → only Seneca rows visible.
3. Open a brand-new institution with no data → every tab shows its empty state, not borrowed rows.
4. Create an agreement/commission/promotion/campaign from a panel → record appears only on that institution's detail page.
5. Non-admin user signs in → `/institutions*` routes show "Access restricted"; sidebar hides the Institutions group.
6. Admin user → full access restored.