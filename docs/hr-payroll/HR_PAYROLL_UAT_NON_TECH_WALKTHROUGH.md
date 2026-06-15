# HR Payroll — Non-technical team walkthrough (12 checks)

**For:** Office staff, counsellors, admins — **not** professional testers  
**Time:** About **45–60 minutes** with 2–3 people  
**You do NOT need** the full 61-case document for this walkthrough

**Staging URL + login:** Your lead will give you these.

---

## How to work as a team

| Person | Job |
|--------|-----|
| **Reader** | Reads each step aloud from this page |
| **Clicker** | Does the clicks on the computer |
| **Recorder** | Writes **Pass** or **Fail** in the table at the bottom |

If anything is confusing → **stop** and message your lead. Do not guess.

---

## Before you start (everyone)

1. Open staging website and log in.
2. Left sidebar → **HR Payroll** (or **Employee Master**).
3. Top-right **View as** → choose **HR Manager**.
4. You should see a cream-coloured HR screen — **not** a blank white page or red error.

---

## Check 1 — HR module opens

**Do:** Click **HR Payroll** in the sidebar.  
**Pass if:** Dashboard or HR home loads with menu on the left.  
**Fail if:** Blank page or “module error”.

---

## Check 2 — Every menu opens

**Do:** Click each item in the HR sidebar once (Dashboard, Employees, Payroll Verify, Attendance, Leave, etc.).  
**Pass if:** Each screen opens without crash.  
**Fail if:** Any screen shows an error or stays blank.

---

## Check 3 — Employee list

**Do:** Open **Employee Master** / **Employees**.  
**Pass if:** You see a list of employees (names and codes like FL-1042).  
**Fail if:** Empty list or error.

---

## Check 4 — Open Isha’s record

**Do:** Find **Isha Sikligar** (code **FL-1042**). Click to view or edit.  
**Pass if:** Her details open (Sr. Counsellor, Genda Circle, etc.).  
**Fail if:** Cannot find her or screen crashes.

---

## Check 5 — Isha CRM link (optional display)

**Do:** On Isha → **Employment** tab → find **CRM login**.  
**Pass if:** Shows a login email (e.g. adminsupport2@…) or “Linked”.  
**Fail if:** Red error on the whole screen.  
**Note:** “Not linked” alone is OK if your lead already confirmed SQL — ask lead if unsure.

---

## Check 6 — Isha payroll numbers (MOST IMPORTANT)

**Do:**
1. Open **Payroll Verify** (or `/hr/payroll`).
2. Find **Isha Sikligar (FL-1042)** in the table.

**Pass if:**

| Field | Must show |
|-------|-----------|
| Payable days | **29.5** |
| Net salary | **₹39,500** (rupees) |

**Fail if:** Different numbers or employee missing.

---

## Check 7 — Canada employee payroll (MOST IMPORTANT)

**Do:**
1. On same **Payroll Verify** page.
2. Set **Branch** filter to **All** (top of table).
3. Find **Priya Sharma (FL-CA01)** or branch **Canada**.

**Pass if:**

| Field | Must show |
|-------|-----------|
| Net salary | about **CA$4,157** (dollars, not ₹) |
| Deduction columns | **CPP** and **EI** (not PF/ESIC) |

**Fail if:** Missing row, shows ₹ instead of CA$, or net far from 4,157.

---

## Check 8 — Employee monthly salary column

**Do:** Back to **Employee Master** list. Look at **Monthly** column.  
**Pass if:** Amounts show with correct symbol (₹ for India, CA$ for Canada employee).  
**Fail if:** All rows show wrong currency for Canada.

---

## Check 9 — Check-in (one person only)

**Do:**
1. **Log out.**
2. Log in as: **adminsupport2@futurelinkconsultants.co.in**
3. Open **My Portal** / **ESS** / `/hr/me`
4. Try **Check in** (if button is there).

**Pass if:** Page shows **Isha** (not a blank “no employee” message). Check-in works or shows today’s status.  
**Fail if:** “No employee profile” or crash.  
**Then:** Log back in with your normal admin account for remaining checks.

---

## Check 10 — Leave screen

**Do:** View as **HR Manager** → open **Leave**.  
**Pass if:** Leave list or empty state loads (no crash).  
**Fail if:** Error screen.

---

## Check 11 — Export buttons exist

**Do:** On **Payroll Verify**, look for **↓ Excel**, **↓ PDF Register** buttons (top).  
**Pass if:** Buttons are visible and clickable (download may open — that is OK).  
**Fail if:** Buttons missing or error when clicked.

---

## Check 12 — Overall “would you use this?”

**Do:** Team discussion — 2 minutes.  
**Pass if:** No **blocker** issues (wrong pay amounts, crashes, missing employees).  
**Fail if:** Team would not trust payroll numbers or cannot open main screens.

---

## Do NOT do (your lead or developer only)

- **Process → Approve → Lock** payroll (changes live cycle)
- SQL or database
- Edit salary amounts
- All 61 technical test cases in `HR_PAYROLL_UAT.md`

---

## Record your results

Copy this table into email/Sheet or update `HR_PAYROLL_UAT_PROGRESS.csv` for these rows only:

| # | Test ID | Result (Pass/Fail) | Notes |
|---|---------|-------------------|-------|
| 1 | HR-UAT-SHELL-001 | | |
| 2 | HR-UAT-SHELL-002 | | |
| 3 | HR-UAT-EMP-001 | | Use for employee list |
| 4 | HR-UAT-EMP-003 | | Isha record |
| 5 | HR-UAT-EMP-003 | | CRM link |
| 6 | HR-UAT-PAY-002 | | Isha 29.5 / ₹39,500 |
| 7 | HR-UAT-P2-007 | | FL-CA01 CA$4,157 |
| 8 | HR-UAT-EMP-001 | | Currency column |
| 9 | HR-UAT-ATT-001 | | ESS check-in |
| 10 | HR-UAT-WF-001 | | Leave screen |
| 11 | HR-UAT-PAY-006 | | Export buttons |
| 12 | (walkthrough) | | Overall OK |

**All other rows** in `HR_PAYROLL_UAT_PROGRESS.csv`: mark **N/A** with note `Covered by auto-test + lead`.

---

## If something fails

Send your lead:
1. Check number (1–12)  
2. What you expected  
3. What you saw  
4. Screenshot (phone photo of screen is fine)  

Use `HR_PAYROLL_DEFECT_TRACKER.csv` only if your lead asks.

---

## When finished

Message your lead: **“12-check walkthrough done — X Pass, Y Fail.”**  
They complete sign-off. **You are done.**
