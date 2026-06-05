# Dashboard V2 — Optimization Review

**Review date:** 2026-06-05  
**Context:** Hybrid migration — some staff on new CRM, some still on Odoo; mixed production and test data  
**Scope:** Every widget currently rendered on `/` (`DashboardV2.tsx`)  
**Action:** Audit and wireframe only — **no UI changes in this review**

**Implementation files reviewed:**
- `src/dashboard/components/DashboardV2.tsx`
- `src/dashboard/hooks/useDashboardV2Data.ts` (31 parallel queries per page load)

---

## Migration context assumptions

| Factor | Impact on dashboard |
|--------|---------------------|
| **CRM is declared source of truth** | Per `docs/guides/odoo-usage-guide.md`, Odoo sync is inactive/historical — but staff still on Odoo means **CRM counts under-represent firm-wide activity** |
| **Dual lead models** | Telephony leads live on `clients` (`vw_lead_funnel`); formal leads live on `leads` table — **Hot Leads and Lead Conversion measure different populations** |
| **No data-quality filters** | Dashboard has no `is_test`, branch, or `odoo_synced_at` filters — test rows and partial migrations pollute KPIs |
| **Multi-currency revenue** | Payment and invoice sums add amounts across currencies without FX normalization |
| **RLS scopes data per user** | Counts reflect what the logged-in user can see, not necessarily firm-wide totals for non-admin roles |

**Recommended global addition (future):** A migration banner on `/`:

> *“Metrics reflect CRM data only. Odoo-only records are not included. Last updated: …”*

---

## Scoring legend

### Data quality classification

| Label | Meaning |
|-------|---------|
| **Production Data** | Source is live, staff-facing, intended for decisions |
| **Mixed Data** | Production schema but incomplete coverage (Odoo gap, dual models, multi-currency, RLS scope) |
| **Test Data** | Likely dominated by sandbox/QA rows or unused modules |
| **Incomplete Integration** | Feature or table exists but go-live / sync / adoption incomplete |

### Scores (1–10)

| Score | Business Value | Data Reliability |
|-------|----------------|------------------|
| 9–10 | Critical executive decision metric | Trustworthy firm-wide with known caveats only |
| 7–8 | High value for role or migration tracking | Mostly reliable for CRM-adopted staff |
| 5–6 | Useful operationally | Directionally correct; do not use for exec sign-off |
| 3–4 | Niche audience | Often zero, stale, or misleading during migration |
| 1–2 | Low value or harmful if misread | Unreliable or test-dominated |

### Dashboard tier

| Tier | Audience | Purpose |
|------|----------|---------|
| **Executive Dashboard** | Owners, managers | 6–10 KPIs max; firm health during migration |
| **Operations Dashboard** | Telecallers, counselors, ops | Daily work queues and team performance |
| **Reports & Analytics** | Managers, analysts | Drill-down, CSV export, full tables |
| **Hide Until Go-Live** | — | Schema exists but misleading until module/cutover complete |

---

## Widget inventory (complete)

### Section A — Executive KPI row (8 stat cards)

| # | Widget | Data source | Data quality | Biz | Rel | Tier | Duplicate on `/reports`? | Recommendation |
|---|--------|-------------|--------------|-----|-----|------|--------------------------|----------------|
| A1 | **Total Clients** | `clients` count | **Mixed** — includes all CRM clients; excludes Odoo-only; may include test profiles | 8 | 6 | Executive | No (reports has no total) | **Stay** — primary CRM adoption indicator; add “CRM only” label |
| A2 | **Hot Leads** | `vw_lead_funnel` → `clients.lead_temperature = hot` | **Mixed** — telephony/client leads only, not `leads` table | 7 | 5 | Operations | **Partial** — reports shows “Hot / total” KPI | **Move** to Operations; replace exec slot with **Enrollments** or **New Apps (30d)** |
| A3 | **Calls (30d)** | `vw_call_stats_daily` aggregated | **Production** — if TeleCMI adopted | 7 | 7 | Operations | **Yes** — reports KPI “Total Calls” | **Move** to Operations |
| A4 | **Answer Rate** | Derived from `vw_call_stats_daily` | **Production** — same caveat as A3 | 6 | 7 | Operations | **Yes** — reports “Answered (%)” | **Move** to Operations |
| A5 | **Outstanding AR** | `client_invoice_aging` sum `balance_due` | **Mixed** — CRM invoices only; multi-currency sum; Odoo billing excluded | 9 | 5 | Executive | No | **Stay** — high value; add currency caveat + link to invoices |
| A6 | **Overdue Tasks** | `client_tasks` count, `status != done`, `due_at < now` | **Production** — for CRM task users | 8 | 7 | Operations | No | **Stay** on Operations dashboard |
| A7 | **Bookings (7d)** | `calendar_events` pending/scheduled, next 7 days | **Mixed** — only if calendar module adopted firm-wide | 6 | 6 | Operations | No | **Move** to Operations |
| A8 | **WhatsApp Queue** | `whatsapp_conversations` queue statuses | **Incomplete Integration** — Phase 0/1; may be empty or test | 7 | 3 | Hide Until Go-Live | No | **Hide** until Meta Phase 1 production cutover |

