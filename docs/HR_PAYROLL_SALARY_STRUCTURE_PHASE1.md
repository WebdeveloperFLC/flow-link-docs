# HR Payroll — Salary Structure Phase 1 (Engine)

**Status:** Implemented locally — engine + schema only. UI cleanup deferred to Phase 2.  
**Do not publish** prior display-only UI branch; ship these migrations first.

---

## Updated migration list

| Order | File | Purpose |
|-------|------|---------|
| 1 | `20260728120000_hr_payroll_salary_structure_statutory.sql` | Employee columns + `payroll_lines` breakdown columns |
| 2 | `20260729120000_hr_payroll_salary_structure_engine.sql` | Resolver, extended compute, line builder |

**Depends on:** `20260727120000_hr_payroll_phase_c_earned_days_engine.sql` (current `fn_compute_payroll` / `fn_build_payroll_line`).

**Lovable Publish:** Approve both migrations in order after sync.

---

## Impacted SQL functions

| Function | Change |
|----------|--------|
| **`fn_resolve_employee_salary_structure(uuid, pt_default)`** | **NEW** — monthly structure from employee master |
| **`fn_employee_salary_structure_enabled(uuid)`** | **NEW** — gate (`salary_structure_enabled` AND India) |
| **`fn_compute_payroll(...)`** | **EXTENDED** — optional `p_structure`, `p_structure_enabled`; legacy branch unchanged |
| **`fn_build_payroll_line(uuid, uuid)`** | **UPDATED** — resolves structure, passes to compute, persists breakdown columns + `calc_snapshot` |
| `fn_rebuild_cycle_lines` | Indirect — calls `fn_build_payroll_line` |
| `fn_process_payroll_cycle` | Indirect — unchanged logic |
| `fn_compare_payroll_formulas` | Unchanged (structure not in parallel compare yet) |
| Rollup functions (`fn_rollup_inputs*`) | **Unchanged** |

---

## New `employees` columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `salary_package` | numeric(12,2) | null | CTC (monthly) |
| `bonus_percentage` | numeric(5,2) | null | NULL until configured; engine uses 8.33 when structure ON |
| `other_allowances` | numeric(12,2) | 0 | |
| `employer_pf_applicable` | boolean | false | Backfilled from `pf_applicable` |
| `employer_esic_applicable` | boolean | false | Backfilled from `esic_applicable` |
| `employee_pf_pct` | numeric(5,2) | 12 | |
| `employer_pf_pct` | numeric(5,2) | 12 | |
| `employee_esic_pct` | numeric(5,3) | 0.75 | |
| `employer_esic_pct` | numeric(5,2) | 3.25 | |
| `professional_tax_amount` | numeric(12,2) | null | Override; else org policy |
| **`salary_structure_enabled`** | boolean | **false** | **Master switch** |

---

## New `payroll_lines` columns

| Column | Type | Notes |
|--------|------|-------|
| `salary_structure_mode` | boolean | Snapshot: structure used for this line |
| `salary_package` | numeric(12,2) | CTC |
| `structure_basic` | numeric(12,2) | Pro-rated cycle value |
| `structure_hra` | numeric(12,2) | Pro-rated |
| `structure_conveyance` | numeric(12,2) | Pro-rated |
| `structure_bonus` | numeric(12,2) | Pro-rated from bonus % |
| `structure_other_allowances` | numeric(12,2) | Pro-rated |
| `total_earnings_a` | numeric(12,2) | Cycle Total (A) = `gross_earned` when structure ON |
| `employer_pf` | numeric(12,2) | Cycle employer PF |
| `employer_esic` | numeric(12,2) | Cycle employer ESIC |
| `total_employer_cost_b` | numeric(12,2) | **Monthly** Total (B) — not pro-rated |
| `structure_difference` | numeric(12,2) | **Monthly** CTC − A − B — not pro-rated |
| `calc_snapshot` | jsonb | Full `fn_compute_payroll` output |

When `salary_structure_mode = false`, structure columns remain 0/null; legacy columns drive UI.

---

## Engine behaviour summary

### Structure ON (`salary_structure_enabled = true`, India)

- Wage base = **Total Earnings (A)** from components (pro-rated per payable days).
- **Bonus** = `basic × bonus_percentage / 100` — legacy `employees.bonus` **ignored**.
- **Employee PF** = `min(pro_rated_basic, ceiling) × employee_pf_pct`.
- **Employee ESIC** = `gross_earned × employee_esic_pct` if `total_earnings_a ≤ 21000`.
- **PT** = `professional_tax_amount` or org policy default.
- **Employer PF/ESIC** persisted on line; not deducted from net.
- **Difference** = monthly CTC − (monthly A + monthly B).

### Structure OFF (default — all existing employees)

- Identical to pre-Phase-1 engine (TV01–TV33).

### Unchanged

