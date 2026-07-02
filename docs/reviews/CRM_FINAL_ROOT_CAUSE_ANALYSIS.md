# CRM Final Root Cause Analysis

**Date:** 2026-07-02  
**Scope:** CRM module only — production blockers before Business UAT  
**Method:** Code trace + SQL/RPC review + live smoke test cross-reference (`CRM_LIVE_SMOKE_TEST_REPORT.md`)  
**Investigator:** Cursor agent (release candidate pass)

---

## Executive summary

| Issue | Severity | Root cause | Fix |
|-------|----------|------------|-----|
| 1 — Dashboard Total Clients = 0 | **High** | Client count query gated on `mode === "summary"`; admin/counselor use `mode === "full"` | **Fixed** — fetch count for all admissions modes |
| 2 — Reports Total Calls = 0 | **Medium** | `vw_call_stats_daily` excludes rows where `start_time IS NULL`; productivity view counts by `created_at` | **Fixed** — migration uses `COALESCE(start_time, created_at)` |
| 3 — Stage 1 of 15 vs 0/15 | **Medium** | Different semantics (current position vs completed count) | **Fixed** — label clarity only |
| 4 — Pipeline analytics empty | **Low** | `vw_stage_distribution` missing from DB schema (PGRST205); only `ALTER VIEW` in repo | **Fixed** — migration creates view |
| 5 — Phone scientific notation | **Medium** | Excel numeric cells → `String(v)` → `"9.19081E+11"` at import | **Documented** — validation points below; no display patch |

**Verdict:** After Lovable Publish (including migration `20260702160000_crm_rc_analytics_views_fix.sql`), CRM is **ready for Business UAT**. Issue 5 leaves legacy bad rows in DB until re-import or manual correction.

---

## Issue 1 — Dashboard Total Clients = 0

### Symptom

Dashboard KPI **Total Clients: 0** while `/clients` lists 24+ records (Owner/admin session).

### Root cause

`fetchDashboardExecutiveData()` only queried the client count when **both** `needAdmissions` and `mode === "summary"` were true:

```76:78:src/dashboard/lib/fetchDashboardData.ts
    needAdmissions
      ? supabase.from("clients").select("*", { count: "exact", head: true })
      : emptyCount,
```

Prior bug (now fixed): the condition was `needAdmissions && mode === "summary"`.

`getDashboardVisibility()` assigns:

| Profile | `executive.mode` |
|---------|------------------|
| admin / manager | `"full"` |
| counselor | `"full"` |
| telecaller | `"summary"` |

Smoke test ran as **Owner → admin profile → mode `"full"`**, so the query was skipped and `emptyCount` returned `{ count: 0 }`.

This is **not** a filter/date/branch mismatch — the query never ran.

### Dashboard KPI query (before fix)

- **Source:** `supabase.from("clients").select("*", { count: "exact", head: true })`
- **When:** Only `mode === "summary"` (telecaller)
- **Filters:** None (all clients visible under RLS)

### Clients page query

- **File:** `src/pages/Clients.tsx` (lines 137–156)
- **Source:** `supabase.from("clients").select(..., { count: "exact" }).order(...).range(...)`
- **Filters:** Optional search (`q`), `status`, `country` — **none applied by default**
- **Date range:** None
- **Branch filter:** None

### Comparison

| Dimension | Dashboard (bug) | Clients page |
|-----------|-----------------|--------------|
| Table | `clients` | `clients` |
| Count type | Head count | Exact count with pagination |
| Status filter | None | None (default) |
| Date window | None | None |
| Branch | None | None |
| RPC / view | Direct table | Direct table |
| **Blocker** | Skipped for `mode === "full"` | Always runs |

### Files involved

- `src/dashboard/lib/fetchDashboardData.ts`
- `src/dashboard/config/dashboardVisibility.ts`
- `src/dashboard/components/DashboardV2.tsx` (displays `executive.clients`)
- `src/pages/Clients.tsx`

### SQL / RPC

Direct PostgREST count on `public.clients` — no RPC.

### Risk

Low. Same table and RLS as Clients page; no KPI manipulation.

### Recommended fix

Fetch total client count whenever `needAdmissions` is true (both `"full"` and `"summary"`).

### Fix implemented

**Yes** — `fetchDashboardData.ts` condition changed to `needAdmissions ? ... : emptyCount`.

### Why it is safe

- Identical query to what telecaller mode already used successfully.
- RLS unchanged; no hardcoded values.
- Other admissions KPIs (enrollments, new apps 30d) already run in `"full"` mode.

### Tests performed

- Code review: admin/counselor profiles now hit client count branch.
- Regression: `qa/regression/CRM-R-013-dashboard-client-count.test.ts` (source assertion).
- `npm run test:crm` (full CRM regression suite).

