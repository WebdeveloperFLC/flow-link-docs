# Fix: Access Management — guard + vertical layout

## 1. Why Balveer can see the page today

Two reasons combine:

- **Stale deployed bundle on the custom domain.** The route guard (`AccountingSectionRoute section="access_admin"`) and the in-page `if (!isAdmin) <Navigate />` already exist in code, but the live site at `dms.futurelinkconsultants.com` still serves the previous bundle. Until republished, Balveer's browser runs the old version without the guard.
- **Guard runs only on the client.** Even with the new bundle, the protection is purely React-side. Anyone who bypasses it (cached JS, direct DOM, devtools) can still attempt the API call. We should also harden it so the page is a no-op for non-admins.

## 2. What we will change

### A. Tighten the page guard (defense in depth)

In `src/accounting/pages/settings/AccountingAccessAdminPage.tsx`:

- Keep `<Navigate>` on `!isAdmin` (already there).
- **Also short-circuit `loadAll`**: bail out immediately if `!isAdmin`, so the data fetch never fires for Balveer even if a render slips through.
- Re-check `isAdmin` inside `toggle/saveRow/resetRow/revokeAll` so any stale handler is a no-op.
- Replace any `Loading…` flash before the role resolves with the same loader so the page never paints the matrix to a non-admin.

No backend RLS changes (per scope rule "Do NOT modify existing RLS").

### B. Re-shape the UI to a vertical layout

Replace the wide horizontal users × sections matrix with a **vertical per-user layout** that fits a normal screen:

```text
┌───────────────────────────────────────────────────────────┐
│ Balveer Singh — ACCOUNTANT      [Reset] [Revoke] [Save]   │
│ accounts@futurelinkconsultants.ca                         │
├───────────────────────────────────────────────────────────┤
│ Section                            View   Edit            │
│ Dashboard                           [x]    [ ]            │
│ Chart of Accounts                   [x]    [x]            │
│ Journals  (auto: COA)               [x]    [x]            │
│ AP — Bills  (auto: Vendors, COA)    [x]    [ ]            │
│ …                                                          │
└───────────────────────────────────────────────────────────┘
```

Specifics:

- One **collapsible Card per user**, stacked vertically. Admins render as a single locked card showing "Full access (locked)" — no checkboxes.
- Inside each card, a **two-column table**: `Section | View · Edit`. Sections grouped by area (Core, Transactions, Banking & Cash, Reporting, Admin) with subtle group headers, so the long list scans well.
- Dependency hint shown inline as muted text under the section name (e.g. "Auto-grants View on: COA").
- Action bar (`Reset`, `Revoke all`, `History`, `Save`) sits in the card header, sticky on scroll within the card.
- Search filter stays at the top and filters which user cards are shown.
- Removes the horizontal scroll entirely; everything fits in the 1312px viewport.

### C. Small UX cleanups

- Show role chip and last-login under the user name in each card header.
- "Save" button disabled until dirty; toast on success/failure (unchanged behaviour).
- Audit drawer (`History` button) unchanged — keep current Sheet.

## 3. Out of scope

- No changes to RLS, `BRIDGE_ENABLED`, CRM, commissions, or institutions.
- No change to the permission model, dependency resolver, or DB schema.
- After merge, the user needs to **Publish** so the live custom domain picks up the new guard + layout.

## 4. Files touched

- `src/accounting/pages/settings/AccountingAccessAdminPage.tsx` — guard hardening + full re-render as vertical per-user cards.

No other files change.
