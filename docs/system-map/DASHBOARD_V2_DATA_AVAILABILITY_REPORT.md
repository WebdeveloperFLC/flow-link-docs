# Dashboard V2 — Data Availability Report

**Audit date:** 2026-06-05  
**Scope:** Full Supabase schema audit against a consolidated executive dashboard (Dashboard V2)  
**Sources:** `supabase/migrations/` (182 files), `src/integrations/supabase/types.ts`, current dashboard UIs

---

## Executive summary

There is **no written Dashboard V2 product spec** in this repository. Analytics today are **fragmented** across six pages:

| Surface | Route | Data maturity |
|---------|-------|---------------|
| Main CRM dashboard | `/` | Minimal — 8 stat cards + recent clients |
| Reports & Analytics | `/reports` | Production — 6 SQL views + stage distribution |
| Offers analytics | `/offers` (admin) | Production — `offer_roi_stats` RPC |
| Calendar analytics | `/calendar/analytics` | Production — direct `calendar_events` queries |
| Institutions overview | `/institutions/:id` | Production — per-institution KPIs |
| Accounting overview | `/accounting` | **Placeholder** — hardcoded zeros |

**Database inventory:** 250 tables + 13 typed views in `types.ts`; 2 additional objects used in app code but missing from types (`vw_stage_distribution`, `whatsapp_*`).

### Readiness at a glance

| Status | Widget count | Meaning |
|--------|-------------|---------|
| **Ready** | 28 | Query existing tables/views/RPCs today |
| **Partial** | 14 | Schema exists; needs aggregation view, UI wiring, or data quality work |
| **Blocked** | 9 | Requires new tables, fields, external integration, or schema drift fix |

**Highest-value quick wins:** Promote `/reports` KPIs to `/`, wire `client_invoice_aging`, add tasks/follow-ups widget, surface offer ROI summary, add calendar no-show rate, add WhatsApp queue counts.

---

## Audit methodology

1. Enumerated all `CREATE TABLE` / `CREATE VIEW` statements in `supabase/migrations/`.
2. Cross-referenced generated types in `src/integrations/supabase/types.ts`.
3. Mapped every current dashboard widget to its data source(s).
4. Proposed a Dashboard V2 widget catalog from existing module capabilities + documented flows in `docs/system-map/`.
5. Classified each widget: **Ready** (build now), **Partial** (schema exists, gap is view/UI/integration), **Blocked** (net-new schema or external dependency).

---

## Schema inventory

### Analytics views (production-ready)

| View / RPC | Migration | Used by | In `types.ts` |
|------------|-----------|---------|---------------|
| `vw_call_stats_daily` | `20260509125053_*.sql` | Reports | Yes |
| `vw_lead_funnel` | same | Reports | Yes |
| `vw_telecaller_productivity` | same | Reports | Yes |
| `vw_counselor_productivity` | same | Reports | Yes |
| `vw_campaign_performance` | same | Reports | Yes |
| `vw_country_intake_trends` | same | Reports | Yes |
| `vw_client_current_stage` | ALTER only | Client detail, portal | Yes |
| `vw_portal_stages` | ALTER only | Portal | Yes |
| `vw_stage_distribution` | ALTER only (`20260523225312_*.sql`) | Reports `(supabase as any)` | **No** |
| `client_invoice_aging` | `20260523004405_*.sql` | Invoice panels (not dashboard) | Yes |
| `v_calendar_activity_feed` | `20260531195944_*.sql` | Calendar | Yes |
| `v_clients_masked` | `20260508120122_*.sql` | Telephony | Yes |
| `offer_roi_stats(date, date)` | `20260530161822_*.sql` | OffersAnalytics | Yes (Functions) |
| `counselor_offer_stats(date, date)` | same | OffersAnalytics | Yes (Functions) |

### Schema drift (fix before Dashboard V2)

