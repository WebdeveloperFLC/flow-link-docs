## Goal
Stop the CRM `admin` role from automatically being a financial admin. Accounting and Commissions become their own walled gardens with their own admin roles, so an IT lead / supervisor / manager with CRM `admin` rights can run the rest of the CRM without ever seeing accounting books or commission payouts.

## New access model

Three independent admin "tracks":

| Track | Role(s) that grant full access | Scope |
|---|---|---|
| CRM admin | `user_roles.role = 'admin'` | Everything in the CRM **except** Accounting and Commissions |
| Accounting admin | `accounting_users.role in ('SUPER_ADMIN','FINANCE_ADMIN')` | Entire `/accounting/*` module |
| Commission admin | new `user_roles.role = 'commission_admin'` | Institutions → Commissions, Claims, Agreements, Invoicing |

A person can hold any combination — a CRM admin who is *also* listed in `accounting_users` keeps accounting access; a CRM admin who is *also* `commission_admin` keeps commissions. Nothing is granted just by being a CRM admin.

## What changes for the user

- `/accounting/*` routes: only accessible to a user whose auth id is in `accounting_users` with role `SUPER_ADMIN` or `FINANCE_ADMIN` (or other accounting roles they've been granted). A CRM admin with no accounting record sees a "No access" screen and the Accounting entry disappears from the sidebar.
- Institutions → Commissions / Claims / Agreements / Invoicing tabs: only visible/usable for `commission_admin` (or someone with an explicit per-section grant via the matrix we just built). CRM admin alone no longer grants this.
- `/users` Module-access matrix: `Accounting (entry)` and `Commissions & Claims` rows are removed for non-accounting/non-commission admins — those modules are no longer controlled by the CRM matrix, they're controlled by their own role tables.
- The CRM admin badge keeps full power over: Clients, Documents, Tasks, Telephony, Institutions (non-commission tabs), Assessments, Reports, Letter templates, Settings, Users & roles, per-section permissions matrix.

## Database

Additive migration only — no existing roles or policies are dropped.

1. Add `'commission_admin'` to the `app_role` enum.
2. New helper functions:
   - `public.is_accounting_user(_uid)` → true if a row in `accounting_users` with status `ACTIVE` and role in (`SUPER_ADMIN`,`FINANCE_ADMIN`,`ACCOUNTANT`,`AUDITOR`,`FINAL_AUDITOR`,`BRANCH_MANAGER`,`COMPLIANCE_OFFICER`,`VIEWER`) maps to this auth user. (Used purely as a route-gate; existing accounting RLS already enforces per-row rules.)
   - `public.is_commission_admin(_uid)` → `has_role(_uid,'commission_admin')`.
3. Update the helper added last turn:
   - `public.user_has_module(_uid, _module, _level)` — drop the blanket `has_role(_uid,'admin')` short-circuit for the two scoped modules:
     - For `_module = 'accounting'`: return `is_accounting_user(_uid)`.
     - For `_module = 'commissions'`: return `is_commission_admin(_uid)` OR explicit grant in `user_module_permissions`.
     - For every other module: behavior is unchanged (admin still full).
4. Tighten RLS on commission-related tables (`upi_commissions`, `upi_commission_students`, `upi_claims`, `upi_agreements`, `upi_agreement_versions`, `upi_ai_suggestions`, `upi_extraction_results`, `upi_uploaded_documents`) — replace any existing `has_role(...,'admin')` checks with `is_commission_admin(...) OR is_accounting_admin(...)`. CRM `admin` alone no longer satisfies these.

> Note: I'll read each table's existing policies first and rewrite them one-for-one; nothing else gets stricter.

## Frontend

**New / edited utilities**
- `src/contexts/AuthContext.tsx`
  - Add `isCommissionAdmin`, `isAccountingMember` (true if user has a row in `accounting_users`).
  - Update `canModule()` so `accounting` and `commissions` ignore the plain CRM admin flag and use the two new flags.
- `src/lib/modulePermissions.ts`
  - Remove `accounting` and `commissions` from the CRM matrix (those move to their own pages).
  - `admin` no longer auto-fills those two — irrelevant now since they're gone from the matrix.

**Route guards** (`src/App.tsx`)
- Wrap every `/accounting/*` route in a new `<RequireAccountingMember>` element. CRM admin alone gets a "You don't have access to Accounting" empty state with a link back to the CRM dashboard.
- Wrap the commissions / claims / agreements tabs inside Institutions with `<RequireCommissionAdmin>`. (Institutions itself stays open to CRM admin so they can still manage partner schools.)

**UI cleanups**
- `src/components/layout/AppLayout.tsx` (and any sidebar where Accounting / Commissions live) — show those nav entries only when the corresponding access flag is true.
- `src/institutions/components/*` — hide the Commissions / Claims / Agreements tab triggers when `!isCommissionAdmin && !isAccountingMember`.
- New page `src/pages/NoAccountingAccess.tsx` and `src/pages/NoCommissionAccess.tsx` for the gated empty states.

**Users & roles page**
- `/users` Role dropdown gets a new option **Commission admin**.
- Per-row helper text updated: "Admin = full CRM access (excludes Accounting & Commissions). Commission admin = full commission/claims access. Accounting access is managed in /accounting/settings/users."
- The Module-access dialog no longer shows the two removed rows.

## Out of scope
- No change to existing CRM admin powers outside Accounting and Commissions.
- No change to per-client sharing rules.
- No migration of historical data — just access gates and role definitions.

## Risks / things to confirm during build
- I'll read every commission-table RLS policy before rewriting it, so the existing accountant / counselor read paths remain intact.
- If your team currently relies on CRM admins logging in to view commission reports, they'll need to either be added to `accounting_users` or given the new `commission_admin` role. I'll surface this in a one-line banner on the Users page after the migration runs.