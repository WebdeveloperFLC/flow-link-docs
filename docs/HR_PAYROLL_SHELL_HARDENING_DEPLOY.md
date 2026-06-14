# HR Payroll — Shell hardening deploy

## Shipped (agent)

| Item | Change |
|------|--------|
| Error boundary | `HrModuleErrorBoundary` — screen crashes show recoverable message |
| Access denied UX | Clear card when role cannot open a screen (no blank redirect loop) |
| RBAC resilience | Graceful fallback when `role_assignments` / `payroll_cycles` queries fail |
| Screen fallback | Empty RBAC row → default screens for selected role |
| Integration smoke | Placeholder URL/key detection; service role for TV02 data checks |
| AI test guide | Correct `.env` usage (no literal `xxx.supabase.co` in shell) |
| Migration fix | `20260717120008` — drop stale `hr_demo_update_*` before recreate |

## Pre-UAT gate

```bash
npm run test:hr-payroll
```

Optional live DB (staging, after migrations 00–17):

```bash
HR_INTEGRATION_TEST=1 npm run test:hr-payroll
# + SUPABASE_SERVICE_ROLE_KEY for employee count + TV02 assertions
```

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

**Approve migration if pending:**

```
20260717120008_hr_payroll_demo_rls_bootstrap.sql
```

(Re-run safe on demo org — idempotent policy bootstrap.)

### Verify (optional)

| Step | Expect |
|------|--------|
| `/hr` as Employee | My Portal loads; restricted screens show access card |
| `/hr/payroll/...` as Employee | Redirect or access card (not white screen) |
| Force bad screen URL | Error boundary message + Try again |
| `npm run test:hr-payroll` | Exit 0 |

---

*Next: human UAT via `docs/hr-payroll/HR_PAYROLL_UAT.md` when demo seed + migrations are live.*
