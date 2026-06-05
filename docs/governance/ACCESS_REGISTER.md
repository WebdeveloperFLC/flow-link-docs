# Future Link CRM — Access Register

| | |
|---|---|
| **Version** | 1.0 |
| **Status** | Active |
| **Owner** | OPS |
| **Review** | Quarterly |

Record of **who can access which systems** (vendor dashboards, repos, secrets, DNS). This is infrastructure access — not CRM in-app roles for counselors and staff.

Complements [OWNERSHIP_MATRIX.md](./OWNERSHIP_MATRIX.md) (who owns accounts) and [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) (how to operate them).

**Last reviewed:** 2026-06-04  
**Next review due:** 2026-09-04 (quarterly)

> **Privacy:** Do not store personal emails, phone numbers, or passwords in git. Use role titles below and keep named holders in a **sealed offline vault** (password manager or secure sheet). Replace `TBD` when updating offline.

---

## Register roles (infrastructure)

| Role ID | Title | Typical access |
|---|---|---|
| **OPS** | Operations lead | All production dashboards, billing, DNS, vendor admin |
| **TECH** | Technical admin | Supabase, GitHub admin, secrets, deploy, CLI tokens |
| **DEV** | Developer | GitHub write, local `.env`, Supabase read, no production secrets by default |
| **META** | WhatsApp / Meta admin | Meta Business Suite, developer app, webhook config |
| **TEL** | Telephony admin | TeleCMI dashboard, CRM telephony settings |
| **ODOO** | Odoo admin | Odoo backend, sync credentials |
| **BILL** | Billing contact | Vendor invoices only; no technical access |

**Named holders (offline vault only):**

| Role ID | Name | Work email | MFA | Last confirmed |
|---|---|---|---|---|
| OPS | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| TECH | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| DEV | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| META | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| TEL | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| ODOO | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| BILL | _TBD_ | _TBD_ | — | _TBD_ |

---

## System access register

