# Future Link CRM — Operations Runbook

| | |
|---|---|
| **Version** | 1.0 |
| **Status** | Active |
| **Owner** | TECH |
| **Review** | Monthly |

Day-to-day operations for staff and technical owners. For account ownership see [OWNERSHIP_MATRIX.md](./OWNERSHIP_MATRIX.md); for who has dashboard access see [ACCESS_REGISTER.md](./ACCESS_REGISTER.md); for exit strategy and disaster recovery, see [EXIT_STRATEGY.md](./EXIT_STRATEGY.md).

**Last updated:** 2026-06-04

---

## Quick reference

| Item | Value |
|---|---|
| Production app | `https://dms.futurelinkconsultants.com` |
| Supabase project ref | `auofttkyosgjhxcbhscw` |
| Supabase API | `https://auofttkyosgjhxcbhscw.supabase.co` |
| GitHub | Source of truth for frontend, migrations, edge functions |
| Local dev | `npm run dev` (port 8080) |
| Architecture map | [docs/system-map/00-README.md](../system-map/00-README.md) |

**Dashboards (Future Link accounts):**

- Supabase — project settings, logs, secrets, SQL editor
- Lovable — publish frontend, deploy functions/secrets (optional path)
- Meta — WhatsApp app & webhook
- TeleCMI — telephony
- Odoo — CRM sync target
- OpenAI / Google AI Studio — direct API keys where configured

---

## Environments

| Environment | Frontend | Backend | Notes |
|---|---|---|---|
| **Production** | Lovable publish or custom domain | Supabase `auofttkyosgjhxcbhscw` | Live CRM + portal |
| **Local** | Vite dev server | Same Supabase project (`.env`) | Never commit `.env` |
| **Lovable preview** | `*.lovable.app` iframe | Same Supabase project | OAuth/iframe quirks documented in code |

**Frontend env** (`.env` / Lovable Publish):

```env
VITE_SUPABASE_URL=https://auofttkyosgjhxcbhscw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=auofttkyosgjhxcbhscw
VITE_WHATSAPP_ENABLED=true
VITE_WHATSAPP_PROVIDER=mock   # mock | meta | auto
```

Restart dev server after changing `VITE_*` values.

---

## Routine health checks

Run **weekly** (or after any deploy). For a full **monthly** governance pass, see [MONTHLY_AUDIT.md](./MONTHLY_AUDIT.md).

- [ ] Production app loads; staff can sign in
- [ ] Client portal Google sign-in works
- [ ] Supabase Dashboard → **Database** — no failed migrations pending
- [ ] Supabase Dashboard → **Edge Functions** — recent invocations without error spikes
- [ ] **Notification email** — send test from invoice/receipt flow; check `app_email_logs`
- [ ] **WhatsApp** — CRM → WhatsApp → Simulate inbound (staff session)
- [ ] **TeleCMI** — click-to-call from CRM (if telephony enabled)
- [ ] ~~**Odoo**~~ — N/A while integration inactive (deferred cleanup)
- [ ] Review `auth_emails_dlq` / `transactional_emails_dlq` / `notification_emails_dlq` if queues enabled

---

## Deploy procedures

### Frontend (production)

**Via Lovable (default):**

1. Merge changes to GitHub main branch
2. Lovable → **Publish**
3. Set/update `VITE_*` env in Lovable if needed
4. Confirm `https://dms.futurelinkconsultants.com` (or published URL)

**Via static host (Vercel / Cloudflare Pages):**

```bash
npm ci
npm run build
# Deploy dist/ per host; set same VITE_* at build time
```

### Database migrations

Migrations live in `supabase/migrations/` (182 files). Apply via Lovable or CLI:

```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."   # https://supabase.com/dashboard/account/tokens
npx supabase db push --project-ref auofttkyosgjhxcbhscw
```

**Before pushing:**

