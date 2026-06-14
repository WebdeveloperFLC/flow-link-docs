# HR Payroll — Full UAT & Testing Guide

**Audience:** QA / UAT team, DevOps, UAT lead  
**Purpose:** Single checklist to set up staging, run all **58** HR Payroll test cases, log defects, and sign off — so engineering can proceed to production hardening.

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Date** | June 2026 |
| **Environment** | Staging / Lovable preview only — **not production** |
| **Demo org ID** | `00000000-0000-0000-0000-0000000000f1` |
| **Demo payroll cycle** | 26 May 2026 – 25 Jun 2026 (30 days) |
| **Golden anchor** | Isha Sikligar (FL-1042): **29.5** payable days, **₹39,500** net |

> **START HERE:** Complete **Phase 1 → Phase 4** before testers run cases. Phase 5 is execution. Phase 6 is sign-off. Do not skip setup.

---

## Document map (repository)

| File | Use |
|------|-----|
| **This guide** | `docs/guides/hr-payroll-uat-guide.md` — setup + workflow (in-app: **Guide → HR Payroll UAT**) |
| Test case pack (58 cases) | `docs/hr-payroll/HR_PAYROLL_UAT.md` |
| **UAT kickoff** | `docs/hr-payroll/HR_PAYROLL_UAT_KICKOFF.md` |
| Tester quick reference | `docs/hr-payroll/HR_PAYROLL_TESTER_QUICKSTART.md` |
| Defect log | `docs/hr-payroll/HR_PAYROLL_DEFECT_TRACKER.csv` |
| **Progress tracker** | `docs/hr-payroll/HR_PAYROLL_UAT_PROGRESS.csv` |
| **SQL verify script** | `docs/hr-payroll/HR_PAYROLL_UAT_VERIFY.sql` — run before Phase 5 |
| Sign-off form | `docs/hr-payroll/HR_PAYROLL_UAT_SIGNOFF.md` |
| Prototype reference | `docs/guides/hrms-full-prototype.html` |
| Business rules / TV02 | `docs/guides/HRPAYROLL MODULE/HR PAYROLL ALL CLAUDE FILES/03_business_rules_and_test_vectors.md` |

**Screenshot folder:** `uat-screenshots/hr-payroll/`  
**Screenshot naming:** `HR-UAT-{TestCaseID}_{YYYYMMDD}.png` (example: `HR-UAT-PAY-002_20260615.png`)

---

## Roles & ownership

| Role | Responsibility |
|------|----------------|
| **DevOps / Engineering** | Apply migrations 00–22, publish Lovable build, run demo seed SQL, smoke checklist |
| **Admin (existing staff)** | CRM roles via `/users`; HR module roles via `/hr/roles` → **Team & CRM** |
| **UAT testers** | Execute `HR_PAYROLL_UAT.md` cases, screenshots, pass/fail |
| **UAT lead** | Maintain defect tracker, triage severity, complete sign-off form |

---

## Phase 1 — Deploy build & migrations

**Owner:** Engineering / DevOps  
**Environment:** Staging Supabase + Lovable

### 1.1 Sync code

- Merge latest `feature/service-library-nav` (or release branch) into the Lovable project.
- **Lovable → Publish** frontend when migrations below are applied.

### 1.2 Apply database migrations (order matters)

Run in Supabase **SQL Editor** or Lovable **Database → Migrations**.

