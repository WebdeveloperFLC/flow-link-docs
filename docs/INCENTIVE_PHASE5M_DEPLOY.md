# Performance Hub — Phase 5M Deploy

## Phase 5M deliverables (settlement governance)

| # | Feature | Surface |
|---|---------|---------|
| 5M.1 | Scheme templates (I3) | `/incentives/plans` → **Scheme templates** tab — save plan as template, clone to new plan |
| 5M.2 | Line-item disputes (I6) | `/incentives/runs/:runId` — counselor query thread per line; manager resolve |
| 5M.3 | Payroll handoff (I1) | `/incentives/payouts` — payroll status column, batch mark sent |
| 5M.4 | FX audit log (I2) | `/incentives/fx-rates` — change history panel + trigger on `fx_rates` |

## Migration

**`20260630120000_incentive_platform_phase5m.sql`**

- `incentive_scheme_templates` + `fn_save_plan_as_scheme_template`, `fn_clone_scheme_template_to_plan`
- `incentive_run_item_disputes`, `incentive_run_item_dispute_messages` + dispute RPCs
- `incentive_payouts.payroll_status`, `payroll_sent_at`, `payroll_batch_ref` + `fn_mark_payouts_payroll_sent`
- Updated `fn_incentive_payout_export` (includes payroll columns)
- `fx_rate_audit_log` + `trg_fx_rates_audit` on `fx_rates`

## Access

| Action | Who |
|--------|-----|
| Save / clone scheme templates | Admin, manager |
| Open dispute on line | Counselor (own lines) or staff |
| Reply to dispute | Counselor or staff while open |
| Resolve dispute | Manager, admin |
| Mark payroll sent | Admin |
| View FX audit | Admin, manager |

## UAT

1. **I3** — Plans → select plan → Scheme templates → Save as template → Clone to new plan → verify rules/slabs copied.
2. **I6** — Run detail → counselor opens query on a line → manager replies → Resolve.
3. **I1** — Payout desk → export CSV (status → exported) → select rows → Mark sent to payroll with batch ref.
4. **I2** — FX rates → add/edit rate → audit log shows insert/update with user and values.

## Post–5M (not in scope)

Split attribution (I4), multi-plan stacking (I7), wallet W4–W6 flags, automation journeys (O7).
