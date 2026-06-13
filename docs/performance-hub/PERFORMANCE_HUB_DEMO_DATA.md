# Performance Hub — Demo Data Pack (UAT)

**Purpose:** Load a deterministic demo dataset so testers can walk every Performance Hub screen and every batch-UAT scenario (5Q–5W, 6A–6E) **without creating records manually**.

**Demo period:** `2026-06` (matches `fn_performance_hub_readiness_check('2026-06')` and `docs/INCENTIVE_PHASE5_BATCH_UAT.md`).

**Primary branch:** `Genda Circle` (resolved at runtime — do not hard-code branch UUIDs).

---

## 1. Gap analysis — is the current database sufficient?

**Verdict: No.** A typical Lovable / staging database after migrations **does not** contain enough linked data to exercise all Performance Hub workflows end-to-end.

### What migrations already seed (no demo pack needed)

| Area | Source migration | Notes |
|------|------------------|-------|
| Branches | `20260519024118_*.sql` | Genda Circle, Ajwa, Karelibaug, … |
| Wallet multiplier bands | `20260610320000_sprint2_wallet_sizing.sql` | Achievement → multiplier table |
| Wallet unlock bands | `20260631120000_incentive_platform_phase5n.sql` | Unlock % of potential |
| Approved offer types | `20260610352000_sprint5_strategic_wallets.sql` | Counselor self-serve matrix |
| Margin floor policies | `20260705120000` (5S), `20260707120000` (5U) | Global 80% + per-service floors |
| Cross-sell journey templates | `20260703120000_incentive_platform_phase5q.sql` | `cross_sell_coaching_abroad`, `cross_sell_allied_bundle` |
| Scheme templates | `20260630120000_incentive_platform_phase5m.sql` | Clone-from-template only; no live plans assigned |

### What is **missing** for UAT (this pack supplies)

| Gap | Blocks |
|-----|--------|
| No dedicated Performance Hub test users (counselor with/without target, manager, admin, director, telecaller, MarCom) | Role-gated screens, approval depth matrix, director read-only (6B) |
| No clients mapped to cross-sell / propensity / give-discount / A/B / legacy banner flows | 5Q, 5R, 5S, 5T, 6C, 6D |
| No `offers` rows in all lifecycle states + funding mixes | Offers library, wizard, analytics, give discount |
| No `service_offers` legacy row | 6D convergence banner on invoice preview |
| No open `discount_wallets` for `2026-06` (personal, branch pool, strategic) | Home wallet card, give discount, branch pool, period close |
| No queue rows (`discount_approval_requests`, `promotion_requests`, `wallet_exception_requests`) | Command center counts, approvals, promotion requests |
| No classified + **unclassified** `incentive_qualifying_events` | Unclassified payments admin, revenue breakdown, readiness blocker W2 |
| No `incentive_targets`, `incentive_runs`, `incentive_line_items`, `incentive_payouts` | Team view, earning ticker (5T), payouts desk |
| No `counselor_performance_scores` for WIR card (5U) | Wallet impact revenue card on home |
| No running A/B experiment + assignments | A/B tests screen, variant badge (5R) |
| No active journey **enrollment** on a demo client | Journeys screen, cross-sell strip (5Q) |
| No `incentive_branch_contests` | Competitions screen |
| No `campaign_calendar`, `offer_groups`, or `offer_templates` rows | Calendar, Segments, Automation screens look empty |
| No offers in all lifecycle statuses + `offer_status_history` | Offers library filters sparse |
| No analytics ROI rows (`offer_events` viewed/claimed + invoice attribution) | Offer analytics charts empty |
| No Ajwa branch qualifying events | Competitions standings show ₹0 |
| No incentive plan **rules/slabs** on demo plan | Plans & rules tab sparse |
| No Rohit team metrics / performance score | Team view + Rohit home cards sparse |

**Readiness check before seed:**

```sql
SELECT fn_performance_hub_readiness_check('2026-06');
```

After seed (with blockers intentionally present for queue UAT): expect `ready_for_period_lock: false` until you resolve demo blockers in scenario **W2-clear**.

---

## 2. Demo record registry

All IDs are fixed UUIDs using **hex-only** segments (`0-9`, `a-f` only — PostgreSQL rejects letters like `t`, `q`, `s` in UUID strings). Prefix `a00x` maps entity type; users/clients/offers keep `b1000001`, `c1000001`, `o1000001` style where already valid.

### 2.1 Test users (auth + profiles)

Create users in **Team & Roles** (or Supabase Auth invite) **before** running SQL. Password is your environment default; emails must match exactly.

| Email | Display name | Role(s) | Branch | Profile UUID |
|-------|--------------|---------|--------|--------------|
| `ph.counselor1@flowlink.demo` | Priya Mehta | `counselor` | Genda Circle | `b1000001-0001-4000-8000-000000000001` |
| `ph.counselor2@flowlink.demo` | Rohit Shah | `counselor` | Genda Circle | `b1000002-0002-4000-8000-000000000002` |
| `ph.manager@flowlink.demo` | Neha Manager | `manager` | Genda Circle | `b1000003-0003-4000-8000-000000000003` |
| `ph.admin@flowlink.demo` | Admin Demo | `admin` | Genda Circle | `b1000004-0004-4000-8000-000000000004` |
| `ph.director@flowlink.demo` | Director Demo | `director` | Genda Circle | `b1000005-0005-4000-8000-000000000005` |
| `ph.telecaller@flowlink.demo` | Tara Telecaller | `telecaller` | Genda Circle | `b1000006-0006-4000-8000-000000000006` |
| `ph.marcom@flowlink.demo` | Maya MarCom | `counselor` + modules **`offers`** edit + **`offers_ai`** edit | Genda Circle | `b1000007-0007-4000-8000-000000000007` |

> **Note:** If invite flow generates different UUIDs, update the SQL variables in §4 to match `auth.users.id` / `profiles.id` from:
> `SELECT id, email FROM auth.users WHERE email LIKE 'ph.%@flowlink.demo';`

### 2.2 Test clients

| Application ID | Full name | UUID | Counselor | Primary UAT use |
|----------------|-----------|------|-----------|-----------------|
| `PH-DEMO-001` | Aman Shah | `c1000001-0001-4000-8000-000000000001` | Priya | Cross-sell coaching→abroad (5Q), hot propensity (5T), journey enrollment |
| `PH-DEMO-002` | Ritika Jain | `c1000002-0002-4000-8000-000000000002` | Priya | Study abroad + allied cross-sell; dismiss suggestion (5Q Q3) |
| `PH-DEMO-003` | Farhan Ali | `c1000003-0003-4000-8000-000000000003` | Priya | Give discount, admission 85% floor (5S, 5U), below-floor approval |
| `PH-DEMO-004` | Unclassified Pay Client | `c1000004-0004-4000-8000-000000000004` | Priya | Unclassified payment queue (5C / W1) |
| `PH-DEMO-005` | AB Test Client | `c1000005-0005-4000-8000-000000000005` | Priya | A/B variant badge (5R) |
| `PH-DEMO-006` | Legacy Reg Client | `c1000006-0006-4000-8000-000000000006` | Priya | Legacy `service_offers` banner (6D) |

### 2.3 Offers (`offers` table)

| Title | UUID | Status | Funding | Discount |
|-------|------|--------|---------|----------|
| PH Demo · FL 10% IELTS Coaching | `o1000001-0001-4000-8000-000000000001` | `active` | `future_link` | 10% |
| PH Demo · University 15% Admission | `o1000002-0002-4000-8000-000000000002` | `active` | `university` | 15% |
| PH Demo · Joint 60/40 Bundle | `o1000003-0003-4000-8000-000000000003` | `active` | `joint` | 20% (60% FL / 40% uni) |
| PH Demo · Full Waiver (admin) | `o1000004-0004-4000-8000-000000000004` | `active` | `future_link` | 100% |
| PH Demo · Draft Pending Review | `o1000005-0005-4000-8000-000000000005` | `draft` | `future_link` | 12% |
| PH Demo · AB Variant A (12%) | `o1000006-0006-4000-8000-000000000006` | `active` | `future_link` | 12% |
| PH Demo · AB Variant B (8%) | `o1000007-0007-4000-8000-000000000007` | `active` | `future_link` | 8% |

**Extended lifecycle & studio rows (§4.4 — run after main §4):**

| Title | UUID | Status | Screen |
|-------|------|--------|--------|
| PH Demo · Approved Canada push | `o1000008-0008-4000-8000-000000000008` | `approved` | Offers library lifecycle |
| PH Demo · Scheduled July intake | `o1000009-0009-4000-8000-000000000009` | `scheduled` | Library + calendar |
| PH Demo · Pending review draft | `o1000010-0010-4000-8000-000000000010` | `pending_review` | Library review queue |
| PH Demo · Expiring soon IELTS | `o1000011-0011-4000-8000-000000000011` | `expiring_soon` | Library expiry badge |
| PH Demo · Archived winter promo | `o1000012-0012-4000-8000-000000000012` | `archived` | Library archive filter |
| PH Demo · Published field offer 8% | `o1000013-0013-4000-8000-000000000013` | `active` | Library + analytics ROI |

| Studio entity | UUID | Notes |
|---------------|------|-------|
| Campaign · Monsoon IELTS | `cc100001-0001-4000-8000-000000000001` | Linked `o1000001`, status `live` |
| Campaign · Canada intake | `cc100002-0002-4000-8000-000000000002` | Linked `o1000002`, status `planned` |
| Campaign · Rakhi branch push | `cc100003-0003-4000-8000-000000000003` | Festival type, no linked offer |
| Segment · Coaching hot list | `a0110001-0001-4000-8000-000000000001` | Members `c1000001`, `c1000005` |
| Segment · Study abroad prospects | `a0110002-0002-4000-8000-000000000002` | Members `c1000002`, `c1000003` |
| Auto-rule · Birthday 10% | `a0140001-0001-4000-8000-000000000001` | Active birthday template |
| Auto-rule · First payment 5% | `a0140002-0002-4000-8000-000000000002` | Workflow trigger |
| Incentive rule · Core 5% | `a0160001-0001-4000-8000-000000000001` | Plan `a0040001` |
| Ajwa contest revenue events | `a00e0007`, `a00e0008` | Branch contest standings (Ajwa ~₹1.42L vs Genda ~₹1.95L) |
| Rohit team metrics | `a00e0005`, `a00e0006`, `a0100002` | Team view + WIR card |

### 2.4 Legacy offer (`service_offers`)

| Code | UUID | Banner trigger |
|------|------|----------------|
| `PH-LEGACY-10` | `a0010001-0001-4000-8000-000000000001` | Active legacy row for 6D convergence banner |

