# HR Payroll Engine Redesign — Attendance-Based Payroll

**Status:** Implementation plan for approval — **no payroll formula changes implemented**  
**Date:** 2026-06-19  
**Related:** `docs/HR_PAYROLL_POLICY_AUDIT.md`

---

## Executive Summary

The payroll engine today uses **Payroll Cycle Days** as the **starting payable base** and applies attendance-driven **deductions**. Approved business rules require:

1. **Keep** `daily_rate = monthly_salary ÷ payroll_cycle_days` (from cycle config, not hardcoded 30).
2. **Change** payable days to an **attendance-earned sum minus deductions** model.
3. **Redesign** status derivation to use **check-in + check-out + worked hours** (not check-in only).
4. **Automate** Weekly Off and strengthen Holiday automation before earned-days payroll is accurate.

**Risk if earned-days ships without automation:** Under-payment when Week Off / Holiday rows are missing (common today).

**Recommended phasing:** Phase A (status + automation) → Phase B (earned formula) → Phase C (reports/UI parity) → Phase D (parallel validation + cutover).

---

## 1. Approved Business Rules (Locked)

### 1.1 Payroll Cycle Days (divisor — unchanged)

```
daily_rate = monthly_gross ÷ payroll_cycle_days
```

- `payroll_cycle_days` from `payroll_cycles.payroll_days` (HR Config → Payroll Cycle).
- No hardcoded 30; supports 28/30/31 per cycle.

### 1.2 Attendance earned days

| Component | Earned credit |
|-----------|---------------|
| Present | 1.0 |
| Half Day | 0.5 |
| Holiday | 1.0 |
| Week Off | 1.0 |
| Approved Paid Leave | 1.0 per approved day |
| Approved Comp-Off | 1.0 per approval |

### 1.3 Deductions (from earned base)

| Deduction | Source today |
|-----------|--------------|
| Unauthorized Leave | Attendance `Unauthorized Leave` row count × multiplier |
| Sandwich Leave | Approved leave requests with `is_sandwich` |
| Late Deductions | Late mark count → slab days |
| Mispunch Deductions | Mispunch count → policy formula |
| Unpaid Training Days | `training_records.unpaid_days` sum |
| Other Payroll Deductions | Employee `other_deductions`, Canada policy, TDS path |

### 1.4 Proposed payable formula

```
attendance_earned =
    present_count
  + half_day_count × 0.5
  + holiday_count
  + week_off_count
  + paid_leave_days          -- approved requests, non-Unpaid
  + comp_off_count           -- approved compoff_requests

payable_days =
    attendance_earned
  − unauthorized_leave_deduction    -- see §7.1 (days vs multiplier)
  − sandwich_deduction
  − late_deduction_days
  − mispunch_deduction_days
  − unpaid_training_days
  − other_payroll_deduction_days      -- if modeled as day-equivalents

gross_earned = round(daily_rate × payable_days)
net_salary   = gross_earned + incentive + bonus + ot_pay − statutory deductions
```

**Clarification needed before build:** Whether UL subtracts **earned days (1 per row)** **and** applies `ul_multiplier`, or only one mechanism. Plan assumes: **UL rows contribute 0 to earned**; deduction = `ul_count × ul_multiplier` (current behavior preserved).

---

## 2. Current Formula vs Proposed Formula

### 2.1 Current (`fn_compute_payroll` + `fn_build_payroll_line`)

**Authoritative SQL:** `20260717120031_hr_payroll_shift_salary_offshift_split.sql`, `20260717120022_hr_payroll_phase2c_rbac_snapshots.sql`

```
payable_days =
    payroll_days
  − leaves_taken              -- attendance Leave + Sick Leave row count
  + paid_leaves               -- sum approved paid leave request days
  + comp_off
  − late_deduction
  − (ul_count × ul_mult)
  − sandwich_count
  − mispunch_deduction
  − unpaid_training

daily_rate   = monthly_gross ÷ payroll_days
gross_earned = round(daily_rate × payable_days)
```

