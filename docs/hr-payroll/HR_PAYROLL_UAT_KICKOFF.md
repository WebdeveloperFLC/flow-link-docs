# HR Payroll — UAT kickoff (staging ready)

**Branch:** `feature/service-library-nav`  
**When:** After migrations **00–22** applied + Lovable Publish

---

## Pre-flight (5 min)

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Run [`HR_PAYROLL_UAT_VERIFY.sql`](./HR_PAYROLL_UAT_VERIFY.sql) in Supabase SQL Editor | ☐ all PASS (isha_ess_link may WARN → run fix below) |
| 2 | If `isha_ess_link` = WARN, run [`HR_PAYROLL_UAT_FIX_ISHA_LINK.sql`](./HR_PAYROLL_UAT_FIX_ISHA_LINK.sql) | ☐ FL-1042 `crm_linked = true` |
| 3 | Local gate: `npm run test:hr-payroll` | ☐ Pre-UAT PASS |
| 4 | Lovable Publish synced to latest commit | ☐ |

---

## ESS login map (demo org)

| Employee | Code | Use this login for punch / ESS |
|----------|------|--------------------------------|
| Isha Sikligar | FL-1042 | First free CRM **admin** (e.g. adminsupport2@…) |
| Maya MarCom | FL-1048 | santoshramrakhiani@gmail.com |
| Yashika Sheth | FL-1049 | yashika@futurelinkconsultants.ca |

**View-as Employee** does not substitute for check-in — use the linked login.

---

## Golden anchors

| Test | Employee | Expected |
|------|----------|----------|
| TV02 / HR-UAT-PAY-002 | FL-1042 Isha | **29.5** payable days, **₹39,500** net |
| HR-UAT-P2-007 | FL-CA01 | CPP/EI, net **~CA$4,157** |

---

## Execution order (61 cases)

1. **HR-UAT-SETUP-001** → **HR-UAT-SHELL-001/002**
2. Sections **A–H** (v1 pack)
3. **Section I** — Phase 2 (P2-001 … P2-008)
4. **Section J** — Phase 2C (P2C-001 … P2C-003) — after migration 22
4. Sign-off: [`HR_PAYROLL_UAT_SIGNOFF.md`](./HR_PAYROLL_UAT_SIGNOFF.md)
5. Defects: [`HR_PAYROLL_DEFECT_TRACKER.csv`](./HR_PAYROLL_DEFECT_TRACKER.csv)
6. Progress: [`HR_PAYROLL_UAT_PROGRESS.csv`](./HR_PAYROLL_UAT_PROGRESS.csv) — mark Pass/Fail per case

**Full steps:** [`../guides/hr-payroll-uat-guide.md`](../guides/hr-payroll-uat-guide.md)

---

## Report failures

Send: **Test case ID** + screenshot + expected vs actual → engineering fixes next pass.

---

## Day 1 — first 90 minutes (recommended)

Your staging roster is confirmed (8 employees, FL-1042 linked, FL-CA01 present). Execute in this order:

| # | Case | Login / View-as | Pass criteria |
|---|------|-----------------|---------------|
| 1 | HR-UAT-SETUP-001 | — | Verify SQL all PASS (you did this) |
| 2 | HR-UAT-SHELL-001 | HR Manager | `/hr` loads, no white screen |
| 3 | HR-UAT-SHELL-002 | HR Manager | All sidebar routes open |
| 4 | HR-UAT-PAY-002 | HR Manager | Isha **29.5** days, **₹39,500** net |
| 5 | HR-UAT-P2-003 | HR Manager | Process → Approve → Lock succeeds |
| 5b | — | SQL | Run [`HR_PAYROLL_SNAPSHOT_VERIFY.sql`](./HR_PAYROLL_SNAPSHOT_VERIFY.sql) after Process |
| 6 | HR-UAT-P2C-002 | HR Manager | `processed` snapshots ≥5 rows |
| 7 | HR-UAT-ATT-001 | `adminsupport2@…` | ESS punch as Isha on `/hr/me` |
| 8 | HR-UAT-P2-001 | HR Manager | Profile fields save (middle name, etc.) |
| 9 | HR-UAT-P2C-001 | Admin | `/hr/roles` → **Sync from CRM** |
| 10 | HR-UAT-P2C-002 | HR Manager | After Process → SQL `processed` snapshots exist |

Mark each row in [`HR_PAYROLL_UAT_PROGRESS.csv`](./HR_PAYROLL_UAT_PROGRESS.csv).  
If **#4** or **#6** fail, stop and send screenshot — do not continue payroll cases until TV02/Canada anchors pass.
