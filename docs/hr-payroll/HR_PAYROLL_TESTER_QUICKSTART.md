# HR Payroll — Tester Quick Start

**Audience:** Non-technical UAT testers  
**Team setup & full workflow:** [`../guides/hr-payroll-uat-guide.md`](../guides/hr-payroll-uat-guide.md) — **Guide → HR Payroll UAT** (`/guides/hr-payroll-uat`)  
**Full test pack:** [`HR_PAYROLL_UAT.md`](./HR_PAYROLL_UAT.md) (50 cases)  
**Sign-off form:** [`HR_PAYROLL_UAT_SIGNOFF.md`](./HR_PAYROLL_UAT_SIGNOFF.md)

---

## 1. What is HR Payroll?

HR Payroll is the **employee, attendance, leave, and payroll** module inside Flow Link. It helps HR staff:

- Maintain **employee master** data and bank details  
- Track **attendance**, leave, comp-off, late, and mispunch  
- Run **payroll verification** with Excel-parity maths (Postgres engine)  
- Export salary registers (CSV/Excel/**PDF**) and **batch salary slip PDFs**  
- Lock payroll with **attendance freeze** and audited reopen  

You test on **staging**, not production. Demo employees use codes **FL-1042** through **FL-1047**.

---

## 2. Setup (before you test)

**Engineering must finish setup first.**

| Step | Who | What you need |
|------|-----|----------------|
| 1 | Engineering | Staging URL + latest HR build published |
| 2 | Engineering | SQL migrations **00–14** applied + demo seed loaded |
| 3 | Admin | Your login has **HR Payroll** module access |
| 4 | Admin | Your user has an **HR role** in `/hr/roles` → Team & CRM (or use View-as) |

**First test:** Run **HR-UAT-SETUP-001**. Ask engineering if employee count ≠ 5 or Isha net ≠ ₹39,500.

---

## 3. How to open HR Payroll

1. Log in to staging.  
2. Sidebar → **HR Payroll** (or **Employee Master** under it).  
3. You should see the HR layout (cream sidebar, “View as” role pill top-right).

If the screen is **blank white**, tell engineering — bootstrap SQL may be missing.

---

## 4. View-as role switcher

Top-right **View as** dropdown lets you test roles without separate logins:

| View as | What you should see |
|---------|---------------------|
| HR Manager | Dashboard, Verify, Employees, most menus |
| Employee | My Portal (ESS), Leave, Comp-Off only |
| Manager | Team leave/attendance; no Payroll Config |

Use the test pack’s **Preconditions** column — it says View-as or specific login.

---

## 5. Demo employees (memorise two)

| Code | Name | Why it matters |
|------|------|----------------|
| **FL-1042** | Isha Sikligar | **Golden test:** 29.5 days, ₹39,500 net |
| FL-1043 | Karan Joshi | Sick leave + training scenarios |

Payroll cycle for all tests: **26 May – 25 Jun 2026**.

---

## 6. Running a test case

1. Open `HR_PAYROLL_UAT.md` (or ask lead for PDF export).  
2. Find the test ID (e.g. **HR-UAT-PAY-002**).  
3. Follow **Steps** exactly.  
4. Compare to **Expected Result**.  
5. Mark **Pass** or **Fail**; add **Notes** if Fail.  
6. Save screenshot if required → `uat-screenshots/hr-payroll/HR-UAT-PAY-002_YYYYMMDD.png`.  
7. Log failures in **HR_PAYROLL_DEFECT_TRACKER.csv**.

---

## 7. When something fails

1. Note test ID + what you expected vs what happened.  
2. Screenshot the screen.  
3. Can you repeat it? Mark **Reproducible: Yes/No**.  
4. Severity: **Blocker** (cannot continue) down to **Minor**.  
5. Send row to UAT lead — do not mark sign-off complete with open Blockers.

---

## 8. Sign-off

When all **50** cases are done, UAT lead completes **HR_PAYROLL_UAT_SIGNOFF.md**.

---

*Questions? Ask your UAT lead or engineering contact from the main UAT guide Appendix C.*
