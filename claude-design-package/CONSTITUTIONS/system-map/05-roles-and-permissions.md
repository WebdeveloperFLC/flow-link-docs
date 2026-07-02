# Roles & Permissions

## CRM app roles (`user_roles.role`, enum `app_role`)

`admin` / `administrator`, `counselor`, `documentation`, `telecaller`, `viewer`, `client`, `commission_admin`, `manager`.

Resolution in `AuthContext.tsx`:
- `isAdmin` = admin OR administrator
- `canEdit` / `canUpload` = admin/counselor/documentation/telecaller/commission_admin/manager
- `isClient` = only `client` role, no staff role
- `isCommissionAdmin` = commission_admin OR manager OR accounting admin

## Accounting roles (`accounting_users.role`, type `AccountingRole`)

`SUPER_ADMIN`, `FINANCE_ADMIN` (= admin), `ACCOUNTANT`, `AUDITOR`, `FINAL_AUDITOR`, `BRANCH_MANAGER`, `COMPLIANCE_OFFICER`, `VIEWER`.

Resolution in `src/accounting/hooks/usePermission.ts`:
- Admin roles get all module perms.
- Non-admins resolved from `accounting_user_module_permissions(can_view, can_edit, can_delete)` per module key (see `accountingModulePermissions.ts`).
- Entity scoping via `accounting_users.entity_scope` (array, `*` = all).

## Module permissions (CRM)

`user_module_permissions(user_id, module, can_view, can_edit, can_delete)`. Modules include: `institutions`, `commissions`, `digital_success_hub`, accounting sections.

Helper: `user_has_module(uid, module, level)`. For `accounting` → defers to `is_accounting_user`. For `commissions` → defers to `is_commission_admin` OR matrix. Else admin OR matrix.

## RLS helper functions (SECURITY DEFINER)

| Function | Returns | Used by |
|---|---|---|
| `has_role(uid, role)` | bool | almost every CRM policy |
| `is_accounting_user(uid)` | bool | accounting_* policies |
| `is_accounting_admin(uid)` | bool | accounting writes, audit |
| `is_commission_admin(uid)` | bool | upi_* policies |
| `is_telephony_admin(uid)` | bool | telephony settings |
| `user_client_permission(uid, cid)` → enum | `full`/`upload`/`edit`/`view` | client-scoped tables |
| `can_view_client`, `can_edit_client`, `can_upload_client` | bool | thin wrappers |
| `user_has_module(uid, module, level)` | bool | module-scoped tables |
| `acct_user_has_module(uid, module, level)` | bool | accounting sub-modules |
| `dsh_can(uid, level)` | bool | dsh_* policies |
| `is_team_member(uid, team)` | bool | team-shared clients |
| `is_client_staff_editor` / `is_client_staff_viewer` | bool | global staff fallback in `user_client_permission` |

## Permission paths for sensitive actions

- **Create invoice (counselor draft)**: `accounting_ar_invoices` INSERT policy `counselors create draft invoices` — status='DRAFT' + role + created_by=auth.uid().
- **Record payment**: `client_invoice_payments` requires `can_edit_client`. Triggers run as DEFINER → recompute totals regardless of role.
- **Generate receipt**: insert into `client_invoice_receipts` — RLS gated on `can_edit_client`. Trigger snapshots regardless.
- **Send notification email**: `notifications-dispatch` runs with caller JWT; recipient resolution and SMTP send are server-side and **bypass** the caller's accounting access. This is intentional so counselors without accounting visibility can still trigger emails.
- **Accounting settings**: SUPER_ADMIN / FINANCE_ADMIN only via `is_accounting_admin`.
- **Portal client**: `PortalProtectedRoute` allows roles `client` or `admin`. Portal client data resolved via `getMyPortalClientId(uid)`.

## Bootstrap behaviour

- First signup with no admin → auto-promoted to `admin` via `handle_new_user`.
- `signup_role=client` in metadata → only `client` role assigned.