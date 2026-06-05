# Future Link CRM — Monthly Audit

| | |
|---|---|
| **Version** | 1.0 |
| **Status** | Active |
| **Owner** | OPS + TECH |
| **Review** | Monthly |
| **Approved** | 2026-06-04 |

Recurring checklist for **operations and governance**. Run once per calendar month. Takes ~1–2 hours with dashboard access.

| Cadence | Document | Focus |
|---|---|---|
| **Weekly** | [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) § Health checks | Production smoke tests |
| **Monthly** | This file | Security, access, integrations, queues, DR readiness |
| **Quarterly** | [OWNERSHIP_MATRIX.md](./OWNERSHIP_MATRIX.md), [ACCESS_REGISTER.md](./ACCESS_REGISTER.md), [EXIT_STRATEGY.md](./EXIT_STRATEGY.md) | Ownership, named holders, secret inventory |

**Auditor role:** OPS (accountable), TECH (supports dashboards)

### Change control

Future modifications to this document require one of:

- Security incident
- Compliance requirement
- Major architecture change
- New business KPI
- New critical integration

Routine **audit log** entries (monthly pass/fail results) do not require a document version bump. Template changes increment the version and are recorded in **Version history** below.

---

## How to complete an audit

1. Copy the **Audit record** section below into the **Audit log** at the bottom (or a private ops tracker).
2. Work through every checklist section; mark pass / fail / N/A.
3. Log failures as **action items** with owner and due date.
4. Update **Last reviewed** dates in linked docs if anything changed.

---

## 1. Production health

| # | Check | Pass | Notes |
|---|---|---|---|
| 1.1 | `https://dms.futurelinkconsultants.com` loads over HTTPS | ☐ | |
| 1.2 | Staff login (email/password) works | ☐ | |
| 1.3 | Client portal Google sign-in works | ☐ | |
| 1.4 | No open P1/P2 incidents since last audit | ☐ | |
| 1.5 | Supabase Edge Functions — no sustained error rate spike (7d) | ☐ | Dashboard → Edge Functions |
| 1.6 | Supabase Database — disk/connection metrics normal | ☐ | |

---

## 2. Deployments & repository

| # | Check | Pass | Notes |
|---|---|---|---|
| 2.1 | GitHub `main` matches last production publish (no drift > 1 week unintended) | ☐ | |
| 2.2 | All intended migrations applied (`supabase/migrations` vs dashboard history) | ☐ | 182 migrations in repo |
| 2.3 | No undeployed critical function changes on `main` > 2 weeks | ☐ | Compare git log vs last deploy |
| 2.4 | `.env.example` still matches required `VITE_*` for production | ☐ | |

---

## 3. Access & security

Reference: [ACCESS_REGISTER.md](./ACCESS_REGISTER.md)

| # | Check | Pass | Notes |
|---|---|---|---|
| 3.1 | Offline named-holder vault matches current team (no stale holders) | ☐ | Update ACCESS_REGISTER offline sheet |
| 3.2 | GitHub — no unexpected admins or outside collaborators | ☐ | Org/repo settings |
| 3.3 | Lovable Cloud project access reviewed | ☐ | Workspace members limited to authorized users (OPS, TECH only). Underlying Supabase org is **Lovable-managed** — see [OWNERSHIP_MATRIX](./OWNERSHIP_MATRIX.md); Future Link should still hold Supabase dashboard access where possible |
| 3.4 | Supabase project — member list reviewed; no unknown accounts | ☐ | Project `auofttkyosgjhxcbhscw`; confirm who holds org owner (Lovable vs FLC) in offline vault |
| 3.5 | MFA enabled on GitHub, Supabase, Lovable, Meta, domain registrar (auditor sample) | ☐ | |
| 3.6 | No secrets committed to git (`git log` / secret scan if available) | ☐ | |
| 3.7 | `service_role` key not used in frontend or shared channels | ☐ | |
| 3.8 | Offboarded staff removed from GitHub, Supabase, Lovable, CRM users | ☐ | Use ACCESS_REGISTER offboarding list |

---

## 4. Secrets & credentials

