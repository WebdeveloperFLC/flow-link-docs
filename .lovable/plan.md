## Goal

Restrict Service Library to a fixed allow-list of countries (the ~35 listed) and purge any existing records for other countries.

## Allow-list (single source of truth)

Use the existing `REGIONS` list in `src/lib/regions.ts` (already contains exactly these countries across Europe, North America, Oceania, Middle East, Asia) plus the Turkey entry. Expose a helper `ALLOWED_SERVICE_LIBRARY_COUNTRIES` derived from `REGIONS.flatMap(r => r.countries)`.

Final allow-list: United Kingdom, Germany, Ireland, France, Italy, Spain, Netherlands, Sweden, Switzerland, Austria, Poland, Malta, Cyprus, Portugal, Finland, Denmark, Norway, Hungary, Lithuania, Latvia, Estonia, Georgia, Russia, Romania, Serbia, Turkey, Canada, United States, Australia, New Zealand, United Arab Emirates, Singapore, Malaysia, Japan, South Korea, Uzbekistan, Kazakhstan, Kyrgyzstan, Philippines, China.

## Changes

### 1. `src/pages/ServiceLibraryAdmin.tsx`
- Import `REGIONS` from `@/lib/regions` and build `ALLOWED_COUNTRIES` set.
- **Country dropdown in EditDialog**: filter the country options to only those in `ALLOWED_COUNTRIES` (intersect with master `countries`).
- **`syncFromCatalogue`**:
  - Filter catalogue items so only those whose `country_tag` is in `ALLOWED_COUNTRIES` are considered.
  - When falling back to `masterCountries`, also intersect with `ALLOWED_COUNTRIES`.
  - Before inserting, add a "Delete disallowed" pass: `DELETE FROM service_library WHERE country NOT IN (allow-list)` via `supabase.from("service_library").delete().not("country", "in", "(...)")`.
  - Update toast to report deleted + created counts.
- **Country filter dropdown** at the top of the admin list: also restricted to allow-list (existing rows outside it are deleted by the sync, so this stays consistent).

### 2. `src/pages/ServiceLibrary.tsx` (read-only page)
- Apply the same `ALLOWED_COUNTRIES` filter to the country facet/filter so even stale data can't show non-allowed countries until the next sync.

### 3. No database migration
- Deletion is a data operation done through the existing client (admin role gated by RLS `can_manage_service_library`). No schema change.
- Fee items and attachments cascade via existing FKs (verify in current migration; if not cascading, the delete call will explicitly delete child rows first in a small helper).

## Out of scope
- No changes to the lead form catalogue itself.
- No changes to master `countries` list (other modules still use the full list).

## Acceptance
- After clicking "Sync from lead form", Service Library contains rows only for the allow-listed countries.
- Admin "Add entry" country dropdown shows only allow-listed countries.
- Re-running sync never re-introduces other countries.
