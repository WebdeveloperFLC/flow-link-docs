# HR Payroll — UAT kickoff (staging ready)

**Branch:** `feature/service-library-nav`  
**When:** After migrations **00–21** applied + Lovable Publish

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

## Execution order (58 cases)

1. **HR-UAT-SETUP-001** → **HR-UAT-SHELL-001/002**
2. Sections **A–H** (v1 pack)
3. **Section I** — Phase 2 (P2-001 … P2-008)
4. Sign-off: [`HR_PAYROLL_UAT_SIGNOFF.md`](./HR_PAYROLL_UAT_SIGNOFF.md)
5. Defects: [`HR_PAYROLL_DEFECT_TRACKER.csv`](./HR_PAYROLL_DEFECT_TRACKER.csv)
6. Progress: [`HR_PAYROLL_UAT_PROGRESS.csv`](./HR_PAYROLL_UAT_PROGRESS.csv) — mark Pass/Fail per case

**Full steps:** [`../guides/hr-payroll-uat-guide.md`](../guides/hr-payroll-uat-guide.md)

---

## Report failures

Send: **Test case ID** + screenshot + expected vs actual → engineering fixes next pass.