Reference: [EXIT_STRATEGY.md § User-Owned Secrets](./EXIT_STRATEGY.md#user-owned-secrets)

| # | Check | Pass | Notes |
|---|---|---|---|
| 4.1 | `WHATSAPP_*` secrets present if `VITE_WHATSAPP_PROVIDER=meta` | ☐ | |
| 4.2 | `TELECMI_*` secrets present if telephony in use | ☐ | |
| 4.3 | `ODOO_*` secrets valid — test connection or check `odoo-cron` logs | ☐ | |
| 4.4 | `LOVABLE_API_KEY` present — AI + transactional email functional | ☐ | |
| 4.5 | `OPENAI_API_KEY` / `GEMINI_API_KEY` valid if those features used | ☐ | |
| 4.6 | SMTP credentials in CRM Settings still valid (test notification email) | ☐ | `app_email_logs` |
| 4.7 | No integration secret past documented rotation date | ☐ | Offline rotation schedule |

---

## 5. Email pipelines

Reference: [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) § Email, [notifications-email-smtp flow](./system-map/flows/notifications-email-smtp.md)

| # | Check | Pass | Notes |
|---|---|---|---|
| 5.1 | Notification path: test invoice/receipt email delivered | ☐ | |
| 5.2 | `QUEUE_EMAILS` flag consistent on `notifications-dispatch` **and** `process-notification-email-queue` | ☐ | Mismatch = silent loss |
| 5.3 | `notification_emails_dlq` empty or triaged | ☐ | SQL: `pgmq` DLQ inspect |
| 5.4 | `transactional_emails_dlq` / `auth_emails_dlq` empty or triaged | ☐ | Lovable pipeline |
| 5.5 | `process-email-queue` cron job active | ☐ | `SELECT * FROM cron.job WHERE jobname LIKE '%email%';` |
| 5.6 | `app_email_logs` — no unexplained burst of failures (30d) | ☐ | |

---

## 6. Integrations

| # | Check | Pass | Notes |
|---|---|---|---|
| 6.1 | **WhatsApp** — Simulate inbound in CRM succeeds | ☐ | |
| 6.2 | **WhatsApp (Meta)** — if live: webhook URL still `…/whatsapp-webhook` on `auofttkyosgjhxcbhscw` | ☐ | [phase-1 setup](./guides/whatsapp-phase1-meta-setup.md) |
| 6.3 | **TeleCMI** — click-to-call smoke test | ☐ | Skip if N/A |
| 6.4 | **Odoo** — `odoo-cron-every-5min` running; recent sync in logs | ☐ | |
| 6.5 | **pg_cron** — all expected jobs present | ☐ | `odoo-cron`, `process-email-queue`, `process-notification-email-queue`, `offers-lifecycle-tick`, `offers-expiry-tick` |

---

## 7. Data & backups

Reference: [EXIT_STRATEGY.md § Disaster Recovery](./EXIT_STRATEGY.md#disaster-recovery-plan) (RPO 24h)

| # | Check | Pass | Notes |
|---|---|---|---|
| 7.1 | Supabase backup / PITR enabled and meets RPO | ☐ | Dashboard → Database → Backups |
| 7.2 | Storage buckets — no unexpected public exposure | ☐ | Only `calendar-branding`, `calendar-company-branding` public |
| 7.3 | Sample document download from `client-documents` works (RLS) | ☐ | |
| 7.4 | Odoo backup schedule confirmed (vendor) | ☐ | |

---

## 8. Lovable & vendor accounts

Reference: [OWNERSHIP_MATRIX.md](./OWNERSHIP_MATRIX.md)

| # | Check | Pass | Notes |
|---|---|---|---|
| 8.1 | Lovable workspace accessible to OPS + TECH | ☐ | |
| 8.2 | Lovable AI credits / quota not exhausted unexpectedly | ☐ | Check if AI errors in logs |
| 8.3 | Vendor invoices received and paid (GitHub, Supabase, Lovable, Meta, TeleCMI, Odoo, AI) | ☐ | BILL role |
| 8.4 | Domain `dms.futurelinkconsultants.com` renewal date > 60 days out | ☐ | |
| 8.5 | SSL certificate valid on production | ☐ | |

---

## 9. Documentation

| # | Check | Pass | Notes |
|---|---|---|---|
| 9.1 | [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) still accurate after recent changes | ☐ | |
| 9.2 | [EXIT_STRATEGY.md](./EXIT_STRATEGY.md) function/migration counts still match repo | ☐ | Currently: 81 functions, 182 migrations |
| 9.3 | [ACCESS_REGISTER.md](./ACCESS_REGISTER.md) review log updated if access changed | ☐ | Quarterly minimum |
| 9.4 | System map updated if architecture changed | ☐ | [system-map/00-README.md](./system-map/00-README.md) |

---

## 10. Incidents & action items

| Item | Severity | Opened | Resolved | Root cause | Doc updated? |
|---|---|---|---|---|---|
| _None_ | — | — | — | — | — |

**New action items from this audit:**

| ID | Finding | Owner | Due | Status |
|---|---|---|---|---|
| — | — | — | — | — |

---

## 11. Cost & usage review

Reference: [OWNERSHIP_MATRIX.md](./OWNERSHIP_MATRIX.md) (billing owners), EXIT_STRATEGY trigger *Lovable pricing becomes prohibitive*

| # | Check | Pass | Notes |
|---|---|---|---|
| 11.1 | Lovable monthly cost reviewed | ☐ | Workspace billing + Cloud usage |
| 11.2 | OpenAI usage reviewed | ☐ | platform.openai.com → Usage (`dsh-ai-generate-poster-openai`) |
| 11.3 | Gemini usage reviewed | ☐ | Google AI Studio / Cloud console (`ai-financial-assistant`) |
| 11.4 | TeleCMI billing reviewed | ☐ | TeleCMI dashboard — minutes, DIDs, plan |
| 11.5 | WhatsApp conversation charges reviewed | ☐ | Meta Business Suite → WhatsApp → Billing (skip if `mock` only) |
| 11.6 | Supabase usage metrics reviewed | ☐ | Dashboard → Settings → Usage (DB, storage, egress, MAU) |
| 11.7 | Overage risks identified | ☐ | Lovable AI credits, OpenAI/Gemini spikes, WA template/session volume, Supabase storage growth |

**Optional vendors (if in use):** Jina, Firecrawl, Resend, Odoo hosting — add line items to action table if material.

**Record monthly totals (offline or audit log):**

| Vendor | Prior month | This month | Δ | Action needed |
|---|---|---:|---:|---|
| Lovable | | | | |
| Supabase | | | | |
| OpenAI | | | | |
| Gemini | | | | |
| TeleCMI | | | | |
| Meta WhatsApp | | | | |

---

## 12. Capacity & growth review

Track trends month-over-month. Record counts in the **Growth log** below; investigate spikes before they hit billing or performance limits.

| # | Check | Pass | Notes |
|---|---|---|---|
| 12.1 | Total CRM users reviewed | ☐ | Staff accounts (`profiles` / `user_roles`) |
| 12.2 | Total active students reviewed | ☐ | `clients` — define active (e.g. not archived, status open) |
| 12.3 | Storage growth trend reviewed | ☐ | Supabase → Storage → Usage; top buckets: `client-documents`, `institution-documents`, `dsh-media` |
| 12.4 | Database growth trend reviewed | ☐ | Supabase → Database → Usage; table bloat / index health if slow queries reported |
| 12.5 | WhatsApp message volume reviewed | ☐ | `whatsapp_messages` count (30d); Meta billing if live |
| 12.6 | TeleCMI call volume reviewed | ☐ | `call_sessions` count (30d); TeleCMI invoice minutes |
| 12.7 | AI usage growth trend reviewed | ☐ | Edge function invocations (`ai-*`, `dsh-ai-*`, `upi-*`); Lovable AI credits (§ 11) |
| 12.8 | Performance bottlenecks identified | ☐ | Slow pages, timeout errors in function logs, queue backlog |
| 12.9 | Leads created (30d) reviewed | ☐ | `leads` table; see [leads-and-conversion flow](./system-map/flows/leads-and-conversion.md) |
| 12.10 | Applications submitted (30d) reviewed | ☐ | `questionnaire_instances` where `status = 'submitted'` and `submitted_at` in last 30d (visa/application forms) |
| 12.11 | Revenue collected (30d) reviewed | ☐ | `client_invoice_payments` where `archived_at IS NULL`, `is_refund = false`, `payment_status = 'verified'`, `paid_at` in last 30d — see [invoices-payments-receipts](./system-map/flows/invoices-payments-receipts.md) |
| 12.12 | Visa approvals (30d) reviewed | ☐ | `client_timeline` where `event_type = 'status_change'`, `metadata->>'to'` in approval slugs, `created_at` in last 30d — confirm slug in Settings → Masters → Client Statuses (`visa_approved`, `approved`) |

**Growth log (record each audit):**

| Metric | Prior month | This month | Δ % | Threshold / action |
|---|---|---:|---:|---|
| CRM staff users | | | | |
| Active clients (students) | | | | |
| Leads created (30d) | | | | |
| Applications submitted (30d) | | | | |
| Revenue collected (30d) | | | | `client_invoice_payments`: not archived, not refund, `verified`; per currency |
| Visa approvals (30d) | | | | `client_timeline`, `event_type = 'status_change'`; transitions only |
| Storage (GB) | | | | |
| DB size (GB) | | | | |
| WhatsApp messages (30d) | | | | |
| Call sessions (30d) | | | | |
| AI-related function invocations (30d) | | | | |

**Suggested SQL (Supabase SQL editor, service-role or trusted admin):**

```sql
-- CRM staff (profiles linked to roles)
SELECT count(DISTINCT ur.user_id) AS staff_with_roles
FROM user_roles ur;

-- Clients — adjust WHERE for your "active" definition
SELECT count(*) AS total_clients FROM clients;
SELECT count(*) AS clients_created_30d
FROM clients WHERE created_at > now() - interval '30 days';

-- Leads (intake)
SELECT count(*) AS leads_created_30d
FROM leads
WHERE created_at > now() - interval '30 days';
SELECT count(*) AS leads_converted_30d
FROM leads
WHERE converted_at > now() - interval '30 days';

-- Applications submitted (client questionnaires)
SELECT count(*) AS applications_submitted_30d
FROM questionnaire_instances
WHERE status = 'submitted'
  AND submitted_at > now() - interval '30 days';

-- Revenue collected (client_invoice_payments)
SELECT currency,
       count(*) AS payment_count,
       coalesce(sum(amount), 0) AS revenue_collected_30d
FROM client_invoice_payments
WHERE archived_at IS NULL
  AND is_refund = false
  AND payment_status = 'verified'
  AND paid_at > now() - interval '30 days'
GROUP BY currency
ORDER BY currency;

-- Visa approvals (client_timeline)
SELECT count(*) AS visa_approvals_30d
FROM client_timeline
WHERE event_type = 'status_change'
  AND (metadata->>'to') IN ('visa_approved', 'approved')
  AND created_at > now() - interval '30 days';

-- WhatsApp volume
SELECT count(*) AS wa_messages_30d
FROM whatsapp_messages
WHERE created_at > now() - interval '30 days';

-- TeleCMI / dialer volume
SELECT count(*) AS call_sessions_30d
FROM call_sessions
WHERE created_at > now() - interval '30 days';

-- Storage object count by bucket (approximate growth proxy)
SELECT bucket_id, count(*) AS objects, pg_size_pretty(sum(coalesce((metadata->>'size')::bigint, 0))) AS size
FROM storage.objects
GROUP BY bucket_id
ORDER BY sum(coalesce((metadata->>'size')::bigint, 0)) DESC;
```

---

## Audit record (copy per month)

```text
Month: YYYY-MM
Auditor (role): 
TECH support: 
Started: 
Completed: 

Summary:  Pass ___ / Fail ___ / N/A ___
Critical findings: 
Actions opened: 
Next month focus: 
```

---

## Audit log

| Month | Auditor | Pass | Fail | Critical findings | Actions |
|---|---|---:|---:|---|---|
| 2026-06 | _TBD (OPS)_ | — | — | Template created | Fill holders in ACCESS_REGISTER offline vault |

---

## Quick SQL (Supabase SQL editor)

**pg_cron jobs:**

```sql
SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobname;
```

**Email DLQ depth (adjust queue names if needed):**

```sql
SELECT 'notification_emails_dlq' AS queue, count(*) FROM pgmq.q_notification_emails_dlq
UNION ALL
SELECT 'transactional_emails_dlq', count(*) FROM pgmq.q_transactional_emails_dlq
UNION ALL
SELECT 'auth_emails_dlq', count(*) FROM pgmq.q_auth_emails_dlq;
```

**Recent email failures:**

```sql
SELECT created_at, status, recipient, error_message
FROM app_email_logs
WHERE status != 'sent'
  AND created_at > now() - interval '30 days'
ORDER BY created_at DESC
LIMIT 20;
```

---

## Related documents

| Document | Purpose |
|---|---|
| [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) | Weekly health checks, deploy, troubleshooting |
| [ACCESS_REGISTER.md](./ACCESS_REGISTER.md) | Infrastructure access |
| [OWNERSHIP_MATRIX.md](./OWNERSHIP_MATRIX.md) | Account ownership |
| [EXIT_STRATEGY.md](./EXIT_STRATEGY.md) | DR plan, secrets, exit triggers |
| [GOVERNANCE_INDEX.md](./GOVERNANCE_INDEX.md) | Master registry of governance docs |

---

## Version history

| Version | Date | Status | Summary |
|---|---|---|---|
| 1.0 | 2026-06-04 | Active | Approved baseline — 12 sections incl. cost, capacity, revenue, visa KPIs; Lovable access check (3.3) |
