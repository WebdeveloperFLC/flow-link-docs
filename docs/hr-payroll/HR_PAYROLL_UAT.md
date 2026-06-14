# HR Payroll — User Acceptance Testing (UAT)

**Environment:** Staging / Lovable preview after HR Payroll v1 publish  
**Full setup & workflow:** [`../guides/hr-payroll-uat-guide.md`](../guides/hr-payroll-uat-guide.md) — in-app **Guide → HR Payroll UAT** (`/guides/hr-payroll-uat`)  
**Tester quick start:** [`HR_PAYROLL_TESTER_QUICKSTART.md`](./HR_PAYROLL_TESTER_QUICKSTART.md)  
**Demo org:** `00000000-0000-0000-0000-0000000000f1`  
**Demo cycle:** 26 May 2026 – 25 Jun 2026  
**Screenshot folder:** `uat-screenshots/hr-payroll/`  
**Screenshot format:** `HR-UAT-{TestCaseID}_{YYYYMMDD}.png`

---

## Global preconditions

- Migrations `20260717120000` through `20260717120020` applied; Lovable Publish complete.
- Demo seed (migrations 03 + 07) loaded.
- HR module visible in sidebar (module permission or admin).
- At least one user with **HR Manager** in `/hr/roles` → Team & CRM.

---

## Section A — Setup & shell

### HR-UAT-SETUP-001 — Demo data loaded

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-SETUP-001 |
| **Preconditions** | Global preconditions met. |
| **Steps** | 1. SQL: `SELECT count(*) FROM employees WHERE org_id = '00000000-0000-0000-0000-0000000000f1';`<br>2. SQL: Isha payroll line query from UAT guide Phase 3.2. |
| **Expected Result** | 5 employees. Isha: payable **29.5**, net **39500**. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-SHELL-001 — HR module entry

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-SHELL-001 |
| **Preconditions** | Logged in as user with HR Payroll module access. |
| **Steps** | 1. Click **HR Payroll** in CRM sidebar.<br>2. Confirm `/hr` loads (not white blank screen). |
| **Expected Result** | Standalone HR layout with sidebar, top bar, dashboard content. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-SHELL-002 — Navigation coverage

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-SHELL-002 |
| **Preconditions** | View-as **HR Manager**. |
| **Steps** | 1. Click each sidebar group item once (Dashboard, ESS, Employees, Verify, Attendance, Leave, Roles). |
| **Expected Result** | Each route renders without crash; breadcrumb title updates. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

---

## Section B — RBAC & access

### HR-UAT-RBAC-001 — Employee role screens

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-RBAC-001 |
| **Preconditions** | View-as **Employee**. |
| **Steps** | 1. Review sidebar.<br>2. Try URL `/hr/payroll` directly. |
| **Expected Result** | Only ESS, Leave, Comp-Off, Late, Mispunch, Holidays visible. Redirect or empty if verify URL forced. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-RBAC-002 — Manager scope

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-RBAC-002 |
| **Preconditions** | View-as **Manager**. |
| **Steps** | 1. Open `/hr/leave`.<br>2. Open `/hr/config`. |
| **Expected Result** | Leave visible with team items; Config blocked/hidden. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-RBAC-003 — HR Executive no override

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-RBAC-003 |
| **Preconditions** | View-as **HR Executive**. |
| **Steps** | 1. Open `/hr/payroll`.<br>2. Inspect row actions. |
| **Expected Result** | View + export allowed; **Override** control absent. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-RBAC-004 — HR Manager override

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-RBAC-004 |
| **Preconditions** | View-as **HR Manager**; cycle Draft. |
| **Steps** | 1. Open `/hr/payroll`.<br>2. Override one counter on Karan; save.<br>3. Check Audit log. |
| **Expected Result** | Line marked overridden; net recalculates; audit entry written. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-RBAC-005 — Live permission matrix

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-RBAC-005 |
| **Preconditions** | View-as **Admin**; `/hr/roles` → Action Permissions. |
| **Steps** | 1. Grant Manager role `export`.<br>2. Switch View-as to Manager; open Verify. |
| **Expected Result** | Export buttons appear without page reload beyond context switch. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-RBAC-006 — Lock last configure

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-RBAC-006 |
| **Preconditions** | View-as **Admin**; only one role has Configure. |
| **Steps** | 1. Try revoke Configure from that role in matrix. |
| **Expected Result** | Blocked with lock-last-configure message. |
| **Screenshot Required** | No |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-RBAC-007 — ESS self RLS

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-RBAC-007 |
| **Preconditions** | Login linked to Isha via `staff_id`; View-as Employee. |
| **Steps** | 1. Open `/hr/me`.<br>2. Confirm only own payroll line visible in ESS salary section. |
| **Expected Result** | Isha data shown; no other employee net pay exposed. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