- Read [09-safety-rules.md](../system-map/09-safety-rules.md) for affected domain
- Fill [10-change-impact-checklist.md](../system-map/10-change-impact-checklist.md)
- Test migration on a branch/staging project when change is high-risk (RLS, financial triggers)

**Optional seeds:** `supabase/seed/` (manual run in SQL editor — not auto-applied on push)

### Edge functions

**Single function (example — WhatsApp):**

```bash
./scripts/deploy-whatsapp.sh
```

**Any function via CLI:**

```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."
npx supabase functions deploy <function-name> --project-ref auofttkyosgjhxcbhscw
```

**JWT settings:** `supabase/config.toml` — `verify_jwt = false` for webhooks/cron/public endpoints. Redeploy after config changes.

**Deploy path decision:**

```text
Need to deploy functions?
  → Lovable connected to Supabase?
    → Yes: Ask Lovable to deploy <function-names>
    → No: Supabase CLI (needs org access token) or dashboard
```

---

## Secrets management

**Where secrets live:** Supabase Dashboard → **Edge Functions** → **Secrets** (or Lovable prompt for same project).

**Never commit** secret values to git.

### Supabase-injected (automatic)

| Secret | Notes |
|---|---|
| `SUPABASE_URL` | Project API URL |
| `SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — bypasses RLS |

### Future Link–owned (maintain inventory offline)

See full inventory in [EXIT_STRATEGY.md § User-Owned Secrets](./EXIT_STRATEGY.md#user-owned-secrets).

| Group | Examples |
|---|---|
| WhatsApp | `WHATSAPP_PROVIDER`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` |
| TeleCMI | `TELECMI_APP_ID`, `TELECMI_SECRET`, `TELECMI_FROM_NUMBER`, `TELECMI_WEBHOOK_SECRET` |
| Odoo | `ODOO_URL`, `ODOO_DB`, `ODOO_LOGIN`, `ODOO_API_KEY` |
| AI (direct) | `OPENAI_API_KEY`, `GEMINI_API_KEY`, `JINA_API_KEY`, `FIRECRAWL_API_KEY` |
| Email | Per-entity SMTP in DB; `QUEUE_EMAILS`, `RESEND_API_KEY`, `EMAIL_INBOUND_SECRET` |
| App | `PUBLIC_APP_URL` |

### Lovable-managed

| Secret | Purpose |
|---|---|
| `LOVABLE_API_KEY` | AI gateway, transactional email, webhooks |
| `LOVABLE_SEND_URL` | Optional email API override |

**Rotation:** Update in Supabase secrets → redeploy affected functions if cached at cold start. Update external webhooks (Meta, TeleCMI) when URLs or verify tokens change.

---

## Scheduled jobs (pg_cron)

| Job | Schedule | Edge function | Purpose |
|---|---|---|---|
| `odoo-cron-every-5min` | Every 5 min | `odoo-cron` | Odoo sync trigger |
| `process-email-queue` | ~5 sec | `process-email-queue` | Lovable transactional/auth email worker |
| `process-notification-email-queue` | Every 1 min | `process-notification-email-queue` | Notification SMTP queue (when `QUEUE_EMAILS=true`) |
| `offers-lifecycle-tick` | Daily 06:00 UTC | `offers-lifecycle-tick` | Offer lifecycle notifications |
| `offers-expiry-tick` | Daily 05:30 UTC | `offers-lifecycle-tick` | Flip expired offers |

**Manual / on-demand ticks** (no cron in migrations — invoke from app or dashboard):

- `notifications-reminders-tick`, `notifications-digest-tick`, `incentive-calculate-run`

**Inspect cron:** Supabase SQL editor → `SELECT * FROM cron.job;`

**Unschedule (emergency):** `SELECT cron.unschedule('<job-name>');` — see migration comments in `20260510102014_email_infra.sql` for revert notes.

---

## Integration operations

### WhatsApp helpline

