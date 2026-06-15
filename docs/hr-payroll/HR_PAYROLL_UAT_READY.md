# HR Payroll — UAT READY

**Status:** ✅ **OPEN for human UAT**  
**Date:** 13 Jun 2026  
**Branch:** `feature/service-library-nav`  
**Staging:** Confirmed working by product owner (Employee Master, FL-CA01 CAD, CRM link, no crash)

---

## Who does what

| Role | Action |
|------|--------|
| **Product owner (you)** | Hand off to UAT team — **no further testing required** unless final sign-off |
| **UAT team** | Run 61 cases using one-pager + `HR_PAYROLL_UAT.md` |
| **UAT lead** | One SQL pre-flight (below), then mark `HR_PAYROLL_UAT_PROGRESS.csv` |
| **Engineering** | Fix only **Blocker** defects from `HR_PAYROLL_DEFECT_TRACKER.csv` |

---

## Engineering gates (complete)

| Gate | Command / action | Status |
|------|------------------|--------|
| Auto-test (logic) | `npm run test:hr-payroll` | ✅ PASS (61 tests) |
| Production build | `npm run build` | ✅ PASS |
| Staging publish | Lovable Publish latest | ✅ Done |
| Migrations on staging | **18–24** in SQL editor | ✅ Applied |
| Golden anchors (UI) | Isha ₹39,500 / FL-CA01 CA$4,157 | ✅ Confirmed |

---

## UAT team — start here

1. Read **`HR_PAYROLL_UAT_TEAM_ONE_PAGER.md`** (1 page)
2. Full cases: **`HR_PAYROLL_UAT.md`** (61 tests, sections A–J)
3. Log results: **`HR_PAYROLL_UAT_PROGRESS.csv`**
4. Log bugs: **`HR_PAYROLL_DEFECT_TRACKER.csv`**

**View-as:** HR Manager for most tests  
**ESS punch:** log in as `adminsupport2@futurelinkconsultants.co.in` (Isha FL-1042)

---

## Golden anchors (team must pass first)

| Test ID | Employee | Must show |
|---------|----------|-----------|
| HR-UAT-PAY-002 | FL-1042 Isha | **29.5** days, **₹39,500** net |
| HR-UAT-P2-007 | FL-CA01 | **CA$4,157** net, CPP/EI columns, Branch **All** or **Canada** |

If either fails → **stop** and escalate to UAT lead (do not continue payroll cases).

---

## UAT lead — one SQL pre-flight (optional, 2 min)

Run `HR_PAYROLL_UAT_VERIFY.sql` in Supabase SQL Editor. All rows should be **PASS** (Isha link = PASS, not WARN).

---

## Save for last (one person only)

After all other cases pass:

| Test ID | Action |
|---------|--------|
| HR-UAT-P2-003 | Process → Approve → Lock |
| HR-UAT-P2-004 | Mark paid / reopen (if in scope) |

Cycle may already be **Paid** from earlier testing — if so, mark lifecycle cases **N/A** or use Reopen first per UAT lead.

---

## ESS login map

| Employee | Code | Login |
|----------|------|-------|
| Isha Sikligar | FL-1042 | adminsupport2@futurelinkconsultants.co.in |
| Maya MarCom | FL-1048 | santoshramrakhiani@gmail.com |
| Yashika Sheth | FL-1049 | yashika@futurelinkconsultants.ca |

---

## Out of scope for this UAT

- Full CRM-only RBAC (no HR matrix)
- Snapshot replay UI
- Provincial Canada tax (bracket/flat only)
- Production RLS hardening (demo org uses bootstrap policies)

---

## Sign-off

When all 61 cases are Pass / Fail / Blocked / N/A → complete **`HR_PAYROLL_UAT_SIGNOFF.md`**.

**Product owner:** You are **not** on the hook for case-by-case testing. Review sign-off when the team finishes.