| Object | Issue | Impact |
|--------|-------|--------|
| `vw_stage_distribution` | View exists in DB, not in `types.ts`, no CREATE in repo migrations | Reports uses unsafe cast; TS won't autocomplete |
| `whatsapp_conversations`, `whatsapp_messages` | In migration `20260604150000_whatsapp_inbox_phase0.sql`, not in `types.ts` | WhatsApp widgets need type regen |
| `stage_pipelines`, `pipeline_stages`, `client_stage_history` | In `types.ts`, no CREATE TABLE in repo migrations | Pipeline DDL may be out of sync with repo |
| `incentive_*`, `wallet_*` tables | In `types.ts`, no CREATE in repo migrations | Incentive widgets depend on live-only schema |
| Accounting overview | Tables exist (`accounting_journals`, `accounting_ar_invoices`, etc.) | UI not wired — shows zeros |

### Domain table groups (abbreviated)

| Domain | Key tables | ~Count |
|--------|-----------|--------|
| CRM core | `clients`, `client_profile`, `client_tasks`, `client_timeline`, `leads`, `lead_handoffs`, `stage_pipelines`, `pipeline_stages` | 25+ |
| Telephony | `call_sessions`, `call_queue_items`, `call_campaigns`, `telephony_agents`, `distribution_runs` | 10 |
| Documents | `client_documents`, `client_files`, `binders`, `client_document_extraction_queue` | 8 |
| Email | `app_email_logs`, `email_events`, `email_send_log`, `email_read_receipts` | 12 |
| WhatsApp | `whatsapp_conversations`, `whatsapp_messages` | 2 |
| Chat | `chat_channels`, `chat_messages`, `chat_read_receipts` | 8 |
| Invoices | `client_invoices`, `client_invoice_payments`, `client_invoice_aging` | 12 |
| Accounting | `accounting_journals`, `accounting_ar_invoices`, `accounting_ap_bills`, `accounting_petty_cash` | 20+ |
| UPI / Institutions | `upi_institutions`, `upi_courses_staging`, `upi_claim_cycles`, `upi_commissions`, `upi_ai_suggestions` | 28+ |
| Calendar | `calendar_events`, `calendar_meeting_types`, `calendar_event_crm_links` | 14 |
| Offers / loyalty | `offers`, `offer_events`, `client_offers`, `credit_wallet`, `referrals` | 10 |
| Incentives | `incentive_plans`, `incentive_runs`, `incentive_payouts`, `discount_wallets` | 12 |
| Assessment | `assessment_sessions`, `assessment_invitations`, `assessment_leads` | 7 |

Full inventory: `docs/system-map/04-database-map.md`.

---

## Current Dashboard V1 (`/`)

Source: `src/pages/Dashboard.tsx`

| Widget | Query | Status |
|--------|-------|--------|
| Total Clients | `clients` count | Ready (already live) |
| Documents Processed | `client_documents` count | Ready |
| Binders Generated | `binders` count | Ready |
| Pending Review | `clients - binders` (proxy) | Partial — crude heuristic |
| Total Institutions | `upi_institutions` where `is_active` | Ready |
| Partner Institutions | `upi_institutions` where `is_partner` | Ready |
| Courses Pending Review | `upi_courses_staging.review_status = pending_review` | Ready |
| AI Suggestions Pending | `upi_ai_suggestions.status = pending` | Ready |
| Recent Clients (5) | `clients` ordered by `created_at` | Ready |

**Not on V1 but documented:** tasks widget (`docs/system-map/flows/tasks-timeline-activity.md`), all `/reports` analytics, billing, calendar, comms.

---

## Dashboard V2 widget catalog

Legend: **R** = Ready · **P** = Partial · **B** = Blocked

### A. CRM & pipeline

