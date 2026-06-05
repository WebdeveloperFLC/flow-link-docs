# Future Link CRM — Ownership Matrix

| | |
|---|---|
| **Version** | 1.0 |
| **Status** | Active |
| **Owner** | OPS |
| **Review** | Quarterly |

Who owns what: accounts, billing, admin access, source of truth, and portability. Complements [EXIT_STRATEGY.md](./EXIT_STRATEGY.md) (continuity) and [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) (day-to-day ops).

**Last audited:** 2026-06-04

---

## How to read this matrix

| Column | Meaning |
|---|---|
| **Account owner** | Legal/contract holder for the vendor account |
| **Billing** | Who pays the invoice |
| **Admin access** | Who can change production settings |
| **Source of truth** | Where the definitive config/code/data lives |
| **Portability** | Can Future Link move this without the current vendor? |
| **FLC role** | Future Link Consultants operational responsibility |

**Status legend**

| Status | Meaning |
|---|---|
| **Owned** | Future Link holds account, keys, and contracts |
| **Managed** | Future Link uses it; vendor/Lovable operates the control plane |
| **Portable** | Definition in git or standard export; movable with effort |
| **Vendor** | Third-party SaaS; Future Link owns account, vendor runs service |

---

## Executive summary

| Category | Owned by Future Link | Managed by Lovable | Notes |
|---|---:|---:|---|
| Accounts & contracts | 8 | 4 | See master matrix below |
| Portable without migration | Schema, functions, frontend, most integrations | — | In GitHub |
| Requires replacement on full exit | — | AI gateway, transactional email, portal OAuth, hosting UX | See EXIT_STRATEGY |

---

## Master ownership matrix

### Platform & code

| Asset | Account owner | Billing | Admin access | Source of truth | Portability | FLC role | Status |
|---|---|---|---|---|---|---|---|
| GitHub repository | Future Link | Future Link | Future Link dev team | GitHub `main` | High | Maintain repo, PRs, access control | **Owned** |
| Application source (`src/`) | Future Link | — | Future Link | GitHub | High | Feature development (Cursor) | **Owned** |
| Database migrations | Future Link | — | Future Link | `supabase/migrations/` (182) | High | Review before `db push` | **Owned** |
| Edge functions | Future Link | — | Future Link | `supabase/functions/` (81) | High | Deploy via CLI or Lovable | **Owned** |
| Function JWT config | Future Link | — | Future Link | `supabase/config.toml` | High | Keep in sync on deploy | **Owned** |
| Local / CI env template | Future Link | — | Future Link | `.env.example` | High | Document `VITE_*` changes | **Owned** |

### Infrastructure

| Asset | Account owner | Billing | Admin access | Source of truth | Portability | FLC role | Status |
|---|---|---|---|---|---|---|---|
| Supabase project `auofttkyosgjhxcbhscw` | Lovable Cloud * | Lovable / FLC † | Lovable + Supabase dashboard ‡ | GitHub + live DB | Medium | Backups, secrets, migrations | **Managed** |
| PostgreSQL data | Future Link (data) | via Supabase | Supabase SQL / dashboard | Supabase instance | Medium | RPO 24h — verify PITR | **Managed** |
| Supabase Storage (10 buckets) | Future Link (data) | via Supabase | Supabase dashboard | Buckets + object files | Medium | Export before decommission | **Managed** |
| Supabase Auth (staff) | Future Link (users) | via Supabase | Supabase Auth dashboard | `auth.users` | Medium | User provisioning via CRM | **Managed** |
| Production domain `dms.futurelinkconsultants.com` | Future Link | Future Link | Future Link DNS registrar | DNS panel | High | DNS, SSL, redirects | **Owned** |
| Frontend hosting | Lovable Cloud | Lovable / FLC † | Lovable publish | GitHub build (`npm run build`) | High | Publish after merge | **Managed** |
| Lovable preview (`*.lovable.app`) | Lovable | Lovable | Lovable | GitHub | N/A (dev only) | QA previews | **Managed** |