---

### Section B — Admissions KPI row (7 stat cards)

| # | Widget | Data source | Data quality | Biz | Rel | Tier | Duplicate on `/reports`? | Recommendation |
|---|--------|-------------|--------------|-----|-----|------|--------------------------|----------------|
| B1 | **Enrollments** | `clients` where `status IN ('enrolled','visa_approved')` | **Mixed** — status must be maintained in CRM; Odoo enrollments missing | 10 | 4 | Executive | No | **Stay** — top exec KPI; reliability improves with status SOP |
| B2 | **New Apps (30d)** | `clients.created_at >= 30d` | **Mixed** — includes test imports; excludes Odoo-only apps | 9 | 5 | Executive | No | **Stay** |
| B3 | **Final Programs** | `cf_client_programs.status = final` | **Test / Mixed** — new module; low adoption early | 8 | 4 | Operations | No | **Move** — hide until course-finder adoption confirmed |
| B4 | **Lead Conversion** | `leads` converted / total | **Mixed** — formal `leads` table only; ignores telephony `clients` leads | 7 | 4 | Reports & Analytics | No | **Move** to Reports; conflicts with Hot Leads semantics |
| B5 | **Open Leads** | `leads` not converted/lost/unqualified | **Mixed** — same dual-model issue | 7 | 5 | Operations | No | **Move** to Operations |
| B6 | **Study Permits** | `clients.study_permit_number IS NOT NULL` | **Mixed** — only if counselors enter permit data in CRM | 8 | 4 | Executive | No | **Stay** with “CRM-entered only” footnote |
| B7 | **Assessments Done** | `assessment_sessions.status = completed` | **Test / Mixed** — may include QA sessions | 5 | 4 | Hide Until Go-Live | No | **Hide** or move to Reports until assessment go-live |

---

### Section C — Revenue KPI row (6 stat cards)

| # | Widget | Data source | Data quality | Biz | Rel | Tier | Duplicate on `/reports`? | Recommendation |
|---|--------|-------------|--------------|-----|-----|------|--------------------------|----------------|
| C1 | **Collected (30d)** | `client_invoice_payments` sum | **Mixed** — CRM payments only; multi-currency; Odoo collections excluded | 10 | 5 | Executive | No | **Stay** — label “CRM collections” |
| C2 | **Invoiced (30d)** | `client_invoices.amount` sum | **Mixed** — same caveats | 9 | 5 | Executive | No | **Stay** |
| C3 | **Collection Rate** | `amount_paid / amount` on active invoices | **Mixed** — all-time ratio, not 30d; multi-currency | 8 | 4 | Executive | No | **Stay** — rename to “CRM collection rate (all open)” |
| C4 | **Offer Revenue** | `offer_roi_stats` RPC sum | **Test / Mixed** — zero if offers module unused | 6 | 3 | Hide Until Go-Live | Partial — `/offers-analytics` | **Hide** until offers in production use |
| C5 | **Commission Expected** | `upi_claim_cycles.total_expected` sum (all cycles) | **Mixed** — no status filter; includes draft cycles | 7 | 4 | Reports & Analytics | No | **Move** to Institutions exec view |
| C6 | **Active Offers** | `offers.is_active` count | **Test / Mixed** | 5 | 5 | Hide Until Go-Live | No | **Hide** with C4 |

---

### Section D — Charts and tables

