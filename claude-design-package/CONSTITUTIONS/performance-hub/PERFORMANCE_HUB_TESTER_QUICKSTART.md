# Performance Hub — Tester Quick Start

**Audience:** Non-technical UAT testers  
**Team setup & full workflow:** [`../guides/performance-hub-uat-guide.md`](../guides/performance-hub-uat-guide.md) — **Guide → Performance Hub UAT** (`/guides/performance-hub-uat`)  
**Full test pack:** [`PERFORMANCE_HUB_UAT.md`](./PERFORMANCE_HUB_UAT.md) (51 cases)  
**Sign-off form:** [`PERFORMANCE_HUB_UAT_SIGNOFF.md`](./PERFORMANCE_HUB_UAT_SIGNOFF.md)

---

## 1. What is Performance Hub?

Performance Hub is the **incentives and offers workspace** inside Flow Link. It helps staff:

- See **wallet budgets**, earnings, and team performance for a month  
- **Apply discounts** to clients within policy rules  
- **Review approvals** (deep discounts, wallet exceptions, promotion requests)  
- Manage the **offers library**, analytics, and related admin tasks  

You will test on a **staging (practice) site**, not live production data. All demo clients are named **PH-DEMO-001** through **PH-DEMO-006**.

---

## 2. Setup (before you test)

**Your IT / engineering lead must finish these first.** You do not need to run scripts yourself.

| Step | Who | What you need to hear back |
|------|-----|----------------------------|
| 1 | Engineering | Staging site URL and that the latest Performance Hub build is live |
| 2 | Engineering | Demo practice data loaded for **June 2026** |
| 3 | Engineering | Seven test logins created (see §3) with passwords shared securely |
| 4 | You | Browser: Chrome or Edge, latest version |

**When setup is done**, log in and open **Performance Hub** from the main menu. At the top of every hub screen, set:

- **Period:** `2026-06` (June 2026)  
- **Branch:** `Genda Circle` (if shown)

If the period is wrong, many tests will show empty wallets or zero counts.

**First test:** Run **PH-UAT-SETUP-001** in the UAT pack. Ask engineering to confirm demo data if setup fails.

---

## 3. Demo users and roles

Use only these accounts. Each test case tells you which login to use.

| Login email | Name | Role | Use for |
|-------------|------|------|---------|
| `ph.counselor1@flowlink.demo` | Priya Mehta | Counselor | Home screen, give discount, client promotions |
| `ph.counselor2@flowlink.demo` | Rohit Shah | Counselor (no sales target) | No-target messaging, wallet exception form |
| `ph.manager@flowlink.demo` | Neha Manager | Branch manager | Team view, branch pool, manager approvals |
| `ph.admin@flowlink.demo` | Admin Demo | Admin | Command center, queues, incentives admin |
| `ph.director@flowlink.demo` | Director Demo | Director (read-only) | View approvals without approving |
| `ph.telecaller@flowlink.demo` | Tara Telecaller | Telecaller | Telecaller home layout |
| `ph.marcom@flowlink.demo` | Maya MarCom | Marketing / offers | Offers library, promotion requests, AI studio |

**Passwords:** Provided by your IT lead — do not share in chat or email with wide distribution.

---

## 4. Required seed steps (for engineering — you verify)

Demo **practice records** (clients, offers, wallets, approval queues) must exist before testing. Engineering loads them once; you **verify** with test **PH-UAT-SETUP-001**.

**You should see after seed:**

- Six demo clients (**PH-DEMO-001** … **006**)  
- Non-zero counts on the admin **Hub readiness** card (unclassified payments, approvals, etc.)  
- Period **2026-06** on the hub bar  

**Do not create your own test clients or offers.** If data is missing, stop and ask engineering to reload demo data — do not improvise.

**Tip:** Some tests change data (e.g. approving a queue item). If a later test looks “empty,” ask engineering to **reset demo data** before the next full run.

---

## 5. How to record bugs

Work through [`PERFORMANCE_HUB_UAT.md`](./PERFORMANCE_HUB_UAT.md) one case at a time. For each case, fill in:

| Field | What to write |
|-------|----------------|
| **Pass / Fail** | Pass if result matches “Expected result”; otherwise Fail |
| **Notes** | What you saw vs what was expected |
| **Bug severity** | See table below (use **N/A** if passed) |
| **Reproducible** | Yes if it fails again the same way; No if random |

