## Country & Entity Access Scoping — Accounting Module

Extends the existing `accounting_section_permissions` system with two new layers (country + entity) without touching CRM, commissions, institutions, personal wealth, or any data-table RLS.

---

### 1. Database

**Migration:** `add_accounting_user_entity_scope`

New table `public.accounting_user_entity_scope`:

```
id                   uuid PK default gen_random_uuid()
accounting_user_id   uuid NOT NULL REFERENCES accounting_users(id) ON DELETE CASCADE
scope_type           text NOT NULL CHECK (scope_type IN ('country','entity'))
country_code         text          -- 'IN' | 'CA' when scope_type='country'
entity_id            uuid REFERENCES accounting_entities(id) ON DELETE CASCADE
can_view             bool DEFAULT true
can_edit             bool DEFAULT false
created_at           timestamptz DEFAULT now()
UNIQUE (accounting_user_id, scope_type, country_code, entity_id)
```

Additional CHECK: `(scope_type='country' AND country_code IS NOT NULL AND entity_id IS NULL) OR (scope_type='entity' AND entity_id IS NOT NULL AND country_code IS NULL)`.

Index on `accounting_user_id`.

**RLS** (enabled):
- SELECT — `public.is_accounting_user(auth.uid())`
- INSERT/UPDATE/DELETE — `public.is_accounting_admin(auth.uid())`

**Seed (insert tool, after migration approved):**
- Insert one row for Balveer (`accounts@futurelinkconsultants.ca`): `scope_type='country', country_code='IN', can_view=true, can_edit=true`.
- Santosh (`SUPER_ADMIN`) gets no rows → unrestricted.

No changes to existing tables, no changes to data-table RLS. Enforcement in Phase 1 is frontend-only as requested.

---

### 2. Resolution Rules (implemented in hook)

For a given user, after loading their scope rows:

1. **No rows** → full view + edit on every entity.
2. **Country rows only** → entities are allowed iff their `country` ∈ user's allowed country codes. `can_edit` inherited per country.
3. **Entity rows override country rows** for that specific entity (whether to expand or restrict).
4. View=false on an entity hides it entirely; Edit=false makes it read-only.
5. Admin roles (`SUPER_ADMIN`, `FINANCE_ADMIN`) bypass — always full access regardless of rows.

---

### 3. Admin UI — `/accounting/access`

Inside each user's expanded card (file: `src/accounting/pages/settings/AccountingAccessAdminPage.tsx`), add a new **Data Access** panel below the existing section-permissions grid.

Layout:
- Radio: ● Full access (default when no rows) / ○ Restricted.
- When Restricted: entities grouped by country (`IN 🇮🇳`, `CA 🇨🇦`) from `accountingEntitiesStore`.
- Per country header row: `[View] [Edit]` country-level toggles + label "Country level (all <country>)".
- Indented per-entity rows beneath each country: `[View] [Edit]` for each.
- Toggling country View/Edit ON cascades to all child entities (sets entity rows to match) — user can then uncheck individual entities to carve out exceptions.
- `Edit` checkbox disabled when `View` is unchecked.
- Buttons: **Save changes** (upserts/deletes rows for this user) and **Reset to full access** (deletes all rows for this user).
- For `SUPER_ADMIN` / `FINANCE_ADMIN` users: panel is locked, shows shield icon + "Full data access (locked)" — matches existing section-permissions admin-lock styling.

Save strategy: replace-all per user — delete existing rows for the user, then insert the new set in one transaction-like sequence (delete + bulk insert).

---

### 4. Frontend Enforcement

**New file:** `src/accounting/hooks/useEntityScope.ts`

```
useEntityScope() returns {
  loading,
  isUnrestricted,           // true for admins or no rows
  allowedEntityIds,         // string[] | null  (null = all)
  canViewEntity(entityId),  // boolean
  canEditEntity(entityId),  // boolean
  canViewCountry(country),  // boolean
}
```

Loads `accounting_user_entity_scope` rows for current `auth.uid()` mapped through `accounting_users.auth_user_id`, joins with `accountingEntitiesStore` to resolve country→entity sets, applies Rules 1–5, memoizes.

**Applied to (entity-selection + list filtering only — no data-table RLS changes):**

| Page | Treatment |
|---|---|
| `/accounting/journals` | Entity dropdown filtered; journal list filtered; create/edit buttons hidden when `!canEdit`. |
| `/accounting/coa` | Entity filter dropdown filtered; account list filtered; New/Edit/Toggle disabled when `!canEdit`. |
| `/accounting/reports/trial-balance` | Entity dropdown filtered. |
| `/accounting/reports/general-ledger` | Entity dropdown filtered. |
| `/accounting/reports/pl` | Entity dropdown filtered. |
| `/accounting/reports/bs` | Entity dropdown filtered. |
| `/accounting/reports/reconciliation` | Entity scope filtered. |
| `/accounting/reports/consolidated` | Entity checkbox list filtered. |
| `/accounting/ap` | Entity filter + bill list filtered; add/edit hidden when `!canEdit`. |
| `/accounting/ar` | Entity filter + invoice list filtered; add/edit hidden when `!canEdit`. |
| `/accounting/bank-accounts` | Entity filter + account list filtered; add/edit hidden when `!canEdit`. |

When an entity row is shown but `canEditEntity=false`, a small "Read-only" badge replaces edit affordances.

---

### 5. Out of Scope (untouched)

- Commission module, CRM/Clients/Leads, Institutions/Programs, Personal Wealth.
- `BRIDGE_ENABLED` flags.
- Existing RLS on accounting data tables (`accounting_journals`, `accounting_coa`, `accounting_bills`, etc.) — Phase 1 is frontend-only enforcement, as specified.
- Existing section-permissions system (`accounting_section_permissions`).

---

### 6. Verification Checklist

1. Migration applied; table + RLS visible.
2. `/accounting/access` shows Data Access panel for both users; Santosh locked.
3. Balveer seeded with `country=IN, view+edit`.
4. Sign in as Balveer → COA entity dropdown shows only India entities; Canadian entities hidden across all listed pages.
5. Sign in as Santosh → all 14 entities visible.
6. Existing section permission toggles unchanged in behaviour.

### 7. Noticed Outside Scope (flagging only — no action)

- Phase 1 enforces scope on the client only. A user who calls Supabase directly could still read other entities' rows. A Phase 2 follow-up to enforce this in RLS (via a security-definer `entity_allowed(uid, entity_id)` function applied to `accounting_*` tables) is the right next step but is explicitly excluded here.
- `accounting_entities.country` is the source of truth for grouping — confirmed populated for all 14 rows (11 IN, 3 CA).
