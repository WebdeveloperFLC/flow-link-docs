# Phase 1 Build Plan — Reports, Distribution, Excel Import

Strictly additive. Existing chat, telephony, timeline, tasks, AI summary, and client workspace stay untouched.

---

## 1) Reports & Analytics Dashboard

New route `/reports` (admin + manager + counselor scoped views).

### Data layer
- Add Postgres views (read-only, RLS-respecting via `SECURITY INVOKER`):
  - `vw_call_stats_daily` — calls, answered, unanswered, avg duration per agent/day
  - `vw_lead_funnel` — counts by `lead_status` × `lead_temperature` × `campaign_id`
  - `vw_telecaller_productivity` — calls/day, talk time, callbacks completed, conversions handed off
  - `vw_counselor_productivity` — handoffs accepted, tasks closed, status moves to enrolled
  - `vw_campaign_performance` — leads, hot/warm/cold, callbacks pending, converted, enrolled
  - `vw_country_intake_trends` — leads by `country` and intake month
  - `vw_visa_outcomes` — approvals/rejections from `clients.status` history (uses `client_timeline` status_change events)
- Add helper RPC `report_response_times(_from date, _to date)` for first-call latency and callback completion %.

### UI
- `src/pages/Reports.tsx` with tabs:
  - **Overview** — KPI tiles + 30-day trend (calls, leads, conversions, enrollments)
  - **Telecallers** — per-agent table, sortable
  - **Counselors** — per-counselor table
  - **Campaigns** — per-campaign performance + ROI placeholder
  - **Funnel & Geo** — funnel chart + country/intake trends
- Charts via existing `recharts` already in project. Date range picker, export-to-CSV.

### Files
- `supabase/migrations/<ts>_reports_views.sql`
- `src/pages/Reports.tsx`, `src/lib/reports.ts`
- `src/components/reports/{KpiTile,FunnelChart,AgentTable,CampaignTable}.tsx`
- Sidebar entry in `src/components/layout/AppLayout.tsx`

---

## 2) Bulk Lead Distribution Engine

New tables + RPC; reuses existing `client_access`, `call_queue_items`, `telephony_agents`.

### Schema
- `distribution_rules` — `name, mode (round_robin|random|fixed_qty|team), campaign_id?, team_id?, fixed_qty int?, active bool`
- `distribution_rule_members` — `rule_id, user_id, weight int default 1, daily_cap int?`
- `distribution_runs` — audit row per execution: `rule_id, executed_by, lead_count, summary jsonb, executed_at`

### RPC
- `distribute_leads(_lead_ids uuid[], _rule_id uuid)` — assigns telecallers (writes `client_access` + `call_queue_items.assigned_agent_id`), respects caps, returns per-user counts.
- `rebalance_leads(_campaign_id uuid, _rule_id uuid)` — re-spreads queued/uncalled leads.
- `reassign_leads(_lead_ids uuid[], _to_user uuid)` — manual override.

All `SECURITY DEFINER`, admin/manager only, writes `activity_logs`.

### UI
- `src/components/leads/DistributionRulesCard.tsx` on a new `/admin/distribution` page.
- Inline "Distribute now" + "Rebalance" actions inside `ImportLeadsDialog` Step 5.
- Per-row "Reassign" in telecaller `ListsTab`.

---

## 3) Excel + Column Mapping Importer (rebuild `ImportLeadsDialog`)

Replace single-CSV form with a 4-step wizard. Existing `import_lead` RPC is extended with new optional fields.

### Step 1 — Upload
- Accept CSV and XLSX. Use `xlsx` (SheetJS) — already common; `bun add xlsx`.
- "Download sample template" button → emits XLSX with all default fields below.

### Step 2 — Map columns
- Drag-to-map UI matching detected headers to canonical fields. Auto-suggest by fuzzy match.
- Required: `first_name`, `last_name`, `phone`. All others optional.

### Step 3 — Duplicate preview
- Dedupe by phone / email / passport / whatsapp.
- Show new vs duplicate counts. Per-duplicate action: skip / merge / update.
- "Download duplicates as XLSX" before import.

### Step 4 — Distribute & confirm
- Pick campaign, distribution rule (from Phase-2), preview per-user counts.
- Import → calls extended `import_lead_v2` RPC in batches; shows progress.

### Default field set (recommended)
Basic: first_name, last_name, gender, dob, mobile, whatsapp, email, city, state, country
Study: interested_country, interested_course, intake, education_level, passing_year, percentage_or_cgpa, ielts, pte, duolingo, gre, gmat, toefl, gap_years, work_experience, budget, passport_available, visa_refusal_history, preferred_language, preferred_contact_time
Sales/CRM: lead_source, campaign, assigned_telecaller, assigned_counselor, priority, lead_temperature, lead_stage, next_followup_date, callback_time, last_remark, enrollment_probability, notes
Operational: documents_pending, parent_contact, alternate_number, timezone, tags

Storage: extend `clients` and `client_profile` with the missing scalar columns; spec-only fields like `tags` go to `clients.tags text[]`. Test scores not yet in `client_profile` are added there.

### Files
- `src/components/telecaller/ImportLeadsDialog.tsx` — rewritten (replaces existing single-form)
- `src/lib/leadImport.ts` — extended with mapping + XLSX parser
- `supabase/migrations/<ts>_lead_fields_and_distribution.sql`

---

## 4) Smart Lead Scoring (lightweight, deterministic v1)

To unblock Hot/Warm/Cold without immediate AI cost.

- New column `clients.lead_score int` + `clients.lead_score_reasons jsonb`.
- Trigger `fn_recalc_lead_score()` on insert/update of relevant fields and on related `lead_remarks`/`call_sessions` insert.
- Rules engine in SQL: IELTS ≥ 6.5 (+20), passport available (+15), budget set (+10), recent positive remark (+15), 2+ unanswered calls (-15), etc. Caps Hot ≥70, Warm 40–69, Cold <40.
- AI re-scoring deferred — hook left in `ai-summarize` for future.

Surfaced in queue rows + client header chip. No retraining needed — pure rules.

---

## Out of scope for this phase (called out from spec but deferred)
- Enrollment pipeline page (data already exists via `clients.status`; needs UI).
- Live team performance dashboard (extends Reports later with `telecaller_status` realtime).
- Counselor Workspace dedicated route.

---

## Risks
- The new `clients` columns require a careful migration; defaults are NULL so existing rows are safe.
- `xlsx` adds ~400KB to bundle — code-split inside `ImportLeadsDialog` (dynamic import).
- Distribution RPCs run inside a transaction; large imports (>5k) batched at 500 rows.
- Reports views use `SECURITY INVOKER` so RLS still applies — counselors only see their assigned clients in reports.

---

## Build order
1. Schema migration (lead fields + distribution tables + score column + reports views).
2. `import_lead_v2` RPC + distribution RPCs.
3. New `ImportLeadsDialog` wizard (uses both above).
4. Distribution rules admin page.
5. Reports page + charts.
6. Lead score trigger + UI chip.
7. Sidebar wiring + permission gates.

This will land across 2–3 follow-up turns. After your approval I'll start with the migration.
