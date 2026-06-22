# HR Payroll Phase C — Locked Business Specification

**Status:** Canonical source of truth for Phase C earned-days engine  
**Authority:** All SQL (`fn_apply_priority_matrix_c17`, rollups, compute), TypeScript (`earnedDaysResolver.ts`, `payrollEngineLogic.ts`), and QA tests **must** implement this document exactly.  
**Do not** redefine priority order in code comments or alternate helpers.

**Deploy default:** `formula_mode = legacy` — production payable unchanged until explicit cutover approval.

---

## 1. Locked decisions C1–C7

| ID | Rule |
|----|------|
| **C1** | Worked Week Off / Holiday (Present or Half Day) + approved Comp Off on the same `worked_date` = **additive** credits. **`day_credit = LEAST(base + comp_off_bonus, 2.0)`**. |
| **C2** | Approved **Half Day** paid leave + attendance **Half Day** on the same date = **1.0** day credit (not 0.5 + 0.5 error). |
| **C3** | **Holiday wins over Unauthorized Leave** — Holiday date earns **+1.0**; UL deduction does **not** apply for that date. |
| **C4** | **Remove Absent from mispunch bucket** — mispunch count uses **`is_mispunch = true` only** (earned mode). |
| **C5** | **No late deduction** when attendance status = **Half Day** (earned mode). |
| **C6** | **Sandwich leave deduction** applies only when `policies.payroll.sandwich_enabled = true`. |
| **C7** | Payroll uses **eligible employment dates only** within the cycle. **`payroll_days_effective`** drives **`daily_rate`** in earned mode. |

---

## 2. Daily credit cap

```
day_credit = LEAST(resolved_base_credit + comp_off_bonus, 2.0)
```

No scenario may exceed **2.0** earned days for a single calendar date.

---

## 3. Comp-off credit rule (RC-2)

- Comp-off value is applied **only** through the daily priority matrix (C1 bonus).
- **`comp_off` on rollup JSON** is an **audit count** of approved comp-off requests in the cycle — it is **never** added again to `attendance_earned` or `payable_days` in earned mode.
- Legacy mode retains the historical `+ comp_off` term in `fn_compute_payroll` unchanged.

---

## 4. Joiner / exiter (C7)

```
eligible_from = GREATEST(cycle.start_date, employee.date_of_joining)
                -- if date_of_joining IS NULL → cycle.start_date

eligible_to   = LEAST(cycle.end_date, COALESCE(employee.exit_date, cycle.end_date))

eligible_calendar_days =
  COUNT(d) WHERE d BETWEEN eligible_from AND eligible_to

payroll_days_effective =
  IF eligible_from = cycle.start_date AND eligible_to = cycle.end_date
    THEN cycle.payroll_days
    ELSE eligible_calendar_days
```

Dates outside `[eligible_from, eligible_to]` earn **0** and contribute **0** to late/mispunch/UL counts (earned mode).

---

## 5. Priority matrix (per eligible date)

Apply in order; **first matching row wins** for base credit. Then apply C1 comp-off bonus and cap.

| Step | Condition | Base credit | Notes |
|------|-----------|-------------|-------|
| P0 | `work_date` outside eligible window | 0 | C7 |
| P1 | Attendance status = **Holiday** | 1.0 | C3 — UL ignored for this date |
| P2 | Approved paid **Half Day** leave on date **and** attendance = **Half Day** | 1.0 | C2 |
| P3 | Attendance = **Week Off** (not worked) | 1.0 | |
| P4 | Attendance = **Present** | 1.0 | Includes worked WO/Holiday (Present on off day) |
| P5 | Attendance = **Half Day** (and P2 did not apply) | 0.5 | |
| P6 | Attendance = **Leave** or **Sick Leave** | 1.0 | |
| P7 | Approved paid leave request covers date (no P1–P6 credit yet) | 1.0 or 0.5 | From request `days` / `duration_type` |
| P8 | Attendance = **Unauthorized Leave** | 0 | UL counted at cycle level |
| P9 | Attendance = **Absent** or no row | 0 | |

**C1 bonus (after base):**

```
IF approved compoff_requests.worked_date = work_date
   AND status = 'Approved'
   AND (base from P4 Present on WO/Hol OR P4 Present on Holiday OR worked Half on WO/Hol):
  comp_off_bonus = LEAST(1.0, 2.0 - base)
ELSE:
  comp_off_bonus = 0

day_credit = LEAST(base + comp_off_bonus, 2.0)
```

**Worked WO/Holiday detection:** `(status IN ('Present','Half Day')) AND (status = 'Holiday' OR status = 'Week Off' OR fn_is_weekly_off_day(org, employee, date))`

---

## 6. Earned formula (earned mode only)

```
attendance_earned = SUM(day_credit) over eligible dates

payable_days = attendance_earned
             − late_deduction_days       (C5)
             − mispunch_deduction_days   (C4)
             − (ul_count × ul_multiplier)
             − unpaid_training_days
             − sandwich_deduction        (C6; 0 if sandwich_enabled = false)

daily_rate   = ROUND(monthly_gross ÷ payroll_days_effective, 2)

gross_earned = ROUND(daily_rate × payable_days, 2)

net_salary   = gross_earned + incentive + bonus + ot_pay − statutory deductions
```

**No `+ comp_off` term in earned payable formula.**

---

## 7. Deduction formula (earned mode)

| Deduction | Source |
|-----------|--------|
| Late | Count eligible dates where late mark applies (C5: exclude Half Day) → `fn_late_deduction` |
| Mispunch | Count eligible dates where `is_mispunch = true` only (C4) → `fn_mispunch_deduction` |
| UL | Count eligible dates with status Unauthorized Leave × `ul_multiplier` |
| Sandwich | Sum `is_sandwich` on approved leave requests in cycle if C6 enabled |
| Unpaid training | Sum `training_records.unpaid_days` (unchanged) |

---

## 8. Legacy formula (unchanged — RC-1)

Legacy mode **must** preserve pre–Phase C behaviour exactly:

```
payable_days = payroll_days − leaves + paid_leaves + comp_off
             − late_ded − (ul × mult) − sandwich − mispunch_ded − unpaid_training

daily_rate   = monthly_gross ÷ payroll_days

gross_earned = daily_rate × payable_days
```

Legacy rollup uses **Absent + is_mispunch** in mispunch bucket and **includes Half Day in late counts** — unchanged from migration `20260722120000`.

---

## 9. Dual-path architecture (RC-1)

| Function | Role |
|----------|------|
| `fn_rollup_inputs_legacy` | Frozen copy of pre–Phase C rollup |
| `fn_rollup_inputs_earned` | C1–C7 per-day loop |
| `fn_rollup_inputs` | Routes on `formula_mode` |
| `fn_compute_payroll` | Routes on `formula_mode`; legacy body unchanged |

**No shared late/mispunch counting between legacy and earned paths.**

---

## 10. Cutover requirements

Phase C deploys with **`formula_mode = legacy`** for all orgs.

Cutover to `earned` requires **all** of:

1. Parallel validation (`fn_compare_payroll_formulas`) reviewed by HR  
2. UAT PC-01–PC-11 and JE-01–JE-06 passed on staging  
3. Phase A/B migrations published on Supabase  
4. Explicit written approval: **“Approve Phase C cutover to earned mode”**

---

## 11. Reference

- Related: `docs/HR_PAYROLL_ATTENDANCE_ENGINE_REDESIGN.md` (naming map: redesign “Phase B earned” = product **Phase C**)
- Phase D.0: `docs/HR_PAYROLL_POLICY_AUDIT.md` — deferred; not in Phase C scope
