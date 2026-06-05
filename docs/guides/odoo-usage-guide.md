# Odoo Usage Guide

> **Status:** Inactive (retained for historical compatibility). No active business workflows depend on Odoo. Code and schema remain until a future infrastructure cleanup phase. Staff should use the CRM as the source of truth.

How the CRM **synced with Odoo** when the integration was active. Retained for reference only.

---

## 1. Overview

- Edge functions: `odoo-sync`, `odoo-api`, `odoo-cron` (every 5 minutes)
- Secrets: `ODOO_URL`, `ODOO_DB`, `ODOO_LOGIN`, `ODOO_API_KEY` (Supabase — TECH only)
- Future Link owns the Odoo account (operations team maintains vendor access)

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

## 5. Escalation

| Issue | Contact |
|---|---|
| Sync failures / cron | TECH (operations team) |
| Odoo login / data | Odoo admin (ODOO role) |