| # | Widget | Status | Data source | Gap |
|---|--------|--------|-------------|-----|
| A1 | Total clients by status | R | `clients.status` | — |
| A2 | New clients (7d / 30d trend) | R | `clients.created_at` | Needs date-range query or `vw_clients_daily` |
| A3 | Lead temperature pie (hot/warm/cold) | R | `vw_lead_funnel` | Already on `/reports`; promote to V2 |
| A4 | Pipeline stage funnel bar chart | R | `vw_stage_distribution` | Fix types drift; add to main dashboard |
| A5 | Clients per counselor | R | `clients.assigned_counselor_id` / `owner_id` | — |
| A6 | Overdue follow-ups | R | `client_tasks` + `clients.next_followup_at` | No aggregated view; simple count query |
| A7 | Open tasks by assignee | R | `client_tasks` where `status != done` | — |
| A8 | Lead score distribution | R | `clients.lead_score` | — |
| A9 | Lead → client conversion rate | P | `leads.converted_to_client_id`, `clients.source_lead_id` | Unified funnel view not built |
| A10 | Time-in-stage velocity | P | `client_stage_history.entered_at` | Needs `vw_stage_velocity` materialized view |
| A11 | Firm-wide activity feed | P | `client_timeline`, `activity_logs` | No cross-client aggregated view |
| A12 | Odoo sync health | P | `clients.odoo_lead_id`, `odoo_synced_at` | Full KPIs need Odoo API or sync log table |
| A13 | Enrollment forecast | B | — | No ML/scoring table beyond `enrollment_probability` int |

### B. Telephony & leads

| # | Widget | Status | Data source | Gap |
|---|--------|--------|-------------|-----|
| B1 | Total calls (30d) | R | `vw_call_stats_daily` | Live on `/reports` |
| B2 | Answer rate % | R | `vw_call_stats_daily` | — |
| B3 | Daily call volume chart | R | `vw_call_stats_daily` | — |
| B4 | Telecaller leaderboard | R | `vw_telecaller_productivity` | — |
| B5 | Pending callbacks | R | `call_queue_items.status = callback` | — |
| B6 | Campaign performance table | R | `vw_campaign_performance` | — |
| B7 | Country / intake demand | R | `vw_country_intake_trends` | — |
| B8 | Counselor productivity | R | `vw_counselor_productivity` | — |
| B9 | Cold pool size | R | `leads.is_cold_pool` | — |
| B10 | Lead distribution run history | R | `distribution_runs.summary` | — |
| B11 | TeleCMI live agent status | B | — | Real-time status requires TeleCMI API webhook feed; `telecaller_status` is manual |

### C. Documents & compliance

| # | Widget | Status | Data source | Gap |
|---|--------|--------|-------------|-----|
| C1 | Documents uploaded (total) | R | `client_documents` | On V1 |
| C2 | Documents by status | R | `client_documents.status` | — |
| C3 | OCR queue depth | R | `client_document_extraction_queue` | — |
| C4 | Verification pass/fail rate | R | `document_verifications` | — |
| C5 | Binder completion rate | P | `binders` vs `clients` | V1 uses `clients - binders` proxy |
| C6 | Portal file submission status | R | `client_files.status` | — |
| C7 | SOP checklist completion | R | `service_library_sop_completions` | — |
| C8 | Missing mandatory docs | P | `workflow_templates.items` + `client_documents` | Needs join logic per client; no view |

### D. Billing & collections

| # | Widget | Status | Data source | Gap |
|---|--------|--------|-------------|-----|
| D1 | Outstanding AR ($) | R | `client_invoices` (`balance_due`, `status`) | Not on any dashboard |
| D2 | AR aging buckets chart | R | `client_invoice_aging` | View exists; zero UI usage on `/` |
| D3 | Overdue invoice count | R | `client_invoice_aging.days_overdue > 0` | — |
| D4 | Collection rate (paid / sent) | R | `client_invoices.amount_paid / amount` | — |
| D5 | Payments received (30d) | R | `client_invoice_payments.created_at` | — |
| D6 | Refund requests pending | R | `client_invoice_refund_requests.status` | — |
| D7 | GL revenue / expenses / profit (YTD) | P | `accounting_journals`, `accounting_journal_lines` | Schema ready; `AccountingOverviewPage` shows zeros |
| D8 | Outstanding AP | P | `accounting_ap_bills` | Not wired to CRM dashboard |
| D9 | Bank reconciliation status | P | `client_invoices.bank_reconciled` | Per-invoice flag; no rollup view |
| D10 | Tax filing compliance | B | — | `AccountingTaxDashboardPage` uses mock data; needs real tax period tables or Odoo |