**Rollup (`fn_rollup_inputs`) computes but does NOT feed payroll:**

- `working` = Present + 0.5×Half Day
- `week_off` = Week Off + Holiday count
- `off_shift_minutes`, `shift_work_minutes`, `ot_minutes`

### 2.2 Proposed (approved)

See §1.4. Divisor unchanged; **base switches from `payroll_days` to `attendance_earned`**.

### 2.3 Behavioral deltas (examples)

| Scenario | Current payable (30-day cycle, ₹30k) | Proposed |
|----------|--------------------------------------|----------|
| Perfect month, all Present, 4 Sundays marked Week Off | 30 (if no deductions) | ~26 Present + 4 WO = 30 if all days stamped |
| Perfect month, Sundays **not** marked | 30 | ~26 earned → **under-pay** |
| 2 Half Days, rest Present, 4 WO | 30 | 26 + 1 + 4 = 31 before deductions |
| 3 mispunch (0 free policy) | 29.5 | earned − 1.5 mispunch deduction |
| 1 UL (×2 mult) | −2 from base of 30 | earned − 2 (if UL not in earned) |

---

## 3. Attendance → Payroll Mapping

| Status / outcome | Generated how | Payroll today | Recommended earned | Deduction |
|------------------|---------------|---------------|-------------------|-----------|
| Present | `fn_derive_status` (check-in only today) | Indirect via fixed base | +1.0 | Late marks → slab |
| Half Day | Late check-in > half threshold | Rollup +0.5 only | +0.5 | — |
| Absent | No punches / very late check-in | Mispunch bucket | 0 | Mispunch if applicable |
| Leave | HR / workflow | −1 `leaves_taken` | +1 if paid leave aligned | — |
| Sick Leave | Same | Same | +1 if paid | — |
| Paid Leave | `leave_requests` (not att_status) | `+paid_leaves` | +approved days | — |
| Unpaid Leave | `leave_requests` Unpaid | −1 if att Leave | 0 | — |
| Holiday | `fn_apply_holidays_for_date` / manual | Neutral | +1.0 | — |
| Week Off | **Manual** today | Neutral | +1.0 | — |
| Unauthorized Leave | Manual status | `ul × mult` | 0 | `ul × mult` |
| Comp-Off | `compoff_requests` | +count | +1 per approval | — |
| Late Mark | check-in > login+grace | Late slab days | — | Late slab |
| Mispunch | `is_mispunch` + Absent in rollup | Mispunch formula | — | Mispunch formula |
| Training | `training_records` | −unpaid_days | — | unpaid_days |

**Double-counting rule:** Attendance `Leave`/`Sick Leave` rows should **not** add to earned **if** the same days are already in `paid_leave_days` from requests. Prefer **request-driven paid leave** + attendance status sync on approval.

---

## 4. Attendance Status Generation — Current vs Proposed

### 4.1 Current (`fn_derive_status` — `20260717120040_hr_payroll_punch_24h_all_shifts.sql`)

| Input used | Used? |
|------------|-------|
| Check-in time | Yes — primary for Half/Absent |
| Check-out time | Only for mispunch detection (older migrations); v40 uses in+out for Present when out missing |
| Worked hours (in−out−break) | **No** |
| Shift login/logout | Yes — in-shift window |
| Grace minutes | **No** for status (only late marks in rollup) |
| `half_day_after_min` | Yes — minutes **after login** |
| `full_day_after_min` | Yes — minutes **after login** |
| `work_hours` | **No** |

**Off-shift check-in:** Status stays **Present** (no half/absent from late rules).

### 4.2 Approved model (hours-based)

