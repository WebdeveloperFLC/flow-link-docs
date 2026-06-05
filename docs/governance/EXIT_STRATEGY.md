# Future Link CRM – Exit Strategy & Infrastructure Ownership Plan

| | |
|---|---|
| **Version** | 1.0 |
| **Status** | Active |
| **Owner** | OPS + TECH |
| **Review** | Quarterly |

## Purpose

This document is not a migration plan.

It is a business continuity and infrastructure ownership document that ensures Future Link Consultants can operate independently of any single platform, vendor, developer, or service provider.

**Current strategy:**

- Continue using Lovable Cloud.
- Continue developing in Cursor.
- Continue using GitHub as the source of truth.
- Do not migrate unless there is a clear business reason.

**Last audited:** 2026-06-04 (against repo `flow-link-docs`)

---

# Infrastructure Ownership Scorecard

| Asset | Owner | Status |
|---|---|---|
| GitHub repository | Future Link | Owned |
| Domain names | Future Link | Owned |
| WhatsApp Business account | Future Link | Owned |
| Meta app | Future Link | Owned |
| TeleCMI | Future Link | Owned |
| Odoo | Future Link | Owned |
| OpenAI | Future Link | Owned |
| Google AI | Future Link | Owned |
| Supabase project | Lovable Cloud | Managed — portable schema/functions in git; org/billing via Lovable |
| Lovable AI Gateway | Lovable | Managed — 24 edge functions; replace with direct provider keys |
| Lovable transactional email | Lovable | Managed — `process-email-queue` pipeline; notification SMTP already independent |
| Portal OAuth wrapper | Lovable | Managed — `src/integrations/lovable`; staff auth is native Supabase |

**Legend:** Owned = Future Link holds accounts, keys, and contracts. Managed = operational dependency on Lovable; code and data remain portable per sections below.

---

# Current Architecture

**Frontend:**

- React/Vite
- Source code: GitHub
- Development: Cursor

**Backend:**

- Lovable Cloud managed Supabase
- Project ref: `auofttkyosgjhxcbhscw`
- API URL: `https://auofttkyosgjhxcbhscw.supabase.co`

**Database:**

- PostgreSQL
- 182 migration files (`supabase/migrations/`)

**Functions:**

- 81 Supabase Edge Functions (`supabase/functions/`)

**Hosting:**

- Lovable Cloud (`*.lovable.app` preview/publish)
- Production app URL (configured): `https://dms.futurelinkconsultants.com`

**Deploy without Lovable (already possible):**

- Supabase CLI with `--project-ref auofttkyosgjhxcbhscw` (see `scripts/deploy-whatsapp.sh`)
- Secrets via Supabase Dashboard → Edge Functions → Secrets

---

# Assets Owned By Future Link

## Source Code

| | |
|---|---|
| **Location** | GitHub repository |
| **Status** | Fully controlled |
| **Risk** | Low |

## Database Schema

| | |
|---|---|
| **Location** | `supabase/migrations/` |
| **Migration count** | 182 |
| **Status** | Fully portable (standard Supabase SQL) |
| **Risk** | Low |

## Edge Functions

| | |
|---|---|
| **Location** | `supabase/functions/` |
| **Count** | 81 |
| **Config** | `supabase/config.toml` (JWT verification per function) |
| **Status** | Fully portable |
| **Risk** | Low |

## Notification Email (already independent)

| | |
|---|---|
| **Pipeline** | `notifications-dispatch` → customer SMTP via `smtp-send` |
| **Queue (optional)** | `notification_emails` pgmq → `process-notification-email-queue` when `QUEUE_EMAILS=true` |
| **Lovable dependency** | None |
| **Risk** | Low |

---

# Lovable Dependencies

## AI Gateway

| | |
|---|---|
| **Dependency** | `ai.gateway.lovable.dev`, `LOVABLE_API_KEY` |
| **Migration difficulty** | Medium |

**Affected edge functions (24)** — call `https://ai.gateway.lovable.dev/v1/chat/completions`:

| Domain | Functions |
|---|---|
| CRM / documents | `ai-help-chat`, `ai-summarize`, `classify-document`, `extract-card-statement`, `extract-document-data`, `generate-letter`, `parse-form-fields` (AI fallback), `split-binder`, `verify-document` (optional vision) |
| Digital Success Hub | `dsh-ai-generate-copy`, `dsh-ai-edit-image`, `dsh-ai-generate-poster`, `dsh-ai-generate-poster-openai` (Lovable fallback), `dsh-ai-generate-stock` |
| Institutions (UPI) | `upi-analyze-agreement`, `upi-ask-suggestions`, `upi-detect-promotions`, `upi-extract-commission-sheet`, `upi-extract-programs-from-doc`, `upi-generate-content`, `upi-process-document`, `upi-sync-process-batch`, `upi-sync-source` |

