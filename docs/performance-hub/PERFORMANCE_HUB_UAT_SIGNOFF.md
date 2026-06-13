# Performance Hub — UAT Sign-Off

Complete this form after executing [`PERFORMANCE_HUB_UAT.md`](./PERFORMANCE_HUB_UAT.md). Demo data must be loaded per [`PERFORMANCE_HUB_DEMO_DATA.md`](./PERFORMANCE_HUB_DEMO_DATA.md) before testing.

---

## 1. Test Environment

| Field | Value |
|-------|-------|
| **Environment name** | ☐ Staging ☐ Lovable preview ☐ Production-like ☐ Other: _______________ |
| **Base URL** | |
| **Database** | Supabase project: _______________ |
| **Migrations applied through** | `20260711120001` (Phase 6B) ☐ Yes ☐ No |
| **Lovable Publish complete** | ☐ Yes ☐ No |
| **Demo seed loaded** | ☐ Yes ☐ No (`PERFORMANCE_HUB_DEMO_DATA.md` §4) |
| **Demo period used** | `2026-06` |
| **Browser / OS** | |
| **Notes** | |

---

## 2. Build Version

| Field | Value |
|-------|-------|
| **Git branch** | |
| **Git commit SHA** | |
| **Commit date** | |
| **Lovable publish ID / date** | |
| **Phases in scope** | 5Q, 5R, 5S, 5T, 5U, 5V, 5W, 6A, 6B, 6C, 6D, 6E |
| **Edge functions republished** | ☐ `incentive-calculate-run` ☐ Other: _______________ ☐ N/A |

---

## 3. Tester Name

| Role | Name | Email |
|------|------|-------|
| **Primary UAT tester** | | |
| **Additional testers** | | |

---

## 4. Test Date

| Field | Value |
|-------|-------|
| **UAT start date** | |
| **UAT end date** | |
| **Total testing days** | |

---

## 5. Test Cases Executed

**Total defined in UAT pack:** 51  
**Executed this cycle:**

| # | Test Case ID | Title | Result |
|---|--------------|-------|--------|
| 1 | PH-UAT-SETUP-001 | Demo data loaded | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 2 | PH-UAT-6A-001 | Hub navigation shell | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 3 | PH-UAT-6E-001 | Theme tokens LIGHT / DARK / system | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 4 | PH-UAT-W1 | Hub readiness queue counts | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 5 | PH-UAT-W2 | Clear blockers → ready for period lock | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 6 | PH-UAT-W3 | How it works intelligence layer | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 7 | PH-UAT-CC-001 | Command center workflow rail | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 8 | PH-UAT-EXEC-001 | Executive dashboard | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 9 | PH-UAT-HOME-001 | Wallet and earning cards (Priya) | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 10 | PH-UAT-HOME-002 | No-target counselor copy (Rohit) | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 11 | PH-UAT-HOME-003 | Wallet exception request form | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 12 | PH-UAT-Q4 | Live earning ticker footer | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 13 | PH-UAT-T2 | Hot clients for offers list | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 14 | PH-UAT-T3 | Realtime earning update | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 15 | PH-UAT-U3 | WIR wallet impact card | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 16 | PH-UAT-V1 | Offer influence O10 card | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 17 | PH-UAT-TEAM-001 | Team performance view | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 18 | PH-UAT-R4 | Period bar sync across hub | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 19 | PH-UAT-TC-001 | Telecaller home layout | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 20 | PH-UAT-S2 | Instant apply small discount | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 21 | PH-UAT-U1 | Admission 85% margin floor preview | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 22 | PH-UAT-S1 | Below-floor escalates to admin | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 23 | PH-UAT-S3 | Full waiver blocked for counselor | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 24 | PH-UAT-6C-001 | Mobile give discount layout | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 25 | PH-UAT-WALLET-001 | Wallet policy bands | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 26 | PH-UAT-WALLET-002 | Branch pool allocation | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 27 | PH-UAT-UNCL-001 | Unclassified payments queue | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 28 | PH-UAT-S4 | Approvals depth matrix and floor badges | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 29 | PH-UAT-U2 | Edit coaching margin floor on approvals | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 30 | PH-UAT-6B-001 | Director read-only on approvals | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 31 | PH-UAT-PROMO-001 | Promotion requests queue | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 32 | PH-UAT-OFF-LIB-001 | Offers library listing | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 33 | PH-UAT-OFF-NEW-001 | New offer wizard | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 34 | PH-UAT-V2 | Offer analytics period alignment | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 35 | PH-UAT-OFF-CAL-001 | Offers calendar | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 36 | PH-UAT-OFF-AUTO-001 | Automation templates | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 37 | PH-UAT-Q2 | Journey enrollments view | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 38 | PH-UAT-R1 | A/B experiment running | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 39 | PH-UAT-R3 | Promote A/B winner | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 40 | PH-UAT-OFF-AI-001 | AI studio shell | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 41 | PH-UAT-OFF-SEG-001 | Segments builder | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 42 | PH-UAT-Q1 | Cross-sell promotions strip | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 43 | PH-UAT-Q3 | Dismiss suggestion 7 days | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 44 | PH-UAT-T1 | Propensity hot badge on client | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 45 | PH-UAT-R2 | A/B variant badge on client | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 46 | PH-UAT-6D-001 | Legacy service_offers convergence banner | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 47 | PH-UAT-INC-PC-001 | Period close open wallets | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 48 | PH-UAT-INC-RUN-001 | Incentive run preview | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 49 | PH-UAT-INC-PLAN-001 | Plans and rules | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 50 | PH-UAT-INC-COMP-001 | Branch competition standings | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |
| 51 | PH-UAT-INC-PAY-001 | Payout desk | ☐ Pass ☐ Fail ☐ Blocked ☐ N/R |

