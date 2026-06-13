# Business Rules, Edge Cases & Payroll Test Vectors (v1)

**Source of truth:** `Final_Payroll_Formula_With_Mispunch.xlsx` → ported verbatim to `fn_compute_payroll` (`supabase/03_functions.sql`). The prototype JS engine and the SQL port were diff-tested across all 30 vectors below and agree exactly.

---

## 1. The payable-days formula

```
Payable = PayrollDays
        − Leaves
        + PaidLeaves
        + CompOff
        − LateDeduction(K)
        − (UnauthorizedLeave × 2)
        − SandwichLeave
        − MispunchDeduction(N)
        − UnpaidTrainingDays

DailyRate    = MonthlyGross ÷ PayrollDays
GrossEarned  = round(DailyRate × Payable)
PF(employee) = pf_applicable ? round(min(Basic,15000) × 12%) : 0
ESIC(employee)= esic_applicable AND MonthlyGross ≤ 21000 ? round(Gross × 0.75%) : 0
NetSalary    = GrossEarned + Incentive + Bonus − PF − ESIC
```

### 1a. Late deduction slab (K) — authoritative nested-IF
Use **this** table (from the Excel `IF` chain), **not** the prose table in the policy doc, which differs.

| Late comings | Deduction (days) |
|---|---|
| 1–3 | 0 |
| 4–6 | 0.5 |
| 7–9 | 1.0 |
| 10–12 | 1.5 |
| 13–15 | 2.0 |
| 16–18 | 2.5 |
| 19–21 | 3.0 |
| 22–24 | 3.5 |
| 25–27 | 4.0 |
| 28+ | 5.0 (cap) |

> "Late coming" counts a day only when check-in exceeds shift login **+ grace** (default 10:05). Within grace = not late.

### 1b. Mispunch deduction (N)
`N = mispunch ≤ 2 ? 0 : (mispunch − 2) × 0.5`. The "mispunch" counter is the Excel **"mispunch + absent"** column — i.e. missed-punch days and unexplained absents share the 2-free allowance.

---

## 2. Rule-by-rule reference

| Rule | Spec | Where enforced |
|---|---|---|
| Working hours | 9h incl. 45m lunch; report 10:00, grace → 10:05 | `shifts` row |
| Half day | Check-in later than `half_day_after_min` (default 60m) past login | `fn_derive_status` |
| Leave entitlement | 6-Day week: 18/yr (1.5/mo accrual). 5-Day: 10/yr. Sick capped 8/yr. | `leave_balances`, policy |
| Probation | First 3 months: **no paid leave**; leaves in this window are unpaid | business logic (v1.1, see gaps) |
| Unauthorized leave (UL) | Counts ×2 against payable | formula |
| Sandwich leave | Leave bridging an off-day/holiday counts the off-day too; ×1; **cap 2/yr** | `leave_requests.is_sandwich` (manual v1; auto v1.1) |
| Comp-off | Worked on off-day/holiday → +1 payable once **approved** | `compoff_requests` |
| Late exemption | Approved exemption removes one late (delay beyond grace) before the slab | `fn_rollup_inputs` |
| Mispunch regularization | 2 free/month; approval removes one mispunch | `fn_rollup_inputs` |
| Training | Up to **7 unpaid** training days reduce payable | `training_records.unpaid_days` |
| Holiday | National/Festival/Company always payable; **Optional** configurable | `holidays.type` |
| PF | 12% of basic, basic capped at ₹15,000 wage | `fn_compute_payroll` |
| ESIC | 0.75% of gross, only if monthly ≤ ₹21,000 | `fn_compute_payroll` |

---

## 3. Edge cases (must be covered in code + UAT)

