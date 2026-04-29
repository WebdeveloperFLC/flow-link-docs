## Goal
Diagnose the `errors=1` from the last Odoo sync, fix it, and clarify the API-keys section in the UI so it's not confusing.

## Step 1 — Diagnose the sync error (read-only)
- Read recent logs from the `odoo-sync` edge function to capture the exact error message from the last run.
- Run `Test connection` programmatically against `odoo-sync` with `action: "test"` to confirm whether the failure is at the credential layer (XML-RPC `authenticate`) or later in the data mapping.
- If credentials fail: confirm with the user which of `ODOO_URL`, `ODOO_DB`, `ODOO_LOGIN`, `ODOO_API_KEY` needs updating, then update via the secrets tool.
- If credentials succeed: the error is in `sync_all` mapping (likely a missing field on `crm.lead`, a permission issue on `res.partner`, or an empty result set being treated as an error). Patch `supabase/functions/odoo-sync/index.ts` to:
  - Treat empty result sets as `ok` (not an error).
  - Wrap each lead in try/catch so one bad record doesn't fail the batch — record per-record errors in a count and surface them in `last_sync_message`.
  - Log the failing `lead_id` + Odoo field name in `last_sync_message` so future failures are self-explanatory.

## Step 2 — Improve sync status UX
- In `OdooIntegrationCard.tsx`, when `last_sync_status === "error"` and `errors > 0`, render the message in a red-tinted block with a "View details" expander that shows the full `last_sync_message`.
- Add a small "Last error" timestamp separate from "Last successful sync" so a single bad run doesn't hide that earlier syncs worked.

## Step 3 — Clarify the "API keys" section so it stops being confusing
The bottom card today looks like it's part of the Odoo sync, but it's the *inbound* API (Odoo → Fovel). Two changes in `src/pages/Settings.tsx`:
- Rename the card header from "API keys" to **"Inbound API access (optional)"** with a one-line subtitle: *"Only needed if Odoo, Zapier, or another system needs to read data from Fovel. The two-way CRM sync above does NOT require a key here."*
- Move the `Odoo CRM endpoint` card to sit *inside* the API keys card (they're the same feature) and visually separate it from the top "Odoo CRM sync" card with a heading divider labeled **"Outbound vs. inbound integrations"**.

## Step 4 — Verify
- Click `Test connection` and `Sync now` from the UI; confirm `errors=0` and a non-zero pull/push count if there are leads in Odoo.
- Confirm the API keys card now reads clearly as optional/inbound.

## Files to touch
- `supabase/functions/odoo-sync/index.ts` — error handling, per-record try/catch, better `last_sync_message`.
- `src/components/settings/OdooIntegrationCard.tsx` — error display, last-error vs. last-success.
- `src/pages/Settings.tsx` — rename + reorganize the inbound-API card.

## What I will *not* do
- Will not generate an API key for you — that section stays empty unless you explicitly need outside systems to call Fovel.
- Will not change the sync mode, interval, or auto-on-open settings you've already chosen.