| # | Widget | Data source | Data quality | Biz | Rel | Tier | Duplicate on `/reports`? | Recommendation |
|---|--------|-------------|--------------|-----|-----|------|--------------------------|----------------|
| D1 | **Applications by status** | `clients.status` client-side group | **Mixed** — includes test statuses; Odoo apps absent | 8 | 5 | Executive | No | **Stay** — core admissions viz |
| D2 | **Counselor productivity** (table, top 8) | `vw_counselor_productivity` | **Mixed** — enrollments depend on `clients.status`; owner_id based | 8 | 5 | Operations | **Yes** — full table on reports | **Move** to Operations; link to reports for CSV |
| D3 | **Top offers by influenced revenue** | `offer_roi_stats` RPC top 5 | **Test / Mixed** | 5 | 3 | Reports & Analytics | **Yes** — `/offers-analytics` | **Move** to offers-analytics only |
| D4 | **Calls chart (30d)** | `vw_call_stats_daily` by day | **Production** (if telephony live) | 6 | 7 | Reports & Analytics | **Yes** — identical chart | **Move** to Reports |
| D5 | **Lead temperature pie** | `vw_lead_funnel` | **Mixed** | 6 | 5 | Reports & Analytics | **Yes** — identical pie | **Move** to Reports |
| D6 | **Pipeline stage distribution** | `vw_stage_distribution` | **Mixed** — only CRM-pipeline clients | 9 | 6 | Executive | **Yes** — identical chart + CSV | **Stay** (exec) — dedupe: remove from above-fold on reports or dashboard, not both |
| D7 | **AR aging buckets** | `client_invoice_aging` | **Mixed** — multi-currency | 9 | 5 | Executive | No | **Stay** |
| D8 | **Tasks & follow-ups due** (list) | `client_tasks` + client join | **Production** | 9 | 7 | Operations | No | **Stay** on Operations |
| D9 | **Recent clients** (list) | `clients` order by `created_at` | **Mixed** | 7 | 6 | Operations | No | **Stay** on Operations |
| D10 | **Telecaller leaderboard** (top 5) | `vw_telecaller_productivity` | **Production** (if telephony live) | 6 | 7 | Reports & Analytics | **Yes** — full table + CSV | **Move** to Reports |

---

### Section E — Institutions row (4 stat cards)

| # | Widget | Data source | Data quality | Biz | Rel | Tier | Duplicate on `/reports`? | Recommendation |
|---|--------|-------------|--------------|-----|-----|------|--------------------------|----------------|
| E1 | **Active Institutions** | `upi_institutions.is_active` | **Production** (UPI module) | 6 | 8 | Operations | No | **Move** — UPI admin audience only |
| E2 | **Partner Institutions** | `upi_institutions.is_partner` | **Production** | 6 | 8 | Operations | No | **Move** with E1 |
| E3 | **Courses Pending Review** | `upi_courses_staging.pending_review` | **Production** | 5 | 8 | Operations | No | **Move** with E1 |
| E4 | **AI Suggestions Pending** | `upi_ai_suggestions.pending` | **Production** | 5 | 7 | Operations | No | **Move** with E1 |

---

## Duplicate summary: Dashboard vs `/reports`

| Widget on `/` | Also on `/reports` | Notes |
|---------------|-------------------|-------|
| Calls (30d) KPI | Total Calls KPI | Same underlying view |
| Answer Rate KPI | Answered (%) KPI | Same derivation |
| Hot Leads KPI | Hot Leads / total KPI | Same `vw_lead_funnel` |
| Calls chart | Calls chart | **Identical** |
| Lead temperature pie | Lead temperature pie | **Identical** |
| Pipeline stage distribution | Stage distribution chart | **Identical** (+ CSV on reports) |
| Telecaller leaderboard | Telecaller productivity table | Dashboard top 5 vs reports full 50 + CSV |
| Counselor productivity | Counselor productivity table | Dashboard top 8 vs reports full 50 + CSV |

**Not on `/reports` but on dashboard:** AR aging, outstanding AR, tasks due, recent clients, admissions/revenue KPIs, applications by status, institutions, offers, WhatsApp, bookings, assessments, formal leads metrics.

**On `/reports` but not on dashboard:** Campaign performance, country/intake demand, unanswered calls KPI, counselor table talk-time column, CSV exports.

---

## Aggregate assessment

### Current dashboard problems (migration phase)

