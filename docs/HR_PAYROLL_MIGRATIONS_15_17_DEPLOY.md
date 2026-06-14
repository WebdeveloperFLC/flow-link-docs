# HR Payroll — Deploy (Migrations 15–17)

## Shipped (agent)

| Migration | Purpose |
|-----------|---------|
| `20260717120015_hr_payroll_punch_work_date.sql` | `fn_start_attendance_day` accepts client `p_work_date` (timezone parity) |
| `20260717120016_hr_payroll_ess_self_profile.sql` | `fn_ensure_my_employee_profile` — staff self-link for ESS check-in |
| `20260717120017_hr_payroll_testing_changes.sql` | First/last name, PT columns, 2026 holidays, **OT+PT merged engine** |

**Fix in 17:** `fn_compute_payroll` now keeps OT params from migration 14 **and** adds PT — `fn_build_payroll_line` writes `pt_employee`.

## Pre-UAT gate

```bash
npm run test:hr-payroll
```

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

**Approve migrations in order (after 14):**

```
20260717120015_hr_payroll_punch_work_date.sql
20260717120016_hr_payroll_ess_self_profile.sql
20260717120017_hr_payroll_testing_changes.sql
```

If **17 was already applied** with the broken OT-less version, re-run **17** from GitHub (idempotent `CREATE OR REPLACE`).

### Verify (optional)

| Step | Expect |
|------|--------|
| ESS → **Create my employee profile** | Row linked to login; check-in works |
| Punch uses local date | `work_date` matches browser day |
| TV02 anchor | Isha FL-1042: 29.5 payable, ₹39,500 net (PT off in demo) |
| Holidays | 2026 India + Canada rows in Holidays screen |
| `npm run test:hr-payroll` | Exit 0 |

---

*Next: human UAT — `docs/hr-payroll/HR_PAYROLL_UAT.md`*