- Payable days, late, mispunch, UL, sandwich, comp-off, OT, earned vs legacy formula.
- Canada CPP/EI path.

---

## TypeScript mirror

| File | Role |
|------|------|
| `src/hr-payroll/lib/payrollEngineLogic.ts` | CI mirror: `resolveEmployeeSalaryStructure`, structure branch in `computePayroll`, vectors TV-STRUCT-01–05 |
| `qa/hr-payroll/salaryStructureEngine.test.ts` | Structure engine tests |

**Phase 2 (not in this ship):** Remove `salaryStructure.ts` client calc from UI; read `payroll_lines` only.

---

## Rollback strategy

### Level 1 — Disable per employee (no schema rollback)

```sql
UPDATE employees SET salary_structure_enabled = false WHERE id = '<employee_id>';
-- Reset Draft cycle and re-process
```

Legacy engine path immediately restored for that employee.

### Level 2 — Disable org-wide

```sql
UPDATE employees SET salary_structure_enabled = false;
```

Re-process open cycles. Locked/paid lines retain historical snapshots.

### Level 3 — Function rollback (deploy previous migration body)

Re-apply `fn_compute_payroll` and `fn_build_payroll_line` from `20260727120000_hr_payroll_phase_c_earned_days_engine.sql` via a new forward migration (do not delete history).

New columns on `employees` / `payroll_lines` are additive — safe to leave in place.

### Level 4 — Full schema rollback (last resort)

Only if migrations not yet in production:

```sql
ALTER TABLE payroll_lines DROP COLUMN IF EXISTS calc_snapshot, ...;
ALTER TABLE employees DROP COLUMN IF EXISTS salary_structure_enabled, ...;
DROP FUNCTION IF EXISTS fn_resolve_employee_salary_structure(uuid, numeric);
DROP FUNCTION IF EXISTS fn_employee_salary_structure_enabled(uuid);
-- Restore fn_compute_payroll / fn_build_payroll_line from Phase C migration
```

---

## UAT test matrix

### Backward compatibility (must pass before structure UAT)

| ID | Steps | Expected |
|----|-------|----------|
| BC-01 | Employee with `salary_structure_enabled = false`, process full month | Same net as before (TV02 baseline) |
| BC-02 | Locked cycle from before migration | Opens normally; structure columns 0/false |
| BC-03 | Canada employee, structure fields filled | CPP/EI unchanged; structure ignored |
| BC-04 | Golden vectors TV01–TV33 in CI | All pass |

### Structure activation

| ID | Steps | Expected |
|----|-------|----------|
| ST-01 | Enable structure, set CTC 55062 / Basic 27500 / HRA 11000 / Bonus 8.33%, process 30/30 | `total_earnings_a = 40791`, bonus 2291, diff 12471 |
| ST-02 | Change Basic to 30000, re-process Draft | Bonus 2499, Total A 43499, PF still 1800 (ceiling) |
| ST-03 | Employee PF % = 10% | PF = 1500 on 15k wage |
| ST-04 | ESIC on Total A = 18000 | ESIC = 135 (0.75%) |
| ST-05 | PT override ₹300 | `pt_employee = 300` |
| ST-06 | Mid-month joiner payable 15/30 | Components pro-rated 50% |
| ST-07 | Legacy `bonus` field = 5000 with structure ON | Line `bonus = 0`; not in net |

### Cross-surface (Phase 2 — after UI reads lines)

| ID | Steps | Expected |
|----|-------|----------|
| XS-01 | Verify / Register / Slip / ESS same cycle | All amounts match `payroll_lines` |
| XS-02 | Bank export | Net = `net_salary` |

### Attendance isolation

| ID | Steps | Expected |
|----|-------|----------|
| AT-01 | 3 mispunch, structure ON vs OFF same employee gross components | Same payable days; only wage base differs |

---

## Phase 2 checklist (awaiting separate approval)

- [ ] Employee Master: set `salary_structure_enabled` on save + CTC validation warning
- [ ] Remove `buildPayrollSalaryStructure()` from Verify, Register, Slip, Export
- [ ] Read structure columns from `payroll_lines` only
- [ ] Update `PayrollLineRow` TypeScript types from DB
- [ ] Calculator page: pass structure to RPC

---

## Files in this Phase 1 ship

```
supabase/migrations/20260728120000_hr_payroll_salary_structure_statutory.sql
supabase/migrations/20260729120000_hr_payroll_salary_structure_engine.sql
src/hr-payroll/lib/payrollEngineLogic.ts
qa/hr-payroll/salaryStructureEngine.test.ts
qa/hr-payroll/module-contract.test.ts
docs/HR_PAYROLL_SALARY_STRUCTURE_PHASE1.md
```

**Excluded:** Display-only UI changes (`salaryStructure.ts` consumers, EmployeeFormModal structure UI, etc.).
