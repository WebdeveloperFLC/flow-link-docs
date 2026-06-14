# CMS Phase 1 — Deploy (PH-R fixes + AI QA scaffold)

## Shipped (agent)

| Item | Change |
|------|--------|
| PH-R-006 | Director read-only approvals load when `canView` (not gated on `canReview`) |
| PH-R-005 | Team page links to `/performance/admin/approvals` |
| PH-R-011 | Wallet policy in Performance Hub sidebar (`adminOnly`) |
| PH-R-007 | MarCom review on promotion requests — already wired via `canEditOffers` |
| QA scaffold | `playwright.config.ts`, `e2e/`, `qa/rules/`, `qa/generators/` |
| Rule harness | `npm run test:rules` — wallet limit + scope matrix (Vitest) |

**No new migration in this ship** — UI + test scaffold only.

## AI automation (no manual UAT)

```bash
npm run test:rules          # business-rule matrix (runs in CI)
npm run test:e2e            # Playwright golden lifecycle (staging env only)
```

E2E skips until env is set: `E2E_BASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## YOUR ACTION

### Step 1 — Lovable → Sync from GitHub → Publish

No new migration file in this ship. If demo migrations are still pending, approve **all** of these in Publish (in order):

```
20260716120000_performance_hub_demo_seed.sql
20260716120001_performance_hub_demo_seed_idempotent.sql
20260716120002_performance_hub_demo_wallet_rebind.sql
20260716120003_performance_hub_demo_seed_score_upsert.sql
20260716120004_performance_hub_demo_wallet_unlock.sql
20260716120005_performance_hub_demo_target_rebind.sql
20260716120006_performance_hub_demo_rebind_uuid_cast.sql
20260716120007_performance_hub_demo_incentive_rebind.sql
```

### Step 2 — Demo users (if missing)

Create in **Users** (Lovable) then run SQL:

| Email | Create with role |
|-------|------------------|
| `ph.admin@flowlink.demo` | Administrator |
| `ph.manager@flowlink.demo` | Counselor → SQL below |
| `ph.director@flowlink.demo` | Viewer → SQL below |
| `ph.telecaller@flowlink.demo` | Telecaller |
| `ph.marcom@flowlink.demo` | Counselor + Offers module edit |

```sql
-- §2.2 director + manager roles
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

### Step 3 — Rebind + sync (after counselors exist)

```sql
SELECT public.fn_rebind_ph_demo_wallets();
SELECT public.fn_sync_wallet_metrics('a0020001-0001-4000-8000-000000000001');
```

### Step 4 — Verify director approvals (read-only)

Log in as `ph.director@flowlink.demo` → `/performance/admin/approvals` — rows visible, **no** approve/decline buttons.

---

*Reference: `docs/guides/FLC_CMS_Cursor_Package/01_Build_Guide/FLC_CMS_Transformation_Brief.md`*