### Business impact

Managers and counselors see accurate portfolio size on Dashboard — required for UAT sign-off on executive KPIs.

---

## Issue 2 — Reports Total Calls = 0 vs Telecaller table = 23

### Symptom

Reports page **Total Calls: 0** while Telecaller productivity table sums to **23** calls (30-day window).

### Root cause

Two analytics views use **incompatible session timestamps**:

**KPI source** — `Reports.tsx` lines 59–60, 82:

```typescript
(supabase as any).from("vw_call_stats_daily").select("*").gte("day", since)
// totalCalls = sum of total_calls
```

**View definition** (original):

```262:268:supabase/migrations/20260509125053_793bdc26-6882-4f3b-a29e-701af483358b.sql
CREATE OR REPLACE VIEW public.vw_call_stats_daily WITH (security_invoker=on) AS
SELECT date_trunc('day', start_time)::date AS day, agent_id,
       ...
  FROM public.call_sessions WHERE start_time IS NOT NULL GROUP BY 1,2;
```

**Table source** — `vw_telecaller_productivity`:

```275:285:supabase/migrations/20260509125053_793bdc26-6882-4f3b-a29e-701af483358b.sql
LEFT JOIN public.call_sessions cs ON cs.agent_id=a.id AND cs.created_at > now()-interval '30 days'
```

**Session lifecycle** — `telephony-click-to-call/index.ts`:

- Inserts `call_sessions` with `status: "initiated"`, **no `start_time`** (lines 114–127).
- Sets `start_time` only when provider path reaches `"ringing"` (line 191).
- Browser SDK path returns without setting `start_time` (lines 142–163).
- Failed/abandoned sessions may remain with `created_at` set and `start_time` NULL.

**Result:** Productivity counts all sessions in 30 days; daily stats view drops any session without `start_time` → KPI = 0.

### Secondary note (not primary blocker)

- Productivity view uses a **fixed 30-day** window; Reports KPI respects 7/30/90 selector on `vw_call_stats_daily.day`. After fix, KPI still won't match table when window ≠ 30 days — acceptable; smoke test used 30 days.

### Caching

None. Pure Supabase view queries in `useEffect`; no React Query cache or localStorage.

### Files involved

- `src/pages/Reports.tsx`
- `supabase/migrations/20260509125053_793bdc26-6882-4f3b-a29e-701af483358b.sql`
- `supabase/migrations/20260702160000_crm_rc_analytics_views_fix.sql`
- `supabase/functions/telephony-click-to-call/index.ts`

### SQL / RPC

- `public.vw_call_stats_daily` (view)
- `public.vw_telecaller_productivity` (view)
- `public.call_sessions` (base table)

### Risk

Low–medium. Including `created_at` fallback counts initiated/failed dials as calls — aligns with productivity semantics and telecaller operational reality.

### Recommended fix

Replace `WHERE start_time IS NOT NULL` with `date_trunc('day', COALESCE(start_time, created_at))` in `vw_call_stats_daily`.

Optional follow-up: set `start_time = created_at` on insert in edge function (not required for KPI fix).

### Fix implemented

**Yes** — migration `20260702160000_crm_rc_analytics_views_fix.sql`.

### Why it is safe

- Does not alter stored session rows or inflate counts artificially in application code.
- Same rows productivity already counts; only aggregation definition aligned.
- `security_invoker` preserved.

### Tests performed

- SQL definition review (before/after).
- Migration file added to repo for Lovable apply.
- `npm run test:crm`.

### Business impact

Call volume KPI and chart match telecaller productivity — required for ops reporting UAT.

---

## Issue 3 — Client stage mismatch (Stage 1 of 15 vs 0/15)

### Symptom

Client detail header: **"stage 1 of 15"**; Stages button: **"0 / 15"**.

### Root cause

**Different metrics — not a logic bug.**

| UI element | File | Metric |
|------------|------|--------|
| Header | `ClientStageStepper.tsx` → `useClientStage` | **Current stage position** — index of first unticked stage + 1 (`deriveStepNumber`) |
| Button | `StageCheckboxPicker.tsx` line 58 | **Completed stages** — `completedStageIds.size` |

Logic in `src/lib/clientStageCompletions.ts`:

- `deriveCurrentStageId`: first stage not in `completedStageIds`, else last stage.
- Client on first stage (Enrolled) with zero completions → position **1**, completed **0**.

Both values are **correct** under current product rules (checkbox completions are independent of position).

### Files involved

- `src/components/clients/ClientStageStepper.tsx`
- `src/components/clients/StageCheckboxPicker.tsx`
- `src/hooks/useClientStage.ts`
- `src/lib/clientStageCompletions.ts`

