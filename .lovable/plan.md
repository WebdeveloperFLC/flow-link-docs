## Goal

Connect TeleCMI to the system by securely storing your API credentials and exposing a webhook endpoint URL you can paste into the TeleCMI dashboard. No call UI yet — this lays the foundation so we can later add call history (auto-matched by phone with manual fallback) and click-to-call.

## What you'll see after this is done

In **Settings**, a new card "TeleCMI (Cloud Telephony)" with:
- Status: Connected / Not connected
- Fields: App ID, App Secret (write-only, masked), Webhook auth token (auto-generated, copy button)
- A read-only **Webhook URL** to paste into the TeleCMI dashboard:
  `https://auofttkyosgjhxcbhscw.supabase.co/functions/v1/telecmi-webhook?token=<auth-token>`
- "Test connection" button (calls TeleCMI API to verify credentials)
- Last received-event timestamp + last sync status

Nothing changes for non-admin users; the card is admin-only.

## Scope of this step

In scope:
1. Save TeleCMI App ID + App Secret as backend secrets (server-only).
2. Store non-secret config (enabled flag, webhook auth token, last-event timestamp) in the existing `integration_settings` table under `key = 'telecmi'`.
3. Build a public webhook edge function `telecmi-webhook` that:
   - Validates the `?token=` query against the stored auth token.
   - Accepts both GET and POST (TeleCMI supports either).
   - Logs every received payload into a new `call_events` table for now (raw JSON kept). Auto-matching to clients comes in the next step.
   - Updates `integration_settings.last_sync_at` / `last_sync_status`.
4. Build a `telecmi-test` edge function that uses the stored secrets to hit a TeleCMI API endpoint and confirm the credentials work; surfaced via the "Test connection" button.
5. Settings UI card (admin-only) to enable/disable, save config, copy webhook URL, and run the test.

Out of scope (next step, to be planned separately):
- Showing calls on the client profile.
- Click-to-call button.
- Phone-number → client auto-matching + manual attach inbox.

## Technical details

### Secrets to add (via secret tool, you'll be prompted)
- `TELECMI_APP_ID`
- `TELECMI_APP_SECRET`

I'll request these via the secret prompt only after you approve this plan.

### Database (one migration)
New table `call_events` (raw inbox of every TeleCMI webhook hit; client linkage added later):
- `id uuid pk`, `received_at timestamptz`, `event_type text` (cdr / live), `direction text`, `from_number text`, `to_number text`, `duration_seconds int`, `recording_url text`, `call_id text`, `status text`, `raw jsonb`, `client_id uuid null`, `matched_at timestamptz null`
- RLS: select for authenticated; insert only via service role (edge function); update for admin/counselor/documentation (so we can attach to client later).

No changes to `integration_settings` schema — it already has `key`, `enabled`, `config jsonb`, `last_sync_at`, `last_sync_status`, `last_sync_message`. We'll store `{ webhook_token, app_id_last4 }` in `config`.

### Edge functions
- `supabase/functions/telecmi-webhook/index.ts` — `verify_jwt = false`, validates `?token` against `integration_settings.config->>webhook_token`, normalizes payload, inserts into `call_events`, updates last-sync fields. Returns 200 quickly.
- `supabase/functions/telecmi-test/index.ts` — `verify_jwt = true`, admin only. Reads `TELECMI_APP_ID` / `TELECMI_APP_SECRET`, calls a TeleCMI authenticated endpoint (e.g. account/call-list) and returns ok/fail with message.

`supabase/config.toml` gets one new block: `[functions.telecmi-webhook] verify_jwt = false`.

### Frontend
- New `src/components/settings/TelecmiIntegrationCard.tsx` modeled after the existing `OdooIntegrationCard`.
- Mounted in `src/pages/Settings.tsx` (admin-only, same pattern as Odoo).
- "Generate webhook token" creates a random 32-char token, saves it to `integration_settings.config.webhook_token`, then displays the assembled webhook URL with copy button.

### Files to add / edit
- add: `supabase/migrations/<ts>_call_events.sql`
- add: `supabase/functions/telecmi-webhook/index.ts`
- add: `supabase/functions/telecmi-test/index.ts`
- edit: `supabase/config.toml` (add telecmi-webhook function block)
- add: `src/components/settings/TelecmiIntegrationCard.tsx`
- edit: `src/pages/Settings.tsx`

## After approval

1. I'll prompt you to paste `TELECMI_APP_ID` and `TELECMI_APP_SECRET`.
2. Run the migration, deploy the two edge functions, ship the Settings card.
3. You copy the webhook URL from Settings into the TeleCMI dashboard, click "Test connection", and we confirm green.
4. Then we plan step 2: showing/attaching calls on client profiles.
