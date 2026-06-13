# Performance Hub — Full UAT & Testing Guide

**Audience:** QA / UAT team, DevOps, UAT lead  
**Purpose:** Single checklist to set up staging, run all **51** Performance Hub test cases, log defects, and sign off — so engineering can move to the next module.

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Date** | June 2026 |
| **Environment** | Staging / Lovable preview only — **not production** |
| **Demo period** | `2026-06` (June 2026) |
| **Primary branch** | Genda Circle |

> **START HERE:** Complete **Phase 1 → Phase 4** before testers run cases. Phase 5 is execution. Phase 6 is sign-off. Do not skip setup.

---

## Document map (repository)

| File | Use |
|------|-----|
| **This guide** | `docs/guides/performance-hub-uat-guide.md` — setup + workflow (in-app: **Guide → Performance Hub UAT**) |
| Test case pack (51 cases) | `docs/performance-hub/PERFORMANCE_HUB_UAT.md` |
| Demo seed SQL | `docs/performance-hub/PERFORMANCE_HUB_DEMO_DATA.md` — **§4** + **§4.4** (run after users exist) |
| Tester quick reference | `docs/performance-hub/PERFORMANCE_HUB_TESTER_QUICKSTART.md` |
| Defect log | `docs/performance-hub/PERFORMANCE_HUB_DEFECT_TRACKER.csv` |
| Sign-off form | `docs/performance-hub/PERFORMANCE_HUB_UAT_SIGNOFF.md` |
| Demo coverage audit | `docs/performance-hub/PERFORMANCE_HUB_UAT_DEMO_COVERAGE.md` |
| Known limitations | `docs/performance-hub/PERFORMANCE_HUB_UAT_READY.md` (Phase C items) |

**Screenshot folder:** `uat-screenshots/performance-hub/`  
**Screenshot naming:** `PH-UAT-{TestCaseID}_{YYYYMMDD}.png` (example: `PH-UAT-Q1_20260615.png`)

---

## Roles & ownership

| Role | Responsibility |
|------|----------------|
| **DevOps / Engineering** | Apply migrations, publish Lovable build, run demo seed SQL, smoke checklist |
| **Admin (existing staff)** | Create 7 demo users via `/users`, assign roles/modules, share passwords securely |
| **UAT testers** | Execute `PERFORMANCE_HUB_UAT.md` cases, screenshots, pass/fail |
| **UAT lead** | Maintain defect tracker, triage severity, complete sign-off form |

---

## Phase 1 — Deploy build & migrations

**Owner:** Engineering / DevOps  
**Environment:** Staging Supabase + Lovable

### 1.1 Sync code

- Merge latest `feature/service-library-nav` (or release branch) into the Lovable project.
- **Lovable → Publish** frontend when migrations below are applied.

### 1.2 Apply database migrations (order matters)

Run in Supabase **SQL Editor** or Lovable **Database → Migrations**. **Never combine** the two Phase 6B files in one query.

| Order | Migration file |
|------:|----------------|
| 1 | `20260711120000_incentive_platform_phase6b.sql` — enum only (`director` role) |
| 2 | `20260711120001_incentive_platform_phase6b.sql` — RLS + mutation guards |
| 3 | `20260712120000_performance_hub_offer_events_sent.sql` — `offer_events` `sent` type |
| 4 | `20260715120000_performance_hub_offers_studio_rls.sql` — MarCom offers library write + lifecycle RPC |
| 5 | `20260716120000_performance_hub_demo_seed.sql` — **loads all PH-DEMO mock data** (runs `fn_seed_performance_hub_demo()`) |
| 6 | `20260716120001_performance_hub_demo_seed_idempotent.sql` — idempotent upsert fix + re-run seed |
| 7 | `20260716120002_performance_hub_demo_wallet_rebind.sql` — rebind demo wallets to `ph.counselor1` / `ph.counselor2` (fixes empty Give Discount wallet) |
| 8 | `20260716120003_performance_hub_demo_seed_score_upsert.sql` — fix `counselor_performance_scores` re-seed after rebind (if seed fails on `a0100002` duplicate) |
| 9 | `20260716120004_performance_hub_demo_wallet_unlock.sql` — fix ₹0 spendable (achievement threshold + scoped wallet unlock) |
| 10 | `20260716120005_performance_hub_demo_target_rebind.sql` — rebind `incentive_targets` to `ph.counselor1` (fixes NULL achievement / unlocked=0 on Priya wallet) |
| 11 | `20260716120006_performance_hub_demo_rebind_uuid_cast.sql` — fix `id::text LIKE` in rebind (if 200005 failed with `uuid ~~ unknown`) |