### SQL / RPC

Stage completions: `client_stage_completions`, `client_stage_completion_log`.  
Current stage sync: `clients.current_stage_id` updated via `syncCurrentStage()` in hook.

### Risk

Label-only change — no data mutation.

### Recommended fix

Clarify labels: header **"current stage N of M"**; button **"Done (X/M)"**.

Do **not** force both numbers equal without a product decision to redefine "current stage" as "completed count".

### Fix implemented

**Yes** — label updates in `ClientStageStepper.tsx` and `StageCheckboxPicker.tsx`.

### Why it is safe

Display-only; no change to stage derivation, completions, or DB writes.

### Tests performed

- Code trace of `deriveStepNumber` vs `doneCount`.
- Manual logic walk-through for 0 completions on stage 1.

### Business impact

Removes UAT confusion; counselors understand position vs completion checklist.

---

## Issue 4 — Pipeline analytics empty ("No pipeline data yet")

### Symptom

Dashboard and Reports show empty pipeline stage distribution despite clients with active steppers on detail pages.

### Root cause

**Missing database object — schema drift.**

1. App queries `vw_stage_distribution` from:
   - `src/dashboard/lib/fetchDashboardData.ts` (line 81)
   - `src/pages/Reports.tsx` (line 66)

2. Repo contains only:
   ```sql
   ALTER VIEW public.vw_stage_distribution SET (security_invoker = on);
   ```
   (`20260523225312_9c8683b8-91d0-4ddd-8d2e-0d6ad2964730.sql`) — **no `CREATE VIEW`**.

3. Live REST probe (anon key, 2026-07-02):
   ```
   PGRST205: Could not find the table 'public.vw_stage_distribution' in the schema cache
   ```

4. UI treats empty/error as `[]` → "No pipeline data yet" (`DashboardV2.tsx` line 469, `Reports.tsx` line 333).

**Not primarily** missing `pipeline_id` on clients — client detail uses `vw_client_current_stage` and steppers work in smoke test. The analytics view simply did not exist for PostgREST to query.

### Dashboard query

```typescript
(supabase as any).from("vw_stage_distribution").select("*")
  .order("pipeline_name").order("sort_order")
```

### Expected shape (from Reports types)

`pipeline_id`, `pipeline_name`, `country`, `service_category`, `stage_id`, `stage_key`, `stage_label`, `sort_order`, `client_count`

### Files involved

- `src/dashboard/lib/fetchDashboardData.ts`
- `src/dashboard/components/DashboardV2.tsx`
- `src/pages/Reports.tsx`
- `supabase/migrations/20260523225312_9c8683b8-91d0-4ddd-8d2e-0d6ad2964730.sql`
- `supabase/migrations/20260702160000_crm_rc_analytics_views_fix.sql`

### SQL / RPC

New view (migration):

```sql
CREATE OR REPLACE VIEW public.vw_stage_distribution AS
SELECT sp.*, ps.*, count(c.id) AS client_count
FROM stage_pipelines sp
JOIN pipeline_stages ps ON ps.pipeline_id = sp.id
LEFT JOIN clients c ON c.pipeline_id = sp.id AND c.current_stage_id = ps.id
WHERE sp.is_active = true
GROUP BY ...
```

Counts clients by `clients.pipeline_id` + `clients.current_stage_id` (same fields backfilled in `20260617140000_backfill_client_pipelines.sql`).

### Risk

Low. Read-only aggregation; RLS via `security_invoker`. If `current_stage_id` drifts from completion-derived UI stage, counts follow DB column (consistent with reporting expectations).

### Recommended fix

Add `CREATE OR REPLACE VIEW vw_stage_distribution` migration; regenerate `types.ts` when convenient (optional).

### Fix implemented

**Yes** — `20260702160000_crm_rc_analytics_views_fix.sql`.

### Why it is safe

Creates the object the app already expects; no frontend KPI patching. Requires Lovable migration publish.

### Tests performed

- Grep: no `CREATE VIEW vw_stage_distribution` in repo before fix.
- REST schema error reproduced.
- Migration SQL reviewed against Reports `StageDist` type.

### Business impact

Pipeline funnel visible on Dashboard and Reports after migration publish — supports manager UAT on admissions funnel.

---

## Issue 5 — Phone scientific notation (9.19081E+11)

### Symptom

Telecaller queue shows phone `9.19081E+11` for lead "New Admin".

### Root cause

**Import pipeline stores Excel numeric phones as scientific-notation strings** — not a rendering bug.

**Display path** — `MyQueueTab.tsx` renders `lead.phone` as plain text (no number formatting).

**Column type** — `leads.phone` / `clients.phone` are **text**.

