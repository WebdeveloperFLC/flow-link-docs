# Incentive Platform — Phase 0 Deploy Checklist

Deploy path: **local repo → GitHub → Lovable → Supabase (Lovable admin)**.

## What Phase 0 includes

| Area | Change |
|------|--------|
| **DB migration** | `20260618120000_incentive_platform_phase0.sql` — FX buffer columns, closing counselor attribution, plan versions, qualifying events ledger, clawback on refund |
| **Edge function** | `incentive-calculate-run` — closer-wins, FX snapshot, branch filter, allied/B2B channel slabs, target bonuses, discount penalty |
| **Frontend** | My Incentives (period-scoped earned + forecast), Incentive Plans (branch scope), FX Rates admin, Incentives Admin (branch dropdown) |
| **Libs + tests** | `src/lib/fxPolicy.ts`, `src/incentives/lib/incentiveEngineLogic.ts` (11 vitest tests) |

## Deploy steps (your workflow)

```text
GitHub push  →  Lovable sync from GitHub  →  Publish
                    ↓
              Migration runs on Supabase (DB changes)
              Edge function code updates (backend calculation)
              Frontend updates (new pages / UI)
```

### What is `incentive-calculate-run`?

It is **not** a page in the CRM. It is **backend code** that lives here:

`supabase/functions/incentive-calculate-run/index.ts`

When an admin clicks **Preview**, **Calculate & save**, or **Approve & lock** on **Incentives Admin**, the app calls this function on Supabase. That function reads payments, applies slabs, FX buffer, closer-wins rules, and returns/writes incentive totals.

**Frontend publish alone does not update this file on Supabase.** The calculation engine must be deployed to Supabase separately from the React UI — though in Lovable, **Publish after GitHub sync often deploys both**.

### What you actually do in Lovable

You do **not** need a separate “edge function” menu if you use the normal publish flow:

1. Push code to GitHub (see YOUR ACTION at bottom of agent message).
2. In **Lovable** → sync/pull from GitHub.
3. Click **Publish** (same as any other CRM release).

Lovable should pick up:
- the migration (`20260618120000_...sql`) → database changes
- the function folder (`supabase/functions/incentive-calculate-run/`) → updated calculation engine
- the React files → new FX Rates page, etc.

**If Lovable asks to run migrations**, approve that step.

### How to know the function updated (smoke test)

After publish, go to **Incentives → Incentives Admin** and click **Preview** for a plan/period.

| Sign | Meaning |
|------|---------|
| Preview works, shows **FX:** line in the header (e.g. `CAD=68`) | New function is likely live |
| Preview errors or behaves exactly like before Phase 0 | Function may still be on old code — re-publish from Lovable or ask Lovable to deploy `incentive-calculate-run` from GitHub |

You **cannot** verify the function from local repo alone — Supabase is under Lovable admin.

### If Preview still uses old logic

Ask in Lovable (chat/support): *“Please deploy the updated Supabase edge function `incentive-calculate-run` from the latest GitHub sync.”*

Alternative (only if you have a Supabase access token):  
`npx supabase functions deploy incentive-calculate-run --project-ref auofttkyosgjhxcbhscw`

Most FLC deploys use **Lovable Publish only** — no CLI needed.


1. **FX Rates** — `/incentives/fx-rates` — add CAD rate for current month; confirm effective = base + 2.
2. **Incentive Plans** — create org-wide plan with a service_revenue slab; optional branch-scoped plan.
3. **Incentives Admin** — Preview run for current period; then Calculate & save; verify line items in DB.
4. **My Incentives** — log in as counselor; confirm earned matches locked run for period.
5. **Closer attribution** — record a verified payment on a client; confirm `closing_counselor_id` is set.

## After Lovable publish — smoke test (counselor)

1. Open **My Incentives** — period total and projected month-end visible.
2. Confirm no errors when no runs exist yet (empty state OK).

## Known V1 limits (Phase 1+)

- No payout desk / adjustments UI yet
- No multi-payee splits (freelancer + counselor separate rows)
- No rule builder UI — slabs configured in Incentive Plans
- Types in `src/integrations/supabase/types.ts` may need Lovable regen after migration

## Rollback

If migration fails on Lovable, do not re-run partial SQL manually without DBA review. Revert GitHub commit and republish previous Lovable version.