| Task | Reference |
|---|---|
| Staff guide | [guides/whatsapp-helpline.md](../guides/whatsapp-helpline.md) |
| Meta team setup | [guides/whatsapp-meta-team-setup.md](../guides/whatsapp-meta-team-setup.md) |
| Technical webhook URL | [guides/whatsapp-phase1-meta-setup.md](../guides/whatsapp-phase1-meta-setup.md) |

**Webhook URL:**

```text
https://auofttkyosgjhxcbhscw.supabase.co/functions/v1/whatsapp-webhook
```

**Deploy:** `./scripts/deploy-whatsapp.sh` or Lovable deploy of `whatsapp-webhook` + `whatsapp-send`

**Mock vs live:** `WHATSAPP_PROVIDER=mock` in secrets + `VITE_WHATSAPP_PROVIDER=mock` — no Meta charges. Set `meta` on both for production WhatsApp.

### Notification email (SMTP)

- Pipeline: `notifications-dispatch` → `smtp-send` (or queue when `QUEUE_EMAILS=true`)
- **Rollback queue:** set `QUEUE_EMAILS=false` on **both** `notifications-dispatch` and `process-notification-email-queue`
- Debug: [flows/notifications-email-smtp.md](../system-map/flows/notifications-email-smtp.md)
- Logs: `app_email_logs` table

### Transactional / assessment email (Lovable)

- Pipeline: `send-transactional-email` → pgmq → `process-email-queue` → `sendLovableEmail`
- Requires `LOVABLE_API_KEY`
- DLQ: `transactional_emails_dlq`, `auth_emails_dlq`

### TeleCMI

- Webhook: `telephony-webhook` (`verify_jwt=false`)
- Secrets: `TELECMI_*` — see `_shared/telephony/telecmi.ts`
- Admin config: CRM Settings → Telephony

### Odoo

> **Inactive (2026-06):** Integration disabled in `integration_settings`; no active business workflows depend on Odoo. Edge functions, cron job, secrets, and schema columns are **retained for historical compatibility** until a future infrastructure cleanup phase. Skip weekly Odoo checks below unless re-enabling.

- Sync: `odoo-sync` (on demand), `odoo-cron` (every 5 min) — dormant when `enabled = false`
- Secrets: `ODOO_URL`, `ODOO_DB`, `ODOO_LOGIN`, `ODOO_API_KEY`
- API bridge: `odoo-api`

### Client portal OAuth

- Google sign-in via `src/integrations/lovable` → `PortalAuth.tsx`
- Staff CRM uses email/password (`Auth.tsx`) — native Supabase, not Lovable OAuth

---

## Troubleshooting playbooks

### Staff cannot sign in

1. Confirm Supabase Auth status (dashboard)
2. Check user exists in `auth.users` / CRM user tables
3. Verify `VITE_SUPABASE_URL` and anon key on published frontend
4. Browser console for CORS or 401 on auth endpoints

### Emails not sending (notifications / invoices)

1. Check `app_email_logs` for error rows
2. Verify entity/global SMTP in CRM Settings
3. If `QUEUE_EMAILS=true`: confirm `process-notification-email-queue` cron running; check `notification_emails_dlq`
4. See [notifications-email-smtp.md](../system-map/flows/notifications-email-smtp.md) debug tags

### Assessment / invite emails not sending

1. Check `transactional_emails` / `auth_emails` queue depth
2. Verify `LOVABLE_API_KEY` secret
3. Check `process-email-queue` function logs
4. Inspect `transactional_emails_dlq`

### WhatsApp simulate fails

1. Redeploy `whatsapp-webhook`
2. User must be logged in as staff
3. `WHATSAPP_WEBHOOK_SECRET` for simulate path (mock)

### WhatsApp live messages not arriving

1. Meta webhook subscribed to `messages`
2. `WHATSAPP_VERIFY_TOKEN` matches Meta exactly
3. Function logs for `whatsapp-webhook`
4. `WHATSAPP_PROVIDER=meta` in secrets