**Severity (use on failed cases)**

| Level | Meaning | Example |
|-------|---------|---------|
| **Blocker** | Cannot continue UAT | Cannot log in; hub menu missing |
| **Critical** | Main workflow broken, no workaround | Give discount never submits |
| **Major** | Wrong but workaround exists | Wrong number on card, can still complete task |
| **Minor** | Cosmetic or small edge case | Label typo, alignment issue |
| **Trivial** | Polish only | Spacing, colour preference |

**Log each bug with:**

1. **Test case ID** (e.g. `PH-UAT-S2`)  
2. **Short title** (one line)  
3. **Steps to reproduce** (numbered steps)  
4. **Expected vs actual**  
5. **Screenshot** (if the case requires one)  
6. **Your name and date**

Send bugs to your **UAT lead** or project tracker — your lead will tell you the exact channel (email, ticket system, shared sheet).

**Standard template:** Log every defect in [`PERFORMANCE_HUB_DEFECT_TRACKER.csv`](./PERFORMANCE_HUB_DEFECT_TRACKER.csv) (open in Excel or Google Sheets). Copy the example row format; delete the example before go-live. Use **Module** values such as: Setup, Command center, Counselor home, Give discount, Admin queues, Offers studio, Client workspace, Incentives.

---

## 6. Screenshot naming convention

When a test case says **Screenshot Required: Yes**, save a PNG using this pattern:

```text
PH-UAT-{TestCaseID}_{YYYYMMDD}.png
```

**Examples**

| Test | Filename |
|------|----------|
| PH-UAT-SETUP-001 on 12 Jun 2026 | `PH-UAT-SETUP-001_20260612.png` |
| PH-UAT-Q1 on 12 Jun 2026 | `PH-UAT-Q1_20260612.png` |

**Multiple screenshots for one case** — add a short suffix before the date:

```text
PH-UAT-6E-001-light_20260612.png
PH-UAT-6E-001-dark_20260612.png
PH-UAT-Q4-before_20260612.png
PH-UAT-Q4-after_20260612.png
```

Use the **test case ID exactly** as written in the UAT document (including hyphens).

---

## 7. Where to save screenshots

Save all files in this folder (create it if needed):

```text
uat-screenshots/performance-hub/
```

**Recommended layout**

- One folder per tester or per test week, if your lead prefers  
- Keep filenames as in §6 so sign-off review is easy  

**Also store copies** where your UAT lead asks — often a **shared drive** or **ticket attachments**. Note the link or path on the sign-off form (§13).

---

## 8. How to complete sign-off

When you finish (or pause) UAT:

1. Open [`PERFORMANCE_HUB_UAT_SIGNOFF.md`](./PERFORMANCE_HUB_UAT_SIGNOFF.md).  
2. Fill in **environment**, **dates**, **your name**, and **counts**: executed / passed / failed / blocked.  
3. List **failed** and **blocked** test IDs with short reasons.  
4. Log **bugs** in [`PERFORMANCE_HUB_DEFECT_TRACKER.csv`](./PERFORMANCE_HUB_DEFECT_TRACKER.csv) by severity (Critical, High, Medium, Low) — see sign-off sections 9–12.  
5. Enter **screenshot folder** path and total screenshots captured.  
6. Choose **one recommendation**: Ready for Production · Ready for Limited Pilot · Requires Fixes Before Release (definitions are on the form).  
7. **Sign** with tester, manager, and project owner as required.

**Hand back to project owner** with:

- Completed UAT spreadsheet or annotated `PERFORMANCE_HUB_UAT.md`  
- Completed sign-off form  
- Screenshot folder or shared link  
- Bug list with severities  

---

## Quick reference

| Item | Value |
|------|-------|
| Demo period | **2026-06** |
| Demo branch | **Genda Circle** |
| Total test cases | **51** |
| Main test doc | [`PERFORMANCE_HUB_UAT.md`](./PERFORMANCE_HUB_UAT.md) |
| Sign-off | [`PERFORMANCE_HUB_UAT_SIGNOFF.md`](./PERFORMANCE_HUB_UAT_SIGNOFF.md) |
| Screenshot folder | `uat-screenshots/performance-hub/` |

**Questions?** Contact your UAT lead or engineering contact — do not change demo data or user roles yourself.