1. **43 widget surfaces** (21 KPI cards + 9 charts/tables/lists + institutions) on a single scroll — cognitive overload for executives.
2. **~8 widgets duplicate `/reports`** — maintenance burden and user confusion (“which number is right?”).
3. **Dual lead semantics** — Hot Leads (clients) vs Open Leads / Lead Conversion (`leads`) without explanation.
4. **Revenue KPIs overstate precision** — multi-currency sums presented as single numbers.
5. **Odoo blind spot** — no indicator that firm-wide totals are incomplete.
6. **31 parallel queries** on every `/` visit — performance cost for widgets many users never need.
7. **No role-based layout** — telecallers see commission expected; UPI admins see telephony — wrong audience.
8. **Go-live widgets visible** — WhatsApp queue, offers, assessments show zeros or test data, eroding trust.

### What should stay (Executive Dashboard — migration phase)

| Widget | Why |
|--------|-----|
| Enrollments | Primary admissions outcome KPI |
| New Apps (30d) | CRM adoption + pipeline inflow |
| Outstanding AR | Cash risk — even if CRM-partial |
| Collected (30d) | Revenue pulse — with CRM-only label |
| Invoiced (30d) | Billing activity |
| Study Permits | Visa outcome proxy |
| Applications by status (chart) | Pipeline health at a glance |
| Pipeline stage distribution (chart) | Admissions funnel by stage |
| AR aging buckets (chart) | Collections priority |

**9 surfaces** — down from 43.

### What should move

| Destination | Widgets |
|-------------|---------|
| **Operations Dashboard** (`/` ops tab or `/operations`) | Overdue tasks, tasks due list, recent clients, hot leads, open leads, bookings, telecaller leaderboard (summary), counselor productivity (summary), final programs |
| **Reports & Analytics** (`/reports`) | Calls KPI/chart, answer rate, lead temperature pie, telecaller full table, counselor full table, lead conversion |
| **Institutions module home** | All 4 UPI institution KPIs, commission expected |
| **Offers Analytics** (`/offers-analytics`) | Offer revenue KPI, active offers, top offers table |

### What should hide until go-live

| Widget | Gate |
|--------|------|
| WhatsApp Queue | Meta Phase 1 production + staff trained |
| Assessments Done | Assessment funnel live for counselors |
| Offer Revenue, Active Offers, Top offers table | Offers module in production use |
| Final Programs | Course finder adoption confirmed |

### Missing widgets (high value, schema-ready)

| Widget | Source | Why missing matters |
|--------|--------|---------------------|
| **Migration banner** | Static + `integration_settings` | Sets CRM-only expectation |
| **Odoo sync health** | `clients.odoo_synced_at` / sync errors | Visibility during hybrid phase |
| **CRM vs firm-wide disclaimer on revenue** | Static | Prevents exec misread |
| **Country / intake demand** | `vw_country_intake_trends` | On reports only — key for admissions planning |
| **Pending handoffs** | `lead_handoffs.status = pending` | Counselor ops queue |
| **Callbacks pending** | `call_queue_items` or telecaller view | Telecaller daily queue |
| **Enrollment trend (30d sparkline)** | `clients` by `created_at` / status | Exec trend vs single point |
| **Odoo-only clients indicator** | Future: sync log | Cannot build accurately today |

---

## Proposed Dashboard V2 wireframe (migration phase)

**Design principles:**
- One screen, three logical zones — no tab required for v1 wireframe, but visually separated
- Executive zone first (above fold)
- Operations zone collapsed or below fold
- Reports linked, not duplicated
- Footnotes on every revenue/admissions KPI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Dashboard                                    [Full Reports →]              │
│  Welcome back, {name}. CRM metrics only — Odoo data not included.  ⓘ       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EXECUTIVE SNAPSHOT                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Enrollments│ │New Apps  │ │Study     │ │Outstanding│ │Collected │        │
│  │          │ │ (30d)    │ │Permits   │ │ AR ⓘ     │ │ (30d) ⓘ  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐                                                 │
│  │Invoiced  │ │Collection│                                                 │
│  │ (30d) ⓘ │ │Rate ⓘ    │                                                 │
│  └──────────┘ └──────────┘                                                 │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐        │
│  │ Applications by status       │  │ Pipeline stage distribution │        │
│  │ (horizontal bar)             │  │ [Pipeline ▼] (bar chart)    │        │
│  └─────────────────────────────┘  └─────────────────────────────┘        │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │ AR aging buckets                                              │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  YOUR WORK TODAY (Operations)                          [Role-filtered]       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                        │
│  │Overdue Tasks │ │Callbacks *   │ │Bookings (7d) │                        │
│  └──────────────┘ └──────────────┘ └──────────────┘                        │
│  * telecaller role only                                                    │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐        │
│  │ Tasks & follow-ups due       │  │ Recent clients              │        │
│  │ (action list)                │  │ (last 5)                    │        │
│  └─────────────────────────────┘  └─────────────────────────────┘        │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │ Team performance → View full reports                           │          │
│  │  Telephony · Counselors · Campaigns · Country/intake           │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  MODULE SNAPSHOTS (collapsed accordions — role-gated)                        │
│  ▶ Institutions (UPI admin)     ▶ Offers (when live)    ▶ WhatsApp (Phase 1)│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe zone map

