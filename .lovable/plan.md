## Goal
Replace the `application_types` master_items source for the "Application type" dropdown in the existing CRM client form with `service_catalogue` rows where `master_key = 'visa_immigration'`, grouped by `country_tag`.

## Scope
- **One file edited**: `src/components/clients/NewClientDialog.tsx` (this is the only client form in `src/components/clients/`; no separate edit dialog exists — `ClientDetail.tsx` only displays the value).
- No DB changes. No changes to `/clients` list, `ClientDetail`, leads, accounting, or any other module.
- Historical `clients.application_type` text values remain untouched and continue to render as-is on the list and detail pages.

## Changes in NewClientDialog.tsx

1. Remove the `APPLICATION_TYPES = useMasterLabels("application_types")` lookup.
2. Add a new fetch on dialog open:
   ```ts
   supabase
     .from("service_catalogue")
     .select("service_code, service_name, country_tag, display_order")
     .eq("master_key", "visa_immigration")
     .eq("is_active", true)
     .order("country_tag", { ascending: true })
     .order("display_order", { ascending: true });
   ```
   Store in `visaServices` state.
3. Group rows by `country_tag` (fallback "Other" for null) into an ordered map.
4. Replace the Application type `<Select>` content with `<SelectGroup>` blocks — one per country_tag — using `<SelectLabel>` for the country header (UPPERCASE) and `<SelectItem value={service_code}>{service_name}</SelectItem>` for each row.
5. Keep the field:
   - label: "Application type *"
   - single-select
   - state var `appType` (stores `service_code`)
   - same zod validation (`application_type: z.string().min(1)`)
   - passed unchanged to `create_client` RPC as `_application_type`.
6. Import `SelectGroup`, `SelectLabel` from `@/components/ui/select`.

## Out of scope
- Workflow template matching still uses `country` only (unchanged).
- No backfill or migration of existing `application_type` values.
- No edits to the list column display logic — old text values render as stored.

## Verification
- Open New Client dialog → Application type opens grouped by country (CANADA, UNITED KINGDOM, …) showing service names.
- Selecting "Canada — Student Visa" creates a client whose `application_type` equals the service_code (e.g. `VISA-CA-STUDENT`).
- `/clients` list still renders the column for both new and legacy rows.
- No regressions in other dropdowns (Country, Gender, Workflow template).
