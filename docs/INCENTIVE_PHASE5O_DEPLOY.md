# Performance Hub — Phase 5O Deploy

## Phase 5O deliverables (O7 automation journeys)

| # | Feature | Surface |
|---|---------|---------|
| 5O.1 | Journey definitions | `/performance/offers/journeys` — list, activate, create |
| 5O.2 | Multi-step sequences | `offer_journey_steps` — day offset, channel, action |
| 5O.3 | Enrollments | Manual enroll lead/client via `fn_enroll_offer_journey` |
| 5O.4 | Daily processor | `offers-lifecycle-tick` → `fn_process_due_journey_steps` |
| 5O.5 | Seed win-back | Cold lead day 2/7/15/30 journey pre-loaded |

## Migration

**`20260701120000_incentive_platform_phase5o.sql`**

- `offer_automation_journeys`, `offer_journey_steps`, `offer_journey_enrollments`, `offer_journey_step_log`
- `fn_enroll_offer_journey`, `fn_execute_journey_step`, `fn_process_due_journey_steps`

## Edge function

**`offers-lifecycle-tick`** — runs journey processor before birthday/campaign logic.

## Step actions

| action_type | Behavior |
|-------------|----------|
| `log_touch` | Client timeline + step log (WhatsApp/email/SMS manual send) |
| `notify_counselor` | In-app notification to assigned counselor |
| `create_promotion_request` | Inserts pending promotion request for MarCom |

## UAT

1. **Journeys page** — see seeded &quot;Cold lead win-back&quot; with 4 steps.
2. **Enroll** — enroll a lead UUID → enrollment row with `next_step_at`.
3. **Tick** — run lifecycle tick (or wait for cron) → step log + counselor notification on day-30 task step when due.
4. **Timeline** — client enrollments show `offer_journey` events on client record.

## Post–5O (not in scope)

Split attribution (I4), multi-plan stacking (I7), cross-sell journey templates.