| # | System | URL / entry point | Min. role | Access level | MFA required | Credential type | Authorized roles | Last reviewed | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | GitHub (repo) | _org/repo URL_ | DEV | Read / Write / Admin | Yes | SSO or PAT | OPS, TECH, DEV | 2026-06-04 | Source of truth; branch protection on `main` |
| 2 | Lovable workspace | lovable.dev | TECH | Project edit, Publish | Yes | Lovable account | OPS, TECH | 2026-06-04 | Frontend publish; optional function deploy |
| 3 | Supabase project | `auofttkyosgjhxcbhscw` | TECH | Owner / Admin / Read | Yes | Supabase login | OPS, TECH | 2026-06-04 | Confirm org owner (Lovable vs FLC) in vault |
| 4 | Supabase CLI token | dashboard → Account → Tokens | TECH | Deploy, `db push` | — | `SUPABASE_ACCESS_TOKEN` (`sbp_…`) | TECH | 2026-06-04 | Personal token; not shared in chat |
| 5 | Supabase service role | Project → Settings → API | TECH | Full DB bypass | Yes | `service_role` key | TECH only | 2026-06-04 | Never in frontend; scripts/local only |
| 6 | Production CRM | `dms.futurelinkconsultants.com` | — | Staff login | — | Email + password | All staff (CRM roles) | 2026-06-04 | See § CRM application access |
| 7 | Client portal | `/portal` on production | — | Client Google OAuth | — | Lovable OAuth + Google | Clients | 2026-06-04 | `PortalAuth.tsx` |
| 8 | Domain / DNS | Registrar panel | OPS | DNS edit | Yes | Registrar login | OPS, TECH | 2026-06-04 | `dms.futurelinkconsultants.com` |
| 9 | Meta Business Suite | business.facebook.com | META | WhatsApp admin | Yes | Meta business login | OPS, META | 2026-06-04 | WABA owner |
| 10 | Meta Developer App | developers.facebook.com | META | App admin | Yes | Meta developer login | META, TECH | 2026-06-04 | Webhook + app secret |
| 11 | TeleCMI | TeleCMI / PIOPIY dashboard | TEL | Admin | Yes | TeleCMI account | OPS, TEL | 2026-06-04 | `TELECMI_*` secrets in Supabase |
| 12 | Odoo | _Odoo URL_ | ODOO | Admin / API user | Yes | `ODOO_LOGIN` + API key | OPS, ODOO | 2026-06-04 | Sync every 5 min via cron |
| 13 | OpenAI | platform.openai.com | TECH | API admin | Yes | `OPENAI_API_KEY` | TECH | 2026-06-04 | DSH poster function |
| 14 | Google AI Studio | aistudio.google.com | TECH | API key | Yes | `GEMINI_API_KEY` | TECH | 2026-06-04 | Financial assistant |
| 15 | Jina | jina.ai dashboard | TECH | API key | Yes | `JINA_API_KEY` | TECH | 2026-06-04 | UPI ingest |
| 16 | Firecrawl | firecrawl.dev dashboard | TECH | API key | Yes | `FIRECRAWL_API_KEY` | TECH | 2026-06-04 | UPI ingest |
| 17 | Resend (if used) | resend.com | TECH | API key | Yes | `RESEND_API_KEY` | TECH | 2026-06-04 | `email-send` |
| 18 | Google Cloud OAuth | console.cloud.google.com | TECH | OAuth client admin | Yes | Client ID/secret | TECH | 2026-06-04 | Portal Google sign-in |
| 19 | SMTP (notifications) | CRM → Settings → SMTP | OPS | Global + entity SMTP | — | DB-stored passwords | OPS, TECH | 2026-06-04 | Invoice/receipt path |
| 20 | Lovable AI / email | Lovable Cloud secrets | TECH | `LOVABLE_API_KEY` | — | Supabase edge secret | TECH | 2026-06-04 | AI gateway + transactional mail |
| 21 | WhatsApp edge secrets | Supabase → Secrets | META, TECH | `WHATSAPP_*` | — | Supabase edge secret | META, TECH | 2026-06-04 | See WhatsApp guides |
| 22 | Local dev `.env` | Developer machine | DEV | `VITE_*` anon key | — | File (gitignored) | DEV | 2026-06-04 | Copy from `.env.example` |

---

## Supabase edge secrets — access to change

Who may add/rotate secrets in **Supabase Dashboard → Edge Functions → Secrets** (or via Lovable):

| Secret group | Rotate trigger | Authorized roles |
|---|---|---|
| `WHATSAPP_*` | Token expiry, leak, Meta rotation | META, TECH |
| `TELECMI_*` | Provider rotation, leak | TEL, TECH |
| `ODOO_*` | API key rotation | ODOO, TECH |
| `OPENAI_*`, `GEMINI_*`, `JINA_*`, `FIRECRAWL_*` | Key rotation, quota | TECH |
| `LOVABLE_*` | Lovable rotation, exit planning | TECH, OPS |
| `QUEUE_EMAILS`, `PUBLIC_APP_URL` | Ops change | OPS, TECH |
| SMTP-related | Never in secrets — CRM Settings UI | OPS |

