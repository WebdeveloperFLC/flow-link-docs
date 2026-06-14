# HR Payroll — UAT Sign-Off

Complete after executing [`HR_PAYROLL_UAT.md`](./HR_PAYROLL_UAT.md). Setup per [`../guides/hr-payroll-uat-guide.md`](../guides/hr-payroll-uat-guide.md).

---

## 1. Test Environment

| Field | Value |
|-------|-------|
| **Environment** | ☐ Staging ☐ Lovable preview ☐ Other: _______________ |
| **Base URL** | |
| **Supabase project** | |
| **Migrations through** | `20260717120022` ☐ Yes ☐ No |
| **Demo seed loaded** | ☐ Yes ☐ No |
| **Demo org** | `00000000-0000-0000-0000-0000000000f1` |
| **Payroll cycle tested** | 26 May – 25 Jun 2026 |

---

## 2. Build Version

| Field | Value |
|-------|-------|
| **Git branch** | |
| **Commit SHA** | |
| **Lovable publish date** | |

---

## 3. Test Cases Executed

**Total defined:** 58  
**Executed:** _____ / 58

| Section | Cases | Pass | Fail | Blocked | N/R |
|---------|------:|-----:|-----:|--------:|----:|
| A Setup | 3 | | | | |
| B RBAC | 7 | | | | |
| C Employee | 5 | | | | |
| D Attendance | 8 | | | | |
| E Workflows | 7 | | | | |
| F Payroll | 12 | | | | |
| G Statutory | 4 | | | | |
| H OT & polish | 7 | | | | |
| I Phase 2 add-up | 8 | | | | |

**TV02 anchor (HR-UAT-PAY-002):** ☐ Pass ☐ Fail — Isha 29.5 days / ₹39,500

---

## 4. Defect Summary

| Severity | Open | Closed |
|----------|-----:|-------:|
| Blocker | | |
| Critical | | |
| Major | | |
| Minor | | |

**Defect tracker:** `HR_PAYROLL_DEFECT_TRACKER.csv`

---

## 5. Recommendation

| Option | Select |
|--------|:------:|
| ☐ **Ready for Production** | All 58 executed; TV02 pass; 0 Blocker/Critical open |
| ☐ **Ready for Limited Pilot** | Core HR flows pass; no Blocker open |
| ☐ **Requires Fixes Before Release** | TV02 fail OR any Blocker OR migrations incomplete |

**Rationale:**

```
```

---

## Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **UAT Tester** | | | |
| **UAT Lead** | | | |
| **Product Owner** | | | |

**Final decision:** ☐ Production ☐ Pilot ☐ Fixes required  
**Decision date:** _______________

---

## References

- [`HR_PAYROLL_UAT.md`](./HR_PAYROLL_UAT.md)  
- [`../guides/hr-payroll-uat-guide.md`](../guides/hr-payroll-uat-guide.md)  
- [`HR_PAYROLL_TESTER_QUICKSTART.md`](./HR_PAYROLL_TESTER_QUICKSTART.md)