---

## Section C — Employee master & CRM team

### HR-UAT-EMP-001 — Salary component auto-fill

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-EMP-001 |
| **Preconditions** | View-as HR Manager; `/hr/employees`. |
| **Steps** | 1. Add employee; enter monthly gross ₹40,000 only.<br>2. Review components. |
| **Expected Result** | Basic 50%, HRA 20%, Conveyance ₹1600, Special = remainder. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-EMP-002 — Import from CRM

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-EMP-002 |
| **Preconditions** | Unlinked CRM user exists. |
| **Steps** | 1. `/hr/employees` → **Import from CRM**.<br>2. Import one user. |
| **Expected Result** | Draft employee created with new FL-xxxx code; appears in master list. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-EMP-003 — Link CRM login

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-EMP-003 |
| **Preconditions** | Employee without `staff_id`. |
| **Steps** | 1. Edit employee → Employment → select CRM login → Save. |
| **Expected Result** | `staff_id` saved; ESS works for that login. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-EMP-004 — Document upload

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-EMP-004 |
| **Preconditions** | Migration 10 applied; manageEmp permission. |
| **Steps** | 1. Open Isha detail → Documents tab.<br>2. Upload PDF.<br>3. Open/download. |
| **Expected Result** | File in `hr-docs` bucket; metadata row; signed URL opens. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-EMP-005 — Team & CRM assign role

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-EMP-005 |
| **Preconditions** | Configure permission. |
| **Steps** | 1. `/hr/roles` → Team & CRM.<br>2. Assign **HR Executive** to a CRM user. |
| **Expected Result** | Role saved; user appears with HR role on reload. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

---

## Section D — Attendance & punch

### HR-UAT-ATT-001 — ESS check-in

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-ATT-001 |
| **Preconditions** | ESS linked employee; apply permission. |
| **Steps** | 1. `/hr/me` → Punch station → Check in today. |
| **Expected Result** | Today row Present with check-in time. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-ATT-002 — Grace window present

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-ATT-002 |
| **Preconditions** | HR Manager; `/hr/attendance`. |
| **Steps** | 1. Edit today for employee: in 10:03, out 19:05. |
| **Expected Result** | Present (within 5m grace). |
| **Screenshot Required** | No |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-ATT-003 — Late half day

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-ATT-003 |
| **Preconditions** | Priya 10 Jun row exists. |
| **Steps** | 1. Confirm attendance shows Half Day for 11:12 check-in. |
| **Expected Result** | Status Half Day per shift half_day_after_min. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-ATT-004 — Mispunch detection

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-ATT-004 |
| **Preconditions** | Isha 05 Jun row (in only). |
| **Steps** | 1. View attendance grid for Isha. |
| **Expected Result** | Mispunch flag set; not silent Absent. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-ATT-005 — Manual leave preserved

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-ATT-005 |
| **Preconditions** | Day marked Leave. |
| **Steps** | 1. Add punches to Leave day.<br>2. Save. |
| **Expected Result** | Status stays Leave (manual statuses preserved). |
| **Screenshot Required** | No |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-ATT-006 — Break duration

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-ATT-006 |
| **Preconditions** | Row with break start/end. |
| **Steps** | 1. Verify break_min derived (~45m demo rows). |
| **Expected Result** | break_min matches end − start. |
| **Screenshot Required** | No |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-ATT-007 — Edit rebuilds payroll

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-ATT-007 |
| **Preconditions** | Draft cycle. |
| **Steps** | 1. Note Karan payable days.<br>2. Change attendance; rebuild line.<br>3. Compare register. |
| **Expected Result** | Payable days update when line rebuilt. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-ATT-008 — CSV import

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-ATT-008 |
| **Preconditions** | `/hr/import` access. |
| **Steps** | 1. Paste sample CSV from import page placeholder.<br>2. Preview → Import. |
| **Expected Result** | Rows upserted with source=import; audit entry. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

