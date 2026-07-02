# Module Readiness Matrix

**Document type:** ERP deployment dashboard  
**Version:** 1.1  
**Last updated:** 2026-07-01  
**Owner:** Platform governance  
**Baseline reference:** [`PLATFORM_BASELINE_v1.0.md`](./PLATFORM_BASELINE_v1.0.md)  
**Recovery status:** Platform Baseline Recovery **CLOSED** — see [`PLATFORM_BASELINE_RECOVERY.md`](./PLATFORM_BASELINE_RECOVERY.md#platform-baseline-closure-july-2026)

---

## Purpose

Single dashboard for **where each ERP module stands** across the delivery lifecycle. Update when a module completes Platform Baseline, passes Business UAT, or is cleared for production.

> **Deployment rule:** A feature is not deployed until **both** the live database and GitHub are synchronized.

---

## Status legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete |
| 🟡 | In progress — partial coverage or pending sign-off |
| ❌ | Not started or blocked |
| ⏳ | Pending prerequisite (typically full Business UAT sign-off) |

---

## Column definitions

| Column | Question it answers | Exit criteria |
|--------|---------------------|---------------|
| **Development** | Is the module implemented in GitHub to frozen spec? | Core flows coded; migrations shipped; demo runnable |
| **Platform** | Does live Supabase match repo for this module's schema/RPCs? | Platform Baseline v1.0 schema-effect gates PASS |
| **Business UAT** | Has the business signed off on frozen scenarios? | UAT checklist PASS with named test cases |
| **Production Ready** | Cleared for real business operations? | Full module UAT sign-off + sponsor approval + runbook |

---

## Module readiness (current)

| Module | Development | Platform | Business UAT | Production Ready | Notes |
|--------|:-----------:|:--------:|:------------:|:----------------:|-------|
| **Commission & Revenue** | ✅ Feature Complete | ✅ Complete | 🟡 In Progress | ⏳ Pending complete business sign-off | First critical workflow validated — Post receipt CR-2026-45343 / FLC-2025-SEN-001 (CA$10,860). **Engineering frozen** except UAT defects. |
| **CRM / Clients** | 🟡 | ✅ Complete | ❌ | ❌ | Schema on baseline; pipeline/service-library parity ongoing |
| **HR / Payroll** | 🟡 | ✅ Complete | ❌ | ❌ | WPMS, WTM, AEMS, WRE, payroll engine on baseline |
| **Accounting / Finance** | 🟡 | ✅ Complete | ❌ | ❌ | Journal contract, collection categories, A1 hardening on baseline |
| **Performance Hub** | 🟡 | ✅ Complete | ❌ | ❌ | Architecture frozen; UI/components in repo |
| **Portal** | 🟡 | ✅ Complete | ❌ | ❌ | Client-facing surfaces partial |
| **Admissions / Application** | 🟡 | ✅ Complete | ❌ | ❌ | Qual Q1, Step 0, CF↔UPI linkage on baseline |
| **Institutions / UPI** | 🟡 | ✅ Complete | ❌ | ❌ | Institution masters, commission config on baseline |
| **Service Library / Fee Master** | 🟡 | ✅ Complete | ❌ | ❌ | `service_catalogue` retired; `service_library` is SSOT |

**Platform ✅ Complete** = Platform Baseline v1.0 (migration head `20261102120100` + post-baseline hotfixes). Does not imply module Business UAT is complete.

---

## Commission — engineering freeze (active)

From **2026-07-01**, Commission work is limited to:

1. **Business UAT defect fixes** — required to pass frozen scenarios  
2. **Business-requested changes** — sponsor-approved only  

No new features, refactoring, or unrelated UI/TS work unless Business UAT or sponsor explicitly requests it.

---

## How to update

1. **Development → ✅ Feature Complete** — frozen architecture implemented; domain expert demo approved.  
2. **Platform → ✅ Complete** — module objects verified on live Supabase after publish.  
3. **Business UAT → ✅** — full UAT checklist signed; link certificate and test IDs.  
4. **Production Ready → ✅** — sponsor sign-off; production runbook; all prior columns green.

When updating a row, add date and evidence in **Notes**.

---

## Related docs

- [`PLATFORM_BASELINE_v1.0.md`](./PLATFORM_BASELINE_v1.0.md) — Golden master  
- [`PLATFORM_BASELINE_RECOVERY.md`](./PLATFORM_BASELINE_RECOVERY.md) — Recovery process + closure  
- [`GITHUB_SYNC_REPORT_2026-07.md`](./GITHUB_SYNC_REPORT_2026-07.md) — Repository sync  
- [`DELIVERY_STANDARDS.md`](./DELIVERY_STANDARDS.md) — Module delivery lifecycle