```
net_worked_hours = (check_out − check_in) − break_minutes   -- handle overnight in shift TZ

IF no check_in AND no check_out → Absent (or Week Off/Holiday if stamped)
IF mispunch (one-sided punch) → policy: Half Day or Absent + mispunch flag

required_hours     = shifts.work_hours (or derived from login−logout−break)
half_day_threshold = required_hours × 0.5   -- or policy override / shifts.half_day_hours
full_day_threshold = policy minimum for Present (e.g. required − grace band)

IF net_worked_hours >= required_hours − grace_band → Present
ELSIF net_worked_hours >= half_day_threshold → Half Day
ELSE → Absent
```

**Late arrival:** Optional secondary rule — if check-in > login + grace but hours sufficient → Present + late mark (not Half Day).

### 4.3 Example validation (shift 10:00–19:00, 9h required, 45m break, half = 4.5h)

| Check-in | Check-out | Net hours | Current status | **Proposed** |
|----------|-----------|-----------|----------------|--------------|
| 10:05 | 19:10 | ~8.75h | Present | Present |
| 10:00 | 14:00 | ~3.25h | **Present** | **Half Day** |
| 13:00 | 15:00 | ~2h | Half Day (late in) | **Absent** |

### 4.4 Gaps to close

| Gap | Priority |
|-----|----------|
| Checkout / hours ignored for status | P0 |
| `fn_rollup_inputs` uses current `shift_id`, not `fn_employee_shift_at(date)` | P0 |
| No half-day hours config on shift (only minutes-after-login) | P1 |
| Late policy vs shift threshold duplication | P1 |
| Protected statuses must remain (WO, Holiday, UL, approved Leave) | P0 |

**New function:** `fn_derive_status_v2(...)` + update `trg_attendance_derive`; feature flag via policy `attendance.status_mode: check_in_only | hours_based`.

---

## 5. Weekly Off Automation — Design (not implemented)

### 5.1 Current

- Status exists in enum; **manual** HR/import/seed.
- Rollup counts `Week Off` + `Holiday` as `week_off`.
- **Not** in payable formula today.
- `work_week` on employee from shift `working_days_per_week` (≥6 → 6-Day, else 5-Day).
- **No** auto calendar function.

### 5.2 Proposed design

**Table / policy:** `policies` domain `weekly_off` OR columns on `shifts`:

```json
{
  "six_day_off_weekdays": ["Sunday"],
  "five_day_off_weekdays": ["Saturday", "Sunday"],
  "respect_shift_history": true,
  "category_overrides": [
    { "category_code": "part_time", "off_weekdays": ["Sunday"] }
  ]
}
```

**Function:** `fn_apply_weekly_offs_for_cycle(p_org uuid, p_cycle uuid)`

1. For each active employee and each date in `[start_date, end_date]`:
2. Resolve shift: `fn_employee_shift_at(employee_id, date)`.
3. Resolve work week from shift `working_days_per_week` or `employees.work_week`.
4. If date weekday in off list → upsert attendance `(status = 'Week Off', source = 'system')`.
5. **Do not overwrite** Present/Half Day/Leave/UL if employee already worked (comp-off path).
6. Optional: skip if Holiday already applied.

**Scheduling:** Run on payroll process (Draft rebuild) or nightly job + manual “Apply week offs” in Config.

**Migration:** New function + policy seed; optional backfill for open cycles.

---

## 6. Holiday Automation — Impact Analysis

### 6.1 Current

- `fn_apply_holidays_for_date(org, date)` — stamps `Holiday`, `source=system`.
- Eligibility (`20260721120001`):
  - Branch match
  - Category tags on holiday (`permanent`, `probation`, …) OR legacy permanent employment type
  - Work week tags (`5-Day`, `6-Day`, `Day`)
- **Not** filtered by `payroll_country` on employee (holidays may have country on master — verify `holidays` schema in implementation).
- Rollup: counted in `week_off` with Week Off.
- Payable: **neutral** today → **+1 earned** in proposed model.

### 6.2 Gaps