**Verify migrations:**

```sql
SELECT 'director' = ANY(enum_range(NULL::app_role)::text[]);

SELECT conname FROM pg_constraint
 WHERE conrelid = 'public.offer_events'::regclass
   AND conname LIKE '%event_type%';

SELECT proname FROM pg_proc WHERE proname = 'fn_seed_performance_hub_demo';
```

### 1.3 Edge functions

- Republish **`incentive-calculate-run`** if Phase 6B edge changes are not live.

### 1.4 Record build info (for sign-off)

- Git branch, commit SHA, Lovable publish date → enter on sign-off form later.

---

## Phase 2 — Create seven demo users

**Owner:** Admin with access to **`/users`** (Team & roles)  
**Prerequisite:** Phase 1 complete.

Create accounts **before** running demo seed SQL. Use **exact emails** below. Choose **one shared UAT password** (minimum 8 characters); store it in your team password manager — **do not commit passwords to git**.

### 2.1 User registry

| # | Email | Display name | Role in `/users` UI | Branch | Extra setup |
|---|--------|--------------|---------------------|--------|-------------|
| 1 | `ph.admin@flowlink.demo` | Admin Demo | **Administrator** | Genda Circle | — |
| 2 | `ph.counselor1@flowlink.demo` | Priya Mehta | **Counselor** | Genda Circle | Primary counselor tests |
| 3 | `ph.counselor2@flowlink.demo` | Rohit Shah | **Counselor** | Genda Circle | No-target wallet tests |
| 4 | `ph.telecaller@flowlink.demo` | Tara Telecaller | **Telecaller** | Genda Circle | Telecaller home layout |
| 5 | `ph.marcom@flowlink.demo` | Maya MarCom | **Counselor** | Genda Circle | Module access — see §2.3 |
| 6 | `ph.director@flowlink.demo` | Director Demo | Create as **Viewer** first | Genda Circle | SQL §2.2 → `director` only |
| 7 | `ph.manager@flowlink.demo` | Neha Manager | Create as **Counselor** first | Genda Circle | SQL §2.2 → `manager` |

### 2.2 Assign `director` and `manager` (SQL)

The Add User dialog does not list `director` or `manager`. After creating users 6 and 7, run in **Supabase SQL Editor**:

```sql
DO $$
DECLARE
  v_director uuid := (SELECT id FROM auth.users WHERE email = 'ph.director@flowlink.demo');
  v_manager uuid := (SELECT id FROM auth.users WHERE email = 'ph.manager@flowlink.demo');
BEGIN
  IF v_director IS NULL OR v_manager IS NULL THEN
    RAISE EXCEPTION 'Create ph.director and ph.manager in /users first';
  END IF;
  DELETE FROM public.user_roles WHERE user_id IN (v_director, v_manager);
  INSERT INTO public.user_roles (user_id, role) VALUES (v_director, 'director');
  INSERT INTO public.user_roles (user_id, role) VALUES (v_manager, 'manager');
END $$;
```

### 2.3 MarCom module permissions

For **`ph.marcom@flowlink.demo`**, either:

- **`/users`** → user menu → **Module access** → **Offers & Promotions** = Edit, **AI Offer Studio** = Edit  

**Or** run SQL:

```sql
INSERT INTO public.user_module_permissions (user_id, module, can_view, can_edit, can_delete)
SELECT id, m.module, true, true, false
FROM auth.users, (VALUES ('offers'), ('offers_ai')) AS m(module)
WHERE email = 'ph.marcom@flowlink.demo'
ON CONFLICT (user_id, module) DO UPDATE
  SET can_view = true, can_edit = true, updated_at = now();
```

