# Stage 2 — Provider-agnostic telephony layer + TeleCMI integration

Stage 1 (DB) is already live. This stage adds the server-side calling plumbing. No user-facing UI yet — that comes in Stage 3.

## Secrets to add now

- `TELECMI_APP_ID`
- `TELECMI_SECRET`
- `TELECMI_FROM_NUMBER`

`TELECMI_WEBHOOK_SECRET` will be added later. The webhook handler will log a warning and process events anyway when it's missing, then auto-enable signature verification once you add it. No code change required at that point.

## Provider-agnostic adapter layer

```
src/lib/telephony/
  types.ts        # TelephonyProvider interface, CallRequest, CallResult, NormalizedEvent
  client.ts       # Browser-side helpers — only call edge functions, never provider APIs

supabase/functions/_shared/telephony/
  types.ts        # Same interface, server-side
  telecmi.ts     # TeleCMI implementation (click-to-call, mask config, webhook normalize + verify)
  provider.ts     # getProvider(name) factory — defaults to 'telecmi'
```

The four edge functions all call `getProvider()`. Swapping vendor later means adding one new file in `_shared/telephony/` and changing one env var — no CRM table or UI changes.

## Edge functions

1. **telephony-click-to-call** (JWT verified)
   - Validates caller can edit the client (`can_edit_client`).
   - Auto-creates `telephony_agents` row for caller if missing (role inferred from CRM role).
   - Creates `call_sessions` row with `status='initiated'`, `masked_number_used=TELECMI_FROM_NUMBER`.
   - Calls TeleCMI click-to-call API; on success updates session with `telecmi_call_id` and `status='ringing'`.
   - Writes `telephony_audit_logs` entry `call_started`.

2. **telephony-webhook** (`verify_jwt = false` — public endpoint)
   - Verifies HMAC signature when `TELECMI_WEBHOOK_SECRET` set; logs warning and continues otherwise.
   - Normalizes payload via provider adapter.
   - Idempotent insert into `call_events` keyed on `(provider, provider_event_id)`.
   - Updates `call_sessions` (`status`, `start_time`, `end_time`, `duration_seconds`, `recording_url`) keyed on `telecmi_call_id`.
   - Writes audit log on terminal events (`call_ended`).

3. **telephony-recording-url** (JWT verified)
   - Validates caller can read the session (admin / agent / client viewer).
   - Returns short-lived signed URL (10 min) for the recording.
   - Writes audit log `recording_accessed`.

4. **telephony-queue-next** (JWT verified)
   - Atomic claim of next eligible queue item using `SELECT … FOR UPDATE SKIP LOCKED` inside a SECURITY DEFINER RPC.
   - Filters: `status='queued'` OR (`status='callback'` AND `next_call_at <= now()`), priority desc, oldest first.
   - Sets `assigned_agent_id` + `status='calling'`, `last_called_at=now()`.
   - Includes a 10-minute auto-recovery sweep that resets stale `calling` items back to `queued` (handles lost webhooks so agents never get stuck).

`supabase/config.toml` will get one new block: `[functions.telephony-webhook]` with `verify_jwt = false`.

## Database additions (small, in same stage)

Two helpers needed by the queue-next function and the recording-url permission check:

```sql
-- Atomic queue claim
CREATE OR REPLACE FUNCTION public.claim_next_queue_item(_agent_id uuid, _campaign_id uuid)
RETURNS public.call_queue_items
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ ... $$;

-- Stale-call recovery
CREATE OR REPLACE FUNCTION public.recover_stale_calling_items()
RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  WITH stale AS (
    UPDATE public.call_queue_items
       SET status='queued', assigned_agent_id=NULL
     WHERE status='calling' AND last_called_at < now() - interval '10 minutes'
    RETURNING 1
  ) SELECT count(*)::int FROM stale;
$$;
```

## What's NOT in this stage

- No UI changes (Stage 3 = counselor dial button, Stage 4 = telecaller queue screen).
- No changes to existing CRM tables or pages.
- No changes to existing edge functions.
- No reporting view (Stage 7).

## Risks / notes

1. Webhook signature is the only security gap until you add `TELECMI_WEBHOOK_SECRET`. The endpoint URL is unguessable but not secret. Acceptable for testing; please add the secret before going to production traffic.
2. TeleCMI's click-to-call API shape varies across plans. I'll implement against their **standard PIOPIY click-to-call** spec (`POST https://rest.telecmi.com/v2/ind_pcmo_make_call`). If your account uses a different endpoint, one line changes in `telecmi.ts`.
3. After Stage 2 ships, you'll need to **paste the webhook URL into TeleCMI dashboard**. I'll print the URL in the deploy summary.

## Next step after approval

I'll add the 3 secrets, then ship Stage 2 (1 small migration + adapter layer + 4 edge functions + config.toml block) and stop for review before Stage 3.
