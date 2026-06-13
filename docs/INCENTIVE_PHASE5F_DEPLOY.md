# Performance Hub — Phase 5F Deploy

Deploy: **GitHub → Lovable → Publish** (migration + edge function redeploy)

## Phase 5F deliverables

| # | Feature | Surface |
|---|---------|---------|
| 5F.1 | `enrolment` qualifying events | First verified payment per client (DB trigger) |
| 5F.2 | `stage_change` milestone events | Pipeline stages `visa_lodged`, `offer_received`, `offer_letter` |
| 5F.3 | Client timeline sync | `incentive_event` rows on client record (staff-only) |
| 5F.4 | Calculate engine milestone rules | `offer_received`, `visa_lodged`, `lead_converted` from qualifying events |
| 5F.5 | Rule builder milestones | Plans → rules dropdown extended |
| 5F.6 | Timeline Performance filter | Client activity → **Performance** chip |

## Migration

Apply on Lovable publish:

**`20260623120000_incentive_platform_phase5f.sql`**

Creates / updates:

- `fn_incentive_resolve_client_attribution` — counselor + branch + program dimensions
- `fn_incentive_append_client_timeline` — writes `incentive_event` timeline rows
- `fn_incentive_record_payment_event` — adds `enrolment` + timeline for first payment
- `fn_incentive_record_stage_milestone` — trigger on pipeline stage change
- `fn_incentive_record_lead_converted` — adds timeline sync (from 5D)
- Backfill: `enrolment` from existing first payments; stage milestones from `client_stage_history`

## Edge function

On **Lovable Publish**, redeploy **`incentive-calculate-run`** (Supabase admin is in Lovable — no CLI token needed). It processes qualifying events for rules with milestones:

- `offer_received`
- `visa_lodged`
- `lead_converted`

(Payment milestones `first_payment` / revenue rules still use verified payments directly.)

## UI

| Route | Change |
|-------|--------|
| Client record → Activity timeline | **Performance** filter; trophy icon for `incentive_event` |
| `/incentives/plans` → Rules | Milestone options: offer / visa lodged / lead converted |

## Event chain (X5 prototype)

On a client with offer + payment + pipeline progress you should see:

1. `payment_verified` — from payment verification UI
2. `incentive_event` · Enrolment counted — first verified payment
3. `stage_change` — pipeline stage move (existing)
4. `incentive_event` · Pipeline milestone · visa lodged / offer received

## Depends on

- Phase 0 qualifying events ledger
- Phase 5D `lead_converted` emitter (this phase adds timeline + calculate wiring)
- Phase 5E published (recommended before UAT lock gates)

## UAT checklist

1. **First payment → enrolment** — verify a client’s first payment → `incentive_qualifying_events` has `enrolment` + client timeline shows Performance events.
2. **Stage milestone** — move client to **Visa lodged** or **LOA / offer secured** → `stage_change` qualifying event + timeline `incentive_event`.
3. **Lead converted timeline** — convert lead-linked client with telecaller → timeline shows lead converted incentive event.
4. **Contest / standings** — branch contest with `enrolment_count` metric picks up new `enrolment` events on refresh.
5. **Calculate rule** — plan rule with milestone `visa_lodged` or `lead_converted` → preview/calculate shows rule lines when matching events exist.
6. **No double count** — `first_payment` revenue rules still come from payments only (not duplicated from enrolment QE).

## Not in 5F

- Offers studio wizard (5G)
- AI suggestion layer (5H)
- Admin unlock / void locked run
- `commission_paid` qualifying event emitter (commission still read from `upi_commission_students` in calculate)

## YOUR ACTION

**Step 1 — Ship to GitHub**

```bash
npm run ship -- "feat(performance): Phase 5F — enrolment/stage qualifying events + client timeline" -- \
  supabase/migrations/20260623120000_incentive_platform_phase5f.sql \
  supabase/functions/incentive-calculate-run/index.ts \
  src/components/clients/ClientTimelineCard.tsx \
  src/incentives/components/IncentiveRulesTab.tsx \
  docs/INCENTIVE_PHASE5F_DEPLOY.md
```

**Step 2 — Lovable**

Open Lovable → **Sync from GitHub** (pull latest commit).

**Step 3 — Publish (Supabase admin — all in Lovable)**

Lovable → **Publish** → approve:

- Migration: `20260623120000_incentive_platform_phase5f.sql`
- Edge function: **`incentive-calculate-run`** (included in Publish — no Supabase dashboard)

If Phase 5E was never published, also approve in this publish (or prior):

- `20260621120000_incentive_runs_unique_scope.sql`
- `20260622120000_incentive_platform_phase5e.sql`

**Step 4 — UAT**

Run the checklist above on a test client (payment verify → stage move → calculate preview).

**Step 5 — Confirm prior phases**

If Runs admin or command center still show schema/RPC errors, publish any missing migrations from Phases 5C–5E before relying on 5F UAT.