| Order | Migration file | Purpose |
|------:|----------------|---------|
| 1 | `20260717120000_hr_payroll_schema.sql` | Tables, enums, indexes |
| 2 | `20260717120001_hr_payroll_rls.sql` | RLS helpers + policies |
| 3 | `20260717120002_hr_payroll_functions.sql` | Payroll engine (`fn_compute_payroll`, rollup, triggers) |
| 4 | `20260717120003_hr_payroll_seed_demo.sql` | Baseline demo (5 employees, 1 cycle) |
| 5 | `20260717120005_hr_payroll_workflows.sql` | Lock/reopen, override RPCs |
| 6 | `20260717120006_hr_payroll_integrations.sql` | Incentive pull + accounting batch |
| 7 | `20260717120007_hr_payroll_full_demo_seed.sql` | Full field enrich + policies |
| 8 | `20260717120008_hr_payroll_demo_rls_bootstrap.sql` | Demo org read bootstrap |
| 9 | `20260717120009_hr_payroll_crm_team_integration.sql` | CRM Team & Roles RPCs |
| 10 | `20260717120010_hr_payroll_storage.sql` | `hr-docs` bucket (document upload) |
| 11 | `20260717120011_hr_payroll_leave_workflow.sql` | Leave balance, accrual, sandwich, RBAC reset |
| 12 | `20260717120012_hr_payroll_policy_engine_approvals.sql` | Policy engine, approval chains, preview view |
| 13 | `20260717120013_hr_payroll_lock_export_punch.sql` | Lock snapshot, export RPC, punch guards |
| 14 | `20260717120014_hr_payroll_overtime_pay.sql` | OT roll-up + paid/display policy (v1.1) |
| 15 | `20260717120015_hr_payroll_punch_work_date.sql` | Punch `work_date` from client (timezone parity) |
| 16 | `20260717120016_hr_payroll_ess_self_profile.sql` | ESS self profile RPC (`fn_ensure_my_employee_profile`) |
| 17 | `20260717120017_hr_payroll_testing_changes.sql` | Names, PT, holidays seed, engine PT + OT merge |
| 18 | `20260717120018_hr_payroll_add_up_requirements.sql` | add up.docx Phase 2A — profile, workflows, lifecycle enum |
| 19 | `20260717120019_hr_payroll_lifecycle_salary_revision.sql` | Process / Approve / Lock / Paid + salary revision history |
| 20 | `20260717120020_hr_payroll_canada_engine.sql` | Canada CPP/EI engine + `payroll_line_snapshots` on lock |
| 21 | `20260717120021_hr_payroll_uat_isha_link.sql` | Link Isha FL-1042 to free CRM admin (ESS UAT bootstrap) |
| 22 | `20260717120022_hr_payroll_phase2c_rbac_snapshots.sql` | CRM RBAC sync, Canada brackets, process/lock snapshots |

**Verify migrations:**

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('employees', 'payroll_lines', 'role_assignments', 'policies')
ORDER BY 1;

SELECT proname FROM pg_proc
WHERE proname IN (
  'fn_compute_payroll', 'fn_build_payroll_line', 'fn_list_crm_staff',
  'fn_process_approval_decision', 'fn_export_payroll_register', 'fn_record_punch',
  'fn_process_payroll_cycle', 'fn_approve_payroll_cycle', 'fn_mark_payroll_paid'
);

SELECT id FROM storage.buckets WHERE id = 'hr-docs';
```

### 1.3 Record build info (for sign-off)

- Git branch, commit SHA, Lovable publish date → enter on sign-off form later.

---

## Phase 2 — CRM & HR role setup

**Owner:** Admin with access to **`/users`** and **`/hr/roles`**  
**Prerequisite:** Phase 1 complete.

### 2.1 CRM module access

For each UAT tester who needs HR sidebar access:

1. Open **`/users`** → select user → **Module access**.
2. Enable **HR Payroll** = View (Edit for HR testers).

### 2.2 HR module roles (Team & CRM)

1. Open **`/hr/roles`** → tab **Team & CRM**.
2. Assign HR roles:

| Tester purpose | Suggested HR role | Notes |
|----------------|-------------------|-------|
| Full HR UAT | **HR Manager** | Dashboard, verify, override, export |
| Payroll approver only | **HR Executive** | No override, no config |
| Line manager | **Manager** | Team leave/attendance only |
| Self-service | **Employee** | ESS + own requests |
| Super-user | **Admin** | All screens + configure |

3. **Link CRM login → employee** for ESS tests:
   - Team tab → **Import** or Employee Master → edit → **CRM login** = target user.
   - Demo seed + migration **21** link first free CRM **admin** to **Isha (FL-1042)**; or run `HR_PAYROLL_UAT_FIX_ISHA_LINK.sql`.

### 2.3 View-as switcher (RBAC without multiple logins)

The HR top bar **View as** dropdown lets one login exercise all HR roles instantly. Use for sections **B** (RBAC) when separate logins are not provisioned.

### 2.4 Verify setup

```sql
SELECT e.emp_code, e.full_name, e.staff_id IS NOT NULL AS linked,
       ra.role AS hr_role
FROM employees e
LEFT JOIN role_assignments ra ON ra.staff_id = e.staff_id
  AND ra.org_id = '00000000-0000-0000-0000-0000000000f1'