Full secret inventory: [EXIT_STRATEGY.md § User-Owned Secrets](./EXIT_STRATEGY.md#user-owned-secrets).

---

## CRM application access (in-app)

Staff permissions inside the CRM (counselor, admin, accounting, institutions tiers) are **not** listed row-by-row here. They are managed in the product:

| Topic | Document |
|---|---|
| Roles & modules | [system-map/05-roles-and-permissions.md](../system-map/05-roles-and-permissions.md) |
| Institutions two-tier access | [guides/institutions-module.md](../guides/institutions-module.md) § 3 |
| Portal client access | [system-map/flows/portal-access.md](../system-map/flows/portal-access.md) |
| User provisioning | CRM → Settings → Users (`admin-users` edge function) |

**Infrastructure vs CRM:** This register covers **vendor and platform** access. CRM admins grant module permissions without needing Supabase dashboard access.

---

## Access principles

1. **Least privilege** — DEV does not need service role or production secret write by default.
2. **MFA** — Required on GitHub, Supabase, Meta, domain registrar, and vendor billing accounts.
3. **No secrets in git** — `.env` is local only; edge secrets live in Supabase.
4. **Named CLI tokens** — `SUPABASE_ACCESS_TOKEN` is personal; revoke on offboarding.
5. **Separation** — META/TEL/ODOO admins can operate integrations without GitHub admin.
6. **Audit** — Quarterly review of this register + offline named-holder sheet.

---

## Onboarding checklist (infrastructure)

- [ ] Assign role ID(s) from table above
- [ ] Add to offline named-holder vault (name, email, MFA status)
- [ ] GitHub: invite with appropriate permission (Read vs Write)
- [ ] Supabase: invite as Developer or Admin per role
- [ ] Lovable: workspace invite if publish/deploy needed
- [ ] Vendor dashboards: only systems required for role (Meta, TeleCMI, Odoo, etc.)
- [ ] Confirm **no** service role key emailed or stored in ticket/chat
- [ ] Local `.env`: provide `VITE_*` via secure channel only

---

## Offboarding checklist

- [ ] Remove from GitHub org/repo
- [ ] Remove from Supabase project/org
- [ ] Remove from Lovable workspace
- [ ] Remove from Meta Business / Developer (if applicable)
- [ ] Remove from TeleCMI, Odoo, OpenAI, Google Cloud (if applicable)
- [ ] Revoke personal `SUPABASE_ACCESS_TOKEN` (holder regenerates; old token deleted)
- [ ] Rotate shared secrets if ex-holder had write access (see secret group table)
- [ ] Disable CRM staff user in Settings → Users
- [ ] Update offline named-holder vault and **Last reviewed** date on this doc

---

## Break-glass / emergency

| Scenario | Action | Roles |
|---|---|---|
| Production down | OPS + TECH follow [OPERATIONS_RUNBOOK](./OPERATIONS_RUNBOOK.md) incident section | OPS, TECH |
| Supabase compromise suspected | Rotate `service_role`, anon key, all edge secrets; force staff password reset | TECH, OPS |
| Meta token leak | Revoke in Meta → rotate `WHATSAPP_*` → redeploy `whatsapp-webhook` | META, TECH |
| GitHub compromise | Revoke PATs, review audit log, rotate deploy tokens | TECH |
| Full platform loss | [EXIT_STRATEGY.md § Disaster Recovery](./EXIT_STRATEGY.md#disaster-recovery-plan) | OPS |

**Break-glass contacts (offline vault):**

| Role | Name | Phone | Available |
|---|---|---|---|
| OPS primary | _TBD_ | _TBD_ | _TBD_ |
| TECH primary | _TBD_ | _TBD_ | _TBD_ |
| OPS backup | _TBD_ | _TBD_ | _TBD_ |

---

## Review log

| Date | Reviewer (role) | Changes |
|---|---|---|
| 2026-06-04 | _TBD (OPS)_ | Initial register created from repo audit |

---

## Related documents

| Document | Purpose |
|---|---|
| [OWNERSHIP_MATRIX.md](./OWNERSHIP_MATRIX.md) | Account owner, billing, RACI |
| [EXIT_STRATEGY.md](./EXIT_STRATEGY.md) | Secrets inventory, DR |
| [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) | Deploy and troubleshooting |
| [MONTHLY_AUDIT.md](./MONTHLY_AUDIT.md) | Monthly access & security audit |
| [GOVERNANCE_INDEX.md](./GOVERNANCE_INDEX.md) | Master registry of governance docs |