### E. Institutions (UPI)

| # | Widget | Status | Data source | Gap |
|---|--------|--------|-------------|-----|
| E1 | Active institutions | R | `upi_institutions.is_active` | On V1 |
| E2 | Partner institutions | R | `upi_institutions.is_partner` | On V1 |
| E3 | Courses pending review | R | `upi_courses_staging.review_status` | On V1 |
| E4 | AI suggestions backlog | R | `upi_ai_suggestions.status` | On V1 |
| E5 | Sync job success rate | R | `upi_sync_jobs.status`, `upi_sync_logs` | — |
| E6 | Firm-wide commission (approved/paid CAD) | P | `upi_claim_cycles`, `upi_commission_invoices` | Per-institution only today |
| E7 | Agreement renewals due (30/60/90d) | R | `upi_agreements.valid_to`, `upi_renewal_alerts` | — |
| E8 | Blocked commission students | R | `upi_commission_students` status fields | — |
| E9 | Client → commission auto-sync | B | — | UI marked "In Development"; no sync audit table |

### F. Calendar & appointments

| # | Widget | Status | Data source | Gap |
|---|--------|--------|-------------|-----|
| F1 | Bookings this week | R | `calendar_events.event_date` | Hook: `useAnalyticsMetrics` |
| F2 | No-show rate | R | `calendar_events.status = no_show` | Computed in `AnalyticsDashboardPage` |
| F3 | Cancellation rate | R | `calendar_events.status = cancelled` | — |
| F4 | Meeting type breakdown | R | `calendar_events.meeting_type_id` | `useMeetingTypeBreakdown` |
| F5 | Upcoming appointments (today) | R | `calendar_events` + status filter | On `CalendarDashboard` |
| F6 | CRM-linked meeting → enrollment | P | `calendar_event_crm_links` | No attribution view |
| F7 | Calendar activity feed | R | `v_calendar_activity_feed` | Not on main dashboard |

### G. Offers, loyalty & incentives

| # | Widget | Status | Data source | Gap |
|---|--------|--------|-------------|-----|
| G1 | Offer views / claims / redemptions | R | `offer_events` or RPC `offer_roi_stats` | Live on `/offers` only |
| G2 | Influenced revenue by offer | R | `offer_roi_stats` RPC | — |
| G3 | Counselor offer attribution | R | `counselor_offer_stats` RPC | — |
| G4 | Active client offers | R | `client_offers.status = active` | Portal dashboard only |
| G5 | Credit points outstanding | R | `credit_wallet.available_points` | Portal only |
| G6 | Referral count (30d) | R | `referrals.created_at` | — |
| G7 | Incentive run totals | P | `incentive_runs`, `incentive_payouts` | Admin pages only; schema not in migrations |
| G8 | Discount wallet utilization | P | `discount_wallets`, `wallet_ledger` | Admin pages only |
| G9 | Offer automation trigger performance | P | `offer_templates.trigger_type` + `offer_events` | Correlation logic not built |

### H. Communications (email, WhatsApp, chat)

| # | Widget | Status | Data source | Gap |
|---|--------|--------|-------------|-----|
| H1 | Emails sent (30d) | P | `app_email_logs` | No `vw_email_stats_daily` |
| H2 | Email bounce / failure rate | P | `app_email_logs.status`, `email_events` | Aggregate view needed |
| H3 | Email read rate | P | `email_read_receipts` | — |
| H4 | WhatsApp open conversations | P | `whatsapp_conversations` | Tables exist; types not regenerated |
| H5 | WhatsApp unmatched / escalated queue | P | `whatsapp_conversations.status` | Phase 0 only; Meta integration pending |
| H6 | WhatsApp unread staff count | P | `whatsapp_conversations.unread_count_staff` | — |
| H7 | Chat message volume | P | `chat_messages.created_at` | No analytics view |
| H8 | Chat response SLA | B | — | No first-response timestamp fields |
| H9 | AI summary usage | R | `ai_summaries`, `ai_summary_feedback` | — |
| H10 | Notification delivery failures | P | `notification_delivery_log` | Admin-only; no dashboard widget |
| H11 | Meta WhatsApp delivery metrics | B | — | Requires Meta Cloud API webhook + `whatsapp_delivery_events` table |

