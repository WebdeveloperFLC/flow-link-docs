# Statutory v1 Scope Statement

Defines exactly what statutory handling v1 does and does not cover, so finance/compliance sign off before build. The prototype implements employee-side PF and ESIC deductions at standard rates; this doc fixes the boundary.

## In scope (v1)

| Item | v1 behaviour | Source |
|---|---|---|
| **PF — employee contribution** | 12% of Basic, with Basic capped at ₹15,000 statutory wage ceiling → max ₹1,800. Toggle per employee (`pf_applicable`). | `fn_compute_payroll` |
| **ESIC — employee contribution** | 0.75% of gross earned, applicable only when monthly gross ≤ ₹21,000. Toggle per employee (`esic_applicable`). | `fn_compute_payroll` |
| PF/UAN/ESIC identifiers | Stored per employee (`pf_number`, `uan`, `esic_number`) for display and export. | `employees` |
| Deduction visibility | Shown on payroll register, ESS payslip line, and Accounting export. | `payroll_lines` |
| Per-employee applicability | Both PF and ESIC are explicit booleans; defaults: PF on, ESIC off (hardened from prototype). | schema |

## Out of scope (v1) — explicitly deferred

| Item | Why deferred | Target |
|---|---|---|
| **Employer PF contribution** (12%, with EPS 8.33% split) | Needs employer cost accounting + EPS wage logic; Accounting-side. | v1.1 |
| **Employer ESIC contribution** (3.25%) | Same — employer cost ledger. | v1.1 |
| **Professional Tax (PT)** | State-slab (Gujarat) table; varies by monthly gross band. | v1.1 |
| **TDS / income tax** | Requires declarations, regime choice, projections, Form 16. Substantial module. | v2 |
| **Gratuity / leave encashment payout maths** | Encashment *tracking* exists (`leave_balances.encashed`); payout calculation deferred. | v1.1 |
| **PF/ESIC challan & ECR file generation** | Statutory filing formats; compliance-sensitive. | v2 |
| **Labour Welfare Fund (LWF)** | Small state levy. | v1.1 |
| **Bonus Act / statutory bonus** | `bonus` field is free-form in v1; statutory bonus computation deferred. | v1.1 |

## Assumptions
1. Rates above are the standard Indian rates as configured; they will live in `policies(domain='statutory')` so a rate change is a config edit, not a code change (build the policy hook in v1 even though only employee PF/ESIC use it).
2. PF wage ceiling (₹15,000) and ESIC eligibility ceiling (₹21,000) are policy parameters, not constants — but v1 uses the standard values.
3. v1 produces the **numbers**; it does not produce **government filing artifacts**.
4. Rounding: all statutory amounts rounded to nearest rupee (matches Excel/engine).

## Sign-off needed
- [ ] Finance confirms employer contributions and PT can wait for v1.1.
- [ ] Confirm PT applicability for Gujarat branches (likely needed early — may pull into v1.1 fast-follow).
- [ ] Confirm the standard rate values above match FL's current payroll practice.
