## Root cause

`useAccountingAccess` treats "I see zero rows in `accounting_users`" as bootstrap mode and grants access. But RLS on `accounting_users` is admin-only for SELECT, so **every non-admin sees `count = 0`** and falls into the bootstrap branch → counselors/telecallers/documentation all pass the gate.

Table actually has 2 rows; the client just can't see them.

## Fix

Drop the client-side bootstrap heuristic. New rule:

- `hasAccess = isCRMAdmin || (own accounting_users row exists AND status = 'ACTIVE')`

Self-read of one's own `accounting_users` row is allowed by the existing RLS policy, so the check is reliable. CRM admins remain the bootstrap path: when the table is empty, the CRM admin (Santosh) signs in, opens Accounting → Users & roles, and creates the first Super Admin via the existing edge function (which itself gates server-side with `is_accounting_admin()`).

## Files

**Edited**
- `src/accounting/hooks/useAccountingAccess.ts` — remove the `count` query and the `isBootstrap` branch; compute `hasAccess` only from `isAdmin` + own ACTIVE row.

No other files change. `AccountingProtectedRoute`, `AppLayout`, and `App.tsx` already consume `hasAccess` correctly.

## Behavior after fix

| User | Sees Accounting? |
|---|---|
| CRM admin (Santosh) | Yes |
| User with ACTIVE row in `accounting_users` | Yes |
| Counselor / telecaller / documentation / viewer with no row | **No** (redirected to `/`) |
| SUSPENDED accounting user | No |