### I. Assessment & course finder

| # | Widget | Status | Data source | Gap |
|---|--------|--------|-------------|-----|
| I1 | Assessment invites sent | R | `assessment_invitations` | — |
| I2 | Sessions completed | R | `assessment_sessions.status` | — |
| I3 | Assessment → lead conversion | P | `assessment_leads` | Join to `clients`/`leads` not view-backed |
| I4 | Course finder searches | P | `cf_saved_searches` | No search analytics table |
| I5 | Shortlists created | R | `cf_shortlists` | — |

### J. Digital Success Hub

| # | Widget | Status | Data source | Gap |
|---|--------|--------|-------------|-----|
| J1 | Media assets count | R | `dsh_media` | Module-specific |
| J2 | AI generations (30d) | R | `dsh_ai_generations.created_at` | — |
| J3 | Branch notification backlog | R | `dsh_branch_notifications` | — |

---

## Build immediately (28 widgets)

These require **no schema changes** — only frontend composition and optional date-range filters:

**From existing V1:** A1, E1–E4, C1  
**Promote from `/reports`:** A3, A4, B1–B8  
**New simple counts:** A5–A8, A6–A7, B9–B10, C2–C4, C6–C7, D1–D6, E5, E7–E8, F1–F5, F7, G1–G6, H9, I1–I2, I5, J1–J3

### Recommended V2 layout (Phase 1)

```
┌─────────────────────────────────────────────────────────────┐
│  ROW 1 — Executive KPIs (8 cards)                           │
│  Clients · Hot Leads · Calls (30d) · Answer Rate ·          │
│  Outstanding AR · Overdue Tasks · Bookings · WA Queue       │
├──────────────────────────┬──────────────────────────────────┤
│  Calls chart (30d)       │  Lead temperature pie            │
├──────────────────────────┴──────────────────────────────────┤
│  Pipeline stage distribution (filterable)                   │
├──────────────────────────┬──────────────────────────────────┤
│  AR aging buckets        │  Tasks & follow-ups due          │
├──────────────────────────┴──────────────────────────────────┤
│  Recent clients · Telecaller leaderboard (compact)          │
└─────────────────────────────────────────────────────────────┘
```

All Phase 1 widgets map to **Ready** items above.

---

## Requires new work (Partial + Blocked)

### New SQL views (recommended)

| View | Purpose | Source tables |
|------|---------|---------------|
| `vw_stage_velocity` | Avg days per pipeline stage | `client_stage_history` |
| `vw_email_stats_daily` | Sent/delivered/bounced by day | `app_email_logs`, `email_events` |
| `vw_whatsapp_stats_daily` | Inbound/outbound/unmatched by day | `whatsapp_messages`, `whatsapp_conversations` |
| `vw_firm_timeline_daily` | Activity volume by event type | `client_timeline`, `activity_logs` |
| `vw_lead_conversion_funnel` | Lead → client → enrolled | `leads`, `clients` |
| `vw_upi_commission_summary` | Firm-wide commission rollup | `upi_claim_cycles`, `upi_commission_invoices` |
| `vw_accounting_kpi_ytd` | Revenue, expenses, profit | `accounting_journal_lines`, `accounting_coa` |

### New fields / tables

