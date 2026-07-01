# Phase 3 F3.4 — Discrepancy Report (ENV-001)

**Date:** 2026-06-30  
**Status:** **BLOCKED** — F3.4 cannot be closed; **F3.3 must not start**  
**Reporter:** Cursor Agent (Phase 3 implementation)

---

## 1. Summary

Step 0 and F3.4 migration **files are committed** (`0797ce52` on `main`) but **could not be applied or SQL-verified** in the agent execution environment. Phase 1 / 2A / 2B **manual UAT** under tightened RLS was not executed for the same reason.

| Gate | Result |
|------|--------|
| Apply `20261030120000` (Step 0 config) | **NOT RUN** — no database connection |
| Apply `20261030120100` (F3.4 RLS) | **NOT RUN** — no database connection |
| Verification queries (PHASE3_RLS_BASELINE.md V1–V4) | **NOT RUN** — requires Postgres |
| Automated SQL suite (`supabase/tests/commission_phase3_f34_verification.sql`) | **NOT RUN** — requires Postgres |
| Unit regression (commission TS calculators) | **PASS** — 14/14 tests |
| Phase 1 / 2A / 2B UAT (manual) | **NOT RUN** — requires published migrations + UI |

---

## 2. Root cause

**ENV-001: Local database toolchain unavailable**

| Prerequisite | State on agent host |
|--------------|----------------------|
| Docker Desktop | Not installed (`Unable to find application named 'Docker'`) |
| `npx supabase start` | Fails — Docker required |
| `psql` / local Postgres | Not found on PATH |
| `SUPABASE_ACCESS_TOKEN` | Not set in environment |
| `SUPABASE_SERVICE_ROLE_KEY` / `DATABASE_URL` | Not set in environment |
| `.env` | Anon key + project URL only (no DB password / service role) |

This repo’s normal deploy path is **Lovable → Publish → approve migrations** on the linked Supabase project (`auofttkyosgjhxcbhscw`), not a local Docker stack. The agent environment has neither local Supabase nor credentials to push SQL remotely.

---

## 3. Affected functionality

Until migrations are applied on a real Postgres instance:

- F3.4 acceptance criteria **unverified** (RLS split, institution scope, non-privileged deny).
- Counselor view regression (**PF-2**, **2A-12**) **unverified**.
- Commission admin Claims / Receipt workflows under new policies **unverified**.
- Step 0 config flags (`approval_required`, `financial_events_enabled`) **not live** in database.

**Not affected:** Client-side commission rule/eligibility/receipt **unit logic** (no DB dependency).

---

## 4. Proposed resolution

### Option A — Lovable Publish (recommended, matches owner workflow)

1. Ensure `main` includes commits `20261030120000` + `20261030120100` (already on GitHub).
2. **Lovable → Sync from GitHub → Publish** — approve both pending migrations.
3. Hard refresh the app.
4. Run verification (Supabase SQL Editor):

```bash
# Paste/run file contents:
supabase/tests/commission_phase3_f34_verification.sql
```

5. Execute manual UAT: `docs/guides/PHASE1_COMMISSION_UAT.md`, `PHASE2A_COMMISSION_UAT.md`, `PHASE2B_COMMISSION_UAT.md`.
6. Update `Commission module claude files/PHASE3_TRACEABILITY_MATRIX.md` — mark F3.4 **DN** only if all gates pass.

### Option B — Local Supabase (developer machine)

1. Install [Docker Desktop](https://docs.docker.com/desktop/).
2. `npx supabase start`
3. `npx supabase db reset` (applies full migration chain)
4. `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres node scripts/commission-phase3-f34-verify.mjs`
5. Run manual UAT against local stack (or staging).

### Option C — Remote CLI push

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...   # dashboard → Account → Tokens
npx supabase link --project-ref auofttkyosgjhxcbhscw
npx supabase db push
DATABASE_URL=<pooler-connection-string> node scripts/commission-phase3-f34-verify.mjs
```

---

## 5. Rollback strategy

If F3.4 causes regression after publish:

1. **Do not** start F3.3.
2. Forward-fix preferred: new migration restoring prior policies from `20260604140000` / Phase 2A receipt policies (document in RFC).
3. Emergency: Supabase dashboard → Database → revert specific migration (only if platform supports point rollback; otherwise ship `*_commission_phase3_f34_rls_rollback.sql` that drops `uc_fin_*` policies and recreates pre-F3.4 policies).
4. Step 0 config table is additive — rollback optional; `DROP TABLE upi_commission_config` only if no downstream dependency.

---

## 6. Decision

| Action | Approved? |
|--------|-----------|
| Close F3.4 | **NO** — validation incomplete |
| Start F3.3 (audit log) | **NO** — per Phase 3 plan gate |
| Ship verification tooling | **YES** — this report + `scripts/commission-phase3-f34-verify.mjs` |

---

## 7. Owner actions required

1. **Publish** migrations via Lovable (or apply via Option B/C).
2. Run `scripts/commission-phase3-f34-verify.mjs` with `DATABASE_URL` (or SQL file in dashboard).
3. Complete Phase 1 / 2A / 2B UAT checklists.
4. Reply **“F3.4 validated”** or share failure details — agent will update matrix and only then begin F3.3.