### 2.5 Wallets (`2026-06`)

| Name | UUID | Owner | `budget_kind` | Key fields |
|------|------|-------|---------------|------------|
| Priya personal Jun-2026 | `a0020001-0001-4000-8000-000000000001` | Priya | `month_to_month` | target ₹5,00,000; potential ₹25,000; unlocked ₹15,000; balance ₹15,000 |
| Rohit no-target Jun-2026 | `a0020002-0002-4000-8000-000000000002` | Rohit | `month_to_month` | `assigned_target` NULL — shows no-target copy on home |
| Genda Circle branch pool Jun-2026 | `a0020003-0003-4000-8000-000000000003` | branch pool | `branch_pool` | balance ₹50,000 |
| Strategic Germany scope | `a0020004-0004-4000-8000-000000000004` | Priya | `scoped` | `scope_country_tag = 'DE'` |

### 2.6 Queues & workflows

| Entity | UUID | Status | Screen |
|--------|------|--------|--------|
| Discount approval · instant (applied) | `d1000001-0001-4000-8000-000000000001` | `applied` | Approvals history |
| Discount approval · manager pending | `d1000002-0002-4000-8000-000000000002` | `pending` / level `manager` | `/performance/admin/approvals` |
| Discount approval · below floor admin | `d1000003-0003-4000-8000-000000000003` | `pending` / level `admin` / `below_floor=true` | Approvals + give discount (5S) |
| Discount approval · waiver attempt | `d1000004-0004-4000-8000-000000000004` | `pending` / `is_waiver=true` | Waiver guard (5S S3) |
| Promotion request · pending | `a00f0001-0001-4000-8000-000000000001` | `pending` | `/performance/offers/requests` |
| Promotion request · in review | `a00f0002-0002-4000-8000-000000000002` | `in_review` | Promotion requests |
| Promotion request · approved | `a00f0003-0003-4000-8000-000000000003` | `approved` | Publish → draft offer |
| Wallet exception · pending | `e1000001-0001-4000-8000-000000000001` | `pending` | Command center + home exception form |
| Unclassified qualifying event | `a00e0004-0004-4000-8000-000000000004` | missing `master_key` | `/performance/admin/unclassified` |

### 2.7 Incentives & competitions

| Entity | UUID | Notes |
|--------|------|-------|
| Incentive target (Priya Jun-2026) | `a0030001-0001-4000-8000-000000000001` | ₹5,00,000 net revenue |
| Incentive plan | `a0040001-0001-4000-8000-000000000001` | PH Demo Counselor Plan |
| Incentive run (open) | `a0050001-0001-4000-8000-000000000001` | `2026-06`, `locked=false` |
| Incentive line item | `a0060001-0001-4000-8000-000000000001` | Priya earned ₹12,500 |
| Incentive line item (Q4 ticker) | `a0060002-0002-4000-8000-000000000002` | Second line — admin updates for live refresh |
| Applied wallet allocation | `a0080001-0001-4000-8000-000000000001` | ₹4,500 applied — V1/V2 analytics |
| Incentive payout (approved) | `a0070001-0001-4000-8000-000000000001` | Priya net ₹11,250 |
| Counselor performance score | `a0100001-0001-4000-8000-000000000001` | WIR card: impact ₹80,000 / used ₹10,000 |
| Branch contest Jun-2026 | `a0090001-0001-4000-8000-000000000001` | Genda Circle vs Ajwa |
| A/B experiment | `ab100001-0001-4000-8000-000000000001` | `running`; variants A/B on `o1000006` / `o1000007` |
| Journey enrollment (Aman) | `a00a0001-0001-4000-8000-000000000001` | Active on template `cross_sell_coaching_abroad` |

---

## 3. Prerequisites

1. Apply all migrations through **Phase 6B** (`20260711120000` + `20260711120001`).
2. Apply **`20260712120000_performance_hub_offer_events_sent.sql`** (`offer_events` `sent` type).
3. Lovable Publish complete (Edge functions: `incentive-calculate-run`, etc.).
4. Create the seven test users (§2.1) and assign roles/modules (**MarCom needs `offers` + `offers_ai` edit**).
5. Confirm **`service_library`** contains at least one IELTS/coaching row (for unclassified classify UI — W2 / UNCL-001).
6. Run the SQL in **§4** (core UAT queues + clients), then **§4.4** (studio screens, reports, lifecycle offers).
7. Set Performance Hub period bar to **`2026-06`** and run UAT in calendar month **June 2026** when possible (promotions strip wallet RPC uses `current_date`).

**Verify load:**

```sql
SELECT fn_performance_hub_readiness_check('2026-06');
-- Expect queues.unclassified_payments >= 1, pending_discount_approvals >= 2, etc.

SELECT id, full_name FROM clients WHERE application_id LIKE 'PH-DEMO-%';
SELECT title, status FROM offers WHERE title LIKE 'PH Demo%';
```

---

## 4. SQL seed script

Run as **service role** / migration admin. Script is idempotent (`ON CONFLICT` on fixed UUIDs).

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Performance Hub UAT demo seed · period 2026-06
-- ═══════════════════════════════════════════════════════════════════════════

DO $seed$
DECLARE
  v_period text := '2026-06';
  v_branch_genda uuid;
  v_branch_ajwa uuid;
  -- Resolve demo user IDs by email (fallback to fixed UUIDs if profiles pre-linked)
  v_priya uuid := coalesce(
    (SELECT id FROM auth.users WHERE email = 'ph.counselor1@flowlink.demo'),
    'b1000001-0001-4000-8000-000000000001'::uuid
  );
  v_rohit uuid := coalesce(
    (SELECT id FROM auth.users WHERE email = 'ph.counselor2@flowlink.demo'),
    'b1000002-0002-4000-8000-000000000002'::uuid
  );
  v_manager uuid := coalesce(
    (SELECT id FROM auth.users WHERE email = 'ph.manager@flowlink.demo'),
    'b1000003-0003-4000-8000-000000000003'::uuid
  );
  v_admin uuid := coalesce(
    (SELECT id FROM auth.users WHERE email = 'ph.admin@flowlink.demo'),
    'b1000004-0004-4000-8000-000000000004'::uuid
  );
  v_director uuid := coalesce(
    (SELECT id FROM auth.users WHERE email = 'ph.director@flowlink.demo'),
    'b1000005-0005-4000-8000-000000000005'::uuid
  );
  v_telecaller uuid := coalesce(
    (SELECT id FROM auth.users WHERE email = 'ph.telecaller@flowlink.demo'),
    'b1000006-0006-4000-8000-000000000006'::uuid
  );
  v_marcom uuid := coalesce(
    (SELECT id FROM auth.users WHERE email = 'ph.marcom@flowlink.demo'),
    'b1000007-0007-4000-8000-000000000007'::uuid
  );
  v_journey_coaching uuid;
