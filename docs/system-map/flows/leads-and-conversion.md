# Flow: Leads & Lead → Client Conversion

## Lead ingestion paths
1. **Manual** — `/leads/new` → `LeadNew.tsx` → insert into `clients` (leads share the `clients` table; `lead_stage` differentiates).
2. **CSV/XLSX import** — `LeadsList.tsx` import dialog → RPC `import_lead_v2(payload, dedupe)` (SECURITY DEFINER). Restricted to admin/counselor. Auto-queues into `call_queue_items` if no active item.
3. **Distribution** — `distribute_leads(_lead_ids, _rule_id)` round-robin/random across `distribution_rule_members`; grants `client_access` rows; optionally assigns to telephony agent.
4. **Assessment funnel** — assessment leads land in `assessment_leads`; conversion to `clients` is a separate explicit action.

## Lead scoring
`fn_recalc_lead_score` BEFORE UPDATE on `clients` recomputes `lead_score` and `lead_temperature` from IELTS, passport, budget, intake, call outcomes, and recent positive remarks.

## Telecaller queue
- `claim_next_queue_item(agent, campaign)` — SECURITY DEFINER RPC. Recovers stale `calling` rows older than 10m. Refuses if agent already on a call.
- Telephony events written to `call_sessions` / `call_events`.
- Outcomes feed back into `lead_score`.

## Conversion to client
There is no separate `leads` → `clients` migration: a row is a "lead" while `lead_stage` is pre-conversion, and a "client" once stage advances (typically after first payment or service enrollment). On stage change:
- `fn_log_status_change` → `client_timeline.status_change`.
- `fn_notify_client_status_change` → `client_notifications` row + portal bell update.
- `fn_sync_accounting_client` upserts `accounting_clients` (currency inferred from country, client_type from application_type, counselor name from profiles).

## Permissions
- View/edit gated by `user_client_permission` (owner_id / created_by / `client_access` / `default_team_members` / team).
- Imports restricted to admin/counselor via RPC.

## Failure modes
- Duplicate import: dedupe by phone or lowercase email; `_dedupe='skip'` returns existing id.
- Counselor assignment fails silently if no matching `profiles.email`.
- `accounting_clients` sync trigger swallows nothing — failure here will roll back the client write.