**Executed count:** _____ / 51  
**Not run (N/R):** _____

---

## 6. Passed

| Metric | Count |
|--------|------:|
| **Passed** | |
| **Pass rate** | _____ % (Passed ÷ Executed × 100) |

**Passed test case IDs:**

```
(e.g. PH-UAT-SETUP-001, PH-UAT-Q1, PH-UAT-W1, …)
```

---

## 7. Failed

| Metric | Count |
|--------|------:|
| **Failed** | |

**Failed test case IDs:**

| Test Case ID | Summary of failure |
|--------------|-------------------|
| | |
| | |
| | |

---

## 8. Blocked

| Metric | Count |
|--------|------:|
| **Blocked** | |

**Blocked test case IDs:**

| Test Case ID | Blocker reason |
|--------------|----------------|
| | |
| | |

---

## 9. Critical Bugs

**Definition:** Core workflow broken; no acceptable workaround; release must not proceed.

| Bug ID | Test Case ID | Summary | Steps to reproduce | Status |
|--------|--------------|---------|-------------------|--------|
| | | | | ☐ Open ☐ Fixed ☐ Won't fix |
| | | | | ☐ Open ☐ Fixed ☐ Won't fix |

**Critical bug count:** _____

---

## 10. High Bugs

**Definition:** Major feature incorrect; workaround painful or risky for pilot users.

| Bug ID | Test Case ID | Summary | Steps to reproduce | Status |
|--------|--------------|---------|-------------------|--------|
| | | | | ☐ Open ☐ Fixed ☐ Won't fix |
| | | | | ☐ Open ☐ Fixed ☐ Won't fix |

**High bug count:** _____

---

## 11. Medium Bugs

**Definition:** Functional issue with reasonable workaround; does not block primary flows.

| Bug ID | Test Case ID | Summary | Steps to reproduce | Status |
|--------|--------------|---------|-------------------|--------|
| | | | | ☐ Open ☐ Fixed ☐ Won't fix |
| | | | | ☐ Open ☐ Fixed ☐ Won't fix |

**Medium bug count:** _____

---

## 12. Low Bugs

**Definition:** Cosmetic, copy, or minor edge case; acceptable for pilot with documented known issues.

| Bug ID | Test Case ID | Summary | Steps to reproduce | Status |
|--------|--------------|---------|-------------------|--------|
| | | | | ☐ Open ☐ Fixed ☐ Won't fix |
| | | | | ☐ Open ☐ Fixed ☐ Won't fix |

**Low bug count:** _____

---

## 13. Screenshots Folder

| Field | Value |
|-------|-------|
| **Folder path** | `uat-screenshots/performance-hub/` |
| **Naming convention** | `PH-UAT-{TestCaseID}_{YYYYMMDD}.png` |
| **Total screenshots captured** | |
| **Storage location** | ☐ Repo ☐ Shared drive ☐ Ticket attachments ☐ Other: _______________ |
| **Link / path** | |

**Required screenshots missing:**

| Test Case ID | Expected filename |
|--------------|-------------------|
| | |
| | |

---

## 14. Recommendation

Select **one** primary recommendation:

| Option | Select | Criteria met |
|--------|:------:|--------------|
| ☐ **Ready for Production** | | All 51 cases executed; 0 Critical / 0 High open; pass rate ≥ 95%; W2 readiness gate verified; sign-off below complete. |
| ☐ **Ready for Limited Pilot** | | Core counselor + admin flows pass (HOME, GD, CC, approvals, offers library); no Critical open; High bugs have owner + target date; pilot branch/user list defined. |
| ☐ **Requires Fixes Before Release** | | Any Critical open; OR > 3 High open; OR pass rate < 85%; OR demo seed / migrations not applied. |

**Recommendation rationale:**

```
(Summary of quality, open defects, and risk for go-live / pilot.)
```

**Conditions for upgrade (if Limited Pilot selected):**

```
(e.g. Fix BUG-001 before expanding beyond Genda Circle pilot counselors.)
```

---

## Sign-off

By signing, each party confirms they have reviewed this document, the executed UAT results, and the open defect list.

| Role | Name | Signature | Date | Agree with recommendation? |
|------|------|-----------|------|----------------------------|
| **Tester** | | | | ☐ Yes ☐ No |
| **Manager** | | | | ☐ Yes ☐ No |
| **Project Owner** | | | | ☐ Yes ☐ No |

**Final decision:**

☐ Ready for Production  
☐ Ready for Limited Pilot  
☐ Requires Fixes Before Release  

**Decision date:** _______________

**Next review date (if fixes required):** _______________

---

## References

- Test cases: [`PERFORMANCE_HUB_UAT.md`](./PERFORMANCE_HUB_UAT.md)
- Readiness review: [`PERFORMANCE_HUB_READINESS_REVIEW.md`](./PERFORMANCE_HUB_READINESS_REVIEW.md)
- Demo data: [`PERFORMANCE_HUB_DEMO_DATA.md`](./PERFORMANCE_HUB_DEMO_DATA.md)
- Batch checklist: [`../INCENTIVE_PHASE5_BATCH_UAT.md`](../INCENTIVE_PHASE5_BATCH_UAT.md)
