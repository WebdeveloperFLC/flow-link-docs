# Migration Review Checklist

| | |
|---|---|
| **Version** | 1.0 |
| **Status** | Active |
| **Applies to** | All `supabase/migrations/*.sql` |

---

## Permanent migration review gate

Before introducing **any** SQL function, helper, or RLS policy:

1. **Verify** whether an equivalent function already exists in the repo.
2. **Reuse** the existing approved function whenever possible.
3. **Do not** introduce duplicate authorization helpers.
4. **Follow** the existing HR RLS pattern for all HR objects.

---

## Pre-ship checklist

- [ ] Migration filename timestamp ordering is correct
- [ ] One approved concern per migration file
- [ ] DDL is idempotent (`IF NOT EXISTS`, `CREATE OR REPLACE`)
- [ ] No `fn_compute_payroll` or payroll engine changes (unless approved)
- [ ] Functions granted to `authenticated` where needed
- [ ] **Existing Functions Reused** section completed (below)
- [ ] **Migration Dependency Verification** completed (below)
- [ ] Contract test updated in `qa/hr-payroll/module-contract.test.ts` when HR migration added
- [ ] **Legacy / optional object guard:** if migration touches a retired or module-optional table, wrap DDL in `to_regclass('public.table') IS NOT NULL` (see `20260722120000`, `20261101120100`)

---

## Legacy and retired objects

If a migration references a table that was **retired** in an earlier migration (example: `service_catalogue` dropped in `20260610190000`), do **not** bare-`ALTER` it.

Use:

```sql
DO $$
BEGIN
  IF to_regclass('public.legacy_table') IS NOT NULL THEN
    -- legacy compatibility DDL
  END IF;
END $$;
```

For **required** core objects, fail loudly — do not guard away real missing prerequisites.

---

## Approved HR authorization helpers

Source of truth: `supabase/migrations/20260717120001_hr_payroll_rls.sql`

| Function | Purpose |
|----------|---------|
| `has_perm(org_id, text)` | RBAC permission check |
| `is_hr(org_id)` | HR role membership |
| `manages_employee(org_id, employee_id)` | Manager scope |
| `current_employee_id(org_id)` | ESS actor employee row |
| `fn_hr_actor_label()` | Audit actor display name |

**Do not introduce** undefined helpers (lesson: `current_org_id()`, `can_view_org()` caused publish failures).

---

## HR RLS pattern reference

Match patterns in `20260717120001_hr_payroll_rls.sql`:

- **Training records:** `train_select` / `train_write`
- **Leave / comp-off / late / mispunch:** request select/insert/update with `has_perm(org_id,'approve')`
- **Extension history:** join to `training_records` for employee scope; write via `has_perm(org_id,'approve')`

---

## Required report section: Existing Functions Reused

Include in every implementation report that touches SQL:

### Existing Functions Reused

| Helper / RPC / pattern | Source migration or file | Reused? | Notes |
|------------------------|--------------------------|---------|-------|
| `has_perm(org_id, 'approve')` | `20260717120001_hr_payroll_rls.sql` | Yes | RLS write policy |
| … | … | Yes / N/A | … |

**Statement:** *No new helper functions introduced.* — or list each new function with architect approval reference.

### Example (training extension fix)

| Helper | Source | Reused? |
|--------|--------|---------|
| `has_perm` | `20260717120001` | Yes |
| `is_hr` | `20260717120001` | Yes |
| `manages_employee` | `20260717120001` | Yes |
| `current_employee_id` | `20260717120001` | Yes |
| `current_org_id()` | — | **Removed — never existed** |

---

## Required report section: Migration Dependency Verification

| Prerequisite | Object / function needed | Required by this migration | Publish order | Self-contained fallback? |
|--------------|--------------------------|----------------------------|---------------|--------------------------|
| `20260717120001_hr_payroll_rls.sql` | `has_perm`, `is_hr` | RLS policies | Before feature migrations | No — must publish RLS first |
| `20260724120000_hr_training_completion_workflow.sql` | `training_extension_history` table | Extension history inserts | Before or same as 422 | Yes — 422 may `CREATE TABLE IF NOT EXISTS` |

If prerequisite is often unpublished in Lovable, migration **must** include catch-up DDL or document explicit owner publish steps.

---

## Independent migration tracks (example)

| Migration | Track | Must not overlap |
|-----------|-------|------------------|
| `20260739120000` | Employee contact SSOT | — |
| `20260740120000` | UAT WRE clock-out | Contact columns |
| `20260742120000` | Clarify workflow | Payroll engine |
| `20260742220000` | Training extension | New auth helpers |