| Need | For widget(s) | Suggestion |
|------|---------------|------------|
| `chat_messages.first_response_at` | H8 Chat SLA | Nullable timestamptz |
| `whatsapp_delivery_events` | H11 Meta metrics | New table from webhook |
| `odoo_sync_log` | A12 Odoo health | `(entity, action, status, synced_at, error)` |
| `client_commission_sync_log` | E9 | Audit rows for auto-link attempts |
| `tax_filing_periods` | D10 | Or integrate Odoo tax module |
| `telephony_agent_presence` | B11 | Webhook from TeleCMI |

### Integrations required

| Integration | Widgets blocked without it |
|-------------|---------------------------|
| **TeleCMI** (live presence) | B11 |
| **Meta WhatsApp Cloud API** (Phase 1) | H11, production H4–H6 |
| **Odoo** (bi-directional sync) | A12, D10 |
| **Email queue monitoring** | H1–H3 at scale (pgmq queues not SQL-queryable) |

### Engineering prerequisites

1. **Regenerate `types.ts`** — include `whatsapp_*`, `vw_stage_distribution`.
2. **Commit pipeline DDL** — `stage_pipelines`, `pipeline_stages`, `client_stage_history` CREATE statements to migrations.
3. **Wire accounting overview** — replace mock zeros in `AccountingOverviewPage.tsx` with GL queries.
4. **Remove `(supabase as any)` casts** — after types regen for views.

---

## Implementation phases

### Phase 1 — Compose existing data (1–2 sprints)

- Merge `/reports` charts into `/` with role-based visibility.
- Add AR aging, tasks due, calendar no-show, offer ROI summary card.
- Add WhatsApp queue counts (after type regen).
- Keep `/reports` as detailed drill-down.

### Phase 2 — Aggregation views (1 sprint)

- Create `vw_email_stats_daily`, `vw_whatsapp_stats_daily`, `vw_upi_commission_summary`.
- Add `vw_stage_velocity` for pipeline analytics.
- Wire accounting KPI row on executive dashboard.

### Phase 3 — Integrations & net-new (2+ sprints)

- Meta WhatsApp Phase 1 → delivery metrics table.
- TeleCMI presence webhook.
- Odoo sync log + health widget.
- Client → commission sync audit.
- Tax compliance (real data or Odoo).

---

## Appendix: view definitions reference

### `vw_call_stats_daily`

```sql
-- From 20260509125053_*.sql
SELECT date_trunc('day', start_time)::date AS day, agent_id,
       count(*) FILTER (WHERE status='completed') AS answered,
       count(*) FILTER (WHERE status IN ('failed','no_answer','busy','cancelled')) AS unanswered,
       count(*) AS total_calls,
       coalesce(avg(duration_seconds) FILTER (WHERE status='completed'),0)::int AS avg_duration
  FROM public.call_sessions WHERE start_time IS NOT NULL GROUP BY 1,2;
```

### `offer_roi_stats` return columns

`offer_id`, `title`, `is_active`, `views`, `claims`, `redemptions`, `redemption_rate`, `total_discount`, `influenced_revenue`

### `client_invoice_aging` return columns

`invoice_id`, `client_id`, `invoice_number`, `amount`, `amount_paid`, `balance_due`, `currency`, `due_date`, `days_overdue`, `aging_bucket`, `escalation_level`, `status`

---

## Related files

| File | Role |
|------|------|
| `src/pages/Dashboard.tsx` | Current V1 |
| `src/pages/Reports.tsx` | Analytics views consumer |
| `src/pages/OffersAnalytics.tsx` | Offer ROI RPC consumer |
| `src/calendar/hooks/useAnalytics.ts` | Calendar metrics |
| `src/institutions/components/OverviewPanel.tsx` | UPI KPI pattern |
| `docs/system-map/04-database-map.md` | Full table inventory |
| `supabase/migrations/20260509125053_*.sql` | Core analytics views |
| `supabase/migrations/20260604150000_whatsapp_inbox_phase0.sql` | WhatsApp schema |

---

*This report defines Dashboard V2 as a consolidated executive surface. A separate product spec should confirm widget priority, role visibility, and date-range defaults before implementation.*