1. **Cycle length varies** (28/30/31). Daily rate uses `payroll_days`, not calendar days. Feb → 28.
2. **One-sided punch** (in xor out) → day stays counted but `is_mispunch=true`. Never silently mark Absent.
3. **Late exemption count > actual late** → clamp at 0 (no negative late).
4. **Mispunch approvals > raw mispunch** → clamp at 0.
5. **Payable can exceed payroll_days** (comp-off + paid leave) — allowed; do not cap unless policy says so.
6. **Payable can go negative** in pathological stress input (TV30 is intentionally heavy). Engine does not floor at 0 — flag for HR review in UI when payable < 0.
7. **Override freezes inputs**: an overridden line ignores roll-up until override cleared (parity with prototype).
8. **Locked cycle**: `fn_build_payroll_line` refuses to rebuild; attendance edits after lock do **not** change a locked line (snapshot columns preserve it).
9. **ESIC default hardened**: prototype treated unset ESIC as applicable; schema makes `esic_applicable` an explicit boolean default **false**. Migrating seed data must set it per employee.
10. **Sandwich cap (2/yr)** and **sick cap (8/yr)** are annual — enforced against `leave_balances`, not per-cycle.
11. **Probation + paid leave**: a paid-leave request inside probation must resolve to unpaid in the roll-up.
12. **Timezone**: punches stored in branch timezone (Asia/Kolkata); cross-midnight night shifts need date-attribution rule (assign to login date).

---

## 4. 30 payroll test vectors (engine == Excel)

All values are produced by `fn_compute_payroll`. Use as a golden-file test: load inputs, assert outputs.
ESIC column assumes `esic_applicable` only where the scenario sets it; PF assumes applicable unless TV26.

