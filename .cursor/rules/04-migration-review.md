---
description: Permanent migration review gate — functions, RLS, dependencies
globs: supabase/migrations/**/*
alwaysApply: false
---

# Migration Review Gate (mandatory)

Before introducing **any** SQL function, helper, or RLS policy:

1. **Verify** whether an equivalent function already exists (`grep` migrations + `20260717120001_hr_payroll_rls.sql`).
2. **Reuse** the existing approved function whenever possible.
3. **Do not** introduce duplicate authorization helpers.
4. **Follow** the existing HR RLS pattern for all HR objects.

## Approved HR helpers (reuse — do not duplicate)

| Function | Defined in |
|----------|------------|
| `has_perm(org_id, text)` | `20260717120001_hr_payroll_rls.sql` |
| `is_hr(org_id)` | `20260717120001_hr_payroll_rls.sql` |
| `manages_employee(org_id, uuid)` | `20260717120001_hr_payroll_rls.sql` |
| `current_employee_id(org_id)` | `20260717120001_hr_payroll_rls.sql` |
| `fn_hr_actor_label()` | HR functions migrations |

**Never introduce** helpers that do not exist in repo (e.g. `current_org_id()`, `can_view_org()`).

## HR RLS pattern (training / extension history example)

```sql
-- SELECT: HR, managers, or owning employee via join
is_hr(org_id) OR EXISTS (
  SELECT 1 FROM training_records tr
  WHERE tr.id = training_extension_history.training_id
    AND (manages_employee(tr.org_id, tr.employee_id)
         OR tr.employee_id = current_employee_id(tr.org_id))
);
-- WRITE: approve permission
has_perm(org_id, 'approve')
```

## Migration Dependency Verification

Before ship, confirm in the implementation report:

| Prerequisite migration / object | Required by | Verified |
|---------------------------------|-------------|----------|
| e.g. `20260717120001` (`has_perm`) | RLS policies | ☐ |

If prerequisite may be missing in Lovable, migration must **CREATE IF NOT EXISTS** or document explicit publish order.

## Implementation report section (required)

### Existing Functions Reused

| Helper / RPC / pattern | Source migration | Reused? | Notes |
|----------------------|------------------|---------|-------|
| … | … | Yes / N/A | … |

**Statement:** List every reused helper **or** state: *No new helper functions introduced.*

Reference: `docs/engineering/04-Migration-Review-Checklist.md`.
