# Phase 3 RLS Baseline Snapshot

Captured at Step 0 (before `20261030120100_commission_phase3_f34_rls_remediation.sql`).  
Use this to diff policy changes and verify F3.4 acceptance criteria.

## Summary of gaps (pre-F3.4)

1. **Receipt / Phase 1 / Phase 2B tables** used `FOR ALL` with `can_view_upi_confidential` for both `USING` and `WITH CHECK` — users with commissions **view-only** could mutate financial rows.
2. **Core confidential tier** (20260604140000) split SELECT vs mutate correctly for students/invoices/cycles, but **without institution / accounting scope**.
3. **Legacy `auth_all`** on financial tables was already dropped in 20260516060234 / 20260604140000 (D-01 partially remediated).
4. **`can_view_upi_confidential`** grants all active accounting users global read regardless of `accounting_user_entity_scope`.

## Helper functions (pre-F3.4)

| Function | Purpose |
|----------|---------|
| `can_view_upi_confidential(uid)` | Admin, commission admin, any accounting user, commissions module view/edit |
| `can_manage_upi_confidential(uid)` | Admin, commission admin, commissions module **edit** only (not accounting users) |
| `is_commission_admin(uid)` | `commission_admin` role or accounting admin |
| `is_accounting_user(uid)` | Active row in `accounting_users` |

## Counselor-safe view

`v_client_commission_status` uses `security_invoker = false` — counselors read lifecycle status without amounts; must remain working after F3.4.

## Verification queries (run in Supabase SQL editor)

### V1 — List policies on commission financial tables

```sql
SELECT c.relname AS table_name, pol.polname, pol.polcmd,
       pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
       pg_get_expr(pol.polwithcheck, pol.polrelid) AS check_expr
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'upi_commission_students', 'upi_commission_invoices', 'upi_claim_cycles',
    'upi_invoice_line_items', 'upi_billing_profiles', 'upi_commission_eligibility_configs',
    'upi_commission_snapshots', 'upi_commission_transfer_events',
    'upi_commission_remittance_batches', 'upi_commission_receipts',
    'upi_commission_receipt_invoice_allocations',
    'upi_commission_receipt_student_allocations',
    'upi_commission_receipt_attachments',
    'upi_commission_aggregator_invoices', 'upi_commission_aggregator_invoice_lines'
  )
ORDER BY c.relname, pol.polname;
```

### V2 — Non-privileged user must not select students (post-F3.4)

Run as a test user with **no** commissions module permission and **no** accounting role:

```sql
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"<plain-user-uuid>"}';
SELECT count(*) FROM upi_commission_students;  -- expect 0 or permission denied
```

### V3 — View-only commissions user must not update (post-F3.4)

User with `user_module_permissions.commissions.can_view = true`, `can_edit = false`:

```sql
UPDATE upi_commission_students SET notes = 'test' WHERE false;  -- expect policy violation if attempted
```

### V4 — Counselor view still readable

Any authenticated counselor tied to a client:

```sql
SELECT * FROM v_client_commission_status WHERE client_id = '<client-uuid>' LIMIT 5;
```

## Post-F3.4 expected state

- Financial tables use `can_view_commission_financial(uid, institution_id)` / `can_manage_commission_financial(uid, institution_id)`.
- Accounting users (non-admin) scoped by `accounting_user_entity_scope` country or entity country.
- Receipt scope uses `COALESCE(context_institution_id, institution_id)`.
