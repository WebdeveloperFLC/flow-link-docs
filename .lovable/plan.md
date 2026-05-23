## Problem

On `/clients/new` (and `/clients/new?lead_id=…`), the only header actions are "Cancel" and a passive "Saving…" indicator. Saving relies on `onBlur` autosave after first/last name are filled. When users click "Create Draft Invoice" before any blur-triggered save has succeeded, they hit the `Save the client first` toast and have no obvious way to save manually. The lead form (`LeadNew.tsx`) has a "Save & View" button — the client form should have an equivalent.

## Fix

Edit only `src/pages/clients/ClientNew.tsx`:

1. **Add a `Save Client` button** in the `PageHeader` actions, next to Cancel.
   - Disabled when `saving` is true or when `first_name`/`last_name` are empty (with a tooltip/title explaining why).
   - On click: runs the existing `autosave()` and, if a new client, shows the success toast already produced by autosave. Stays on the page (does not navigate) so the user can continue to add education, services, and create the invoice.
   - Label switches to `Save Changes` when `clientId` already exists.

2. **Surface a small inline hint** under the header when `!clientId && (!first_name || !last_name)`:  
   `Enter first and last name, then click Save Client to begin.`  
   Replaces the silent autosave-skip behavior that confuses users.

3. **No backend / RLS / schema changes.** The existing `upsertClientRegistration` path already works (per previous fix). This is a pure UX addition so the user always has a manual save path and clearer feedback.

## Out of scope

- No changes to `clientRegistration.ts`, RLS, or the lead form.
- No change to the invoice-creation flow — `handleCreateInvoice` already calls `upsertClientRegistration` before posting the invoice.
