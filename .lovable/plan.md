# Owner Profiles: 2 UI fixes

Scope: `src/accounting/pages/owners/` only. No changes to commission, CRM, institution modules. No changes to existing RLS.

## Fix 1 — Remove duplicate "Add account" button

Audit on `AccountingOwnerDetailPage.tsx` shows the only "+ Add account" controls live inside each `SectionBlock` header (Bank / Investments / Insurance / Liabilities). I'll re-inspect the rendered page (header card + KPI strip + tabs area) for any extra Add control — likely either:
- a top-right action button in the sticky header card, or
- a quick-action surfaced from `AccountingOwnersPage` row menu

…and remove the page-level one, keeping only the section-level buttons. If no extra button exists in code, I'll capture the live preview to confirm exactly which element the user is seeing before removing.

## Fix 2 — Directors & Shareholders section (BUSINESS profiles only)

### Database (new migration, additive only)

New table:
```
owner_profile_directors (
  id uuid PK default gen_random_uuid(),
  company_profile_id uuid NOT NULL references owner_profiles(id) on delete cascade,
  individual_profile_id uuid NOT NULL references owner_profiles(id) on delete cascade,
  role text NOT NULL default 'Director',  -- Director | Shareholder | Partner
  ownership_percent numeric(6,3),
  created_at timestamptz NOT NULL default now(),
  unique (company_profile_id, individual_profile_id, role)
)
```
Index on `company_profile_id`. RLS enabled with the same pattern existing `owner_profiles` uses (admin / accounting users) — no changes to RLS on `owner_profiles` itself.

### Store

New `src/accounting/stores/ownerDirectorsStore.ts`:
- `useDirectorsForCompany(companyId)` hook (useSyncExternalStore, hydrate via `runWhenAuthReady`)
- `addDirector({ companyId, individualId, role, ownershipPercent })`
- `updateDirector(id, patch)`
- `removeDirector(id)`

### UI

In `AccountingOwnerDetailPage.tsx`, when `owner.category === 'BUSINESS'`, add a new tab **Directors** (or a section above Accounts inside the Accounts tab — will pick the cleaner option after looking at current tab layout):

- Header: "Directors & shareholders" + `+ Add director` button
- Each director rendered as a card:
  - Avatar + name (linked to `/accounting/owners/{individualId}`)
  - Role badge (Director / Shareholder / Partner)
  - Ownership % (if set)
  - Inline edit / remove actions
- Empty state: "No directors linked. Add one to track ownership."

New `AddDirectorDialog.tsx`:
- Searchable `Command`/`Combobox` over personal owner profiles (`useOwners().filter(o => o.category === 'PERSONAL')`)
- Role select (Director / Shareholder / Partner)
- Ownership % input (optional, 0–100)
- Save → `addDirector(...)` → toast → close

### Files touched
- new: `supabase/migrations/<ts>_owner_profile_directors.sql`
- new: `src/accounting/stores/ownerDirectorsStore.ts`
- new: `src/accounting/components/owners/AddDirectorDialog.tsx`
- new: `src/accounting/components/owners/DirectorsSection.tsx`
- edit: `src/accounting/pages/owners/AccountingOwnerDetailPage.tsx` (remove duplicate Add account + mount DirectorsSection for BUSINESS)
- auto: `src/integrations/supabase/types.ts` (regenerated)

Approve to proceed; migration will be submitted first for your approval, then code.