| ID | Scenario | Days | Monthly | Basic | Lv | PaidLv | Late | Mis | UL | Sand | C/Off | Train | K | N | Payable | Daily | Gross | PF | ESIC | **Net** |
|----|----------|------|---------|-------|----|--------|------|-----|----|------|-------|-------|---|---|---------|-------|-------|----|----|---------|
| TV01 | Perfect month, no deductions | 30 | 42000 | 21000 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **30** | 1400 | 42000 | 1800 | 0 | **40200** |
| TV02 | Excel ref: Isha mispunch+absent=3 | 30 | 42000 | 21000 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0.5 | **29.5** | 1400 | 41300 | 1800 | 0 | **39500** |
| TV03 | Late slab boundary =3 (no ded) | 30 | 30000 | 15000 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **30** | 1000 | 30000 | 1800 | 0 | **28200** |
| TV04 | Late slab boundary =4 (0.5) | 30 | 30000 | 15000 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0.5 | 0 | **29.5** | 1000 | 29500 | 1800 | 0 | **27700** |
| TV05 | Late slab =6 (0.5) | 30 | 30000 | 15000 | 0 | 0 | 6 | 0 | 0 | 0 | 0 | 0 | 0.5 | 0 | **29.5** | 1000 | 29500 | 1800 | 0 | **27700** |
| TV06 | Late slab =7 (1.0) | 30 | 30000 | 15000 | 0 | 0 | 7 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | **29** | 1000 | 29000 | 1800 | 0 | **27200** |
| TV07 | Late slab =27 (4.0) | 30 | 30000 | 15000 | 0 | 0 | 27 | 0 | 0 | 0 | 0 | 0 | 4 | 0 | **26** | 1000 | 26000 | 1800 | 0 | **24200** |
| TV08 | Late slab =28 (5.0 cap) | 30 | 30000 | 15000 | 0 | 0 | 28 | 0 | 0 | 0 | 0 | 0 | 5 | 0 | **25** | 1000 | 25000 | 1800 | 0 | **23200** |
| TV09 | Late slab huge =45 (5.0 cap) | 30 | 30000 | 15000 | 0 | 0 | 45 | 0 | 0 | 0 | 0 | 0 | 5 | 0 | **25** | 1000 | 25000 | 1800 | 0 | **23200** |
| TV10 | Mispunch =2 (free, no ded) | 30 | 36000 | 18000 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | **30** | 1200 | 36000 | 1800 | 0 | **34200** |
| TV11 | Mispunch =3 (0.5) | 30 | 36000 | 18000 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0.5 | **29.5** | 1200 | 35400 | 1800 | 0 | **33600** |
| TV12 | Mispunch =5 (1.5) | 30 | 36000 | 18000 | 0 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 1.5 | **28.5** | 1200 | 34200 | 1800 | 0 | **32400** |
| TV13 | UL =1 (x2 = -2 days) | 30 | 40000 | 20000 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | **28** | 1333.33 | 37333 | 1800 | 0 | **35533** |
| TV14 | UL =2 (x2 = -4 days) | 30 | 40000 | 20000 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | **26** | 1333.33 | 34667 | 1800 | 0 | **32867** |
| TV15 | Sandwich =1 (-1 day) | 30 | 40000 | 20000 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | **29** | 1333.33 | 38667 | 1800 | 0 | **36867** |
| TV16 | Sandwich =2 cap (-2 days) | 30 | 40000 | 20000 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | **28** | 1333.33 | 37333 | 1800 | 0 | **35533** |
| TV17 | Paid leave 2 (added back) | 30 | 40000 | 20000 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **30** | 1333.33 | 40000 | 1800 | 0 | **38200** |
| TV18 | Unpaid leave 2 (not added) | 30 | 40000 | 20000 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **28** | 1333.33 | 37333 | 1800 | 0 | **35533** |
| TV19 | Comp-off +1 | 30 | 40000 | 20000 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | **31** | 1333.33 | 41333 | 1800 | 0 | **39533** |
| TV20 | Comp-off +2 net of 1 leave | 30 | 40000 | 20000 | 1 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | **31** | 1333.33 | 41333 | 1800 | 0 | **39533** |
| TV21 | Training unpaid 7 (max) | 30 | 40000 | 20000 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 7 | 0 | 0 | **23** | 1333.33 | 30667 | 1800 | 0 | **28867** |
| TV22 | Combined: late7 mis3 ul1 sand1 | 30 | 42000 | 21000 | 0 | 0 | 7 | 3 | 1 | 1 | 0 | 0 | 1 | 0.5 | **25.5** | 1400 | 35700 | 1800 | 0 | **33900** |
| TV23 | ESIC applies (gross<=21000) | 30 | 18000 | 9000 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **30** | 600 | 18000 | 1080 | 135 | **16785** |
| TV24 | ESIC suppressed (monthly>21000) | 30 | 42000 | 21000 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **30** | 1400 | 42000 | 1800 | 0 | **40200** |
| TV25 | PF cap (basic 30000 -> wage 15000) | 30 | 60000 | 30000 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **30** | 2000 | 60000 | 1800 | 0 | **58200** |
| TV26 | PF not applicable | 30 | 42000 | 21000 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **30** | 1400 | 42000 | 0 | 0 | **42000** |
| TV27 | Incentive + Bonus added to net | 30 | 40000 | 20000 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **30** | 1333.33 | 40000 | 1800 | 0 | **45200** |
| TV28 | 28-day Feb cycle | 28 | 42000 | 21000 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **28** | 1500 | 42000 | 1800 | 0 | **40200** |
| TV29 | 31-day cycle, half-ish deductions | 31 | 46500 | 23250 | 0 | 0 | 10 | 4 | 0 | 0 | 0 | 0 | 1.5 | 1 | **28.5** | 1500 | 42750 | 1800 | 0 | **40950** |
| TV30 | Everything at once (stress) | 30 | 50000 | 25000 | 3 | 2 | 13 | 6 | 1 | 2 | 1 | 2 | 2 | 2 | **20** | 1666.67 | 33333 | 1800 | 0 | **36033** |

### Anchor checks
- **TV02** reproduces the Excel sample row (Isha, mispunch+absent = 3) → **29.5 payable**, ₹39,500 net.
- **TV08/TV09** confirm the slab caps at 5.0 for any late ≥ 28.
- **TV25** confirms PF wage cap (basic ₹30,000 → PF on ₹15,000 = ₹1,800).
- **TV24** confirms ESIC suppressed when monthly > ₹21,000 even if flagged applicable.
- **TV30** is the all-rules stress case; verify no exception and the audit/review flag fires if payable trends low.

---

## 5. Implementation note for Cursor
Do **not** re-implement the formula in TypeScript. The client calls a Postgres RPC (`fn_build_payroll_line`) or reads the `payroll_lines` table / a `v_payroll_preview` view. Keeping the maths server-side is what guarantees the Excel parity above and prevents float drift between browser and DB.
