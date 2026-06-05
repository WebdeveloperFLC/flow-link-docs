# Odoo Usage Guide

> **Status:** Draft — expand with Future Link Odoo screens and field mapping.

How the CRM **syncs with Odoo** and what staff should expect.

---

## 1. Overview

- Edge functions: `odoo-sync`, `odoo-api`, `odoo-cron` (every 5 minutes)
- Secrets: `ODOO_URL`, `ODOO_DB`, `ODOO_LOGIN`, `ODOO_API_KEY` (Supabase — TECH only)
- Future Link owns the Odoo account — see [OWNERSHIP_MATRIX.md](../OWNERSHIP_MATRIX.md)

---

## 2. What syncs (high level)

| Direction | Data |
|---|---|
| CRM → Odoo | Partners / leads (per sync configuration) |
| Timing | Scheduled cron + on-demand sync |

Confirm exact field mapping with TECH if troubleshooting mismatches.

---

## 3. Staff actions

| Task | Where |
|---|---|
| View client in CRM | Clients (source of truth for counseling workflow) |
| Odoo corrections | Odoo admin (ODOO role) — avoid duplicate manual edits that cron overwrites |
| Sync failure | Escalate to TECH; check `odoo-cron` logs in Supabase |

---

## 4. Troubleshooting

| Symptom | Check |
|---|---|
| Stale Odoo data | `odoo-cron-every-5min` job active; `ODOO_*` secrets valid |
| Duplicate partner | Ref / application_id matching in sync logic |

---

## 5. Related documentation

- [OPERATIONS_RUNBOOK.md](../OPERATIONS_RUNBOOK.md) § Odoo
- [MONTHLY_AUDIT.md](../MONTHLY_AUDIT.md) § 6.4