### AI features fail / rate limited

1. Check `LOVABLE_API_KEY` (gateway functions)
2. `OPENAI_API_KEY` / `GEMINI_API_KEY` for direct-provider functions
3. Lovable Cloud workspace credits (message in `verify-document` UI)
4. Function logs for `ai-help-chat`, `classify-document`, etc.

### Telephony click-to-call fails

1. `TELECMI_FROM_NUMBER`, `TELECMI_APP_ID`, `TELECMI_SECRET` set
2. Agent mapped in telephony settings
3. `telephony-click-to-call` logs

### Odoo sync stale

1. `odoo-cron` job in `cron.job`
2. `ODOO_*` secrets valid
3. `odoo-sync` / `odoo-cron` edge function logs

---

## Logs and monitoring

| Source | What to check |
|---|---|
| Supabase → Edge Functions → Logs | Per-function errors, latency, 4xx/5xx |
| Supabase → Database → `app_email_logs` | Email delivery outcomes |
| Supabase → Database → pgmq DLQs | Stuck/failed queue messages |
| Supabase → Auth → Users | Sign-up / OAuth issues |
| Browser devtools | Frontend API errors |
| Meta Developer Console | WhatsApp webhook delivery |
| TeleCMI dashboard | Call logs |

**No centralized APM** in repo today — rely on Supabase logs + DB audit tables.

---

## Incident response

| Severity | Examples | Action |
|---|---|---|
| **P1** | Production down, data breach, payment/email completely broken | Escalate immediately; see [EXIT_STRATEGY.md § Disaster Recovery](./EXIT_STRATEGY.md#disaster-recovery-plan) |
| **P2** | Major feature broken (WhatsApp, telephony, Odoo sync) | Use playbooks above; deploy fix via hotfix branch |
| **P3** | Single-user / cosmetic | Ticket; fix in normal release |

**DR targets:** RTO 7 days, RPO 24 hours — full procedure in EXIT_STRATEGY.

---

## Development workflow

1. **Clone** GitHub repo
2. **Copy** `.env.example` → `.env`; fill `VITE_*` from team vault
3. **`npm ci`** then **`npm run dev`**
4. **Change** with system map: read [09-safety-rules.md](../system-map/09-safety-rules.md) first
5. **PR** to GitHub with change-impact checklist
6. **Deploy** migrations + functions + Lovable publish per sections above

**Scripts:**

| Script | Purpose |
|---|---|
| `scripts/deploy-whatsapp.sh` | Deploy WhatsApp edge functions |
| `scripts/upload-service-library-metadata.mjs` | Upload service library metadata (needs `SUPABASE_SERVICE_ROLE_KEY`) |

**Tests:** `npm test` (Vitest)

---

## Related documents

| Document | Purpose |
|---|---|
| [OWNERSHIP_MATRIX.md](./OWNERSHIP_MATRIX.md) | Account, billing, data, and RACI by asset |
| [ACCESS_REGISTER.md](./ACCESS_REGISTER.md) | Infrastructure access roles and system register |
| [MONTHLY_AUDIT.md](./MONTHLY_AUDIT.md) | Monthly governance checklist |
| [GOVERNANCE_INDEX.md](./GOVERNANCE_INDEX.md) | Master registry of governance docs |
| [EXIT_STRATEGY.md](./EXIT_STRATEGY.md) | Ownership scorecard, Lovable dependencies, DR plan |
| [system-map/00-README.md](../system-map/00-README.md) | Architecture index |
| [system-map/03-backend-map.md](../system-map/03-backend-map.md) | Edge functions & cron |
| [system-map/09-safety-rules.md](../system-map/09-safety-rules.md) | Non-negotiable build rules |
| [guides/whatsapp-helpline.md](../guides/whatsapp-helpline.md) | WhatsApp staff operations |

**Review this runbook quarterly** alongside EXIT_STRATEGY.
