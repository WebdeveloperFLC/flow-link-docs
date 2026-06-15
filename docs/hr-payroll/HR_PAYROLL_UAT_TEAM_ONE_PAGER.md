# HR Payroll — UAT for testers (1 page)

**UAT status:** ✅ **OPEN** — see `HR_PAYROLL_UAT_READY.md`  
**Non-technical team?** Use **`HR_PAYROLL_UAT_NON_TECH_WALKTHROUGH.md`** (12 checks, ~1 hour) — **not** the full 61 cases.  
**Environment:** Staging only (not production)  
**Your lead will give you:** staging website URL + login  
**Full test list:** `docs/hr-payroll/HR_PAYROLL_UAT.md` (61 cases)  
**Mark results:** `docs/hr-payroll/HR_PAYROLL_UAT_PROGRESS.csv`  
**Report bugs:** `docs/hr-payroll/HR_PAYROLL_DEFECT_TRACKER.csv`

---

## Before you start

1. Log in to **staging**.
2. Open sidebar → **HR Payroll** (or **Employee Master** under it).
3. Top-right **View as** → choose **HR Manager** (for most tests).
4. You should see the HR screen (cream sidebar) — **not a blank white page**.

If the screen is blank, **stop** and tell your lead.

---

## Two numbers you must check (most important)

On **Payroll Verify** (`/hr/payroll`), find these employees:

| Employee | Code | Must show |
|----------|------|-----------|
| Isha Sikligar | FL-1042 | **29.5** days, **₹39,500** net pay |
| Canada employee | FL-CA01 | Net about **CA$4,157** (CPP/EI columns) |

**If FL-CA01 is missing:** set **Branch** filter to **All** (top of register). If still missing, tell your lead — they may need **Rebuild register** or a SQL fix before you continue.

**Test IDs:** HR-UAT-PAY-002 and HR-UAT-P2-007  
If either is wrong, **stop** and tell your lead before continuing.

Payroll period for all tests: **26 May – 25 Jun 2026**.

---

## Special login (check-in / ESS only)

For **My Portal / punch / check-in** tests, log in as:

**adminsupport2@futurelinkconsultants.co.in**

(This is linked to employee Isha. The View-as dropdown does **not** work for punch.)

---

## What to do for each test

1. Open `HR_PAYROLL_UAT.md` and find the test ID (e.g. HR-UAT-SHELL-001).
2. Read **Preconditions** (which View-as role or login to use).
3. Follow **Steps** exactly.
4. Compare screen to **Expected Result**.
5. Mark **Pass** or **Fail** in `HR_PAYROLL_UAT_PROGRESS.csv`.
6. If screenshot required → save as:  
   `uat-screenshots/hr-payroll/HR-UAT-{TestID}_{date}.png`
7. If **Fail** → add a row to `HR_PAYROLL_DEFECT_TRACKER.csv` (what you expected vs what you saw).

---

## Suggested order

**Start (everyone):**
1. HR-UAT-SHELL-001 — HR module opens  
2. HR-UAT-SHELL-002 — click each menu item  
3. HR-UAT-PAY-002 — Isha 29.5 / ₹39,500  
4. HR-UAT-P2-007 — FL-CA01 Canada pay  

**Then:** work through the rest of `HR_PAYROLL_UAT.md` (sections A–J).

**Save for last (one person):**
- Process → Approve → Lock payroll (HR-UAT-P2-003)  
- Mark paid / reopen if listed (HR-UAT-P2-004)  
Do these **after** other payroll and attendance tests so data can still be edited.

---

## When something fails

Write down:
- Test ID (e.g. HR-UAT-PAY-002)  
- What you expected  
- What you actually saw  
- Screenshot  
- Can you repeat it? Yes / No  

Send to your **UAT lead**. Severity: **Blocker** (cannot continue) down to **Minor**.

---

## When you are done

UAT lead completes `HR_PAYROLL_UAT_SIGNOFF.md` when all **61** cases are marked Pass, Fail, Blocked, or N/A.

**Questions?** Ask your UAT lead — do not guess on pay amounts or lock steps.
