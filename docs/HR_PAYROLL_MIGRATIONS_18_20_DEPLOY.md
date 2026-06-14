# HR Payroll — Migrations 18–21 deploy

Run in Lovable SQL editor **after** `20260717120017_hr_payroll_testing_changes.sql`.

| Order | File | Purpose |
|------:|------|---------|
| 18 | `20260717120018_hr_payroll_add_up_requirements.sql` | Profile fields, doc verify, leave/comp-off columns, salary revision table, lifecycle enum |
| 19 | `20260717120019_hr_payroll_lifecycle_salary_revision.sql` | `fn_process_payroll_cycle`, `fn_approve_payroll_cycle`, `fn_mark_payroll_paid`, salary revision trigger |
| 20 | `20260717120020_hr_payroll_canada_engine.sql` | Canada CPP/EI in `fn_compute_payroll`, `payroll_line_snapshots`, FL-CA01 demo seed |
| 21 | `20260717120021_hr_payroll_uat_isha_link.sql` | Link Isha FL-1042 to free CRM admin for ESS UAT (idempotent) |

## Verify

```sql
SELECT proname FROM pg_proc
WHERE proname IN (
  'fn_process_payroll_cycle',
  'fn_approve_payroll_cycle',
  'fn_mark_payroll_paid'
);

SELECT column_name FROM information_schema.columns
WHERE table_name = 'employees' AND column_name IN ('middle_name', 'payroll_country', 'salary_currency');

SELECT emp_code, staff_id IS NOT NULL AS crm_linked
FROM employees
WHERE org_id = '00000000-0000-0000-0000-0000000000f1' AND emp_code = 'FL-1042';
-- Expected: crm_linked = true

SELECT count(*) FROM payroll_line_snapshots; -- 0 until first lock
```

Or run full pack: [`hr-payroll/HR_PAYROLL_UAT_VERIFY.sql`](./hr-payroll/HR_PAYROLL_UAT_VERIFY.sql)

## Pre-UAT gate

```bash
npm run test:hr-payroll
# optional live:
HR_INTEGRATION_TEST=1 npm run test:hr-payroll
```

## UAT

- Kickoff: [`hr-payroll/HR_PAYROLL_UAT_KICKOFF.md`](./hr-payroll/HR_PAYROLL_UAT_KICKOFF.md)
- Full pack: [`hr-payroll/HR_PAYROLL_UAT.md`](./hr-payroll/HR_PAYROLL_UAT.md) — **Section I** (8 Phase 2 cases)
- Golden anchor: Isha **FL-1042** → **29.5** payable, **₹39,500** net

## Publish

Lovable → Sync from GitHub → **Publish** (latest on `feature/service-library-nav`).
