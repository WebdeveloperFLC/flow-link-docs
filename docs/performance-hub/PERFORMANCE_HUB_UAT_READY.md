# Performance Hub — UAT Readiness

**Date:** 2026-06-12  
**Scope:** Phase A + Phase B remediation complete (no new Performance Hub features)  
**Related:** [`PERFORMANCE_HUB_UAT_BLOCKERS.md`](./PERFORMANCE_HUB_UAT_BLOCKERS.md) · [`PERFORMANCE_HUB_UAT.md`](./PERFORMANCE_HUB_UAT.md) · [`PERFORMANCE_HUB_DEMO_DATA.md`](./PERFORMANCE_HUB_DEMO_DATA.md)

---

## Fixed issues

### Phase A — Critical (ops + demo data)

| ID | Issue | Resolution |
|----|-------|------------|
| **PH-R-018** | Phase 6B migrations must apply in order | **Ops runbook below** — apply `20260711120000` then `20260711120001`; verify `director` in `app_role` enum |
| **PH-R-017** | Demo seed not loaded automatically | **Ops runbook below** — create seven `ph.*@flowlink.demo` users; run [`PERFORMANCE_HUB_DEMO_DATA.md`](./PERFORMANCE_HUB_DEMO_DATA.md) §4 SQL |
| **PH-R-003** | Unclassified count vs empty list | **Demo seed updated** — main §4 now inserts `client_invoices` + `client_invoice_payments` for `pay100004` (PH-DEMO-004) before qualifying events |

### Phase B — High (code + one migration)

| ID | Issue | Resolution |
|----|-------|------------|
| **PH-R-001** | Wallet KPIs filtered `budget_kind = 'personal'` | Hooks now match DB enum: `month_to_month` (legacy `personal` fallback) in `usePerformancePeriodMetrics.ts`, `usePerformanceTeamRows.ts` |
| **PH-R-002** | Give discount ignored hub period bar | `GiveDiscount.tsx` uses `usePerformancePeriod()` for wallet load, preview, and submit |
| **PH-R-004** | `/offers-admin` opened legacy page | Removed duplicate `OffersAdmin` route; links point to `/performance/offers/library`; redirect route retained |
| **PH-R-006** | Director redirected from approvals | `PerformanceApprovals.tsx` — director read-only view (badge, no approve/decline) |
| **PH-R-007** | MarCom blocked from promotion review | `canReview` includes `useModulePermission('offers').canEdit` |
| **PH-R-015 / PH-R-019** | `offer_events` CHECK blocked `'sent'` | New migration `20260712120000_performance_hub_offer_events_sent.sql` |

**Build:** `npm run build` passes locally after these changes.

**New migrations added in repo:** **1** (`20260712120000_performance_hub_offer_events_sent.sql`)

---

## Remaining known issues (Phase C — do not block UAT start)

| ID | Summary | UAT impact | Workaround |
|----|---------|------------|------------|
| **PH-R-008** | Command center URL unguarded; readiness RPCs lack caller auth | Low for controlled staging | Use staging URL access control; test as admin |
| **PH-R-009** | `/incentives/*` outside hub theme shell | UX inconsistency | Expected — linked from sidebar by design |
| **PH-R-010** | Director has no RLS SELECT on `wallet_exception_requests` | Director sees discount queue only on Approvals; wallet exception section empty | Test wallet exceptions as admin/manager |
| **PH-R-011** | Wallet policy missing from sidebar | Nav discoverability | Open via command center / How it works |
| **PH-R-005** | Team links to legacy `/incentives/give-discount` | Minor routing | Use `/performance/give-discount` manually |
| **PH-R-013** | Incomplete director guards on some mutating RPCs | Mitigated by UI/RLS today | None for UAT |
| **PH-R-020** | Offer analytics ROI not tied to period bar | Analytics accuracy | Use WIR cards for period-scoped metrics |
| **PH-R-021–028** | Copy, types, SLA UI, AI module, segments, service_offers migration | Polish / backlog | Log in sign-off doc |
| **PH-R-028** | MarCom needs `offers_ai` for AI studio UAT | AI studio only | Assign module or skip AI studio cases |

**W2 readiness:** Unclassified **list** works after seed; **readiness check** still reports unclassified count ≥ 1 until payment is classified (by design for PH-UAT-UNCL-001 / W2).

---

## UAT start recommendation

**Recommended: proceed with team UAT** once the three deployment gates below are complete on the **staging** Supabase + Lovable environment.

| Gate | Status in repo | Owner action |
|------|------------------|--------------|
| Phase 6B migrations applied in order | Migrations exist | DevOps — Step 1 below |
| Demo seed + test users loaded | SQL in demo doc | QA/DevOps — Step 2 below |
| Frontend + `offer_events` migration deployed | Code ready | Engineering — Step 3 below |

**Minimum smoke before handing testers [`PERFORMANCE_HUB_UAT.md`](./PERFORMANCE_HUB_UAT.md):**