---

## Section E — Workflows

### HR-UAT-WF-001 — Approve sick leave

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-WF-001 |
| **Preconditions** | Karan pending sick leave. |
| **Steps** | 1. `/hr/leave` → Approve.<br>2. Rebuild Karan payroll line. |
| **Expected Result** | paid_leaves increases; payable adjusts; audit row. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-WF-002 — Comp-off approved

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-WF-002 |
| **Preconditions** | Karan comp-off Approved in seed. |
| **Steps** | 1. Verify comp_off in Karan payroll line ≥ 1. |
| **Expected Result** | Comp-off feeds payable add-back. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-WF-003 — Late exemption

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-WF-003 |
| **Preconditions** | Priya late exemption pending. |
| **Steps** | 1. Approve exemption.<br>2. Rebuild Priya line. |
| **Expected Result** | Late count reduced before slab. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-WF-004 — Mispunch correction

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-WF-004 |
| **Preconditions** | Approved mispunch for Karan 05 Jun. |
| **Steps** | 1. Rebuild Isha/Karan lines.<br>2. Confirm mispunch deduction respects 2-free rule. |
| **Expected Result** | Approved mispunch reduces mispunch_count in rollup. |
| **Screenshot Required** | No |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-WF-005 — Training unpaid days

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-WF-005 |
| **Preconditions** | Imran unpaid training record (seed). |
| **Steps** | 1. Inspect Imran line unpaid_training field. |
| **Expected Result** | Unpaid training days reduce payable when applicable. |
| **Screenshot Required** | No |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-WF-006 — Reject leave

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-WF-006 |
| **Preconditions** | Pending leave exists. |
| **Steps** | 1. Reject leave.<br>2. Rebuild line. |
| **Expected Result** | paid_leaves unchanged; status Rejected. |
| **Screenshot Required** | No |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

---

## Section F — Payroll verification & lock

### HR-UAT-PAY-001 — Register totals

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-PAY-001 |
| **Preconditions** | HR Manager; `/hr/payroll`. |
| **Steps** | 1. Open register.<br>2. Sum net column vs dashboard liability. |
| **Expected Result** | Totals foot; all 5 employees listed. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-PAY-002 — TV02 golden anchor (Isha)

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-PAY-002 |
| **Preconditions** | Fresh seed; cycle Draft. |
| **Steps** | 1. Locate Isha (FL-1042) in register. |
| **Expected Result** | Payable **29.5** days; Net **₹39,500** (Excel TV02 parity). |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-PAY-003 — Override and revert

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-PAY-003 |
| **Preconditions** | Override permission. |
| **Steps** | 1. Override Sneha UL=1.<br>2. Clear override.<br>3. Check audit. |
| **Expected Result** | Net changes then restores; both audited. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-PAY-004 — Lock cycle

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-PAY-004 |
| **Preconditions** | Approve permission; cycle Draft. |
| **Steps** | 1. Lock cycle from Verify page. |
| **Expected Result** | Status Locked; override disabled; lines frozen. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-PAY-005 — Locked snapshot

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-PAY-005 |
| **Preconditions** | Cycle Locked. |
| **Steps** | 1. Edit attendance for locked period.<br>2. Reload register. |
| **Expected Result** | Locked payroll line unchanged. |
| **Screenshot Required** | No |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-PAY-006 — Export register

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-PAY-006 |
| **Preconditions** | Export permission. |
| **Steps** | 1. Export CSV from Verify.<br>2. Open file. |
| **Expected Result** | Columns match on-screen register incl. branch/company. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-PAY-007 — Salary slip PDF

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-PAY-007 |
| **Preconditions** | Export permission. |
| **Steps** | 1. Print salary slip for Isha from Verify or ESS. |
| **Expected Result** | PDF opens with earnings/deductions matching line. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-PAY-008 — Accounting batch export

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-PAY-008 |
| **Preconditions** | Locked cycle. |
| **Steps** | 1. Export accounting batch RPC/UI.<br>2. SQL: `SELECT count(*) FROM accounting_payouts WHERE cycle_id = …` |
| **Expected Result** | 5 payout rows; batch_id populated. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-PAY-009 — Calculator RPC parity

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-PAY-009 |
| **Preconditions** | `/hr/calculator`. |
| **Steps** | 1. Enter Isha-equivalent inputs (30 days, ₹42k, mispunch 3, etc.). |
| **Expected Result** | Net matches register within ₹0 (engine is Postgres-only). |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