**Not on Lovable AI Gateway (direct provider keys already in use):**

- `ai-financial-assistant` → `GEMINI_API_KEY` (Google Generative Language API)
- `dsh-ai-generate-poster-openai` → `OPENAI_API_KEY` (primary; Lovable is fallback only)

**Replacement options:** OpenAI, Gemini, Anthropic (point each function at provider API; several already use OpenAI/Gemini patterns).

---

## Email Infrastructure (Lovable pipeline)

| | |
|---|---|
| **Dependency** | `@lovable.dev/email-js` → `api.lovable.dev` |
| **Also** | `@lovable.dev/webhooks-js` (suppression webhook verification) |
| **Secrets** | `LOVABLE_API_KEY`, optional `LOVABLE_SEND_URL` |
| **Migration difficulty** | Medium |

**Affected functions:**

| Function | Role |
|---|---|
| `process-email-queue` | Worker; sends via `sendLovableEmail` |
| `send-transactional-email` | Enqueues auth/assessment/transactional mail |
| `preview-transactional-email` | Template preview; gated by `LOVABLE_API_KEY` |
| `handle-email-suppression` | Lovable webhook HMAC verification |

**Database queues (pgmq):** `auth_emails`, `transactional_emails` (+ DLQs)

**Replacement options:** Resend, SendGrid, Amazon SES (wire `process-email-queue` to new sender; update DNS for auth/transactional subdomain).

**Note:** Notification email (`notifications-dispatch` / `smtp-send`) is **separate** and already uses customer SMTP — no Lovable dependency.

---

## OAuth Integration

| | |
|---|---|
| **Dependency** | `@lovable.dev/cloud-auth-js` |
| **Location** | `src/integrations/lovable/index.ts` (auto-generated by Lovable) |
| **Used in** | `src/pages/portal/PortalAuth.tsx` — Google sign-in for client portal |
| **Staff CRM auth** | Native Supabase (`supabase.auth.signInWithPassword` in `src/pages/Auth.tsx`) — **not** Lovable-dependent |
| **Migration difficulty** | Low to medium |

**Replacement:** Native Supabase Auth OAuth providers (Google, etc.) with redirect URLs updated for new hosting domain.

---

## Hosting

| | |
|---|---|
| **Current** | Lovable Cloud (`*.lovable.app`) |
| **Build** | `npm run build` (Vite) |
| **Migration difficulty** | Low |

**Replacement options:** Vercel, Cloudflare Pages, Netlify, or self-hosted static + CDN.

**Frontend env vars to carry over:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `VITE_WHATSAPP_ENABLED`, `VITE_WHATSAPP_PROVIDER` (see `.env.example`).

---

## Dev tooling (non-production)

| Package | Purpose |
|---|---|
| `lovable-tagger` | Component tagging in Vite dev mode only (`vite.config.ts`) |
| `.lovable/plan.md` | Agent planning notes — not infrastructure config |

---

# User-Owned Secrets

Secrets controlled by Future Link Consultants (set in Supabase Edge Function secrets and/or vendor dashboards). **Do not commit values to git.**

## AI & enrichment

| Secret | Used by | In repo |
|---|---|---|
| `OPENAI_API_KEY` | `dsh-ai-generate-poster-openai` | Yes |
| `GEMINI_API_KEY` | `ai-financial-assistant` | Yes |
| `GOOGLE_AI_API_KEY` | — | Not referenced in repo (use `GEMINI_API_KEY` today) |
| `JINA_API_KEY` | `upi-sync-source`, `upi-sync-process-batch` | Yes |
| `FIRECRAWL_API_KEY` | `upi-sync-source`, `upi-sync-process-batch` | Yes |
| `REPLICATE_API_TOKEN` | — | Not referenced in repo |

## Integrations