### 2.4 Verify users

```sql
SELECT u.email, p.full_name, array_agg(ur.role ORDER BY ur.role) AS roles
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email LIKE 'ph.%@flowlink.demo'
GROUP BY u.email, p.full_name
ORDER BY u.email;
```

**Expected:** **7 rows**. Share login emails + password with testers via your secure channel.

---

## Phase 3 — Load demo data

**Owner:** DevOps / Engineering  
**Prerequisite:** Phase 2 complete (at least one **counselor** + **admin** must exist in `auth.users`).

### 3.0 Automatic seed (preferred)

Migration **`20260716120000_performance_hub_demo_seed.sql`** (Phase 1 step 5) creates and runs:

```sql
SELECT public.fn_seed_performance_hub_demo();
```

This loads **all** mock data: 6 clients, 13 offers, wallets, queues, calendar, segments, automation, analytics events, contests, plan rules, incentives.

If migration ran **before** Phase 2 users existed, the seed may have skipped. Re-run after users are created:

```sql
SELECT public.fn_seed_performance_hub_demo();
```

### 3.1 Manual seed (fallback)

If migration 5 cannot be applied, copy **`$seed$`** + **`$seed_ext$`** from **`docs/performance-hub/PERFORMANCE_HUB_DEMO_DATA.md`** §4 + §4.4 into Supabase SQL Editor.

### 3.2 Verify seed

```sql
-- Six demo clients
SELECT count(*) FROM clients WHERE application_id LIKE 'PH-DEMO-%';

-- Readiness JSON (queues should be non-empty for UAT)
SELECT jsonb_pretty(fn_performance_hub_readiness_check('2026-06'));

-- Demo offers
SELECT title, status FROM offers WHERE title LIKE 'PH Demo%';

-- Priya wallet June 2026
SELECT id, unlocked_amount, balance
FROM discount_wallets
WHERE period_key = '2026-06'
  AND counselor_id = (SELECT id FROM auth.users WHERE email = 'ph.counselor1@flowlink.demo');

-- Extended studio (§4.4)
SELECT count(*) AS calendar FROM campaign_calendar WHERE name LIKE 'PH Demo%';
SELECT count(*) AS segments FROM offer_groups WHERE name LIKE 'PH Demo%';
SELECT count(*) AS auto_rules FROM offer_templates WHERE name LIKE 'PH Demo%';

SELECT branch_name, total_amount, rank
  FROM fn_incentive_branch_contest_standings('a0090001-0001-4000-8000-000000000001');
```

**Expected:**

- **6** demo clients (`PH-DEMO-001` … `006`)
- Readiness shows `period_key: 2026-06`, queue counts ≥ 1, `ready_for_period_lock: false` (until W2 scenario)
- Priya wallet unlocked amount **> 0**
- **3** calendar campaigns, **3** segments, **3** auto-rules (after §4.4)
- **13** PH Demo offers spanning lifecycle statuses
- Contest standings: **Genda Circle** rank 1 with non-zero total; **Ajwa** rank 2 with non-zero total

### 3.3 Give Discount shows “No wallet this period”

**Cause:** `/performance/give-discount` loads wallets via `fn_counselor_wallets_for_period`, which returns rows only when `discount_wallets.counselor_id = auth.uid()`. If demo seed ran **before** Phase 2 users existed, wallets may be tied to a fallback counselor UUID — not `ph.counselor1@flowlink.demo`.

**Fix:**

1. Complete **Phase 2** (create `ph.counselor1@flowlink.demo`).
2. Apply migration **`20260716120002_performance_hub_demo_wallet_rebind.sql`** (or run manually):

```sql
SELECT public.fn_rebind_ph_demo_wallets();
```

3. Log in as **`ph.counselor1@flowlink.demo`** (not admin/manager — they do not get a personal wallet on this screen).
4. Set period bar to **`2026-06`**.