---

## Section G — Statutory & engine

### HR-UAT-STAT-001 — PF cap

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-STAT-001 |
| **Preconditions** | Calculator or line with basic > ₹15,000. |
| **Steps** | 1. PF applicable; basic ₹30,000 monthly. |
| **Expected Result** | PF employee = ₹1,800 (12% of ₹15,000 wage cap). |
| **Screenshot Required** | No |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-STAT-002 — ESIC threshold

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-STAT-002 |
| **Preconditions** | Calculator. |
| **Steps** | 1. Gross ₹42,000 ESIC on.<br>2. Gross ₹18,000 ESIC on. |
| **Expected Result** | ₹42k → ESIC 0; ₹18k → 0.75% deducted. |
| **Screenshot Required** | No |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-STAT-003 — PF off

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-STAT-003 |
| **Preconditions** | Calculator. |
| **Steps** | 1. Disable PF applicable. |
| **Expected Result** | PF employee = 0. |
| **Screenshot Required** | No |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

### HR-UAT-STAT-004 — Late slab sample

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-STAT-004 |
| **Preconditions** | Calculator. |
| **Steps** | 1. late=4 → deduction 0.5; late=10 → 1.5 (Excel nested-IF slab). |
| **Expected Result** | Matches `fn_late_deduction` outputs exactly. |
| **Screenshot Required** | No |
| **Pass / Fail** | ☐ Pass ☐ Fail |
| **Notes** | |
| **Bug Severity** | |
| **Reproducible** | ☐ Yes ☐ No |

---

## Section H — OT, lock polish & v1.1

### HR-UAT-PAY-010 — PDF register export

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-PAY-010 |
| **Preconditions** | Export permission; register loaded. |
| **Steps** | 1. Click **↓ PDF Register** on Verify.<br>2. Print preview opens. |
| **Expected Result** | All rows match on-screen register; Locked badge if cycle locked. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |

### HR-UAT-PAY-011 — Batch salary slips PDF

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-PAY-011 |
| **Preconditions** | Export permission. |
| **Steps** | 1. Click **↓ All Slips PDF**.<br>2. Review print preview (one page per employee). |
| **Expected Result** | Each slip net matches register line. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |

### HR-UAT-PAY-012 — Reopen with audit reason

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-PAY-012 |
| **Preconditions** | Cycle Locked; configure or approve role. |
| **Steps** | 1. Click Reopen; enter reason.<br>2. Check `/hr/audit`. |
| **Expected Result** | Cycle Draft; audit shows reason text. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |

### HR-UAT-LOCK-001 — Attendance frozen when locked

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-LOCK-001 |
| **Preconditions** | Cycle Locked. |
| **Steps** | 1. ESS or Attendance: try punch/edit a date inside locked cycle. |
| **Expected Result** | Error: attendance frozen for that date. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |

### HR-UAT-OT-001 — OT minutes on attendance

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-OT-001 |
| **Preconditions** | Employee with full in/out punches exceeding shift target. |
| **Steps** | 1. Open `/hr/attendance` for employee.<br>2. Check OT column and summary stat. |
| **Expected Result** | OT minutes shown (display metric). |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |

### HR-UAT-OT-002 — OT display mode (TV02 unchanged)

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-OT-002 |
| **Preconditions** | Config → Overtime mode = **display** (demo default). |
| **Steps** | 1. Rebuild Isha line if Draft.<br>2. Confirm net **₹39,500**, payable **29.5**. |
| **Expected Result** | OT minutes may show; **ot_pay = 0**; TV02 anchor unchanged. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |

### HR-UAT-OT-003 — OT paid mode

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-OT-003 |
| **Preconditions** | Config → Overtime mode = **paid**; employee with ≥30 OT minutes. |
| **Steps** | 1. Save OT policy.<br>2. Rebuild payroll line.<br>3. Calculator with same OT minutes. |
| **Expected Result** | `ot_pay` > 0; net increases; calculator matches RPC. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |

### HR-UAT-WF-001 — Approval chain stages

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-WF-001 |
| **Preconditions** | Pending leave with reporting manager. |
| **Steps** | 1. View-as Manager → Approve leave.<br>2. View-as HR Manager → Approve.<br>3. Check stage badges. |
| **Expected Result** | Manager ✓ then HR ✓; status Approved after final stage. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |

---

## Section I — Phase 2 add-up (migrations 18–20)

### HR-UAT-P2-001 — Employee profile fields

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-P2-001 |
| **Preconditions** | View-as HR Manager; migration 18 applied. |
| **Steps** | 1. `/hr/employees` → Edit any employee.<br>2. Set middle name, marital status, 2 emergency contacts, CAD currency if Canada branch.<br>3. Save and reopen detail modal. |
| **Expected Result** | All fields persist; full name includes middle name; company shows legal name when set. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |

### HR-UAT-P2-002 — Shift working days 1–7

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-P2-002 |
| **Preconditions** | View-as HR Manager. |
| **Steps** | 1. `/hr/shifts` → Edit Day Shift.<br>2. Set **Working Days / Week** to 5.<br>3. Assign employee to that shift; check employee shift tab. |
| **Expected Result** | Shift card shows 5 days / 2 weekly off; employee form shows leave entitlement derived from shift (5-Day). |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |

### HR-UAT-P2-003 — Payroll lifecycle Process → Approve → Lock

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-P2-003 |
| **Preconditions** | Cycle status **Draft**; View-as HR Manager on `/hr/payroll`. |
| **Steps** | 1. Click **1. Process** → status **Processed**.<br>2. Click **2. Approve** → status **Approved**.<br>3. Click **3. Lock** → status **Locked**; sidebar shows Locked. |
| **Expected Result** | Each step succeeds; overrides disabled when locked; attendance frozen for cycle dates. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |

### HR-UAT-P2-004 — Mark paid + reopen

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-P2-004 |
| **Preconditions** | Cycle **Locked** from P2-003. |
| **Steps** | 1. Click **Mark paid** → status **Paid**.<br>2. Reopen cycle with reason (if exposed) or SQL reopen RPC.<br>3. Confirm status returns **Draft**. |
| **Expected Result** | Paid timestamp set; reopen restores Draft and allows edits. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |

### HR-UAT-P2-005 — Leave rejection reason

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-P2-005 |
| **Preconditions** | Pending leave request exists. |
| **Steps** | 1. `/hr/leave` → Reject with reason "Insufficient balance".<br>2. View row as employee (View-as). |
| **Expected Result** | Status Rejected; rejection reason visible on row. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |

### HR-UAT-P2-006 — Document verification

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-P2-006 |
| **Preconditions** | Employee with uploaded document. |
| **Steps** | 1. Employee detail → Documents tab.<br>2. Click **Verify** on a document.<br>3. Upload second doc → **Reject** with remarks. |
| **Expected Result** | Status badges Verified / Rejected; remarks shown. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |

### HR-UAT-P2-007 — Canada payroll (FL-CA01)

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-P2-007 |
| **Preconditions** | Employee **FL-CA01** exists (migration 20 seed); cycle Draft. |
| **Steps** | 1. Filter register by **Canada** branch.<br>2. Rebuild line; confirm columns **CPP / EI / Tax+**.<br>3. Net ≈ gross − CPP − EI (CA$4,500 → ~CA$4,157 at default rates). |
| **Expected Result** | Canada mapping correct; no PF/ESIC/PT for INR rules on CA employee. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |

### HR-UAT-P2-008 — ESS attendance status

| Field | Value |
|-------|-------|
| **Test Case ID** | HR-UAT-P2-008 |
| **Preconditions** | ESS user linked to employee; shift assigned. |
| **Steps** | 1. `/hr/ess` before punch → **Not checked in**.<br>2. Check in → **Available**.<br>3. Start break → **On break**.<br>4. Check out → **Checked out**. |
| **Expected Result** | Status badge updates on each punch state. |
| **Screenshot Required** | Yes |
| **Pass / Fail** | ☐ Pass ☐ Fail |

---

*End of HR Payroll UAT pack — 58 cases (50 v1 + 8 Phase 2).*