| Secret | Used by |
|---|---|
| `ODOO_URL`, `ODOO_DB`, `ODOO_LOGIN`, `ODOO_API_KEY` | `odoo-sync`, `odoo-api`, `odoo-cron` |
| `TELECMI_APP_ID`, `TELECMI_SECRET`, `TELECMI_FROM_NUMBER`, `TELECMI_WEBHOOK_SECRET` | `telephony-*` (via `_shared/telephony/telecmi.ts`) |
| `WHATSAPP_PROVIDER`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_AI_MODE`, `WHATSAPP_WEBHOOK_SECRET`, `WHATSAPP_GRAPH_VERSION` | `whatsapp-webhook`, `whatsapp-send` |

## Email (non-Lovable)

| Secret | Used by |
|---|---|
| Per-entity SMTP credentials | `smtp-send`, `smtp-admin` (stored in DB) |
| `RESEND_API_KEY` | `email-send` |
| `EMAIL_INBOUND_SECRET` | `email-inbound` |
| `EMAIL_FROM_ADDRESS` | `email-send` |
| `QUEUE_EMAILS` | `notifications-dispatch`, `process-notification-email-queue`, `offers-lifecycle-tick` |

## App config

| Secret | Used by |
|---|---|
| `PUBLIC_APP_URL` | Calendar approval/reschedule links |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected by Supabase on edge functions |

## Lovable-managed (would need replacement on exit)

| Secret | Used by |
|---|---|
| `LOVABLE_API_KEY` | AI gateway, Lovable email pipeline, webhooks, preview gate |
| `LOVABLE_SEND_URL` | Optional override for `process-email-queue` |

**Owner:** Future Link Consultants

---

# Migration Readiness Checklist

## Database

- [ ] Verify all 182 migrations apply cleanly on a fresh Supabase project
- [ ] Inventory storage buckets and policies
- [ ] Inventory RLS policies (see `docs/system-map/04-database-map.md`)
- [ ] Export/verify seed scripts (`supabase/seed/`)

## Functions

- [ ] Inventory all 81 edge functions
- [ ] Identify Lovable dependencies (24 AI + 4 email — lists above)
- [ ] Test CLI deploy: `npx supabase functions deploy <name> --project-ref auofttkyosgjhxcbhscw`
- [ ] Document cron/tick jobs: `notifications-*-tick`, `offers-lifecycle-tick`, `incentive-calculate-run`, `odoo-cron`

## Authentication

- [ ] Inventory OAuth providers (portal: Google via Lovable; staff: email/password via Supabase)
- [ ] Document sign-in flows (`Auth.tsx`, `PortalAuth.tsx`, `AuthContext.tsx`)
- [ ] Plan redirect URL updates for new hosting domain

## Email

- [ ] Document Lovable queue system (`auth_emails`, `transactional_emails`)
- [ ] Document independent SMTP notification path (`QUEUE_EMAILS`, `smtp-send`)
- [ ] Document DNS requirements (transactional subdomain, SPF/DKIM)

## AI

- [ ] Document all AI gateway usage (24 functions — table above)
- [ ] Document direct-provider functions (`OPENAI_API_KEY`, `GEMINI_API_KEY`)
- [ ] Estimate per-feature model costs after migration

## Hosting

- [ ] Document build process (`npm run build`)
- [ ] Document environment variables (`.env.example` + Supabase secrets)
- [ ] Map custom domain (`dms.futurelinkconsultants.com`) to new host

## Ownership & access

- [ ] Confirm Supabase org/project ownership (dashboard access for Future Link)
- [ ] Store `SUPABASE_ACCESS_TOKEN` for CLI (personal access token — not in repo)
- [ ] Document Meta/WhatsApp, TeleCMI, Odoo dashboard access

---

# Trigger Events For Migration

Migration should only be considered if:

- Lovable pricing becomes prohibitive
- Business requires direct Supabase org ownership (billing, compliance, support)
- Compliance requirements demand self-managed infrastructure
- Vendor service degradation impacts operations
- Future Link requires full infrastructure control

**Otherwise remain on Lovable Cloud.**

---

# Disaster Recovery Plan

## Recovery Time Objective (RTO)

**Target:** 7 days — full CRM operational for staff and clients.

## Recovery Point Objective (RPO)

**Target:** 24 hours — acceptable data loss window for Postgres and storage (align with Supabase backup/PITR schedule; verify in dashboard).

## Critical Assets

| # | Asset | Owner | Notes |
|---|---|---|---|
| 1 | GitHub repository | Future Link | Source of truth for schema, functions, frontend |
| 2 | Supabase database | Lovable-managed project | Postgres + RLS; 182 migrations |
| 3 | Edge functions | In git | 81 functions; deploy via CLI |
| 4 | Storage buckets | Supabase Storage | Defined in migrations (see Step 6) |
| 5 | Meta WhatsApp Business | Future Link | Webhook points to Supabase function URL |
| 6 | Odoo | Future Link | `ODOO_*` secrets; sync via `odoo-sync` |
| 7 | TeleCMI | Future Link | `TELECMI_*` secrets; webhooks to `telephony-webhook` |
| 8 | Domain & DNS | Future Link | `dms.futurelinkconsultants.com`; email/WhatsApp DNS |

**Also required for full parity:** Lovable AI Gateway (`LOVABLE_API_KEY`), Lovable transactional email, portal OAuth, OpenAI/Google AI keys, SMTP credentials, `RESEND_API_KEY`, `JINA_API_KEY`, `FIRECRAWL_API_KEY`.

## Recovery Procedure

### Step 1 — Restore GitHub repository

- Clone from GitHub (or restore from org backup).
- Confirm `supabase/migrations/`, `supabase/functions/`, and `src/` are intact.
- Tag the recovery baseline commit.

### Step 2 — Create replacement Supabase project

- Create a new project under a Future Link–owned Supabase org (preferred for DR).
- Record new project ref, URL, anon key, and service role key.
- Update `.env` / hosting `VITE_*` variables to the new project.

### Step 3 — Apply migrations

```bash
npx supabase db push --project-ref <NEW_PROJECT_REF>
```

- Apply all **182** migrations in order.
- Run seed scripts if needed (`supabase/seed/`).
- Verify RLS and extensions (pgmq, etc.) applied without errors.

### Step 4 — Deploy edge functions

```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."   # dashboard → account → tokens
npx supabase functions deploy --project-ref <NEW_PROJECT_REF>
```

- Deploy all **81** functions (or start with critical path: auth-adjacent, `whatsapp-*`, `telephony-*`, `notifications-dispatch`, `smtp-send`, `odoo-sync`).
- Copy JWT settings from `supabase/config.toml` (or redeploy with linked config).

### Step 5 — Restore secrets

Restore all Edge Function secrets from the **User-Owned Secrets** section above, plus:

- `SUPABASE_*` (auto on Supabase; update any hardcoded project refs in external systems)
- `LOVABLE_API_KEY`, `LOVABLE_SEND_URL` (if still using Lovable services)
- `QUEUE_EMAILS`, `PUBLIC_APP_URL`, `WHATSAPP_*`, `TELECMI_*`, `ODOO_*`

Store a sealed offline copy of secret names and rotation contacts (not values in git).

### Step 6 — Restore storage buckets

Migrations recreate bucket definitions and policies. **Object data** must be restored separately:

| Bucket | Public |
|---|---|
| `client-documents` | No |
| `letter-templates` | No |
| `branding` | No |
| `visa-forms` | No |
| `voice-notes` | No |
| `assessment-pdf-assets` | No |
| `institution-documents` | No |
| `dsh-media` | No |
| `calendar-branding` | Yes |
| `calendar-company-branding` | Yes |

- Export from failed project (Supabase Storage or backup) before decommission.
- Bulk upload to matching paths in the new project.

### Step 7 — Reconnect integrations

| Integration | Action |
|---|---|
| **Domain / DNS** | Point app host to new frontend; update Supabase auth redirect URLs |
| **Meta WhatsApp** | Update webhook URL to `https://<NEW_REF>.supabase.co/functions/v1/whatsapp-webhook`; re-verify token |
| **TeleCMI** | Update webhook URL to `telephony-webhook`; confirm `TELECMI_WEBHOOK_SECRET` |
| **Odoo** | No URL change if Odoo unchanged; verify `odoo-sync` / cron auth |
| **Email** | Update SPF/DKIM if sending domain changes; re-test `smtp-send` and transactional queue |
| **Lovable** | Re-link project or migrate off Lovable AI/email/OAuth per exit sections above |