**Verify:**

```sql
SELECT dw.name, dw.balance, u.email
FROM discount_wallets dw
JOIN auth.users u ON u.id = dw.counselor_id
WHERE dw.period_key = '2026-06'
  AND dw.name LIKE 'PH Demo%';
```

**Expected:** `ph.counselor1@flowlink.demo` owns **PH Demo · Priya Jun-2026** with balance **15000**.

### 3.4 Spendable / Unlocked shows ₹0 (wallet balance visible)

**Cause:** Give Discount calls `fn_sync_wallet_metrics` on load. Month-to-month wallets unlock only when period achievement ≥ **50%** (`wallet_settings.unlock_threshold_pct`). Demo verified payments total ~**₹195.5k** against a **₹500k** target → **~39%** → unlocked zeroed while **balance** stays at seeded value. Scoped wallets (Strategic DE) were also gated by achievement instead of manual balance.

**Fix:** Apply migration **`20260716120004_performance_hub_demo_wallet_unlock.sql`** (lowers demo target to ₹300k → ~65% achievement; scoped wallets unlock from balance).

**UI tip:** Use the **Wallet to debit** dropdown → select **PH Demo · Priya Jun-2026** for primary UAT (not Strategic DE unless testing Germany scope).

---

## Phase 4 — Smoke test (gate before UAT)

**Owner:** Engineering or UAT lead  
**Complete all items** before handing testers the case pack.

| # | Login | Action | Pass? |
|---|--------|--------|-------|
| 1 | Any hub user | Set period bar **`2026-06`**, branch **Genda Circle** | ☐ |
| 2 | `ph.counselor1@flowlink.demo` | `/performance` — wallet / earning cards non-empty | ☐ |
| 3 | `ph.admin@flowlink.demo` | `/performance/admin` — readiness card shows queue counts | ☐ |
| 4 | `ph.admin@flowlink.demo` | `/performance/admin/unclassified` — **PH-DEMO-004** row visible | ☐ |
| 5 | `ph.counselor1@flowlink.demo` | `/performance/give-discount` — wallet loads for June 2026 | ☐ |
| 6 | `ph.director@flowlink.demo` | `/performance/admin/approvals` — rows visible, **no** approve buttons | ☐ |
| 7 | `ph.marcom@flowlink.demo` | `/performance/offers/requests` — review/publish buttons visible | ☐ |
| 8 | `ph.marcom@flowlink.demo` | `/performance/offers/library` — PH Demo offers listed | ☐ |

If any item fails, fix setup (Phases 1–3) before Phase 5.

---

## Phase 5 — Execute UAT (51 test cases)

**Owner:** UAT testers  
**Primary document:** `docs/performance-hub/PERFORMANCE_HUB_UAT.md`

### 5.1 Global rules (every test)

- Staging only; demo clients **PH-DEMO-001** … **006** only.
- Period bar: **`2026-06`**; branch: **Genda Circle** when shown.
- Use the login named in each case’s **Preconditions**.
- Fill **Pass / Fail**, **Notes**, **Severity**, **Reproducible** on each case.
- Screenshot when **Screenshot Required: Yes** — save under `uat-screenshots/performance-hub/`.

### 5.2 Test pack overview

| Section | Cases | Primary login(s) |
|---------|------:|------------------|
| A — Setup & shell | 3 | Mixed |
| B — Command center & readiness | 5 | Admin |
| C — Counselor home & team | 11 | Priya, Rohit, Manager, Telecaller |
| D — Give discount & wallets | 7 | Priya, Manager, Admin |
| E — Admin queues | 5 | Admin, Manager, Director, MarCom |
| F — Offers studio | 11 | MarCom, Admin |
| G — Client workspace | 5 | Priya |
| H — Incentives (linked) | 5 | Admin |
| **Total** | **51** | |

### 5.3 Suggested execution order

