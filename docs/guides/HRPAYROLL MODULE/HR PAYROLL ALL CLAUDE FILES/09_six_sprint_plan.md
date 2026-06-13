# 6-Sprint Build Plan (v1)

Two-week sprints assumed. Each sprint ends with a demoable, testable slice. The ordering front-loads the engine and access model (the risky, everything-depends-on-it parts) and back-loads integrations.

---

## Sprint 1 — Foundation & identity
**Goal:** schema live, auth wired, employees CRUD, RBAC enforced.
- Apply `01_schema`, `02_rls`, `03_functions` to a Supabase project.
- Team & Roles link: `role_assignments`, `role_permissions`; `current_hr_role`/`has_perm` helpers verified.
- React app scaffold (Vite, Supabase client, TanStack Query) + `useHrAccess` hook (ports prototype `can`/`canSee`).
- Route guard; sidebar filters by screen visibility.
- **Employee Master** list + form (profile/employment/salary/statutory tabs), `manage_emp`-gated.
- Roles & Access matrix editor (permissions) writing to `role_permissions`, with lock-last-configure guard.
**Exit:** log in as each role and see correct menus; add/edit an employee; UAT section A + B1, B4.

## Sprint 2 — Time capture
**Goal:** attendance, shifts, punch→status, document storage.
- **Shift Management** CRUD.
- **Attendance** screen + **Punch Station** (self + manager edit); `fn_derive_status` trigger validated.
- ESS portal with self check-in/out.
- Supabase Storage `hr-docs`; photo + document upload via signed URLs.
- **Holidays** CRUD (branch-scoped).
**Exit:** UAT section C (all punch→status cases); B2, B3.

## Sprint 3 — The engine & payroll read path
**Goal:** payable-days engine in DB, live calculator, dashboard, verification (read), audit.
- Confirm `fn_compute_payroll` / `fn_rollup_inputs` / `fn_build_payroll_line`; load the 30-vector golden test (CI).
- **Payable Days Engine** screen calling `fn_compute_payroll` live (RPC).
- `v_payroll_preview` view; **Payroll Verification** register (read-only first), **Dashboard**, **Employee 360°**.
- Audit-log writer wrapper around mutations; **Audit Logs** screen.
**Exit:** UAT section F (30/30 vectors) + E1, E2 (Isha 29.5/₹39,500 anchor). This is the critical correctness gate.

## Sprint 4 — Workflows, approvals, lock
**Goal:** the request/approval lifecycle that feeds payroll, plus cycle lock.
- **Leave** (with `leave_balances`: accrual, validation, probation→unpaid), **Comp-Off**, **Late**, **Mispunch**, **Training**.
- Shared **approval chain** (Employee→Manager→HR) via `approvals` (config-driven; HR-single as interim toggle).
- Override flow on payroll lines; **lock/reopen** with snapshot immutability + audit.
- Server-side **export** (Excel/CSV/PDF) from `payroll_lines`.
- **Leave balances** surfaced in ESS.
**Exit:** UAT sections D + E3–E7. Closes gaps: leave balances, approval chains, lock immutability.

## Sprint 5 — Policy, config & Performance Hub
**Goal:** make rules editable; pull incentives.
- Move engine constants (late slab, mispunch free-count, leave entitlements, sandwich/UL multipliers, statutory ceilings) into `policies`; engine resolves by `effective_from`. **Policy versioning** complete.
- **Payroll & Policy Config** screen writes new policy versions.
- **Sandwich auto-calc** (detection + 2/yr cap) — schema/engine already ready.
- **Performance Hub** integration: `fn_pull_incentives(cycle_id)`; lock-time warning if unsynced incentives exist.
**Exit:** change a slab value with a future effective date and confirm only future cycles use it; incentives appear in net. Closes gaps: policy versioning, sandwich auto-calc.

## Sprint 6 — Accounting, attendance import, hardening
**Goal:** emit to Accounting, broaden attendance capture, productionise.
- **Accounting** payout batch on lock (`fn_export_accounting_batch` / `accounting_payouts`), company-split aware.
- **CSV attendance import** (Option D) with preview/diff; reject into locked ranges.
- (If hardware/SaaS chosen) biometric/vendor adapter scaffold (Option B/C).
- Performance, error states, empty states, notifications (email/in-app) for approvals.
- Full regression against UAT A–G; security review of RLS.
**Exit:** locked cycle produces an Accounting batch; bulk import works; UAT green end-to-end.

---

## Milestone view
| Sprint | Theme | Biggest risk retired |
|---|---|---|
| S1 | Foundation & RBAC | Access model correct before any data exposed |
| S2 | Time capture | Punch→status logic matches prototype |
| S3 | **Engine** | Excel parity proven (30 vectors + anchor) |
| S4 | Workflows & lock | Payroll lifecycle + immutability |
| S5 | Policy & incentives | Rules editable; Performance Hub joined |
| S6 | Accounting & import | Hand-off + multi-source attendance |

## Dependencies & sequencing rules
- Nothing reads data before **S1** RLS is correct.
- **S3 engine** must pass the golden vectors before **S4** builds workflows on top.
- **S5 policy versioning** should land before go-live if any rule is expected to change mid-year; otherwise the v1 constants (Excel-matched) are safe to ship.
- Integrations (**S5/S6**) assume payroll is already correct and lockable standalone.

## Parallelisation
With two devs: one owns the **DB/engine track** (S1 schema → S3 engine → S4 lock → S5 policy), the other owns the **React/UX track** (S1 employees → S2 attendance → S3 screens → S4 workflows). They converge each sprint at the RPC boundary.
