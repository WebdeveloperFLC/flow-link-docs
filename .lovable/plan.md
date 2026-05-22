# Fix Accounting → Clients filters

## Problem

On `/accounting/clients` every filter shows nothing or doesn't match the data:

- **Service / Visa / Counselor / Intake** dropdowns are empty — `SERVICE_PACKAGES`, `VISA_CATEGORIES`, `INTAKES`, `MOCK_STAFF` in `src/accounting/data/mockStaff.ts` are all `[]`.
- **Country** is hard-coded to `CA / US / IN / GB`, but CRM clients store labels like "India", "United Kingdom".
- **Type** filter (Student/Immigration/…) and the `service_package / visa_category / intake / counselor_id` columns are all `—` because the `fn_sync_accounting_client` trigger only copies `name / email / phone / country` — it never pulls the lead-form fields that already exist on `public.clients` (`intake`, `visa_services`, `coaching_services`, `admission_services`, `allied_services`, `assigned_counselor_id`, `interested_countries`, `application_type`, `lead_source`).

Net effect: filtering produces zero matches because the rows have no value to match on, and the dropdowns have no options.

## Fix

### 1. Sync lead-form fields into `accounting_clients`

New migration: rewrite `fn_sync_accounting_client()` so on insert/update of `public.clients` it also writes:

| accounting_clients      | source on `clients`                                                                 |
|-------------------------|--------------------------------------------------------------------------------------|
| `intake`                | `clients.intake`                                                                     |
| `visa_category`         | first non-null of `visa_services[1]`, else `application_type`                        |
| `service_package`       | concat of `coaching_services ‖ admission_services ‖ allied_services ‖ visa_services` (comma-joined service names, truncated) |
| `counselor_id`          | `clients.assigned_counselor_id::text`                                                |
| `counselor_name`        | resolved from `profiles.full_name` for that counselor                                |
| `lead_source`           | `clients.lead_source`                                                                |
| `client_type`           | map from `application_type` ("Student Visa" → STUDENT, "Work Permit" → IMMIGRATION, "Dependent" → DEPENDENT, …); default STUDENT |
| `country`               | `clients.country_of_residence` or `country` (keep the human label, not 2-letter code) |
| `currency`              | derive from country label ("India" → INR, "Canada" → CAD, etc.)                      |

Trigger fires on `AFTER INSERT OR UPDATE` and uses the same `ON CONFLICT (linked_crm_client_id)` upsert.

Backfill: run the same mapping over existing rows so the 56 already-synced clients get populated.

### 2. Source filter options dynamically

In `src/accounting/pages/clients/AccountingClientsPage.tsx`:

- **Country**: build from `useMasterLabels("countries")` plus a union of values seen in `clients` rows (so legacy values still match).
- **Service package**: load active rows from `service_catalogue` (already used by lead form via `src/lib/leads.ts`); group by `master_key` so the dropdown shows real service names.
- **Visa**: filter `service_catalogue` where `master_key = 'visa_services'`.
- **Counselor**: load `profiles (id, full_name)` (same source the lead form uses for `assigned_counselor_id`).
- **Intake**: distinct non-null values from the current `clients` list (intakes are free-text on the lead form).
- **Type**: keep `CLIENT_TYPE_LABEL` (already correct enum).
- **Payment / Status**: unchanged.

Filter matching uses `includes` for the service_package column (which is a comma-joined string) so picking "IELTS Coaching" still matches "IELTS Coaching, SDS Visa".

Delete the now-unused `SERVICE_PACKAGES / VISA_CATEGORIES / INTAKES / MOCK_STAFF` constants (or leave the file as an empty re-export to avoid breaking other imports — `rg` first).

### 3. No UI restructure

Only the filter bar logic and the trigger change. Table columns, badges, dialogs, and `clientsStore` stay as-is. The CRM↔Accounting bridge already works; this PR just makes the joined data visible and filterable.

## Files

- New migration: `supabase/migrations/<ts>_sync_lead_fields_to_accounting_clients.sql` — rewrite trigger fn + backfill UPDATE.
- Edit `src/accounting/pages/clients/AccountingClientsPage.tsx` — dynamic filter options + service_package substring match.
- New helper `src/accounting/lib/clientFilterOptions.ts` — small hooks: `useCounselorOptions()`, `useServiceOptions()`, `useVisaOptions()`, `useCountryOptions(clients)`, `useIntakeOptions(clients)`.
- Possibly remove constants in `src/accounting/data/mockStaff.ts` after confirming no other imports depend on them.

## Verification

1. Migration runs, then `SELECT count(*) FROM accounting_clients WHERE intake IS NOT NULL OR visa_category IS NOT NULL` > 0.
2. On `/accounting/clients`, each dropdown lists real options.
3. Picking "Student" type, an existing counselor, or "Jan 2026" intake reduces the row count instead of zeroing it.
4. Creating a new CRM client with intake/visa/services immediately shows those values on the accounting row.