1. **PH-UAT-SETUP-001** — confirm demo data (blocks everything if fail)
2. Sections **A → B** — shell and command center
3. Section **C** — counselor home (Priya, Rohit)
4. Section **D** — give discount
5. Section **E** — admin queues (rotate admin / manager / director / MarCom)
6. Section **F** — offers studio (MarCom)
7. Section **G** — client workspace (Priya)
8. Section **H** — incentives admin paths

### 5.4 Demo user quick reference

| Email | Use for |
|-------|---------|
| `ph.counselor1@flowlink.demo` | Home, give discount, client workspace, cross-sell |
| `ph.counselor2@flowlink.demo` | No-target copy, wallet exception |
| `ph.manager@flowlink.demo` | Team view, manager approvals, branch pool |
| `ph.admin@flowlink.demo` | Command center, unclassified, admin approvals, incentives |
| `ph.director@flowlink.demo` | Read-only approvals (6B) |
| `ph.telecaller@flowlink.demo` | Telecaller home |
| `ph.marcom@flowlink.demo` | Offers library, promotion requests, AI studio |

### 5.5 Log defects

Use **`docs/performance-hub/PERFORMANCE_HUB_DEFECT_TRACKER.csv`** (Excel or Google Sheets).

| Column | What to enter |
|--------|----------------|
| Bug ID | `PH-BUG-001`, `PH-BUG-002`, … |
| Test Case ID | e.g. `PH-UAT-S2` |
| Severity | Blocker / Critical / Major / Minor / Trivial |
| Screenshot File | Match naming convention |
| Status | Open → Fixed → Retest → Closed |

Assign **Critical** and **Blocker** defects to engineering immediately. Do not mark UAT complete while Blockers remain open.

### 5.6 Reset demo data (optional mid-cycle)

If queues are emptied or cases mutate shared rows, re-run **`PERFORMANCE_HUB_DEMO_DATA.md` §4** on staging (idempotent), then re-run **PH-UAT-SETUP-001**.

---

## Phase 6 — Sign-off & handback to engineering

**Owner:** UAT lead  
**Form:** `docs/performance-hub/PERFORMANCE_HUB_UAT_SIGNOFF.md`

### 6.1 Completion criteria

UAT is **complete** when all of the following are true:

| Criterion | Done? |
|-----------|-------|
| Phases 1–4 documented on sign-off form | ☐ |
| All **51** cases marked Pass, Fail, Blocked, or N/R with notes | ☐ |
| Every **Fail** has a row in defect tracker | ☐ |
| No open **Blocker** or **Critical** defects (or explicit business acceptance recorded) | ☐ |
| Sign-off form signed by UAT lead + product owner | ☐ |
| Build version (branch, SHA, publish date) recorded | ☐ |

### 6.2 After sign-off

- Return completed **sign-off form** and **defect tracker** to engineering.
- Engineering may proceed with **next module development** only after sign-off (or documented waiver).
- **Do not** run Performance Hub UAT on production.

---

## Appendix A — Severity guide

| Level | When to use |
|-------|-------------|
| **Blocker** | Cannot continue UAT; cannot log in; hub missing |
| **Critical** | Main workflow broken; no workaround |
| **Major** | Wrong behaviour; workaround exists |
| **Minor** | Cosmetic or small edge case |
| **Trivial** | Polish only |
| **N/A** | Test passed |

---

## Appendix B — Known non-blockers (Phase C)

These may appear during UAT; log as Minor or accept per UAT lead. Details: `PERFORMANCE_HUB_UAT_READY.md`.

- Command center URL not nav-gated (staging access control mitigates)
- `/incentives/*` pages outside hub theme shell
- Director may not see wallet exception rows on approvals (test exceptions as admin/manager)
- Wallet policy not in sidebar (open via command center)
- Offer analytics ROI not tied to period bar (use WIR cards for period scope)

---

## Appendix C — Engineering contact checklist

When requesting setup, send UAT lead only:

1. Staging base URL  
2. Confirmation Phases **1–4** complete  
3. Shared demo password (secure channel)  
4. Link to this guide: **Guide → Performance Hub UAT** (`/guides/performance-hub-uat`)

---

*End of Performance Hub UAT guide.*