1. Period bar set to **`2026-06`**, branch **Genda Circle**.
2. Command center — wallet unlocked **> ₹0** (Priya demo wallet).
3. `/performance/admin/unclassified` — shows **PH-DEMO-004** payment.
4. `/performance/give-discount` — Priya wallet loads for June 2026.
5. `/performance/admin/approvals` — director user sees pending rows **read-only**; admin can approve.
6. `/performance/offers/requests` — `ph.marcom@flowlink.demo` sees review/publish buttons.
7. `/performance` — O10 influence card shows non-zero after seed (requires `sent` migration + re-seed offer_events).

**Do not start new Performance Hub modules** until UAT sign-off ([`PERFORMANCE_HUB_UAT_SIGNOFF.md`](./PERFORMANCE_HUB_UAT_SIGNOFF.md)).

---

## Required demo seed steps

Run on **staging Supabase** (SQL Editor). Full script: [`PERFORMANCE_HUB_DEMO_DATA.md`](./PERFORMANCE_HUB_DEMO_DATA.md) §4.

### 1. Create test users (Team & Roles or auth admin)

| Email | Role / modules (minimum) |
|-------|--------------------------|
| `ph.admin@flowlink.demo` | admin |
| `ph.director@flowlink.demo` | director only |
| `ph.manager@flowlink.demo` | manager |
| `ph.counselor1@flowlink.demo` | counselor (Priya) |
| `ph.counselor2@flowlink.demo` | counselor (Rohit, no target) |
| `ph.marcom@flowlink.demo` | counselor + **offers** module edit |
| `ph.viewer@flowlink.demo` | viewer |

Set passwords via your auth admin flow; map profiles to Genda Circle where applicable.

### 2. Apply database migrations (order matters)

```text
1. 20260711120000_incentive_platform_phase6b.sql   (enum only)
2. 20260711120001_incentive_platform_phase6b.sql   (RLS + guards)
3. 20260712120000_performance_hub_offer_events_sent.sql
```

Verify:

```sql
SELECT 'director' = ANY(enum_range(NULL::app_role)::text[]);
SELECT conname FROM pg_constraint
 WHERE conrelid = 'public.offer_events'::regclass AND conname LIKE '%event_type%';
```

### 3. Run main demo seed

Paste and execute the full **`$seed$` block** from [`PERFORMANCE_HUB_DEMO_DATA.md`](./PERFORMANCE_HUB_DEMO_DATA.md) §4 (includes `pay100001`, `pay100004`, wallets, queues, offer_events).

Verification queries (from demo doc):

```sql
SELECT fn_performance_hub_readiness_check('2026-06');
SELECT * FROM fn_unclassified_payments_for_period('2026-06') LIMIT 5;
SELECT counselor_id, unlocked_amount FROM discount_wallets
 WHERE period_key = '2026-06' AND budget_kind = 'month_to_month';
```

### 4. Browser setup

- Log in as appropriate test user.
- Open any Performance Hub page.
- Set period **`2026-06`** and branch **Genda Circle** in the hub period bar.

---

## Required Lovable publish steps

1. **Merge / sync** this branch to the Lovable project (frontend batch: PH-R-001, 002, 004, 006, 007).
2. **Lovable → Database → Migrations** — approve pending migrations in order:
   - `20260711120000` (if not already applied)
   - `20260711120001` (if not already applied)
   - **`20260712120000_performance_hub_offer_events_sent.sql`** (new)
3. If using **manual SQL editor** for 6B: run `20260711120000` alone, wait for success, then `20260711120001` — never combine in one query ([`INCENTIVE_PHASE6B_DEPLOY.md`](../INCENTIVE_PHASE6B_DEPLOY.md)).
4. **Republish edge function** `incentive-calculate-run` if Phase 6B edge changes are not yet live.
5. **Lovable → Publish** frontend.
6. **Re-run demo seed** §4 on staging (idempotent) so `offer_events` `sent` rows insert cleanly.
7. Run the smoke checklist above; then distribute [`PERFORMANCE_HUB_UAT.md`](./PERFORMANCE_HUB_UAT.md) + [`PERFORMANCE_HUB_UAT_SIGNOFF.md`](./PERFORMANCE_HUB_UAT_SIGNOFF.md).

---

## Traceability

| Artifact | Purpose |
|----------|---------|
| [`PERFORMANCE_HUB_UAT_BLOCKERS.md`](./PERFORMANCE_HUB_UAT_BLOCKERS.md) | Original fix plan |
| [`PERFORMANCE_HUB_READINESS_REVIEW.md`](./PERFORMANCE_HUB_READINESS_REVIEW.md) | Pre-UAT audit |
| [`PERFORMANCE_HUB_DEMO_DATA.md`](./PERFORMANCE_HUB_DEMO_DATA.md) | Seed SQL (updated for PH-R-003, PH-R-027) |
| [`PERFORMANCE_HUB_UAT.md`](./PERFORMANCE_HUB_UAT.md) | 51 test cases |
| [`PERFORMANCE_HUB_UAT_SIGNOFF.md`](./PERFORMANCE_HUB_UAT_SIGNOFF.md) | Post-UAT sign-off |