| Gap | Impact |
|-----|--------|
| Manual trigger only (per date) | Missed holidays if HR doesn’t run apply | 
| No cycle-level batch | Payroll process should call `fn_apply_holidays_for_cycle` |
| Optional holiday type | Business rules mention Optional — need payable flag per holiday type |
| Conflict with Week Off | Same day: Holiday should win over Week Off |

### 6.3 Recommendation

- Add `fn_apply_holidays_for_cycle(org, cycle_id)` wrapping date loop.
- Add `holidays.is_payable` or use `holiday_type` (National/Festival/Company = payable; Optional = config).
- Invoke before weekly-off pass (Holiday > Week Off).
- Earned: +1 per Holiday row when payable.

---

## 7. Half Day — Implementation Impact

| Aspect | Today | After redesign |
|--------|-------|----------------|
| Generation | Check-in > login + 60 min (not hours) | Hours-based per §4.2 |
| Rollup `working` | +0.5 | Same |
| `payable_days` | **Not reduced** (full day pay common) | **+0.5 earned** |
| Net salary | Full day unless late/mispunch | `daily_rate × 0.5` less than full Present |
| Reports | `halfDays` in attendance summary | Add earned breakdown on payroll line |

**Tests:** New vectors for half-day earned; attendance register unchanged.

---

## 8. Policy Logic Audit

### 8.1 Unauthorized Leave

- **Count:** `fn_rollup_inputs` — `count(status = 'Unauthorized Leave')`.
- **Deduction:** `ul_count × ul_multiplier` (default mult 2 from `policies.sandwich_ul.ul_multiplier`).
- **Configurable:** Yes via Config → Sandwich & UL.
- **Hardcoded fallback:** mult = 2 in SQL `COALESCE`.

### 8.2 Sandwich Leave

- **Detection:** `fn_detect_sandwich_for_leave` — leave adjacent to Week Off/Holiday attendance.
- **Deduction:** `sandwich_count` = sum of `is_sandwich` on approved requests in cycle (each −1 day).
- **Configurable:** `sandwich_cap`, `half_day_exception` in policy.
- **Dead config:** `sandwich_mult` / `sandwich_multiplier` in UI/seed **not applied** in `fn_compute_payroll`.

### 8.3 Mispunch

- **Count:** `is_mispunch` rows + `Absent` rows − approved mispunch requests.
- **Deduction:** `fn_mispunch_deduction(mis, policy)` — default 2 free, then 0.5/day (`free_per_month`, `rate_after_free`).
- **Configurable:** `policies.mispunch`.

### 8.4 Late Deduction

- **Count:** check-in > login + grace (in shift window), excluding WO/Holiday/Leave/UL/Absent.
- **Deduction:** `fn_late_deduction(late, policy)` — `slab_table` or legacy CASE.
- **Configurable:** `policies.late` + `HrConfigPage` slab grid.
- **TS mirror:** `leavePolicy.ts` `DEFAULT_LATE_SLAB_TABLE`.

### 8.5 Training Deduction

- **Source:** `sum(training_records.unpaid_days)` where status ≠ Cancelled.
- **Cap:** trigger `trg_training_unpaid_cap` — max 7 unpaid days per employee.
- **Configurable:** Cap hardcoded 7 — recommend policy key.

---

## 9. Technical Impact Analysis

### 9.1 SQL functions impacted

