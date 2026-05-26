# Flow: Clients CRM

## Entry
`/clients/:id` → `ClientDetail.tsx`. Tabs: Overview, Documents, Services, Invoices, Tasks, Timeline, Chat, Notes, Family, Education, Portal.

## Data fan-out on load
`ClientDetail` reads from: `clients`, `client_profile`, `client_education`, `client_family_members`, `case_people`, `client_tasks`, `client_timeline`, `client_documents`, `client_invoices`, `client_invoice_payments`, `client_invoice_receipts`, `client_services` (if present), `client_offers`, `client_appointments`, `client_notifications`, `chat_channels`.

## Autosave
Most field-level edits use a debounced `supabase.update(...).eq('id', clientId)`. Permission is enforced by RLS via `can_edit_client`. If the user lacks edit perm, the update silently fails — UI shows a toast on error.

## Side effects on client mutation
- Status change → `fn_log_status_change` + `fn_notify_client_status_change` + `fn_sync_accounting_client`.
- Insert → `set_client_owner_defaults`, `ensure_applicant_for_client`.
- Any update → `fn_recalc_lead_score`.

## Realtime
`client_timeline` and `client_notifications` are subscribed via `supabase.channel(...)` filtered by `client_id`.

## Sharing
- `client_access` grants per-user/team with permission level.
- `/team-access` page = UI for `default_team_members` (owner-wide share).
- Public share via `share-resolve` edge function + token-based RLS.

See `06-flows/invoices-payments-receipts.md` for the financial slice.