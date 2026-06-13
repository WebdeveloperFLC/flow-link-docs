# CRM Integration Spec (v1)

How the HRMS/Payroll module wires into the existing CRM. Three integration surfaces: **Team & Roles** (identity/RBAC), **Performance Hub** (incentives), **Accounting** (payout & statutory ledgers).

---

## 1. Team & Roles (identity + access)

**Goal:** one person = one CRM identity. HR roles extend, not replace, the CRM's existing membership.

| Concern | Approach |
|---|---|
| Identity link | `employees.staff_id` → CRM staff/auth `user.id`. Provisioned when HR links an employee to a login. Nullable until then. |
| Role source | `role_assignments(org_id, staff_id, role)` holds the HR role. The CRM's own org-membership remains authoritative for "is this person in the org at all". |
| Permission resolution | `role_permissions` + `role_permissions.screens` mirror the prototype's editable matrix. RLS helper `has_perm()` reads it. |
| Branch scoping | `role_assignments.scope_branch_id` optionally restricts a Manager/HR Exec to one branch. RLS `manages_employee` already respects reporting lines; extend with branch filter in v1.1 if needed. |
| SSO/session | Reuse CRM Supabase auth session. No separate login. `auth.uid()` is the join key throughout RLS. |

**Sync contract**
- On CRM staff create → optionally auto-create a draft `employees` row (HR completes profile). Decide: push (CRM webhook) vs pull (HR "import from CRM" button). **Recommend pull for v1** to avoid half-populated employees.
- On CRM staff deactivate → set `employees.status = 'Resigned'/'Terminated'`; do **not** delete (payroll history must survive).

**Build note:** the prototype's role matrix (screen 17) maps 1:1 to `role_permissions`. Port the toggle UI; back it with `rp_write` RLS (configure-gated) and the lock-last-configure guard already proven in the prototype.

---

## 2. Performance Hub (incentives)

**Goal:** incentive amounts computed in Performance Hub land in the right payroll line for the right cycle, without double entry.

| Concern | Approach |
|---|---|
| Data flow | Performance Hub is the source of incentive/bonus figures. HRMS consumes them per employee per cycle. |
| Where it lands | `payroll_lines.incentive` / `.bonus` (per-cycle), overriding `employees.incentive` (the standing default). |
| Mechanism | A nightly/manual sync RPC `fn_pull_incentives(cycle_id)` reads Performance Hub's payout table (or a shared view) and stamps the matching `payroll_lines`. Re-runnable while cycle is Draft. |
| Identity match | Join on `employees.staff_id = performance.staff_id`. |
| Timing | Incentives must be pulled **before** payroll lock. UAT step checks that locking warns if a newer incentive exists unsynced. |
| Audit | Each pull writes `audit_log` rows ("Incentive synced · ₹x · <emp>"). |

**Contract (shared view Performance Hub exposes):**
```
v_incentive_payouts(org_id, staff_id, cycle_label | period_start, period_end, incentive_amount, bonus_amount, status)
```
HRMS reads `status = 'Approved'` only. If Performance Hub uses different period boundaries than the payroll cycle, map by overlap and flag mismatches for HR.

**Net formula already accommodates this:** `Net = Gross + Incentive + Bonus − PF − ESIC`. Incentive/bonus are additive post-gross, so syncing them never disturbs payable-days maths.

---

## 3. Accounting (payout + statutory)

**Goal:** an approved (locked) payroll cycle produces a clean, immutable hand-off to Accounting for disbursement and statutory filing.

| Concern | Approach |
|---|---|
| Trigger | On `payroll_cycles.status → Locked`, emit a payout batch. |
| What Accounting receives | Per-employee: net payable, gross, PF (employee + employer if added v1.1), ESIC, incentive, bonus, plus org/branch/company split. |
| Mechanism | `fn_export_accounting_batch(cycle_id)` returns a structured JSON/CSV; or write to a shared `accounting_payouts` table the Accounting module reads. |
| Company split | `employees.company_id` lets Accounting post against the correct legal entity (FL Pvt. Ltd. vs FL Academic). |
| Immutability | Locked lines are snapshotted; Accounting always reconciles against the frozen `payroll_lines`, never a live recompute. |
| Statutory ledgers | PF/ESIC employee deductions flow as line items; employer contributions are **out of scope v1** (see statutory scope doc). |
| Reversal | If a locked cycle must be corrected, Accounting integration requires an explicit "reopen + re-export" with a superseding batch id and an audit entry. No silent edits. |

**Contract (HRMS → Accounting):**
```
accounting_payouts(
  batch_id, cycle_id, org_id, company_id, branch_id,
  employee_code, employee_name,
  gross_earned, incentive, bonus, pf_employee, esic_employee, net_salary,
  generated_at, status  -- 'Pending' → 'Disbursed'
)
```

---

## 4. Integration sequencing
1. **S1** — Team & Roles link (`staff_id`, `role_assignments`) — required before any RLS works.
2. **S5** — Performance Hub incentive pull.
3. **S6** — Accounting payout batch on lock.

Performance Hub and Accounting are deliberately last: payroll must be correct and lockable on its own first, then enrich (incentives) and emit (accounting).

## 5. Open decisions for your team
- Push vs pull for Team & Roles employee creation (recommended: pull).
- Does Performance Hub already expose an approved-incentive view, or must we build `v_incentive_payouts`?
- Does Accounting want a table write or a file/RPC pull? Affects whether HRMS owns `accounting_payouts`.
- Employer PF/ESIC contributions: confirm out-of-scope for v1 (doc assumes yes).