| Function | Change type |
|----------|-------------|
| `fn_compute_payroll` | **Replace** payable branch |
| `fn_rollup_inputs` | Add earned components; per-day shift; optional earned JSON |
| `fn_build_payroll_line` | Pass earned fields; store breakdown |
| `fn_derive_status` | **New** `fn_derive_status_v2` (hours-based) |
| `trg_attendance_derive` | Call v2 when policy enabled |
| `fn_apply_weekly_offs_for_cycle` | **New** |
| `fn_apply_holidays_for_cycle` | **New** (batch) |
| `fn_rebuild_cycle_lines` | Pre-pass: holidays + week offs |
| `fn_process_payroll_cycle` | Order: stamp → rollup → compute |
| `fn_detect_sandwich_for_leave` | No formula change; depends on WO/Holiday rows |
| `fn_late_deduction` | Unchanged |
| `fn_mispunch_deduction` | Unchanged |
| `fn_capture_payroll_snapshots` | Include earned breakdown in `detail_json` |
| `v_payroll_preview` | Add earned columns or join snapshot |

### 9.2 Files impacted (application)

| Area | Files |
|------|--------|
| Engine TS | `src/hr-payroll/lib/payrollEngineLogic.ts` |
| Leave/late slabs | `src/hr-payroll/lib/leavePolicy.ts` |
| Types | `src/hr-payroll/lib/types.ts`, `src/integrations/supabase/types.ts` |
| API | `src/hr-payroll/lib/hrApi.ts` |
| Calculator | `src/hr-payroll/pages/HrCalculatorPage.tsx` |
| Verify | `src/hr-payroll/pages/HrVerifyPage.tsx` |
| Salary register | `src/hr-payroll/pages/HrSalaryRegisterPage.tsx` |
| ESS | `src/hr-payroll/pages/HrEssPage.tsx` |
| Attendance | `src/hr-payroll/pages/HrAttendancePage.tsx`, `attendanceRegister.ts`, `emp360Rollups.ts` |
| Export/slip | `src/hr-payroll/lib/payrollExport.ts`, `salarySlip.ts` |
| Reports | `src/hr-payroll/pages/reports/HrPayrollReportPage.tsx`, `HrAttendanceReportPage.tsx` |
| Emp 360 | `src/hr-payroll/pages/emp360/HrEmp360PayrollHistoryPage.tsx`, `Emp360PayrollHistoryTable.tsx` |
| Config | `src/hr-payroll/pages/HrConfigPage.tsx`, `moduleStructure.ts` |
| Hooks | `useHrPayroll.ts`, `useAttendanceActions.ts` |

### 9.3 Surface impact summary

| Surface | Impact |
|---------|--------|
| **Payroll processing** | High — rebuild order, earned breakdown, Draft-only automation |
| **Payroll verification** | High — show earned vs deductions columns |
| **Salary register** | High — payable days meaning changes |
| **ESS** | Medium — payable days + optional earned summary |
| **Employee 360 payroll** | Medium — historical lines differ post-cutover |
| **Payroll reports** | High — export columns |
| **Attendance register** | Low — status derivation changes half/absent |
| **Calculator** | High — inputs must include earned components |
| **Integration smoke** | High — TV02A, FL-CA01 anchors |

### 9.4 Database changes

| Change | Required |
|--------|----------|
| `payroll_lines.attendance_earned` numeric(6,2) | Recommended |
| `payroll_lines.earned_breakdown` jsonb | Recommended |
| `payroll_lines.week_off_count`, `holiday_count` | Optional |
| `shifts.half_day_hours` numeric | Optional (or derive from work_hours) |
| `policies` domain `weekly_off` | Recommended |
| `policies.attendance.status_mode` | Recommended |
| `holidays.is_payable` or type mapping | Optional |

### 9.5 Migrations (planned)

| ID | Migration | Phase |
|----|-----------|-------|
| M1 | `fn_derive_status_v2` + policy flag | A |
| M2 | `fn_apply_holidays_for_cycle` | A |
| M3 | `fn_apply_weekly_offs_for_cycle` + policy seed | A |
| M4 | `fn_rollup_inputs` earned fields + `fn_employee_shift_at` per day | B |
| M5 | `fn_compute_payroll` earned-base payable | B |
| M6 | `payroll_lines` columns + snapshot schema | B |
| M7 | `v_payroll_preview` update | C |
| M8 | Backfill job (optional WO/Holiday for past open cycles) | D |