**Import path (cold leads CSV/XLSX):**

1. `src/lib/leadImport.ts` → `parseCsv()`:
   - XLSX: `XLSX.utils.sheet_to_json` then `String(v ?? "")` on every cell (line 63).
   - Excel stores large numeric phones as JS numbers → `String(919081000000)` → `"9.19081E+11"`.

2. `normalize()` (line 47): `(out as Record<string, string>)[key] = String(v).trim()` — preserves bad string.

3. `importRows()` → RPC `import_lead` with `_phone: row.phone!`.

4. SQL `import_lead` / `import_lead_v2`: `btrim(_phone)` stored as-is — no digit normalization.

**Conclusion:** Corruption occurs at **parse/normalize** before RPC; DB faithfully stores the bad string.

### Where import validation should occur

| Layer | Location | Action |
|-------|----------|--------|
| **Primary (recommended)** | `src/lib/leadImport.ts` — `normalize()` or post-parse phone helper | Detect scientific notation / non-digit phones; expand to full digit string; validate length (10–15 digits); surface `_errors` in preview |
| **Secondary** | `import_lead` RPC (`20260718120047_crm_remediation_phase1.sql`) | `normalize_phone(text)` SQL function: reject or fix `~E+` patterns before INSERT |
| **Legacy** | `import_lead_v2` (`20260509125053_*.sql`) | Same phone normalization if still used |
| **Not appropriate** | Telecaller / Clients UI render | Cosmetic only; violates "do not patch symptoms" |

**Example validation rule:** If phone matches `/^\d+(?:\.\d+)?[eE][+\-]?\d+$/`, parse with `Number(phone).toFixed(0)` or dedicated bigint-safe parser; reject if result is not 10–15 digits.

### Files involved

- `src/lib/leadImport.ts`
- `supabase/migrations/20260718120047_crm_remediation_phase1.sql` (`import_lead`)
- `supabase/migrations/20260509125053_793bdc26-6882-4f3b-a29e-701af483358b.sql` (`import_lead_v2`)
- `src/components/telecaller/MyQueueTab.tsx` (display only)

### SQL / RPC

- `public.import_lead(...)`
- `public.import_lead_v2(payload jsonb, ...)`

### Risk

Existing bad rows remain until re-import or manual SQL update. New imports without validation will repeat the issue.

### Recommended fix

Add phone normalization in `leadImport.ts` preview + RPC guard (future sprint). **Not implemented in this pass** per scope (document only; no cosmetic UI fix).

### Fix implemented

**No** — documentation only.

### Why deferral is acceptable for UAT

- Isolated to CSV/XLSX imports where phone column was numeric in Excel.
- Manual lead entry and properly formatted CSV unaffected.
- UAT can proceed with known data-quality caveat.

### Tests performed

- Code trace import → RPC → storage.
- Confirmed text column + `String(v)` XLSX path.

### Business impact

Telecaller may see undialable numbers for affected imports; ops should fix source spreadsheet (format phone column as Text) or re-import after validation is added.

---

## Fixes shipped in this pass

| File | Change |
|------|--------|
| `src/dashboard/lib/fetchDashboardData.ts` | Client count for all `needAdmissions` modes |
| `supabase/migrations/20260702160000_crm_rc_analytics_views_fix.sql` | Fix `vw_call_stats_daily`; create `vw_stage_distribution` |
| `src/components/clients/StageCheckboxPicker.tsx` | "Done (X/Y)" label |
| `src/components/clients/ClientStageStepper.tsx` | "current stage N of M" label |
| `qa/regression/CRM-R-013-dashboard-client-count.test.ts` | Regression guard |

---

## UAT readiness

### Ready after Publish

- Dashboard Total Clients (Issue 1)
- Reports Total Calls after migration (Issue 2)
- Stage label clarity (Issue 3)
- Pipeline distribution after migration (Issue 4)

### Known caveat (non-blocking)

- **Issue 5:** Legacy scientific-notation phones in DB; fix at import layer in follow-up.
- **Reports window:** Telecaller productivity table always 30d; KPI chart respects 7/30/90 — minor inconsistency when window ≠ 30.

### Owner action

1. **Lovable → Publish** — approve migration `20260702160000_crm_rc_analytics_views_fix.sql`
2. **Hard refresh** (Cmd+Shift+R)
3. Re-verify Dashboard clients count, Reports call KPI, pipeline chart

See `docs/LOVABLE_PUBLISH_CHECKLIST.md` for migration checklist.

---

## Final verdict

**CRM is ready for Business UAT** once the analytics migration is published. One documented data-quality gap (Issue 5 import validation) remains for a follow-up hardening task; it does not block functional UAT of core CRM workflows validated in the live smoke test.