\* Confirm whether Supabase org is under Lovable or Future Link — document in admin vault.  
† Billing arrangement should be recorded offline (who receives Supabase/Lovable invoices).  
‡ Future Link should retain Supabase dashboard login even while using Lovable deploy UX.

### Lovable platform services

| Asset | Account owner | Billing | Admin access | Source of truth | Portability | FLC role | Status |
|---|---|---|---|---|---|---|---|
| Lovable AI Gateway | Lovable | Lovable workspace | Lovable Cloud / `LOVABLE_API_KEY` | 24 edge functions in git | Medium | Monitor credits, outages | **Managed** |
| Lovable transactional email | Lovable | Lovable workspace | `LOVABLE_API_KEY`, DNS for subdomain | `process-email-queue` in git | Medium | Assessment/invite mail | **Managed** |
| Portal OAuth (`@lovable.dev/cloud-auth-js`) | Lovable | Lovable workspace | Lovable + Google Cloud OAuth | `src/integrations/lovable/` | Medium | Portal Google login | **Managed** |
| Lovable dev tooling (`lovable-tagger`) | Lovable | — | Local only | `vite.config.ts` | High | Dev-only; not production | **Managed** |

### Integrations (Future Link vendor accounts)

| Asset | Account owner | Billing | Admin access | Source of truth | Portability | FLC role | Status |
|---|---|---|---|---|---|---|---|
| Meta Business / WhatsApp | Future Link | Future Link | Meta Business Suite | Meta + `WHATSAPP_*` secrets | High | Webhook, tokens, sandbox | **Owned** |
| Meta Developer App | Future Link | Future Link | developers.facebook.com | App ID, app secret | High | WhatsApp product config | **Owned** |
| TeleCMI | Future Link | Future Link | TeleCMI dashboard | `TELECMI_*` secrets | High | Numbers, agents, webhooks | **Owned** |
| Odoo | Future Link | Future Link | Odoo admin | `ODOO_*` secrets + Odoo DB | High | Partner/lead sync | **Owned** |
| OpenAI | Future Link | Future Link | platform.openai.com | `OPENAI_API_KEY` | High | DSH poster generation | **Owned** |
| Google AI (Gemini) | Future Link | Future Link | Google AI Studio | `GEMINI_API_KEY` | High | Financial assistant | **Owned** |
| Jina Reader | Future Link | Future Link | Jina dashboard | `JINA_API_KEY` | High | UPI web ingest | **Owned** |
| Firecrawl | Future Link | Future Link | Firecrawl dashboard | `FIRECRAWL_API_KEY` | High | UPI web ingest | **Owned** |
| Resend (if used) | Future Link | Future Link | Resend dashboard | `RESEND_API_KEY` | High | `email-send` path | **Owned** |
| Customer SMTP (notifications) | Future Link | Future Link | CRM Settings → SMTP | `smtp_settings` / `entity_smtp_settings` DB | High | Invoice/receipt mail | **Owned** |

### Email channels (split ownership)

| Channel | Pipeline | Lovable? | Account owner | FLC role |
|---|---|---|---|---|
| Notification / invoice email | `notifications-dispatch` → `smtp-send` | No | Future Link SMTP | Primary business mail |
| Transactional / assessment | `send-transactional-email` → `process-email-queue` | Yes | Lovable + FLC DNS | Invites, auth mail |
| Generic `email-send` | `email-send` (Resend optional) | No | Future Link | Ad-hoc transactional |

---

## Credentials ownership

| Credential store | Owner | Location | FLC must maintain |
|---|---|---|---|
| Supabase Edge secrets | Future Link (operational) | Supabase Dashboard → Secrets | Offline inventory of secret *names* |
| `VITE_*` frontend keys | Future Link | Lovable Publish + local `.env` | Anon key rotation |
| Per-entity SMTP passwords | Future Link | Postgres (`smtp_settings`) | Rotation via CRM Settings |
| OAuth client IDs (Google portal) | Future Link + Lovable | Google Cloud Console + Lovable | Redirect URIs on domain change |
| `SUPABASE_ACCESS_TOKEN` (CLI) | Individual token holder | Not in git | Personal access token for deploys |
| Service role key | Future Link | Supabase API settings | Never expose to frontend |