WHERE e.org_id = '00000000-0000-0000-0000-0000000000f1'
ORDER BY e.emp_code;
```

**Expected:** ≥5 employees (6 after migration 20 incl. **FL-CA01**); at least one with `hr_role` assigned.

---

## Phase 3 — Load / refresh demo data

**Owner:** DevOps / Engineering  
**Prerequisite:** Phase 1 complete.

### 3.1 Baseline + enrich (preferred)

If migrations **03** and **07** ran successfully, demo data is already loaded. To **reset** demo org only:

1. Re-run `20260717120003_hr_payroll_seed_demo.sql` (truncates demo org, reloads baseline).
2. Re-run `20260717120007_hr_payroll_full_demo_seed.sql` (enrich idempotently).

### 3.2 Verify seed

```sql
-- Employees
SELECT count(*) FROM employees
WHERE org_id = '00000000-0000-0000-0000-0000000000f1';
-- Expected: >= 5 (6 after migration 20 with FL-CA01)

-- Active cycle
SELECT label, status, payroll_days FROM payroll_cycles
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
ORDER BY start_date DESC LIMIT 1;
-- Expected: 26 May 2026 – 25 Jun 2026 · Draft · 30

-- Isha anchor (TV02)
SELECT pl.payable_days, pl.net_salary, e.emp_code
FROM payroll_lines pl
JOIN employees e ON e.id = pl.employee_id
WHERE e.emp_code = 'FL-1042'
ORDER BY pl.created_at DESC LIMIT 1;
-- Expected: payable_days = 29.5, net_salary = 39500