| Zone | Widgets included | Removed from current `/` |
|------|------------------|--------------------------|
| **Executive Snapshot** | Enrollments, New Apps, Study Permits, Outstanding AR, Collected, Invoiced, Collection Rate, Apps by status, Pipeline stages, AR aging | Hot Leads, Calls, Answer Rate, WhatsApp, duplicate charts |
| **Your Work Today** | Overdue tasks, Tasks list, Recent clients, Bookings; role: callbacks for telecallers | Telecaller/counselor leaderboards |
| **Team performance link** | Single CTA → `/reports` | Calls chart, lead pie, telecaller table, counselor table |
| **Module snapshots** | UPI 4 KPIs (accordion), Offers/WhatsApp hidden until go-live | Offers table, institutions always visible |

### Role visibility (recommended)

| Role | Executive zone | Operations zone | Module accordions |
|------|----------------|-----------------|-------------------|
| Admin / Manager | Full | Full | All enabled modules |
| Counselor | Full | Tasks, recent clients, bookings | Hidden |
| Telecaller | Summary only (4 KPIs) | Callbacks, tasks | Hidden |
| UPI / Commission admin | Revenue subset | — | Institutions expanded by default |

---

## Implementation priority (when UI changes are approved)

| Priority | Change | Effort |
|----------|--------|--------|
| P0 | Migration disclaimer banner + ⓘ tooltips on revenue KPIs | Low |
| P0 | Remove duplicate charts (calls, lead pie) — link to `/reports` | Low |
| P1 | Collapse to executive + operations zones per wireframe | Medium |
| P1 | Hide WhatsApp, offers, assessments behind go-live flags | Low |
| P2 | Role-based widget visibility | Medium |
| P2 | Split query hook — lazy-load operations section | Medium |
| P3 | Add missing widgets (handoffs, callbacks, country/intake mini) | Low |
| P3 | Odoo sync health indicator | Medium (needs query design) |

---

## Decision summary

| Action | Count | Widgets |
|--------|------:|---------|
| **Stay on Executive Dashboard** | 9 | Enrollments, New Apps, Study Permits, Outstanding AR, Collected, Invoiced, Collection Rate, Apps by status, Pipeline stages, AR aging |
| **Move to Operations** | 10 | Hot Leads, Overdue Tasks, Bookings, Open Leads, Final Programs, Tasks list, Recent clients, Counselor table (summary), Telecaller table (summary), partial exec KPIs |
| **Move to Reports & Analytics** | 5 | Calls KPI/chart, Answer Rate, Lead temperature pie, full telecaller/counselor tables |
| **Move to module pages** | 6 | 4 UPI KPIs, Commission Expected, Offer widgets → offers-analytics |
| **Hide until go-live** | 4 | WhatsApp Queue, Assessments Done, Offer Revenue, Active Offers (+ top offers table) |

**Net result:** Executive dashboard shrinks from **~43 surfaces to ~9–12**, with operations and reports absorbing the rest — appropriate for Future Link Consultants during Odoo → CRM migration.

---

## Related documents

- [DASHBOARD_V2_DATA_AVAILABILITY_REPORT.md](./DASHBOARD_V2_DATA_AVAILABILITY_REPORT.md) — Phase 1 schema audit
- [DASHBOARD_V2_ADMISSIONS_REVENUE_REPORT.md](./DASHBOARD_V2_ADMISSIONS_REVENUE_REPORT.md) — Admissions/revenue table map
- [docs/guides/odoo-usage-guide.md](../guides/odoo-usage-guide.md) — Odoo inactive; CRM source of truth
- `src/pages/Reports.tsx` — duplicate analytics surface

---

*No widgets were removed or changed in this review. Approve wireframe before implementation.*