### 9.6 Test changes

| Test file | Change |
|-----------|--------|
| `qa/hr-payroll/engine-vectors.test.ts` | **Replace** TV01–TV33 expected payable values |
| `qa/hr-payroll/payrollEngine.test.ts` | Earned-base inputs |
| `qa/hr-payroll/attendance-metrics.test.ts` | Status v2 scenarios |
| `qa/hr-payroll/integration-smoke.test.ts` | Update TV02A, FL-CA01 expected rows |
| `qa/hr-payroll/module-contract.test.ts` | New RPCs if exposed |
| New: `weekly-off.test.ts`, `status-v2.test.ts` | Automation + hours status |

---

## 10. Validation Framework

### 10.1 Current behavior

- Payable starts at `payroll_days`; WO/Holiday neutral; Half Day not in payable; status from check-in; WO manual.

### 10.2 Proposed behavior

- Payable = earned − deductions; divisor unchanged; WO/Holiday +1 earned; Half Day +0.5; status from hours; WO/Holiday auto-stamped.

### 10.3 Gap analysis

| # | Gap | Severity |
|---|-----|----------|
| G1 | Earned base not implemented | Blocker |
| G2 | WO not automated | Blocker for accurate earned |
| G3 | Holiday batch not on process | High |
| G4 | Status ignores checkout/hours | High |
| G5 | Rollup wrong shift for history dates | High |
| G6 | Leave double-count (att + requests) | Medium |
| G7 | `sandwich_mult` dead config | Low |
| G8 | Reports lack earned breakdown | Medium |

### 10.4 Risk analysis

| Risk | Mitigation |
|------|------------|
| Mass under-payment (missing WO) | Phase A automation before Phase B; validation report comparing old vs new payable |
| Mass over-payment (comp-off + WO same day) | Rules: worked day → Present; comp-off separate |
| Locked cycles change | Only rebuild Draft; snapshots preserve old formula version in `meta_json` |
| Canada statutory on new gross | Re-run vectors per country |
| ESS employee confusion | Show earned breakdown card |
| Performance (per-day shift resolve) | Batch rollup in single SQL; index `employee_shift_history` |

### 10.5 Migration plan

**Phase A — Foundation (no payable formula change)**

1. Deploy `fn_derive_status_v2` behind policy default `check_in_only`.
2. Deploy `fn_apply_holidays_for_cycle`, `fn_apply_weekly_offs_for_cycle`.
3. HR runs automation on Draft cycles; validate attendance register counts.
4. UAT: WO/Holiday row counts vs expected calendar.

**Phase B — Payroll formula (Draft cycles only)**

1. Deploy `fn_rollup_inputs` earned JSON.
2. Deploy new `fn_compute_payroll` payable branch behind `policies.payroll.formula_mode: legacy | earned`.
3. Default `legacy`; flip org to `earned` after parallel run sign-off.

**Phase C — UI & reports**

1. Verify, register, ESS, calculator, exports show earned breakdown.
2. Update `v_payroll_preview`.

**Phase D — Cutover**

1. Set `formula_mode = earned` for org.
2. Process next cycle; lock; compare to manual Excel.
3. Document cutover date in `payroll_cycle_snapshots.meta_json`.

**Rollback:** Set `formula_mode = legacy`; rebuild Draft lines.

### 10.6 Testing plan

| Layer | Tests |
|-------|--------|
| Unit | Status v2 hours matrix (≥10 cases); earned sum; deduction order |
| Golden | New TV suite `EV01–EV30` for earned-base |
| Integration | `v_payroll_preview` anchors; RPC rebuild line |
| E2E | Process cycle → verify → lock → export register |
| Parallel | SQL report: `old_payable`, `new_payable`, `delta` per employee for Draft cycle |
| Regression | Leave, sandwich, comp-off, UL, late, mispunch unchanged deduction math |