-- Pending workflow items (dashboard queue)
SELECT 'leave' AS q, count(*) FROM leave_requests
WHERE org_id = '00000000-0000-0000-0000-0000000000f1' AND status = 'Pending'
UNION ALL
SELECT 'mispunch', count(*) FROM mispunch_requests
WHERE org_id = '00000000-0000-0000-0000-0000000000f1' AND status = 'Pending';
```

### 3.3 Demo employees quick reference

| Code | Name | Branch (typical) | UAT focus |
|------|------|------------------|-----------|
| FL-1042 | Isha Sikligar | Genda Circle | **TV02 anchor**, mispunch, ESS |
| FL-1043 | Karan Joshi | Anand | Probation, training, sick leave |
| FL-1044 | Priya Sharma | Genda Circle | Late → half day |
| FL-1046 | Sneha Patel | Bharuch | UL override, 5-day week |
| FL-1047 | Imran Shaikh | Anand | Sandwich override, comp-off |
| FL-CA01 | Priya Sharma (CA) | Canada / Toronto | **CPP/EI** payroll (HR-UAT-P2-007) |

---

## Phase 4 — Smoke test (gate before UAT)

**Owner:** Engineering or UAT lead  
**Complete all items** before handing testers the case pack.

| # | Login / View-as | Action | Pass? |
|---|-----------------|--------|-------|
| 1 | Admin + HR access | Open **`/hr`** — dashboard loads (not white screen) | ☐ |
| 2 | View-as **HR Manager** | Sidebar shows Dashboard, Verify, Employee Master | ☐ |
| 3 | View-as **Employee** | Only ESS + request screens visible | ☐ |
| 4 | HR Manager | **`/hr/payroll`** — register shows 5 rows with net totals | ☐ |
| 5 | HR Manager | Isha row: payable **29.5**, net **₹39,500** | ☐ |
| 6 | HR Manager | **`/hr/roles`** → Team & CRM — CRM staff list loads | ☐ |
| 7 | HR Manager | **`/hr/me`** — ESS portal renders employee selector | ☐ |
| 8 | HR Manager | **`/hr/calculator`** — live RPC returns net for sample inputs | ☐ |
| 9 | HR Manager | Lock payroll → attendance edit blocked for cycle dates | ☐ |
| 10 | HR Manager | Export **PDF Register** + **All Slips PDF** from Verify | ☐ |
| 11 | HR Manager | Leave approve shows **Manager · HR** stage trail | ☐ |
| 12 | HR Manager | Config → **Overtime** tab shows mode (display/paid) | ☐ |
| 13 | HR Manager | Verify → **1. Process** → **2. Approve** → **3. Lock** (Phase 2 lifecycle) | ☐ |
| 14 | HR Manager | FL-CA01 row shows CPP/EI columns (~CA$4,157 net) | ☐ |

If any item fails, fix setup (Phases 1–3) before Phase 5.

---

## Phase 5 — Execute UAT (58 test cases)

**Owner:** UAT testers  
**Primary document:** `docs/hr-payroll/HR_PAYROLL_UAT.md`

### 5.1 Global rules (every test)

- Staging only; demo org **`00000000-0000-0000-0000-0000000000f1`**.
- Payroll cycle: **26 May – 25 Jun 2026** unless case says otherwise.
- Use **View-as** or the login named in preconditions.
- Fill **Pass / Fail**, **Notes**, **Severity**, **Reproducible** on each case.
- Screenshot when **Screenshot Required: Yes**.

### 5.2 Test pack overview

| Section | Cases | Primary focus |
|---------|------:|---------------|
| A — Setup & shell | 3 | Demo data, navigation, module entry |
| B — RBAC & access | 7 | Roles, screens, RLS, configure lock |
| C — Employee & CRM team | 5 | Master, import, link, components |
| D — Attendance & punch | 8 | ESS punch, derive status, edit |
| E — Workflows | 7 | Leave, comp-off, late, mispunch, training, approval chain |
| F — Payroll & lock | 12 | Register, TV02, override, lock, export, PDF |
| G — Statutory & engine | 4 | PF/ESIC, calculator parity |
| H — OT, lock polish & v1.1 | 7 | OT policy, PDF batch, freeze, reopen audit |
| I — Phase 2 add-up | 8 | Profile, lifecycle, Canada, doc verify, ESS status |
| **Total** | **58** | |

### 5.3 Suggested execution order

1. **HR-UAT-SETUP-001** — confirm demo data
2. Sections **A → B** — shell and RBAC
3. Section **C** — employee master + Team & CRM
4. Section **D** — attendance / ESS
5. Section **E** — approval workflows
6. Section **F** — payroll verification (includes **TV02**)
7. Section **G** — statutory + engine
8. Section **H** — OT policy, PDF exports, lock polish
9. Section **I** — Phase 2 add-up (migrations 18–20)

**Pre-flight SQL:** run `docs/hr-payroll/HR_PAYROLL_UAT_VERIFY.sql` — all rows should show **PASS**.

### 5.4 Log defects

Use **`docs/hr-payroll/HR_PAYROLL_DEFECT_TRACKER.csv`**.

| Column | What to enter |
|--------|----------------|
| Bug ID | `HR-BUG-001`, `HR-BUG-002`, … |
| Test Case ID | e.g. `HR-UAT-PAY-002` |
| Severity | Blocker / Critical / Major / Minor / Trivial |
| Screenshot File | Match naming convention |
| Status | Open → Fixed → Retest → Closed |

### 5.5 Reset demo data (optional mid-cycle)

Re-run migrations **03** then **07** on staging (idempotent for enrich). Re-run **HR-UAT-SETUP-001**.

---

## Phase 6 — Sign-off & handback to engineering

**Owner:** UAT lead  
**Form:** `docs/hr-payroll/HR_PAYROLL_UAT_SIGNOFF.md`

### 6.1 Completion criteria

| Criterion | Done? |
|-----------|-------|
| Phases 1–4 documented on sign-off form | ☐ |
| All **58** cases marked Pass, Fail, Blocked, or N/R | ☐ |
| Every **Fail** has a defect tracker row | ☐ |
| No open **Blocker** or **Critical** defects (or documented waiver) | ☐ |
| **TV02 anchor** (Isha 29.5 / ₹39,500) verified Pass | ☐ |
| Sign-off signed by UAT lead + product owner | ☐ |
| Build version recorded | ☐ |

### 6.2 After sign-off

- Return sign-off form and defect tracker to engineering.
- Production rollout only after sign-off (or documented waiver).
- **Do not** run HR Payroll UAT on production.

---

## Appendix A — Severity guide

| Level | When to use |
|-------|-------------|
| **Blocker** | Cannot open HR module; white screen; payroll engine error |
| **Critical** | Wrong net pay; lock broken; RLS data leak |
| **Major** | Workflow wrong; workaround exists |
| **Minor** | Cosmetic or edge case |
| **Trivial** | Copy / polish |
| **N/A** | Test passed |

---

## Appendix B — Known limitations (post v1.1)

Log as Minor unless case explicitly requires the feature.

- **Employer PF/ESIC:** employee deductions only; employer ledger out of scope v1.
- **Biometric import:** CSV/manual/biometric path via `/hr/import`; no live device feed in v1.
- **Performance Hub incentives:** `fn_pull_incentives` requires `incentive_payouts` table; returns 0 if absent.
- **OT comp-off-only mode:** v1.1 supports `display` and `paid`; comp-off credit for OT is future scope.

---

## Appendix C — Engineering contact checklist

When requesting setup, send UAT lead:

1. Staging base URL  
2. Confirmation Phases **1–4** complete  
3. Admin login or shared UAT password (secure channel)  
4. Link to this guide: **Guide → HR Payroll UAT** (`/guides/hr-payroll-uat`)

---

*End of HR Payroll UAT guide.*
