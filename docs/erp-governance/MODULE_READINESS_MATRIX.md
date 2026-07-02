# Module Readiness Matrix

**Document type:** ERP deployment dashboard  
**Version:** 1.0  
**Last updated:** 2026-07-01  
**Owner:** Platform governance  
**Baseline reference:** [`PLATFORM_BASELINE_v1.0.md`](./PLATFORM_BASELINE_v1.0.md)

---

## Purpose

Single dashboard for **where each ERP module stands** across the delivery lifecycle. Update this document when a module completes Platform Baseline, passes Business UAT, or is cleared for Production.

> **Deployment rule:** A feature is not deployed until **both** the live database and GitHub are synchronized. See [`PLATFORM_BASELINE_RECOVERY.md`](./PLATFORM_BASELINE_RECOVERY.md).

---

## Status legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete / passed for this column |
| 🟡 | In progress — partial coverage or pending sign-off |
| ❌ | Not started or blocked |

---

## Column definitions

| Column | Question it answers | Exit criteria |
|--------|---------------------|---------------|
| **Development** | Is the module implemented in GitHub to frozen spec? | Core flows coded; migrations shipped; demo runnable |
| **Platform** | Does live Supabase match repo for this module's schema/RPCs? | Platform Baseline schema-effect gates PASS for module objects |
| **Business UAT** | Has the business signed off on frozen scenarios? | UAT checklist PASS with named test cases |
| **Production** | Is the module live for real business operations? | Sponsor approval; production data; support runbook |

---

## Module readiness (current)

| Module | Development | Platform | Business UAT | Production | Notes |
|--------|:-----------:|:--------:|:------------:|:----------:|-------|
| **Commission & Revenue** | ✅ | ✅ | ✅ | ❌ | Round 1 UAT PASS — Post receipt CR-2026-45343 / FLC-2025-SEN-001 (CA$10,860). Broader commission scenarios still open. |
| **CRM / Clients** | 🟡 | ✅ | ❌ | ❌ | Schema on baseline; ~470 pre-existing TS errors; pipeline/service-library parity work ongoing |
| **HR / Payroll** | 🟡 | ✅ | ❌ | ❌ | WPMS, WTM, AEMS, WRE, payroll engine on baseline; module UAT not started |
| **Accounting / Finance** | 🟡 | ✅ | ❌ | ❌ | Journal contract, collection categories, A1 hardening on baseline; module UAT not started |
| **Performance Hub** | 🟡 | ✅ | ❌ | ❌ | Architecture frozen; UI/components in repo; module UAT not started |
| **Portal** | 🟡 | ✅ | ❌ | ❌ | Client-facing surfaces partial; baseline schema present |
| **Admissions / Application** | 🟡 | ✅ | ❌ | ❌ | Qual Q1, Step 0, CF↔UPI linkage on baseline |
| **Institutions / UPI** | 🟡 | ✅ | ❌ | ❌ | Institution masters, commission config on baseline |
| **Service Library / Fee Master** | 🟡 | ✅ | ❌ | ❌ | `service_catalogue` retired; `service_library` is SSOT |

**Platform column ✅** reflects **Platform Baseline v1.0** (July 2026 recovery through migration head `20261102120100` + post-baseline hotfixes). It does **not** mean every module has passed Business UAT.

---

## How to update

1. **Development → ✅** — Architecture freeze + Implementation Bible complete; feature loop demos approved by domain expert.
2. **Platform → ✅** — Module-specific schema-effect gates documented and verified on live Supabase (after any required publish).
3. **Business UAT → ✅** — Link UAT certificate or checklist; record test IDs and date.
4. **Production → ✅** — Sponsor sign-off only after Development + Platform + Business UAT are ✅.

When updating a row, add the date and evidence link in the **Notes** column.

---

## Related docs

- [`PLATFORM_BASELINE_v1.0.md`](./PLATFORM_BASELINE_v1.0.md) — Golden master for July 2026 baseline  
- [`PLATFORM_BASELINE_RECOVERY.md`](./PLATFORM_BASELINE_RECOVERY.md) — Recovery process and gates  
- [`GITHUB_SYNC_REPORT_2026-07.md`](./GITHUB_SYNC_REPORT_2026-07.md) — Repository sync after baseline  
- [`DELIVERY_STANDARDS.md`](./DELIVERY_STANDARDS.md) — Module delivery lifecycle and DoD