BEGIN
  SELECT id INTO v_branch_genda FROM public.branches WHERE name = 'Genda Circle' LIMIT 1;
  SELECT id INTO v_branch_ajwa FROM public.branches WHERE name = 'Ajwa' LIMIT 1;
  SELECT id INTO v_journey_coaching
    FROM public.offer_automation_journeys
   WHERE template_key = 'cross_sell_coaching_abroad'
   LIMIT 1;

  IF v_branch_genda IS NULL THEN
    RAISE EXCEPTION 'Branch Genda Circle not found — run branch migration first';
  END IF;

  -- ── Profiles (branch assignment) ─────────────────────────────────────────
  UPDATE public.profiles SET branch_id = v_branch_genda, full_name = 'Priya Mehta'
   WHERE id = v_priya;
  UPDATE public.profiles SET branch_id = v_branch_genda, full_name = 'Rohit Shah'
   WHERE id = v_rohit;
  UPDATE public.profiles SET branch_id = v_branch_genda, full_name = 'Neha Manager'
   WHERE id = v_manager;
  UPDATE public.profiles SET branch_id = v_branch_genda, full_name = 'Admin Demo'
   WHERE id = v_admin;
  UPDATE public.profiles SET branch_id = v_branch_genda, full_name = 'Director Demo'
   WHERE id = v_director;
  UPDATE public.profiles SET branch_id = v_branch_genda, full_name = 'Tara Telecaller'
   WHERE id = v_telecaller;
  UPDATE public.profiles SET branch_id = v_branch_genda, full_name = 'Maya MarCom'
   WHERE id = v_marcom;

  -- ── Clients ──────────────────────────────────────────────────────────────
  INSERT INTO public.clients (
    id, application_id, application_type, full_name, country, status,
    branch, assigned_counselor_id, owner_id,
    coaching_services, admission_services, allied_services, visa_services,
    lead_score, education_history, english_sections, extra_items, suppressed_template_items, tags
  ) VALUES
  (
    'c1000001-0001-4000-8000-000000000001', 'PH-DEMO-001', 'coaching', 'Aman Shah', 'India', 'active',
    'Genda Circle', v_priya, v_priya,
    ARRAY['IELTS Coaching'], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[],
    72, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, ARRAY[]::text[], ARRAY['ph-demo','coaching-only']
  ),
  (
    'c1000002-0002-4000-8000-000000000002', 'PH-DEMO-002', 'study_abroad', 'Ritika Jain', 'India', 'active',
    'Genda Circle', v_priya, v_priya,
    ARRAY[]::text[], ARRAY['University Application'], ARRAY[]::text[], ARRAY['Student Visa'],
    65, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, ARRAY[]::text[], ARRAY['ph-demo','study-abroad']
  ),
  (
    'c1000003-0003-4000-8000-000000000003', 'PH-DEMO-003', 'study_abroad', 'Farhan Ali', 'India', 'active',
    'Genda Circle', v_priya, v_priya,
    ARRAY[]::text[], ARRAY['University Application'], ARRAY[]::text[], ARRAY[]::text[],
    58, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, ARRAY[]::text[], ARRAY['ph-demo','give-discount']
  ),
  (
    'c1000004-0004-4000-8000-000000000004', 'PH-DEMO-004', 'coaching', 'Unclassified Pay Client', 'India', 'active',
    'Genda Circle', v_priya, v_priya,
    ARRAY['IELTS Coaching'], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[],
    40, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, ARRAY[]::text[], ARRAY['ph-demo','unclassified']
  ),
  (
    'c1000005-0005-4000-8000-000000000005', 'PH-DEMO-005', 'coaching', 'AB Test Client', 'India', 'active',
    'Genda Circle', v_priya, v_priya,
    ARRAY['IELTS Coaching'], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[],
    50, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, ARRAY[]::text[], ARRAY['ph-demo','ab-test']
  ),
  (
    'c1000006-0006-4000-8000-000000000006', 'PH-DEMO-006', 'coaching', 'Legacy Reg Client', 'India', 'active',
    'Genda Circle', v_priya, v_priya,
    ARRAY['IELTS Coaching'], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[],
    45, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, ARRAY[]::text[], ARRAY['ph-demo','legacy-offer']
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    assigned_counselor_id = EXCLUDED.assigned_counselor_id,
    coaching_services = EXCLUDED.coaching_services,
    admission_services = EXCLUDED.admission_services;

  -- ── Legacy service_offers (6D banner) ────────────────────────────────────
  INSERT INTO public.service_offers (
    id, offer_name, offer_code, offer_type, discount_percent,
    valid_from, is_active, is_hidden, notes
  ) VALUES (
    'a0010001-0001-4000-8000-000000000001',
    'PH Legacy 10% IELTS', 'PH-LEGACY-10', 'PERCENT', 10,
    '2026-01-01', true, false,
    'Demo legacy offer for service_offers convergence banner (Phase 6D)'
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── Offers (Performance Hub library) ─────────────────────────────────────
  INSERT INTO public.offers (
    id, title, description, discount_type, discount_value, status, funding_source,
    audience, currency, is_active, requires_approval, per_client_limit,
    fl_contribution_pct, university_contribution_pct, created_by, branch_id,
    applicable_services, target_countries, valid_from, valid_to
  ) VALUES
  (
    'o1000001-0001-4000-8000-000000000001',     'PH Demo · FL 10% IELTS Coaching',
    'UAT active FL-funded coaching discount', 'percentage', 10, 'active', 'future_link',
    'global', 'INR', true, false, 1,
    100, NULL, v_priya, v_branch_genda,
    ARRAY['IELTS Coaching'], ARRAY['IN'], '2026-06-01', '2026-06-30'
  ),
  (
    'o1000002-0002-4000-8000-000000000002', 'PH Demo · University 15% Admission',
    'University-funded admission discount', 'percentage', 15, 'active', 'university',
    'global', 'INR', true, true, 1,
    0, 100, v_admin, v_branch_genda,
    ARRAY['University Application'], ARRAY['IN','CA'], '2026-06-01', '2026-06-30'
  ),
  (
    'o1000003-0003-4000-8000-000000000003', 'PH Demo · Joint 60/40 Bundle',
    'Joint funding split', 'percentage', 20, 'active', 'joint',
    'global', 'INR', true, false, 2,
    60, 40, v_admin, v_branch_genda,
    ARRAY['IELTS Coaching','University Application'], ARRAY['IN'], '2026-06-01', '2026-06-30'
  ),
  (
    'o1000004-0004-4000-8000-000000000004',     'PH Demo · Full Waiver (admin)',
    '100% waiver — admin only', 'percentage', 100, 'active', 'future_link',
    'global', 'INR', true, true, 1,
    100, NULL, v_admin, v_branch_genda,
    ARRAY['University Application'], ARRAY['IN'], '2026-06-01', '2026-06-30'
  ),
  (
    'o1000005-0005-4000-8000-000000000005', 'PH Demo · Draft Pending Review',
    'Draft for library review flow', 'percentage', 12, 'draft', 'future_link',
    'global', 'INR', false, true, 1,
    100, NULL, v_admin, v_branch_genda,
    ARRAY['IELTS Coaching'], ARRAY['IN'], NULL, NULL
  ),
  (
    'o1000006-0006-4000-8000-000000000006', 'PH Demo · AB Variant A (12%)',
    'A/B experiment variant A', 'percentage', 12, 'active', 'future_link',
    'global', 'INR', true, false, 1,
    100, NULL, v_admin, v_branch_genda,
    ARRAY['IELTS Coaching'], ARRAY['IN'], '2026-06-01', '2026-06-30'
  ),
  (
    'o1000007-0007-4000-8000-000000000007', 'PH Demo · AB Variant B (8%)',
    'A/B experiment variant B', 'percentage', 8, 'active', 'future_link',
    'global', 'INR', true, false, 1,
    100, NULL, v_admin, v_branch_genda,
    ARRAY['IELTS Coaching'], ARRAY['IN'], '2026-06-01', '2026-06-30'
  )
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status;

  -- ── Wallets ──────────────────────────────────────────────────────────────
  INSERT INTO public.discount_wallets (
    id, counselor_id, branch_id, period_key, currency, name, budget_kind,
    assigned_target, potential_wallet, unlocked_amount, balance, base_wallet,
    achieved_revenue, achievement_pct, max_percent_per_client
  ) VALUES
  (
    'a0020001-0001-4000-8000-000000000001', v_priya, v_branch_genda, v_period, 'INR',
    'PH Demo · Priya Jun-2026', 'month_to_month',
    500000, 25000, 15000, 15000, 25000,
    320000, 64, 15
  ),
  (
    'a0020002-0002-4000-8000-000000000002', v_rohit, v_branch_genda, v_period, 'INR',
    'PH Demo · Rohit no-target', 'month_to_month',
    NULL, 12000, 8000, 8000, 12000,
    0, NULL, 10
  ),
  (
    'a0020003-0003-4000-8000-000000000003', NULL, v_branch_genda, v_period, 'INR',
    'PH Demo · Genda branch pool', 'branch_pool',
    NULL, 0, 0, 50000, 50000,
    0, NULL, 15
  ),
  (
    'a0020004-0004-4000-8000-000000000004', v_priya, v_branch_genda, v_period, 'INR',
    'PH Demo · Strategic DE', 'scoped',
    NULL, 8000, 8000, 8000, 8000,
    0, NULL, 10
  )
  ON CONFLICT (id) DO UPDATE SET balance = EXCLUDED.balance, unlocked_amount = EXCLUDED.unlocked_amount;

  UPDATE public.discount_wallets
     SET scope_country_tag = 'DE'
   WHERE id = 'a0020004-0004-4000-8000-000000000004';

  -- ── Incentive target ─────────────────────────────────────────────────────
  INSERT INTO public.incentive_targets (
    id, counselor_id, branch_id, period_key, period_type,
    target_metric, target_value, target_currency, plan_id
  ) VALUES (
    'a0030001-0001-4000-8000-000000000001',
    v_priya, v_branch_genda, v_period, 'monthly',
    'net_revenue', 500000, 'INR', NULL
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── Verified payments (unclassified list + hot propensity) ───────────────
  INSERT INTO public.client_invoices (
    id, client_id, invoice_number, amount, currency, status, line_items, assigned_counselor_id
  ) VALUES
  (
    'a00c0001-0001-4000-8000-000000000001',
    'c1000001-0001-4000-8000-000000000001',
    'PH-DEMO-INV-001',
    45000, 'INR', 'paid',
    jsonb_build_array(jsonb_build_object(
      'master_key', 'coaching_services',
      'service_code', 'IELTS',
      'description', 'PH Demo IELTS coaching',
      'amount', 45000
    )),
    v_priya
  ),
  (
    'a00c0004-0004-4000-8000-000000000004',
    'c1000004-0004-4000-8000-000000000004',
    'PH-DEMO-INV-004',
    22000, 'INR', 'paid',
    jsonb_build_array(jsonb_build_object(
      'description', 'PH Demo unclassified payment',
      'amount', 22000
    )),
    v_priya
  ),
  (
    'a00c0002-0002-4000-8000-000000000002',
    'c1000002-0002-4000-8000-000000000002',
    'PH-DEMO-INV-002',
    120000, 'INR', 'paid',
    jsonb_build_array(jsonb_build_object(
      'master_key', 'admission_services',
      'service_code', 'UNIV_APP',
      'description', 'PH Demo university application',
      'amount', 120000
    )),
    v_priya
  ),
  (
    'a00c0003-0003-4000-8000-000000000003',
    'c1000002-0002-4000-8000-000000000002',
    'PH-DEMO-INV-003',
    8500, 'INR', 'paid',
    jsonb_build_array(jsonb_build_object(
      'master_key', 'allied_services',
      'service_code', 'FOREX',
      'description', 'PH Demo forex allied',
      'amount', 8500
    )),
    v_priya
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.client_invoice_payments (
    id, client_id, invoice_id, amount, currency, method, paid_at,
    payment_status, payment_proof_status
  ) VALUES
  (
    'a00d0001-0001-4000-8000-000000000001',
    'c1000001-0001-4000-8000-000000000001',
    'a00c0001-0001-4000-8000-000000000001',
    45000, 'INR', 'bank_transfer', '2026-06-05',
    'verified', 'verified'
  ),
  (
    'a00d0004-0004-4000-8000-000000000004',
    'c1000004-0004-4000-8000-000000000004',
    'a00c0004-0004-4000-8000-000000000004',
    22000, 'INR', 'bank_transfer', '2026-06-12',
    'verified', 'verified'
  ),
  (
    'a00d0002-0002-4000-8000-000000000002',
    'c1000002-0002-4000-8000-000000000002',
    'a00c0002-0002-4000-8000-000000000002',
    120000, 'INR', 'bank_transfer', '2026-06-08',
    'verified', 'verified'
  ),
  (
    'a00d0003-0003-4000-8000-000000000003',
    'c1000002-0002-4000-8000-000000000002',
    'a00c0003-0003-4000-8000-000000000003',
    8500, 'INR', 'bank_transfer', '2026-06-10',
    'verified', 'verified'
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── Classified qualifying events (Priya revenue breakdown) ───────────────
  INSERT INTO public.incentive_qualifying_events (
    id, event_type, event_date, period_key, counselor_id, client_id, branch_id,
    amount, currency, source_type, dimensions, source_table, source_id
  ) VALUES
  (
    'a00e0001-0001-4000-8000-000000000001', 'first_verified_payment', '2026-06-03', v_period,
    v_priya, 'c1000001-0001-4000-8000-000000000001', v_branch_genda,
    45000, 'INR', 'service_revenue',
    jsonb_build_object('master_key','coaching_services','service_code','IELTS','is_first_payment','true'),
    'client_invoice_payments', 'a00d0001-0001-4000-8000-000000000001'
  ),
  (
    'a00e0002-0002-4000-8000-000000000002', 'first_verified_payment', '2026-06-08', v_period,
    v_priya, 'c1000002-0002-4000-8000-000000000002', v_branch_genda,
    120000, 'INR', 'service_revenue',
    jsonb_build_object('master_key','admission_services','service_code','UNIV_APP'),
    'client_invoice_payments', 'a00d0002-0002-4000-8000-000000000002'
  ),
  (
    'a00e0003-0003-4000-8000-000000000003', 'first_verified_payment', '2026-06-10', v_period,
    v_priya, 'c1000002-0002-4000-8000-000000000002', v_branch_genda,
    8500, 'INR', 'service_revenue',
    jsonb_build_object('master_key','allied_services','service_code','FOREX'),
    'client_invoice_payments', 'a00d0003-0003-4000-8000-000000000003'
  ),
  -- Unclassified (blocks readiness until classified)
  (
    'a00e0004-0004-4000-8000-000000000004', 'first_verified_payment', '2026-06-12', v_period,
    v_priya, 'c1000004-0004-4000-8000-000000000004', v_branch_genda,
    22000, 'INR', 'service_revenue',
    '{}'::jsonb,
    'client_invoice_payments', 'a00d0004-0004-4000-8000-000000000004'
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── Discount approval queue ────────────────────────────────────────────────
  INSERT INTO public.discount_approval_requests (
    id, period_key, counselor_id, client_id, wallet_id, offer_id,
    discount_amount, discount_percent, wallet_debit, approval_level, status,
    reference_amount, net_after_discount, below_floor, is_waiver, request_note
  ) VALUES
  (
    'd1000001-0001-4000-8000-000000000001', v_period, v_priya,
    'c1000001-0001-4000-8000-000000000001', 'a0020001-0001-4000-8000-000000000001',
    'o1000001-0001-4000-8000-000000000001',
    4500, 10, 4500, 'instant', 'applied',
    45000, 40500, false, false, 'PH Demo instant apply (historical)'
  ),
  (
    'd1000002-0002-4000-8000-000000000002', v_period, v_priya,
    'c1000002-0002-4000-8000-000000000002', 'a0020001-0001-4000-8000-000000000001',
    'o1000002-0002-4000-8000-000000000002',
    18000, 15, 0, 'manager', 'pending',
    120000, 102000, false, false, 'PH Demo manager queue'
  ),
  (
    'd1000003-0003-4000-8000-000000000003', v_period, v_priya,
    'c1000003-0003-4000-8000-000000000003', 'a0020001-0001-4000-8000-000000000001',
    'o1000002-0002-4000-8000-000000000002',
    30000, 25, 30000, 'admin', 'pending',
    100000, 70000, true, false, 'PH Demo below admission floor (85%)'
  ),
  (
    'd1000004-0004-4000-8000-000000000004', v_period, v_priya,
    'c1000003-0003-4000-8000-000000000003', 'a0020001-0001-4000-8000-000000000001',
    'o1000004-0004-4000-8000-000000000004',
    100000, 100, 100000, 'admin', 'pending',
    100000, 0, true, true, 'PH Demo full waiver — counselor blocked'
  )
  ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

  -- ── Applied wallet allocation (O10 / analytics V2) ───────────────────────
  INSERT INTO public.wallet_allocations (
    id, wallet_id, counselor_id, client_id, offer_id, invoice_id,
    amount, currency, percent, status, exceeded_cap, created_by, applied_at
  ) VALUES (
    'a0080001-0001-4000-8000-000000000001',
    'a0020001-0001-4000-8000-000000000001', v_priya,
    'c1000001-0001-4000-8000-000000000001',
    'o1000001-0001-4000-8000-000000000001',
    'a00c0001-0001-4000-8000-000000000001',
    4500, 'INR', 10, 'applied', false, v_priya, '2026-06-05'::timestamptz
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── Promotion requests ───────────────────────────────────────────────────
  INSERT INTO public.promotion_requests (
    id, title, description, requested_by, branch_id, funding_source,
    proposed_discount_text, status, offer_category, target_audience
  ) VALUES
  (
    'a00f0001-0001-4000-8000-000000000001',
    'PH Demo · Monsoon IELTS push', 'Field request for June IELTS campaign',
    v_priya, v_branch_genda, 'future_link', '10% on IELTS bundle', 'pending',
    'coaching', 'coaching clients'
  ),
  (
    'a00f0002-0002-4000-8000-000000000002',
    'PH Demo · Canada intake bundle', 'MarCom review in progress',
    v_priya, v_branch_genda, 'joint', '15% joint funded', 'in_review',
    'admission', 'study abroad'
  ),
  (
    'a00f0003-0003-4000-8000-000000000003',
    'PH Demo · Approved publish ready', 'Ready to publish to offers library',
    v_priya, v_branch_genda, 'future_link', '8% coaching', 'approved',
    'coaching', 'global'
  )
  ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

  -- ── Wallet exception ─────────────────────────────────────────────────────
  INSERT INTO public.wallet_exception_requests (
    id, period_key, counselor_id, wallet_id, requested_amount, reason, status
  ) VALUES (
    'e1000001-0001-4000-8000-000000000001', v_period, v_rohit,
    'a0020002-0002-4000-8000-000000000002', 5000,
    'PH Demo — client retention exception', 'pending'
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── Counselor performance score (WIR card 5U) ────────────────────────────
  INSERT INTO public.counselor_performance_scores (
    id, counselor_id, period_key,
    revenue_achievement, wallet_impact_revenue, wallet_used, wallet_roi,
    conversion_rate, client_satisfaction, collections_received, total_score
  ) VALUES (
    'a0100001-0001-4000-8000-000000000001', v_priya, v_period,
    64, 80000, 10000, 8.0,
    72, 88, 95000, 78
  )
  ON CONFLICT (id) DO UPDATE SET wallet_impact_revenue = EXCLUDED.wallet_impact_revenue;

  -- ── Incentive plan + open run + line item ────────────────────────────────
  INSERT INTO public.incentive_plans (
    id, name, description, branch_id, period_type, settlement_currency,
    revenue_basis, scope_type, is_active, created_by
  ) VALUES (
    'a0040001-0001-4000-8000-000000000001',
    'PH Demo Counselor Plan', 'UAT plan for Performance Hub home + runs',
    v_branch_genda, 'monthly', 'INR', 'net', 'branch', true, v_admin
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.incentive_runs (
    id, plan_id, branch_id, period_key, period_type, settlement_currency,
    status, total_settlement, locked, calculated_at, calculated_by
  ) VALUES (
    'a0050001-0001-4000-8000-000000000001',
    'a0040001-0001-4000-8000-000000000001', v_branch_genda, v_period, 'monthly', 'INR',
    'calculated', 12500, false, now(), v_admin
  )
  ON CONFLICT (id) DO UPDATE SET locked = EXCLUDED.locked;

  INSERT INTO public.incentive_line_items (
    id, run_id, counselor_id, source_type, client_id,
    base_amount, base_currency, earned_amount, settlement_currency, note
  ) VALUES
  (
    'a0060001-0001-4000-8000-000000000001',
    'a0050001-0001-4000-8000-000000000001', v_priya, 'service_revenue',
    'c1000001-0001-4000-8000-000000000001',
    45000, 'INR', 12500, 'INR', 'PH Demo calculated line'
  ),
  (
    'a0060002-0002-4000-8000-000000000002',
    'a0050001-0001-4000-8000-000000000001', v_priya, 'service_revenue',
    'c1000002-0002-4000-8000-000000000002',
    120000, 'INR', 8000, 'INR', 'PH Demo second line — update for Q4 ticker test'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.incentive_payouts (
    id, run_id, counselor_id, gross_amount, net_amount, tds_amount, tds_percent,
    settlement_currency, status, notes, approved_by, approved_at
  ) VALUES (
    'a0070001-0001-4000-8000-000000000001',
    'a0050001-0001-4000-8000-000000000001', v_priya,
    12500, 11250, 1250, 10, 'INR', 'approved',
    'PH Demo payout — prior period sample', v_admin, now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── Offer events (O10 influence card 5V) ─────────────────────────────────
  -- Requires migration 20260712120000_performance_hub_offer_events_sent.sql ('sent' in CHECK)

  INSERT INTO public.offer_events (counselor_id, client_id, offer_id, event_type, channel)
  SELECT v_priya, 'c1000001-0001-4000-8000-000000000001',
         'o1000001-0001-4000-8000-000000000001', 'sent', 'ph-demo'
   WHERE NOT EXISTS (
     SELECT 1 FROM public.offer_events oe
      WHERE oe.counselor_id = v_priya AND oe.event_type = 'sent'
        AND oe.offer_id = 'o1000001-0001-4000-8000-000000000001'
        AND oe.created_at::date >= '2026-06-01'
   );

  INSERT INTO public.offer_events (counselor_id, client_id, offer_id, event_type, channel)
  SELECT v_priya, 'c1000001-0001-4000-8000-000000000001',
         'o1000001-0001-4000-8000-000000000001', 'redeemed', 'ph-demo'
   WHERE NOT EXISTS (
     SELECT 1 FROM public.offer_events oe
      WHERE oe.counselor_id = v_priya AND oe.event_type = 'redeemed'
        AND oe.offer_id = 'o1000001-0001-4000-8000-000000000001'
        AND oe.created_at::date >= '2026-06-01'
   );

  -- ── A/B experiment (5R) ──────────────────────────────────────────────────
  INSERT INTO public.offer_ab_experiments (
    id, name, description, status, min_conversions, started_at, created_by
  ) VALUES (
    'ab100001-0001-4000-8000-000000000001',
    'PH Demo · IELTS discount test', 'UAT A/B on PH Demo variants', 'running', 5,
    '2026-06-01', v_admin
  )
  ON CONFLICT (id) DO UPDATE SET status = 'running';

  INSERT INTO public.offer_ab_variants (id, experiment_id, offer_id, variant_code, label)
  VALUES
  ('a00b0001-0001-4000-8000-000000000001', 'ab100001-0001-4000-8000-000000000001',
   'o1000006-0006-4000-8000-000000000006', 'A', 'Variant A · 12%'),
  ('a00b0002-0002-4000-8000-000000000002', 'ab100001-0001-4000-8000-000000000001',
   'o1000007-0007-4000-8000-000000000007', 'B', 'Variant B · 8%')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.offer_ab_assignments (
    id, experiment_id, variant_id, client_id, counselor_id
  ) VALUES (
    'a1000001-0001-4000-8000-000000000001',
    'ab100001-0001-4000-8000-000000000001',
    'a00b0001-0001-4000-8000-000000000001',
    'c1000005-0005-4000-8000-000000000005', v_priya
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── Journey enrollment (5Q) ──────────────────────────────────────────────
  IF v_journey_coaching IS NOT NULL THEN
    INSERT INTO public.offer_journey_enrollments (
      id, journey_id, client_id, counselor_id, status, enrolled_at, next_step_at
    ) VALUES (
      'a00a0001-0001-4000-8000-000000000001',
      v_journey_coaching,
      'c1000001-0001-4000-8000-000000000001', v_priya,
      'active', '2026-06-01', '2026-06-08'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- ── Branch contest ───────────────────────────────────────────────────────
  INSERT INTO public.incentive_branch_contests (
    id, name, period_key, metric, pool_amount, settlement_currency,
    min_branch_total, winner_mode, split_mode, status, is_active
  ) VALUES (
    'a0090001-0001-4000-8000-000000000001',
    'PH Demo · June branch challenge', v_period, 'net_revenue', 25000, 'INR',
    100000, 'top_branch', 'by_contribution', 'active', true
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.incentive_contest_branches (contest_id, branch_id)
  VALUES
  ('a0090001-0001-4000-8000-000000000001', v_branch_genda),
  ('a0090001-0001-4000-8000-000000000001', v_branch_ajwa)
  ON CONFLICT DO NOTHING;

END;
$seed$;
```

### 4.1 Optional: extra verified payments for cross-sell (5T)

Aman Shah (`a00d0001`) and unclassified client (`a00d0004`) payments are included in the main §4 seed. Use this block only if you need **additional** payment rows for propensity / cross-sell cards (lookup a coaching row from your live `service_library`):

```sql
-- Example: extra payment row (adjust service_library id if needed)
INSERT INTO public.client_invoices (
  id, client_id, invoice_number, amount, currency, status, line_items, assigned_counselor_id
) VALUES (
  'a00c0001-0001-4000-8000-000000000001',
  'c1000001-0001-4000-8000-000000000001',
  'PH-DEMO-INV-001',
  45000, 'INR', 'paid',
  jsonb_build_array(jsonb_build_object(
    'master_key', 'coaching_services',
    'service_code', 'IELTS',
    'description', 'PH Demo IELTS coaching',
    'amount', 45000
  )),
  (SELECT id FROM auth.users WHERE email = 'ph.counselor1@flowlink.demo')
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.client_invoice_payments (
  id, client_id, invoice_id, amount, currency, method, paid_at,
  payment_status, payment_proof_status
) VALUES (
  'a00d0001-0001-4000-8000-000000000001',
  'c1000001-0001-4000-8000-000000000001',
  'a00c0001-0001-4000-8000-000000000001',
  45000, 'INR', 'bank_transfer', '2026-06-05',
  'verified', 'verified'
)
ON CONFLICT (id) DO NOTHING;
```

### 4.2 Classify unclassified payment (clears W2 blocker)

**Option A — UI:** `/performance/admin/unclassified` → map **PH-DEMO-004** payment using service library picker.

**Option B — SQL (no invoice required):** patch the qualifying event dimensions:

```sql
UPDATE public.incentive_qualifying_events
   SET dimensions = jsonb_build_object(
     'master_key', 'coaching_services',
     'service_code', 'IELTS',
     'is_first_payment', 'true'
   )
 WHERE id = 'a00e0004-0004-4000-8000-000000000004';
```

**Option C — RPC (requires real `client_invoice_payments` row + `service_library` id):**

```sql
SELECT fn_classify_payment_service(
  'a00d0004-0004-4000-8000-000000000004'::uuid,
  (SELECT id FROM public.service_library WHERE lower(coalesce(service,'')) LIKE '%ielts%' LIMIT 1)
);
```

Then re-check: `SELECT fn_performance_hub_readiness_check('2026-06');`

### 4.4 Extended seed — populate all studio screens & reports

Run **after §4** (same prerequisites). Idempotent on fixed UUIDs. Fills empty **Calendar**, **Segments**, **Automation**, **Analytics ROI**, **Competitions standings**, **Plans rules**, **Team view (Rohit)**, and **Offers library lifecycle** columns.

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Performance Hub UAT · extended studio + reports seed · period 2026-06
-- Run AFTER the main §4 $seed$ block
-- ═══════════════════════════════════════════════════════════════════════════

DO $seed_ext$
DECLARE
  v_period text := '2026-06';
  v_branch_genda uuid;
  v_branch_ajwa uuid;
  v_priya uuid := coalesce(
    (SELECT id FROM auth.users WHERE email = 'ph.counselor1@flowlink.demo'),
    'b1000001-0001-4000-8000-000000000001'::uuid
  );
  v_rohit uuid := coalesce(
    (SELECT id FROM auth.users WHERE email = 'ph.counselor2@flowlink.demo'),
    'b1000002-0002-4000-8000-000000000002'::uuid
  );
  v_admin uuid := coalesce(
    (SELECT id FROM auth.users WHERE email = 'ph.admin@flowlink.demo'),
    'b1000004-0004-4000-8000-000000000004'::uuid
  );
  v_marcom uuid := coalesce(
    (SELECT id FROM auth.users WHERE email = 'ph.marcom@flowlink.demo'),
    'b1000007-0007-4000-8000-000000000007'::uuid
  );
  v_manager uuid := coalesce(
    (SELECT id FROM auth.users WHERE email = 'ph.manager@flowlink.demo'),
    'b1000003-0003-4000-8000-000000000003'::uuid
  );
BEGIN
  SELECT id INTO v_branch_genda FROM public.branches WHERE name = 'Genda Circle' LIMIT 1;
  SELECT id INTO v_branch_ajwa FROM public.branches WHERE name = 'Ajwa' LIMIT 1;

  IF v_branch_genda IS NULL THEN
    RAISE EXCEPTION 'Branch Genda Circle not found — run branch migration first';
  END IF;

  -- ── Lifecycle offers (library filters + status history) ───────────────────
  INSERT INTO public.offers (
    id, title, description, discount_type, discount_value, status, funding_source,
    audience, currency, is_active, requires_approval, per_client_limit,
    fl_contribution_pct, university_contribution_pct, created_by, branch_id,
    applicable_services, target_countries, valid_from, valid_to
  ) VALUES
  (
    'o1000008-0008-4000-8000-000000000008', 'PH Demo · Approved Canada push',
    'Approved — awaiting schedule', 'percentage', 12, 'approved', 'university',
    'global', 'INR', false, true, 1,
    0, 100, v_marcom, v_branch_genda,
    ARRAY['University Application'], ARRAY['CA'], '2026-07-01', '2026-07-31'
  ),
  (
    'o1000009-0009-4000-8000-000000000009', 'PH Demo · Scheduled July intake',
    'Scheduled activation', 'percentage', 10, 'scheduled', 'future_link',
    'global', 'INR', false, false, 1,
    100, NULL, v_marcom, v_branch_genda,
    ARRAY['IELTS Coaching'], ARRAY['IN'], '2026-06-25', '2026-07-15'
  ),
  (
    'o1000010-0010-4000-8000-000000000010', 'PH Demo · Pending review draft',
    'Submitted for MarCom review', 'percentage', 14, 'pending_review', 'future_link',
    'global', 'INR', false, true, 1,
    100, NULL, v_marcom, v_branch_genda,
    ARRAY['IELTS Coaching'], ARRAY['IN'], NULL, NULL
  ),
  (
    'o1000011-0011-4000-8000-000000000011', 'PH Demo · Expiring soon IELTS',
    'Ends this month', 'percentage', 8, 'expiring_soon', 'future_link',
    'global', 'INR', true, false, 1,
    100, NULL, v_marcom, v_branch_genda,
    ARRAY['IELTS Coaching'], ARRAY['IN'], '2026-06-01', '2026-06-28'
  ),
  (
    'o1000012-0012-4000-8000-000000000012', 'PH Demo · Archived winter promo',
    'Past campaign — archived', 'percentage', 15, 'archived', 'future_link',
    'global', 'INR', false, false, 1,
    100, NULL, v_admin, v_branch_genda,
    ARRAY['IELTS Coaching'], ARRAY['IN'], '2025-12-01', '2025-12-31'
  ),
  (
    'o1000013-0013-4000-8000-000000000013', 'PH Demo · Published field offer 8%',
    'Sample published promotion offer', 'percentage', 8, 'active', 'future_link',
    'group', 'INR', true, false, 2,
    100, NULL, v_marcom, v_branch_genda,
    ARRAY['IELTS Coaching'], ARRAY['IN'], '2026-06-01', '2026-06-30'
  )
  ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, title = EXCLUDED.title;

  INSERT INTO public.offer_status_history (id, offer_id, from_status, to_status, changed_by, note, created_at)
  VALUES
  ('a0120001-0001-4000-8000-000000000001', 'o1000008-0008-4000-8000-000000000008', 'draft', 'pending_review', v_marcom, 'PH Demo submitted', '2026-06-02'::timestamptz),
  ('a0120002-0002-4000-8000-000000000002', 'o1000008-0008-4000-8000-000000000008', 'pending_review', 'approved', v_admin, 'PH Demo approved', '2026-06-04'::timestamptz),
  ('a0120003-0003-4000-8000-000000000003', 'o1000009-0009-4000-8000-000000000009', 'approved', 'scheduled', v_marcom, 'PH Demo scheduled', '2026-06-05'::timestamptz),
  ('a0120004-0004-4000-8000-000000000004', 'o1000011-0011-4000-8000-000000000011', 'active', 'expiring_soon', NULL, 'PH Demo expiry tick', '2026-06-20'::timestamptz),
  ('a0120005-0005-4000-8000-000000000005', 'o1000012-0012-4000-8000-000000000012', 'expired', 'archived', v_admin, 'PH Demo archived', '2026-01-05'::timestamptz)
  ON CONFLICT (id) DO NOTHING;

  -- ── Corporate calendar (Offers studio → Calendar) ────────────────────────
  INSERT INTO public.campaign_calendar (
    id, name, campaign_type, start_date, end_date, owner_name, status, linked_offer_id, notes, created_by
  ) VALUES
  (
    'cc100001-0001-4000-8000-000000000001', 'PH Demo · Monsoon IELTS push', 'seasonal',
    '2026-06-01', '2026-06-30', 'Maya MarCom', 'live',
    'o1000001-0001-4000-8000-000000000001', 'Linked to active IELTS offer', v_marcom
  ),
  (
    'cc100002-0002-4000-8000-000000000002', 'PH Demo · Canada intake window', 'intake',
    '2026-06-15', '2026-07-15', 'Maya MarCom', 'planned',
    'o1000002-0002-4000-8000-000000000002', 'Admission discount campaign', v_marcom
  ),
  (
    'cc100003-0003-4000-8000-000000000003', 'PH Demo · Rakhi branch celebration', 'festival',
    '2026-08-10', '2026-08-20', 'Neha Manager', 'planned', NULL,
    'Branch event — offer TBD', v_manager
  )
  ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, linked_offer_id = EXCLUDED.linked_offer_id;

  -- ── Segment library (Offers studio → Segments) ───────────────────────────
  INSERT INTO public.offer_groups (id, name, description, definition, is_active, created_by)
  VALUES
  (
    'a0110001-0001-4000-8000-000000000001', 'PH Demo · Coaching hot list',
    'Clients with recent coaching payments', 'coaching_services + verified payment in 30d', true, v_marcom
  ),
  (
    'a0110002-0002-4000-8000-000000000002', 'PH Demo · Study abroad prospects',
    'Admission interest without allied bundle', 'admission_services OR study_abroad profile', true, v_marcom
  ),
  (
    'a0110003-0003-4000-8000-000000000003', 'PH Demo · Birthday cohort June',
    'DOB in June — birthday auto-offer audience', 'date_of_birth month = 6', true, v_marcom
  )
  ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, is_active = EXCLUDED.is_active;

  INSERT INTO public.offer_group_members (group_id, client_id)
  VALUES
  ('a0110001-0001-4000-8000-000000000001', 'c1000001-0001-4000-8000-000000000001'),
  ('a0110001-0001-4000-8000-000000000001', 'c1000005-0005-4000-8000-000000000005'),
  ('a0110002-0002-4000-8000-000000000002', 'c1000002-0002-4000-8000-000000000002'),
  ('a0110002-0002-4000-8000-000000000002', 'c1000003-0003-4000-8000-000000000003'),
  ('a0110003-0003-4000-8000-000000000003', 'c1000001-0001-4000-8000-000000000001')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.offer_audience_targets (id, offer_id, group_id)
  VALUES
  ('a0130001-0001-4000-8000-000000000001', 'o1000001-0001-4000-8000-000000000001', 'a0110001-0001-4000-8000-000000000001'),
  ('a0130002-0002-4000-8000-000000000002', 'o1000013-0013-4000-8000-000000000013', 'a0110002-0002-4000-8000-000000000002')
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.offers SET audience = 'group'
   WHERE id IN (
     'o1000001-0001-4000-8000-000000000001',
     'o1000013-0013-4000-8000-000000000013'
   );

  -- ── Auto-offer rules (Offers studio → Automation) ──────────────────────────
  INSERT INTO public.offer_templates (
    id, name, trigger_type, discount_type, discount_value, max_discount_amount,
    validity_days_before, validity_days_after, trigger_event, target_countries,
    applicable_services, is_active, created_by
  ) VALUES
  (
    'a0140001-0001-4000-8000-000000000001', 'PH Demo · Birthday 10% coaching',
    'birthday', 'percentage', 10, 5000, 7, 7, NULL, ARRAY['IN'],
    ARRAY['IELTS Coaching'], true, v_marcom
  ),
  (
    'a0140002-0002-4000-8000-000000000002', 'PH Demo · First payment 5% workflow',
    'workflow', 'percentage', 5, 3000, 0, 14, 'first_verified_payment', ARRAY['IN','CA'],
    ARRAY['IELTS Coaching','University Application'], true, v_marcom
  ),
  (
    'a0140003-0003-4000-8000-000000000003', 'PH Demo · Referral flat ₹2000 (paused)',
    'manual', 'flat', 2000, 2000, 0, 30, NULL, ARRAY['IN'],
    ARRAY[]::text[], false, v_marcom
  )
  ON CONFLICT (id) DO UPDATE SET is_active = EXCLUDED.is_active;

  -- ── Client offers + tracking (promotions attribution) ────────────────────
  INSERT INTO public.client_offers (id, client_id, offer_id, status, used_at, attached_by, source)
  VALUES
  (
    'co100001-0001-4000-8000-000000000001',
    'c1000001-0001-4000-8000-000000000001',
    'o1000001-0001-4000-8000-000000000001', 'active', NULL, v_priya, 'counselor'
  ),
  (
    'co100002-0002-4000-8000-000000000002',
    'c1000003-0003-4000-8000-000000000003',
    'o1000001-0001-4000-8000-000000000001', 'used', '2026-06-06'::timestamptz, v_priya, 'counselor'
  ),
  (
    'co100003-0003-4000-8000-000000000003',
    'c1000005-0005-4000-8000-000000000005',
    'o1000006-0006-4000-8000-000000000006', 'active', NULL, v_priya, 'auto'
  )
  ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

  INSERT INTO public.offer_tracking_codes (id, offer_id, counselor_id, code)
  VALUES (
    'a0150001-0001-4000-8000-000000000001',
    'o1000001-0001-4000-8000-000000000001', v_priya, 'PHDEMO-PRIYA-IELTS'
  )
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.clients SET date_of_birth = '1998-06-12'
   WHERE id = 'c1000001-0001-4000-8000-000000000001';

  -- ── Analytics ROI (invoices + offer_events) ──────────────────────────────
  UPDATE public.client_invoices
     SET applied_offer_id = 'o1000001-0001-4000-8000-000000000001',
         offer_discount_amount = 4500,
         attributed_counselor_id = v_priya
   WHERE id = 'a00c0001-0001-4000-8000-000000000001';

  UPDATE public.client_invoices
     SET applied_offer_id = 'o1000002-0002-4000-8000-000000000002',
         offer_discount_amount = 18000,
         attributed_counselor_id = v_priya
   WHERE id = 'a00c0002-0002-4000-8000-000000000002';

  INSERT INTO public.offer_events (
    id, offer_id, client_id, counselor_id, event_type, channel, revenue_amount, created_at
  ) VALUES
  ('oe100001-0001-4000-8000-000000000001', 'o1000001-0001-4000-8000-000000000001', 'c1000001-0001-4000-8000-000000000001', v_priya, 'viewed', 'ph-demo', 0, '2026-06-04'::timestamptz),
  ('oe100002-0002-4000-8000-000000000002', 'o1000001-0001-4000-8000-000000000001', 'c1000001-0001-4000-8000-000000000001', v_priya, 'viewed', 'ph-demo', 0, '2026-06-05'::timestamptz),
  ('oe100003-0003-4000-8000-000000000003', 'o1000001-0001-4000-8000-000000000001', 'c1000001-0001-4000-8000-000000000001', v_priya, 'claimed', 'ph-demo', 0, '2026-06-05'::timestamptz),
  ('oe100004-0004-4000-8000-000000000004', 'o1000002-0002-4000-8000-000000000002', 'c1000002-0002-4000-8000-000000000002', v_priya, 'viewed', 'email', 0, '2026-06-07'::timestamptz),
  ('oe100005-0005-4000-8000-000000000005', 'o1000002-0002-4000-8000-000000000002', 'c1000002-0002-4000-8000-000000000002', v_priya, 'claimed', 'email', 0, '2026-06-08'::timestamptz),
  ('oe100006-0006-4000-8000-000000000006', 'o1000002-0002-4000-8000-000000000002', 'c1000002-0002-4000-8000-000000000002', v_priya, 'redeemed', 'ph-demo', 120000, '2026-06-08'::timestamptz),
  ('oe100007-0007-4000-8000-000000000007', 'o1000013-0013-4000-8000-000000000013', 'c1000003-0003-4000-8000-000000000003', v_priya, 'sent', 'ph-demo', 0, '2026-06-09'::timestamptz),
  ('oe100008-0008-4000-8000-000000000008', 'o1000006-0006-4000-8000-000000000006', 'c1000005-0005-4000-8000-000000000005', v_priya, 'sent', 'ph-demo', 0, '2026-06-10'::timestamptz)
  ON CONFLICT (id) DO NOTHING;

  -- ── Team view + competitions (Rohit + Ajwa branch revenue) ───────────────
  INSERT INTO public.incentive_qualifying_events (
    id, event_type, event_date, period_key, counselor_id, client_id, branch_id,
    amount, currency, source_type, dimensions, source_table, source_id
  ) VALUES
  (
    'a00e0005-0005-4000-8000-000000000005', 'first_verified_payment', '2026-06-06', v_period,
    v_rohit, 'c1000003-0003-4000-8000-000000000003', v_branch_genda,
    95000, 'INR', 'service_revenue',
    jsonb_build_object('master_key','coaching_services','service_code','IELTS'),
    'ph-demo', 'a0180005-0005-4000-8000-000000000005'::uuid
  ),
  (
    'a00e0006-0006-4000-8000-000000000006', 'first_verified_payment', '2026-06-11', v_period,
    v_rohit, 'c1000003-0003-4000-8000-000000000003', v_branch_genda,
    42000, 'INR', 'service_revenue',
    jsonb_build_object('master_key','allied_services','service_code','FOREX'),
    'ph-demo', 'a0180006-0006-4000-8000-000000000006'::uuid
  )
  ON CONFLICT (id) DO NOTHING;

  IF v_branch_ajwa IS NOT NULL THEN
    INSERT INTO public.incentive_qualifying_events (
      id, event_type, event_date, period_key, counselor_id, client_id, branch_id,
      amount, currency, source_type, dimensions, source_table, source_id
    ) VALUES
    (
      'a00e0007-0007-4000-8000-000000000007', 'first_verified_payment', '2026-06-04', v_period,
      v_admin, NULL, v_branch_ajwa,
      88000, 'INR', 'service_revenue',
      jsonb_build_object('master_key','admission_services','service_code','UNIV_APP'),
      'ph-demo', 'a0180007-0007-4000-8000-000000000007'::uuid
    ),
    (
      'a00e0008-0008-4000-8000-000000000008', 'first_verified_payment', '2026-06-09', v_period,
      v_admin, NULL, v_branch_ajwa,
      54000, 'INR', 'service_revenue',
      jsonb_build_object('master_key','coaching_services','service_code','IELTS'),
      'ph-demo', 'a0180008-0008-4000-8000-000000000008'::uuid
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  INSERT INTO public.counselor_performance_scores (
    id, counselor_id, period_key,
    revenue_achievement, wallet_impact_revenue, wallet_used, wallet_roi,
    conversion_rate, client_satisfaction, collections_received, total_score
  ) VALUES (
    'a0100002-0002-4000-8000-000000000002', v_rohit, v_period,
    0, 52000, 3500, 14.9,
    58, 82, 137000, 62
  )
  ON CONFLICT (id) DO UPDATE SET wallet_impact_revenue = EXCLUDED.wallet_impact_revenue;

  INSERT INTO public.incentive_line_items (
    id, run_id, counselor_id, source_type, client_id,
    base_amount, base_currency, earned_amount, settlement_currency, note
  ) VALUES (
    'a0060003-0003-4000-8000-000000000003',
    'a0050001-0001-4000-8000-000000000001', v_rohit, 'service_revenue',
    'c1000003-0003-4000-8000-000000000003',
    95000, 'INR', 4750, 'INR', 'PH Demo Rohit line — team view'
  )
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.incentive_targets
     SET plan_id = 'a0040001-0001-4000-8000-000000000001'
   WHERE id = 'a0030001-0001-4000-8000-000000000001';

  -- ── Incentive plan rules + slabs (Plans & rules screen) ────────────────────
  INSERT INTO public.incentive_rules (
    id, plan_id, name, sort_order, is_active, scope_preset, source_type, metric,
    rate_type, rate_value, stacking_mode, settlement_currency
  ) VALUES
  (
    'a0160001-0001-4000-8000-000000000001', 'a0040001-0001-4000-8000-000000000001',
    'PH Demo · Core revenue 5%', 1, true, 'coaching_admission',
    'service_revenue', 'net_revenue', 'percent', 5, 'additive', 'INR'
  ),
  (
    'a0160002-0002-4000-8000-000000000002', 'a0040001-0001-4000-8000-000000000001',
    'PH Demo · Allied slab bonus', 2, true, 'allied_only',
    'service_revenue', 'net_revenue', 'slab', 0, 'cap', 'INR'
  )
  ON CONFLICT (id) DO UPDATE SET is_active = EXCLUDED.is_active;

  INSERT INTO public.incentive_slabs (
    id, plan_id, rule_id, source_type, metric, min_threshold, max_threshold,
    rate_type, rate_value, service_filter, sort_order
  ) VALUES
  (
    'a0170001-0001-4000-8000-000000000001', 'a0040001-0001-4000-8000-000000000001',
    'a0160002-0002-4000-8000-000000000002', 'service_revenue', 'net_revenue',
    0, 50000, 'percent', 3, 'allied_services', 1
  ),
  (
    'a0170002-0002-4000-8000-000000000002', 'a0040001-0001-4000-8000-000000000001',
    'a0160002-0002-4000-8000-000000000002', 'service_revenue', 'net_revenue',
    50000, NULL, 'percent', 5, 'allied_services', 2
  )
  ON CONFLICT (id) DO NOTHING;

END;
$seed_ext$;
```

**Verify extended load:**

```sql
SELECT count(*) AS calendar_rows FROM campaign_calendar WHERE name LIKE 'PH Demo%';
SELECT count(*) AS segment_rows FROM offer_groups WHERE name LIKE 'PH Demo%';
SELECT count(*) AS template_rows FROM offer_templates WHERE name LIKE 'PH Demo%';
SELECT status, count(*) FROM offers WHERE title LIKE 'PH Demo%' GROUP BY status ORDER BY status;

SELECT branch_name, total_amount, rank
  FROM fn_incentive_branch_contest_standings('a0090001-0001-4000-8000-000000000001');
-- Expect Genda Circle > Ajwa (both non-zero)

SELECT title, views, claims, redemptions, influenced_revenue
  FROM offer_roi_stats('2026-06-01'::date, '2026-06-30'::date)
 WHERE title LIKE 'PH Demo%'
 ORDER BY influenced_revenue DESC;
```

### 4.3 Teardown (reset demo period)

```sql
DELETE FROM public.offer_status_history WHERE id IN (
  'a0120001-0001-4000-8000-000000000001',
  'a0120002-0002-4000-8000-000000000002',
  'a0120003-0003-4000-8000-000000000003',
  'a0120004-0004-4000-8000-000000000004',
  'a0120005-0005-4000-8000-000000000005'
);
DELETE FROM public.offer_audience_targets WHERE id IN (
  'a0130001-0001-4000-8000-000000000001',
  'a0130002-0002-4000-8000-000000000002'
);
DELETE FROM public.offer_group_members WHERE group_id IN (
  'a0110001-0001-4000-8000-000000000001',
  'a0110002-0002-4000-8000-000000000002',
  'a0110003-0003-4000-8000-000000000003'
);
DELETE FROM public.offer_groups WHERE id IN (
  'a0110001-0001-4000-8000-000000000001',
  'a0110002-0002-4000-8000-000000000002',
  'a0110003-0003-4000-8000-000000000003'
);
DELETE FROM public.campaign_calendar WHERE id IN (
  'cc100001-0001-4000-8000-000000000001',
  'cc100002-0002-4000-8000-000000000002',
  'cc100003-0003-4000-8000-000000000003'
);
DELETE FROM public.offer_tracking_codes WHERE id = 'a0150001-0001-4000-8000-000000000001';
DELETE FROM public.client_offers WHERE id IN (
  'co100001-0001-4000-8000-000000000001',
  'co100002-0002-4000-8000-000000000002',
  'co100003-0003-4000-8000-000000000003'
);
DELETE FROM public.offer_events WHERE id IN (
  'oe100001-0001-4000-8000-000000000001',
  'oe100002-0002-4000-8000-000000000002',
  'oe100003-0003-4000-8000-000000000003',
  'oe100004-0004-4000-8000-000000000004',
  'oe100005-0005-4000-8000-000000000005',
  'oe100006-0006-4000-8000-000000000006',
  'oe100007-0007-4000-8000-000000000007',
  'oe100008-0008-4000-8000-000000000008'
);
DELETE FROM public.incentive_slabs WHERE id IN (
  'a0170001-0001-4000-8000-000000000001',
  'a0170002-0002-4000-8000-000000000002'
);
DELETE FROM public.incentive_rules WHERE id IN (
  'a0160001-0001-4000-8000-000000000001',
  'a0160002-0002-4000-8000-000000000002'
);
DELETE FROM public.incentive_line_items WHERE id = 'a0060003-0003-4000-8000-000000000003';
DELETE FROM public.counselor_performance_scores WHERE id = 'a0100002-0002-4000-8000-000000000002';
DELETE FROM public.incentive_qualifying_events WHERE id IN (
  'a00e0005-0005-4000-8000-000000000005',
  'a00e0006-0006-4000-8000-000000000006',
  'a00e0007-0007-4000-8000-000000000007',
  'a00e0008-0008-4000-8000-000000000008'
);
DELETE FROM public.offer_templates WHERE id IN (
  'a0140001-0001-4000-8000-000000000001',
  'a0140002-0002-4000-8000-000000000002',
  'a0140003-0003-4000-8000-000000000003'
);
DELETE FROM public.incentive_contest_branches WHERE contest_id = 'a0090001-0001-4000-8000-000000000001';
DELETE FROM public.incentive_branch_contests WHERE id = 'a0090001-0001-4000-8000-000000000001';
DELETE FROM public.offer_journey_enrollments WHERE id = 'a00a0001-0001-4000-8000-000000000001';
DELETE FROM public.offer_ab_assignments WHERE id = 'a1000001-0001-4000-8000-000000000001';
DELETE FROM public.offer_ab_variants WHERE experiment_id = 'ab100001-0001-4000-8000-000000000001';
DELETE FROM public.offer_ab_experiments WHERE id = 'ab100001-0001-4000-8000-000000000001';
DELETE FROM public.incentive_payouts WHERE id = 'a0070001-0001-4000-8000-000000000001';
DELETE FROM public.incentive_line_items WHERE id IN (
  'a0060001-0001-4000-8000-000000000001',
  'a0060002-0002-4000-8000-000000000002'
);
DELETE FROM public.wallet_allocations WHERE id = 'a0080001-0001-4000-8000-000000000001';
DELETE FROM public.incentive_runs WHERE id = 'a0050001-0001-4000-8000-000000000001';
DELETE FROM public.incentive_plans WHERE id = 'a0040001-0001-4000-8000-000000000001';
DELETE FROM public.counselor_performance_scores WHERE id = 'a0100001-0001-4000-8000-000000000001';
DELETE FROM public.wallet_exception_requests WHERE id = 'e1000001-0001-4000-8000-000000000001';
DELETE FROM public.promotion_requests WHERE id IN (
  'a00f0001-0001-4000-8000-000000000001',
  'a00f0002-0002-4000-8000-000000000002',
  'a00f0003-0003-4000-8000-000000000003'
);
DELETE FROM public.discount_approval_requests WHERE id IN (
  'd1000001-0001-4000-8000-000000000001',
  'd1000002-0002-4000-8000-000000000002',
  'd1000003-0003-4000-8000-000000000003',
  'd1000004-0004-4000-8000-000000000004'
);
DELETE FROM public.incentive_qualifying_events WHERE id IN (
  'a00e0001-0001-4000-8000-000000000001',
  'a00e0002-0002-4000-8000-000000000002',
  'a00e0003-0003-4000-8000-000000000003',
  'a00e0004-0004-4000-8000-000000000004'
);
DELETE FROM public.incentive_targets WHERE id = 'a0030001-0001-4000-8000-000000000001';
DELETE FROM public.discount_wallets WHERE id IN (
  'a0020001-0001-4000-8000-000000000001',
  'a0020002-0002-4000-8000-000000000002',
  'a0020003-0003-4000-8000-000000000003',
  'a0020004-0004-4000-8000-000000000004'
);
DELETE FROM public.offers WHERE id IN (
  'o1000001-0001-4000-8000-000000000001',
  'o1000002-0002-4000-8000-000000000002',
  'o1000003-0003-4000-8000-000000000003',
  'o1000004-0004-4000-8000-000000000004',
  'o1000005-0005-4000-8000-000000000005',
  'o1000006-0006-4000-8000-000000000006',
  'o1000007-0007-4000-8000-000000000007',
  'o1000008-0008-4000-8000-000000000008',
  'o1000009-0009-4000-8000-000000000009',
  'o1000010-0010-4000-8000-000000000010',
  'o1000011-0011-4000-8000-000000000011',
  'o1000012-0012-4000-8000-000000000012',
  'o1000013-0013-4000-8000-000000000013'
);
DELETE FROM public.service_offers WHERE id = 'a0010001-0001-4000-8000-000000000001';
DELETE FROM public.clients WHERE application_id LIKE 'PH-DEMO-%';
```

---

## 5. Screen → record → expected outcome matrix

Login as the user listed unless noted. Period = **2026-06**.

### 5.1 Performance Hub shell (6E)

| Screen | Route | User | Test record | Expected outcome |
|--------|-------|------|-------------|------------------|
| Hub theme / context bar | any `/performance/*` | any | — | LIGHT/DARK tokens from `performance-hub-theme.css`; period bar shows `2026-06` |
| Command center | `/performance/admin` | Admin | readiness RPC | Hub readiness card shows blockers: unclassified ≥1, discount approvals ≥2, promotion requests ≥2, wallet exceptions ≥1 |

### 5.2 Counselor home & team

| Screen | Route | User | Test record | Expected outcome |
|--------|-------|------|-------------|------------------|
| Performance home | `/performance` | Priya | wallet `a0020001`, target `a0030001` | Wallet card: target ₹5L, achievement ~64%, spendable ₹15k minus allocations; earning card shows ~₹12,500 from run `a0050001` |
| Performance home (no target) | `/performance` | Rohit | wallet `a0020002` | No-target copy (`NO_TARGET_WALLET_NOTE`); exception form submits `e1000001` |
| Hot clients (5T T2) | `/performance` | Priya | client `c1000001` Aman Shah | Appears in **Hot clients for offers** (verified payment + coaching-only propensity) |
| WIR card (5U U3) | `/performance` | Priya | score `a0100001` | Impact revenue ₹80,000 · wallet used ₹10,000 · ROI 8× |
| Offer influence O10 (5V V1) | `/performance` | Priya | offer events + allocations | **Your offer influence** card: offers sent ≥1, redemptions ≥1 |
| Live earning ticker (5T T3, 5Q Q4) | `/performance` | Priya | run `a0050001` | Cash card footer shows live refresh / ~60s poll |
| Team performance | `/performance/team` | Manager | events `a00e0001`–`a00e0006` | Priya + Rohit revenue; period bar matches command center |
| Telecaller home | `/performance` | Tara | — | Telecaller-specific layout (not counselor cards) |
| How it works (5W W3) | `/performance/how-it-works` | any | — | Lists intelligence layers 5Q–5V |

### 5.3 Give discount & wallets (5S, 5U, 6C)

| Screen | Route | User | Test record | Expected outcome |
|--------|-------|------|-------------|------------------|
| Give discount | `/performance/give-discount` | Priya | client `c1000003`, offer `o1000001` | ≤10% / ≤₹5k → instant apply path (5S S2) |
| Give discount · floor | `/performance/give-discount` | Priya | client `c1000003`, admission line, 25% | Preview shows **85% floor** (5U U1); submit creates/queues `d1000003` (5S S1) |
| Give discount · waiver | `/performance/give-discount` | Priya | offer `o1000004` | Counselor blocked from full waiver (5S S3) |
| Give discount mobile (6C) | `/performance/give-discount` | Priya | 390px viewport | Sticky submit, simplified fields |
| Wallet policy | `/performance/wallet/policy` | Admin | multiplier/unlock bands | Seeded bands from migrations visible |
| Branch pool | `/performance/wallet/branch-pool` | Manager | pool `a0020003` | Balance ₹50,000; allocate to Priya wallet `a0020001` |

### 5.4 Admin queues

| Screen | Route | User | Test record | Expected outcome |
|--------|-------|------|-------------|------------------|
| Unclassified payments | `/performance/admin/unclassified` | Admin | event `a00e0004`, client `c1000004` | One row ₹22,000; classify → clears readiness blocker |
| Discount approvals | `/performance/admin/approvals` | Manager | `d1000002` | Manager can approve 15% university offer |
| Discount approvals | `/performance/admin/approvals` | Admin | `d1000003`, `d1000004` | Floor badges; admin-only waiver row (5S S4) |
| Director read-only (6B) | `/performance/admin/approvals` | Director | all `d100000*` | Can view queue; cannot approve/decline |
| Promotion requests | `/performance/offers/requests` | MarCom | `a00f0001`, `a00f0002`, `a00f0003` | Three statuses; publish `a00f0003` → draft offer |

### 5.5 Offers studio

| Screen | Route | User | Test record | Expected outcome |
|--------|-------|------|-------------|------------------|
| Offers library | `/performance/offers/library` | MarCom | `o1000001`–`o1000013` | All lifecycle statuses + funding badges |
| New offer wizard | `/performance/offers/new` | MarCom | clone from `o1000001` | Creates new draft (do not reuse fixed UUIDs in UAT) |
| Offers studio hub | `/performance/offers` | MarCom | — | Navigation to sub-screens |
| Analytics (5V V2) | `/performance/offers/analytics` | MarCom | period `2026-06` | ROI table non-empty; counselor attribution; wallet impact |
| Calendar | `/performance/offers/calendar` | MarCom | `cc100001`–`cc100003` | Three campaigns (live + planned); two linked to offers |
| Segments | `/performance/offers/segments` | MarCom | `a0110001`–`a0110003` | Segment cards show member + linked offer counts |
| Automation | `/performance/offers/automation` | MarCom | `a0140001`–`a0140003` | Birthday + workflow rules; one inactive manual rule |
| Journeys | `/performance/offers/journeys` | MarCom | enrollment `a00a0001` | Aman Shah active on coaching cross-sell journey |
| A/B tests (5R) | `/performance/offers/ab-tests` | Admin | experiment `ab100001` | Running; variants A/B; promote winner flow |
| AI studio | `/performance/offers/ai-studio` | MarCom | — | Studio shell loads |

### 5.6 Client workspace (cross-sell, propensity, A/B, legacy)

| Screen | Route | User | Test record | Expected outcome |
|--------|-------|------|-------------|------------------|
| Client profile · promotions strip (5Q Q1) | Client → Promotions | Priya | `c1000001` | Cross-sell scenario: coaching-only → study abroad suggestion |
| Client profile · dismiss (5Q Q3) | Client → Promotions | Priya | `c1000002` | Dismiss → hidden 7 days for Priya |
| Client profile · propensity (5T T1) | Client → Promotions | Priya | `c1000001` | **I5 · hot** badge + factor bullets |
| Client profile · A/B badge (5R R2) | Client → Promotions | Priya | `c1000005` | **A/B · variant A** badge |
| Invoice preview · legacy banner (6D) | Client → Invoice | Priya | `c1000006`, `a0010001` | Service offers convergence banner when flag enabled |

### 5.7 Incentives (linked from command center)

| Screen | Route | User | Test record | Expected outcome |
|--------|-------|------|-------------|------------------|
| Period close | `/incentives/period-close` | Admin | wallets `a0020001–4` | Four open wallets for Jun-2026 |
| Runs & preview | `/incentives/admin` | Admin | run `a0050001` | Open run; line item ₹12,500 for Priya |
| Plans & rules | `/incentives/plans` | Admin | plan `a0040001`, rules `a0160001`–`a0160002` | PH Demo plan with rules + allied slabs |
| Competitions | `/incentives/competitions` | Admin | contest `a0090001` | Genda Circle leads Ajwa (~₹1.95L vs ~₹1.42L) |
| Payout desk | `/incentives/payouts` | Admin | payout `a0070001` | Priya approved ₹11,250 net |
| Executive dashboard | `/performance/executive` | Admin | period metrics | Aggregates reflect seeded events |

---

## 6. Batch UAT scenario map (5Q–5W)

Each row ties to `docs/INCENTIVE_PHASE5_BATCH_UAT.md`.

| ID | Scenario | Demo records | Screen(s) | Expected outcome |
|----|----------|--------------|-----------|------------------|
| Q1 | Cross-sell strip | `c1000001`, journey `a00a0001` | Client promotions | Coaching-only cross-sell suggestion visible |
| Q2 | Auto-enroll tick | `c1000001` (coaching-only, no admission) | SQL / journeys | Eligible for `fn_process_cross_sell_journey_enrollments` |
| Q3 | Dismiss 7 days | `c1000002` | Client promotions | After dismiss, strip hidden for Priya |
| Q4 | Live cash footer | run `a0050001`, line `a0060001` | `/performance` | 60s / live refresh on earning card |
| R1 | Create A/B | experiment `ab100001` | `/performance/offers/ab-tests` | Running experiment with 2 variants |
| R2 | A/B badge | `c1000005`, assignment `a1000001` | Client promotions | Variant badge on suggestion |
| R3 | Promote winner | `ab100001`, `o1000006`/`o1000007` | A/B tests | Stats + complete experiment |
| R4 | Period bar sync | period `2026-06` | Team, plans, command center | Same period everywhere |
| S1 | Below floor escalate | `c1000003`, `d1000003` | Give discount, approvals | Admin queue with floor badge |
| S2 | Instant apply | `c1000001`, `o1000001`, `d1000001` | Give discount | ≤10% instant path |
| S3 | Waiver blocked | `o1000004`, `d1000004` | Give discount | Counselor cannot submit 100% waiver |
| S4 | Approvals matrix | `d1000002–4` | `/performance/admin/approvals` | manager + admin depths |
| T1 | I5 hot badge | `c1000001` | Client promotions | hot/warm badge + factors |
| T2 | Hot clients list | `c1000001` | `/performance` | Aman Shah on home list |
| T3 | Realtime ticker | `a0060001` | `/performance` | Earning updates without full refresh |
| U1 | Admission 85% floor | `c1000003` | Give discount | Floor preview 85% |
| U2 | Edit coaching floor | policy `coaching_services` | Approvals admin | Admin can edit 75% coaching floor |
| U3 | WIR card | score `a0100001` | `/performance` | Impact + ROI card populated |
| V1 | O10 influence | offer events, wallet allocations | `/performance` | Influence card non-empty |
| V2 | Analytics period | `2026-06` | `/performance/offers/analytics` | Period-aligned metrics |
| W1 | Readiness queues | all queue seeds | Command center | Counts match SQL |
| W2 | Clear blockers | classify `a00e0004`; resolve approvals/exceptions | Command center | `ready_for_period_lock: true` when queues empty |
| W3 | How it works | — | `/performance/how-it-works` | Phase list 5Q–5V |

---

## 7. Post–6A–6E scenarios (Performance Hub build)

| Phase | Scenario | Demo records | Expected outcome |
|-------|----------|--------------|------------------|
| 6A | Navigation shell | any `/performance/*` | Hub nav + period context bar |
| 6B | Director guard | Director user, `d1000002` | Read approvals; write blocked |
| 6C | Mobile give discount | Priya, `c1000003` | 390px layout + sticky submit |
| 6D | Legacy convergence banner | `c1000006`, `a0010001` | Banner on invoice preview when flag on |
| 6E | Theme tokens | any hub screen | LIGHT/DARK/system via context bar |

---

## 8. Related documents

- **Readiness review (pre-UAT):** [`PERFORMANCE_HUB_READINESS_REVIEW.md`](./PERFORMANCE_HUB_READINESS_REVIEW.md)
- **UAT test cases:** [`PERFORMANCE_HUB_UAT.md`](./PERFORMANCE_HUB_UAT.md) — 51 step-by-step cases referencing demo record IDs above.
- **UAT sign-off:** [`PERFORMANCE_HUB_UAT_SIGNOFF.md`](./PERFORMANCE_HUB_UAT_SIGNOFF.md)
- **Batch checklist:** [`../INCENTIVE_PHASE5_BATCH_UAT.md`](../INCENTIVE_PHASE5_BATCH_UAT.md)

```sql
SELECT jsonb_pretty(fn_performance_hub_readiness_check('2026-06'));
SELECT count(*) AS demo_clients FROM clients WHERE application_id LIKE 'PH-DEMO-%';
```

Expected: **6 demo clients**, **13 offers** (7 core + 6 extended), **3 calendar campaigns**, **3 segments**, **3 auto-rules**, **4 wallets**, **3 pending discount approvals** (+ 1 applied history row), **3 promotion requests**, **1 wallet exception**, **1 unclassified payment**.