Full secret list: [EXIT_STRATEGY.md § User-Owned Secrets](./EXIT_STRATEGY.md#user-owned-secrets).

---

## Data ownership

| Data class | Owner | Residency | Backup responsibility |
|---|---|---|---|
| Client PII & CRM records | Future Link | Supabase Postgres | Supabase backups / PITR |
| Documents & uploads | Future Link | Supabase Storage | Export + bucket policies |
| Accounting & invoices | Future Link | Supabase Postgres | Same as CRM |
| Email logs | Future Link | `app_email_logs`, `email_send_log` | DB backup |
| WhatsApp threads | Future Link | Postgres (phase 0 inbox tables) | DB backup |
| Call metadata / recordings | Future Link | Postgres + TeleCMI | TeleCMI retention policy |
| Odoo mirror data | Future Link | Odoo instance | Odoo backup schedule |

Future Link is **data controller** for client data. Subprocessors include Supabase, Lovable (AI/email/OAuth), Meta, TeleCMI, OpenAI, Google, and email SMTP providers.

---

## Operational responsibilities (RACI-style)

| Activity | Future Link | Lovable | Developer / contractor |
|---|---|---|---|
| CRM feature code | **R/A** | I | **R** (implements) |
| Merge to GitHub main | **A** | — | **R** |
| Apply DB migrations | **A** | C (optional deploy) | **R** |
| Deploy edge functions | **A** | C (optional) | **R** |
| Publish production frontend | **A** | **R** (if using Lovable) | C |
| Rotate integration secrets | **R/A** | — | C |
| Meta / WhatsApp webhook | **R/A** | — | C |
| Supabase billing & org | **A** † | C | — |
| Incident / DR execution | **R/A** | C | C |
| Quarterly ownership review | **R/A** | — | C |

**R** = Responsible, **A** = Accountable, **C** = Consulted, **I** = Informed

---

## Risk register (ownership gaps)

| Gap | Risk | Mitigation |
|---|---|---|
| Supabase org under Lovable only | Cannot bill or recover project | Obtain org invite or document transfer process |
| No offline secret inventory | Slow DR / staff turnover | Sealed vault of secret names + vendor contacts |
| `LOVABLE_API_KEY` single point | AI + email + webhooks fail together | Monitor; plan phased provider migration |
| Portal OAuth via Lovable only | Portal login breaks on Lovable outage | Migrate to native Supabase Google OAuth |
| RPO assumes 24h backups | Data loss beyond window | Confirm PITR tier in Supabase dashboard |

---

## Review cadence

| Review | Frequency | Owner | Update these docs |
|---|---|---|---|
| Ownership matrix | Quarterly | Future Link ops lead | This file |
| Secret name inventory | Quarterly | Future Link ops lead | EXIT_STRATEGY |
| DR drill (tabletop) | Annually | Future Link ops lead | EXIT_STRATEGY § DR |
| Runbook accuracy | After major deploy | Technical lead | OPERATIONS_RUNBOOK |
| Monthly governance audit | Monthly | OPS lead | MONTHLY_AUDIT |

---

## Related documents

| Document | Purpose |
|---|---|
| [ACCESS_REGISTER.md](./ACCESS_REGISTER.md) | Who has access to which vendor/system accounts |
| [MONTHLY_AUDIT.md](./MONTHLY_AUDIT.md) | Monthly checklist (access, backups, integrations) |
| [GOVERNANCE_INDEX.md](./GOVERNANCE_INDEX.md) | Master registry of governance docs |
| [EXIT_STRATEGY.md](./EXIT_STRATEGY.md) | Scorecard, Lovable dependencies, disaster recovery |
| [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) | Deploy, cron, troubleshooting |
| [system-map/00-README.md](../system-map/00-README.md) | Technical architecture index |
