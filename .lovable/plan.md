# TeleCMI Calling Module — Implementation Plan

This is a large, multi-phase build. To stay safe and additive, I'll split it into independently shippable stages. Each stage is a separate migration + code drop you can review before the next one starts.

> Note: a `call_events` table already exists in the DB (used by an older webhook intake). The new schema needs a `session_id` linkage. I'll **extend** it additively (new nullable columns + new policies) rather than recreate it, so existing rows and policies keep working. I'll flag this before applying.

## Stage 1 — Database & RLS (additive only)

New tables:
- `telephony_agents` — one row per CRM user opting into telephony. Admins manage role; users see only their own row.
- `call_campaigns` — telecaller campaigns (admin-managed; assigned team can view).
- `call_queue_items` — queue rows. Partial unique index on `(client_id) WHERE status IN ('queued','calling','callback')` to prevent duplicate active items. Partial unique on `(assigned_agent_id) WHERE status='calling'` to enforce one active call per agent.
- `call_sessions` — every call (ongoing + completed). Indexes on `client_id`, `agent_id`, `created_at`, `telecmi_call_id`.
- `telephony_audit_logs` — start/end/disposition/callback/recording-access events (separate from generic `activity_logs` to keep call audit queryable).

`call_events` extension:
- Add nullable `session_id uuid`, `provider text default 'telecmi'`, `event_payload jsonb` (alias of existing `raw` via view? — no, just add new column and dual-write from new webhook).
- Keep existing policies intact; add new policies that allow team read when `session_id` is set and the user can view the linked client.

Helper functions (SECURITY DEFINER, search_path=public):
- `is_telephony_admin(uid)`
- `can_access_call_session(uid, session_id)` — admin OR session.agent_id=uid OR `can_view_client(uid, session.client_id)`
- `can_access_queue_item(uid, item_id)` — admin OR item.assigned_agent_id matches user's agent OR `can_view_client(...)`

RLS summary (plain English):
- Telephony agents: own row read; admin full.
- Campaigns: read by admin + members of assigned team; write admin only.
- Queue items: telecallers see only items assigned to their agent; counselors see items for clients they can view; admins all.
- Call sessions: agent on the call, viewers of the client, or admin.
- Audit logs: admin-only read; insert allowed for any authenticated user (logging their own actions); no update/delete.
- Recording URLs are **never** returned via RLS directly — fetched only through an edge function that logs access.

Indexes per Phase 8 spec.

## Stage 2 — Provider-agnostic telephony layer (Phase 10)

```text
src/lib/telephony/
  types.ts              // TelephonyProvider interface, CallRequest, CallResult, WebhookEvent
  provider.ts           // getProvider() — returns active provider from settings
  providers/
    telecmi.ts          // TeleCMI implementation (click-to-call, webhook normalize, mask config)
  client.ts             // Frontend helper: startCall(clientId), endCall(sessionId), etc.
                        // Always calls edge functions — never hits provider directly.
```

Edge functions (all server-side, secrets never reach the browser):
- `telephony-click-to-call` — validates caller permission, picks number to mask, calls provider, creates `call_sessions` row (status=ringing).
- `telephony-webhook` — public (`verify_jwt=false`), HMAC-verified, idempotent on `(provider, provider_event_id)`, normalizes into `call_events` + updates `call_sessions`.
- `telephony-recording-url` — issues short-lived signed URL for a recording, writes audit log.
- `telephony-queue-next` — atomic "claim next queue item" via `SELECT … FOR UPDATE SKIP LOCKED` in an RPC, sets status=calling, returns item.

Secrets needed (will request via add_secret after you approve plan):
- `TELECMI_APP_ID`, `TELECMI_SECRET`, `TELECMI_WEBHOOK_SECRET`, `TELECMI_FROM_NUMBER` (or pool).

## Stage 3 — Counselor direct calling (Phase 4)

- New `CallPanel` card on `ClientDetail` (lazy-loaded, behind a tab so it doesn't affect the perf work from Phase 1 of the previous task).
- Dial button → `telephony-click-to-call`.
- Live status via realtime channel on `call_sessions` row.
- Recent calls list (paginated, page size 10).
- Disposition + notes form on call end. Callback scheduling writes a `call_queue_items` row with `status='callback'` and `next_call_at`.
- Phone numbers shown as masked (`+91 ●●●●● ●●123`) until client `status='enrolled'`.

## Stage 4 — Telecaller queue mode (Phase 3)

- New route `/telephony/queue` (telecaller/admin only).
- `QueueWorkspace` with: Start/Pause/Resume/Break/End controls, live counters (waiting/callbacks/connected/enrolled), current-call card, disposition form.
- State persisted in `telephony_agents` (`is_on_break`, `is_available`, `current_campaign_id`) so refresh restores session.
- Auto-advance loop guarded by agent availability flags; one-active-call enforced by partial unique index.

## Stage 5 — Webhook processing & audit hardening

- Idempotency table or unique index on `call_events(provider, provider_event_id)`.
- Retry-safe upserts on `call_sessions` keyed by `telecmi_call_id`.
- Audit log entries on every state transition.

## Stage 6 — UI polish

Skeletons, toasts, timers, empty states, retry buttons. No business-logic changes.

## Stage 7 — Reporting foundation

- SQL view `v_telephony_daily` (per-agent counts, avg duration, conversion ratio) — read-only, admin-gated.
- No dashboard UI yet; just the queryable foundation.

## Risks I want to flag before starting

1. **Existing `call_events` table** — I'll extend it, not recreate. If you'd rather have a fresh `telephony_call_events` table and leave the legacy one alone, say so.
2. **Phone masking in UI** — currently `clients.phone` and `case_people.passport_number` etc. are returned by RLS to anyone who can view the client. True masking requires either (a) a column-level policy or (b) routing reads through a view that redacts. I'll go with **(b) — add a `v_clients_masked` view** for telephony screens, leaving existing screens untouched. Confirm if you want me to also redact the main client detail page (that's a bigger UX change).
3. **One active call per agent** enforced by partial unique index — if a webhook is lost, an agent could get "stuck" in `calling`. I'll add a 10-minute auto-recover via `next_call_at` sweep in `telephony-queue-next`.
4. **TeleCMI credentials** — I'll stop after Stage 1 and ask you to add the 4 secrets before Stage 2 ships.
5. **Scope** — this is ~10–15 files per stage. I'll ship Stage 1 first (DB only, zero UI/runtime impact) and pause for your review before each subsequent stage.

## What I'll do next

If you approve: I'll generate **Stage 1 migration only** (tables + RLS + indexes + helper functions + audit table + additive `call_events` columns) and stop for your review. No code changes in that stage — DB-only, fully reversible.