### 10.7 Backward compatibility

| Item | Impact |
|------|--------|
| Locked / Paid cycles | **No recalculation** — snapshots frozen |
| Processed cycles in Draft revert | Rebuild uses new formula if mode=earned |
| Historical reports | Payable meaning changes after cutover — label columns with `formula_version` |
| `input_snapshot` JSON | Add keys; old keys retained for audit |
| External exports (accounting) | Coordinate column additions |
| Lovable / Supabase | Publish migrations in order M1→M7 |

---

## 11. Implementation Plan (Phased Tasks)

### Phase A — Attendance accuracy & automation (Week 1–2)

| Task | Owner | Deliverable |
|------|-------|-------------|
| A1 | Design sign-off on hours-based status rules | Signed rule table in this doc |
| A2 | Implement `fn_derive_status_v2` + policy flag | Migration M1 |
| A3 | Implement `fn_apply_holidays_for_cycle` | Migration M2 |
| A4 | Design weekly-off policy schema | JSON schema in policy |
| A5 | Implement `fn_apply_weekly_offs_for_cycle` | Migration M3 |
| A6 | Wire `fn_rebuild_cycle_lines` pre-pass (Draft only) | SQL |
| A7 | Unit tests status + automation | QA |
| A8 | UAT attendance register vs calendar | Checklist |

### Phase B — Earned-base payroll (Week 3–4)

| Task | Deliverable |
|------|-------------|
| B1 | Implement `fn_compute_payroll_earned` branch | Migration M5 |
| B2 | Extend `fn_rollup_inputs` with earned breakdown | Migration M4 |
| B3 | Update `fn_build_payroll_line` | Migration M6 |
| B4 | Mirror in `payrollEngineLogic.ts` | TS |
| B5 | Feature flag `formula_mode` | Policy + Config UI |
| B6 | Parallel payable report RPC | `fn_compare_payroll_formulas(cycle)` |
| B7 | New golden vectors EV01–EV30 | QA |

### Phase C — UI & reports (Week 5)

| Task | Deliverable |
|------|-------------|
| C1 | Verify page earned breakdown | UI |
| C2 | Salary register + export columns | UI |
| C3 | ESS payable card | UI |
| C4 | Calculator earned inputs | UI |
| C5 | Payroll report + Emp 360 | UI |
| C6 | Update `v_payroll_preview` | Migration M7 |

### Phase D — Cutover (Week 6)

| Task | Deliverable |
|------|-------------|
| D1 | Parallel run on Draft cycle | Sign-off sheet |
| D2 | Flip `formula_mode` to `earned` | Config |
| D3 | Process + lock first earned cycle | Production |
| D4 | Update business rules doc | Docs |

---

## 12. Open Questions for Sign-off

1. **UL deduction:** Keep `count × mult` or change to earned-only (0 UL rows in earned)?
2. **Sandwich:** Subtract sandwich days when WO/Holiday already in earned? (avoid double penalty)
3. **Optional holidays:** Payable or not?
4. **Paid leave:** Earned from requests only, or attendance Leave rows too?
5. **Payable ceiling:** Cap at `payroll_days + comp_off` or allow higher?
6. **Payable floor:** Floor at 0?
7. **Category-specific week off:** Required for v1 or phase 2?
8. **Country on holidays:** Explicit `payroll_country` filter?

---

## 13. Approval Checklist

- [ ] Approved business rules §1 locked
- [ ] Hours-based status rules signed (§4.2)
- [ ] Weekly-off calendar rules signed (§5.2)
- [ ] Holiday payable rules signed (§6)
- [ ] Open questions §12 resolved
- [ ] Phase A authorized (automation + status, no payable change)
- [ ] Phase B authorized after Phase A UAT
- [ ] Parallel run criteria defined (max delta ₹ / employee?)

---

*End of implementation plan — awaiting approval before code changes.*