### Step 8 — Validate production

- [ ] Staff login (`Auth.tsx` — email/password)
- [ ] Client portal login (Google OAuth)
- [ ] Create/read client, document upload to `client-documents`
- [ ] Outbound notification email (SMTP path)
- [ ] Transactional/assessment email (if Lovable email still in use)
- [ ] WhatsApp inbound webhook + counselor reply
- [ ] TeleCMI click-to-call and webhook
- [ ] Odoo sync smoke test
- [ ] AI features (help chat, document extraction, DSH/UPI as applicable)
- [ ] Custom domain loads CRM over HTTPS

**Rollback:** Keep old Supabase project read-only until validation passes; DNS TTL permitting, revert webhook URLs if cutover fails.

---

# Current Recommendation

Continue development on:

- **Cursor** — local IDE
- **GitHub** — source of truth
- **Lovable Cloud** — Supabase backend provisioning, deploy UX, AI gateway, transactional email, frontend publish

Review this document **quarterly** and update the audit date, function counts, and secret inventory when the repo changes.

**Related docs:**

- [OWNERSHIP_MATRIX.md](./OWNERSHIP_MATRIX.md) — account, billing, and RACI by asset
- [ACCESS_REGISTER.md](./ACCESS_REGISTER.md) — infrastructure access by role (names offline)
- [MONTHLY_AUDIT.md](./MONTHLY_AUDIT.md) — monthly governance checklist
- [GOVERNANCE_INDEX.md](./GOVERNANCE_INDEX.md) — master registry of governance docs
- [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) — day-to-day deploy, secrets, cron, troubleshooting
- [system-map/01-system-overview.md](../system-map/01-system-overview.md) — stack overview
- [guides/whatsapp-phase1-meta-setup.md](../guides/whatsapp-phase1-meta-setup.md) — webhook URL and deploy
- `scripts/deploy-whatsapp.sh` — CLI deploy without Lovable UI
