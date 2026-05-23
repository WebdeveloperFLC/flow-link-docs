## Problem

On `/clients/:id` (the client detail page) there is currently no way to view or change which services a client has signed up for — services can only be set during registration in `ClientNew`. Additionally, inside the `ServiceTabs` picker, a selected service only changes the checkbox state; the row itself doesn't visually stand out, so it's hard to scan what's already chosen.

## Scope

Frontend only. No schema changes, no migrations, no edits to invoicing, accounting, or registration flow.

## Changes

### 1. New `ClientServicesCard` on the client detail page

Add a card on `/clients/:id` that:

- Loads the client's current service selections from the `clients` row: `coaching_services`, `visa_services`, `admission_services`, `allied_services`, `travel_financial_services`.
- Shows them grouped by category as pills (service name resolved from `service_catalogue`). Empty categories say "None selected".
- Has an **Edit services** button (gated by the same `canUpload` / owner check already used by other edit affordances on the page).
- Edit opens a dialog containing the existing `ServiceTabs` component with the current selection prefilled.
- **Save** writes the five service arrays back to the `clients` row (single `update().eq("id", clientId)`), refreshes the card, logs a `client_timeline` event (`services_updated` with a short diff summary), and toasts success.
- **Cancel** discards changes.

Placement: above `ClientPaymentsCard` in the left column of `ClientDetail.tsx`, so services and payments sit next to each other.

### 2. Fix selected-row highlight in `ServiceTabs`

In `src/components/leads/ServiceTabs.tsx`:

- The row `<label>` currently only uses `hover:bg-muted/30`. When `checked` is true, apply a clearly distinct treatment using semantic tokens: subtle accent background, primary-tinted left border, and slightly bolder label. Example: `bg-primary/5 border-l-2 border-primary` when checked, transparent left border otherwise (so layout doesn't shift).
- Keep all colors as semantic tokens (`primary`, `accent`, `muted`) — no raw hex/Tailwind palette colors.
- No behavior change; purely visual. This improves both the existing `ClientNew` registration flow and the new edit dialog.

### 3. Files touched

- **New:** `src/components/clients/ClientServicesCard.tsx` — card + edit dialog wrapper around `ServiceTabs`.
- **Edit:** `src/pages/ClientDetail.tsx` — import and render `ClientServicesCard` above `ClientPaymentsCard`; extend the local `Client` type to include the five service-array fields and include them in the select query.
- **Edit:** `src/components/leads/ServiceTabs.tsx` — add `checked` styling to the row `<label>`.

### Out of scope

- Fee editing per service (registration flow remains the source of truth for fees; this card only edits which services are attached).
- Changing `application_type` (the "Student Visa" string in the page header) — that's a separate registration field and not what this card edits.
- Family-member service edits — only the primary client's services here.
- Auto-creating invoices or touching `service_fees` JSON.
