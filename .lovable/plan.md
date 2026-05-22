# Match Accounting → Clients service filter to the lead form

## Problem

The Accounting → Clients page has one generic "All services" dropdown that mixes every catalogue entry into a flat list. The lead form (`/leads/new` → step 4 "Services Required") groups services into **5 tabs**, each with its own list:

1. Coaching
2. Visa & Immigration
3. Admission
4. Allied
5. Travel & Financial

The user wants the accounting filter to mirror this — five dropdowns, one per category, each listing only that category's services.

## Mapping discovered

| Lead-form tab | `clients` column (array) | `service_catalogue.master_key` |
|---|---|---|
| Coaching | `coaching_services` | `coaching_services` |
| Visa & Immigration | `visa_services` | `visa_immigration` |
| Admission | `admission_services` | `admission_services` |
| Allied | `allied_services` | `allied_services` |
| Travel & Financial | `travel_financial_services` | `travel_financial` |

(The previous trigger used the wrong master_key `visa_services` instead of `visa_immigration`, which is why the current single dropdown is half-empty for visa services.)

## Changes — frontend only

**File:** `src/accounting/pages/clients/AccountingClientsPage.tsx`

1. Replace the single `servicePackage` filter state + dropdown with five states:
   `coachingFilter`, `visaServiceFilter`, `admissionFilter`, `alliedFilter`, `travelFilter` (all default `"ALL"`).

2. In the existing `service_catalogue` fetch, keep `master_key` and bucket the rows into five option lists by the mapping above.

3. Also fetch the linked CRM `clients` rows once (id + the five service arrays) for any accounting client with `linkedCrmClientId`, keyed by id. This gives accurate per-client service membership (the flat `service_package` string is lossy).

4. Filter logic — a row passes a category filter when:
   - the filter is `"ALL"`, **or**
   - the linked CRM client's corresponding array `includes()` the selected service name, **or** (fallback for non-CRM clients) the existing `service_package` string contains the selected name.

5. Render five compact `Select` dropdowns in the filter bar in place of the single "All services" select, labelled: Coaching, Visa & Immigration, Admission, Allied, Travel & Financial.

6. **Do not touch** Country, Type, Counselor, Visa, Intake, Payment, Status filters, the table columns, dialogs, or the store. The existing `Visa` filter (matches `visaCategory`) stays as-is per the user's instruction.

## Out of scope

- No DB migration, no trigger change, no table column change.
- The trigger's `service_package` summary string stays as is; the new filter reads the source arrays directly for correctness.
- No UI restructure beyond swapping one dropdown for five.

## Verification

- All 5 dropdowns populate from `service_catalogue` (counts match the lead form: 28 coaching, 37 visa, 13 admission, 10 allied, 10 travel).
- Picking e.g. Visa & Immigration → "Canada — Student Visa (Study Permit)" reduces the table to clients who actually selected that service in the lead form.
- Selecting `ALL` in every dropdown shows all 56 rows.
- Other filters continue to work unchanged.
