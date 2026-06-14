# HR Payroll — Migrations 18–22 deploy

Run in Lovable SQL editor **after** `20260717120017_hr_payroll_testing_changes.sql`.

| Order | File | Purpose |
|------:|------|---------|
| 18 | `20260717120018_hr_payroll_add_up_requirements.sql` | Profile fields, doc verify, lifecycle enum |
| 19 | `20260717120019_hr_payroll_lifecycle_salary_revision.sql` | Process / Approve / Lock / Paid RPCs |
| **20** | `20260717120020_hr_payroll_canada_engine.sql` | **Required for Canada CPP/EI + FL-CA01 seed** |
| 21 | `20260717120021_hr_payroll_uat_isha_link.sql` | Link FL-1042 to CRM admin (ESS UAT) |
| 22 | `20260717120022_hr_payroll_phase2c_rbac_snapshots.sql` | CRM RBAC bridge, Canada brackets, snapshots |

> **If migration 22 failed** with `relation "payroll_line_snapshots" does not exist`: apply **20** first, or re-run the **latest** 22 from GitHub (`6a94f049+`) which bootstraps that table.

## Apply order (staging)

```
18 → 19 → 20 → 21 → 22
```

Skip **21** if Isha is already linked. Migration **22** is safe to re-run (idempotent functions).

## Verify

Run: [`hr-payroll/HR_PAYROLL_UAT_VERIFY.sql`](./hr-payroll/HR_PAYROLL_UAT_VERIFY.sql)

Quick check:

```sql
SELECT tablename FROM pg_tables
WHERE tablename IN ('payroll_line_snapshots', 'payroll_cycle_snapshots', 'hr_crm_role_map');

SELECT proname FROM pg_proc
WHERE proname IN ('fn_sync_hr_role_from_crm', 'fn_canada_income_tax', 'fn_capture_payroll_snapshots');
```

## Pre-UAT gate

```bash
npm run test:hr-payroll
```

## Publish

Lovable → Sync from GitHub → **Publish** (`feature/service-library-nav`).
