# Platform Baseline v1.0 — Golden Master

**Status:** CLOSED  
**Baseline version:** 1.0  
**Recovery codename:** Platform Baseline July 2026  
**Supersedes:** Ad-hoc migration recovery (pre-2026-07-01)

This document is the **permanent record** that Future Link ERP live Supabase and GitHub reached a verified platform baseline before sustained Business UAT. Do not edit retroactively — append **v1.1+** documents for future baselines.

---

## Executive summary

| Milestone | Status | Date |
|-----------|--------|------|
| Platform Baseline Recovery (Lovable) | ✅ COMPLETE | 2026-07-01 |
| Platform Baseline Exception Register | ✅ CLOSED | 2026-07-01 |
| GitHub Sync (Packages A + B + C) | ✅ COMPLETE | 2026-07-01 |
| Post-baseline hotfixes (D22 + post-receipt) | ✅ APPLIED | 2026-07-01 |
| Schema smoke tests | ✅ PASS | 2026-07-01 |
| Commission Business UAT (Round 1) | ✅ PASS | 2026-07-01 |

---

## Platform Baseline completed

**What was recovered:** Live Supabase had stalled at migration `20260719120400` while GitHub head was `20261101120100`. Lovable applied **103 schema migrations** in strict filename order (Turns B1–B8), skipping six authorized demo seeds (`20261031120000`–`005`).

**Completion gate:** Schema-effect checks (not `MAX(schema_migrations.version)`), plus commission receipt smoke test.

---

## Dates

| Event | Date |
|-------|------|
| Recovery authorized (Option A — schema-effect gates) | 2026-07-01 |
| Turn 1 (B2a) — `service_catalogue` guard + accounting | 2026-07-01 |
| Turn 8 (B9) — Nov hotfixes through `20261101120100` | 2026-07-01 |
| Platform Baseline declared PASS | 2026-07-01 |
| GitHub Sync shipped (`42d6539e`) | 2026-07-01 |
| Post-baseline migrations applied on live DB | 2026-07-01 |
| Commission UAT Round 1 PASS | 2026-07-01 |

---

## Git commits (repository truth)

| Commit | Summary |
|--------|---------|
| [`42d6539e`](https://github.com/WebdeveloperFLC/flow-link-docs/commit/42d6539e) | Platform Baseline GitHub sync — Packages A + B + C (guards, DROP overloads, D22 catch-up migration, governance docs) |
| [`60f37b57`](https://github.com/WebdeveloperFLC/flow-link-docs/commit/60f37b57) | Post-receipt PL/pgSQL `sa` ambiguity fix + auto-distribute UI cap |
| [`e915b400`](https://github.com/WebdeveloperFLC/flow-link-docs/commit/e915b400) | Governance docs for GitHub sync report |

**Repository migration head at baseline close:** `20261102120100_commission_post_receipt_plpgsql_sa_ambiguity_fix.sql`

---

## Platform version

| Artifact | Value |
|----------|-------|
| **Platform Baseline** | **v1.0** |
| **App package** | `vite_react_shadcn_ts@0.0.0` (Lovable sync branch: `feature/service-library-nav`) |
| **Delivery standards** | [`DELIVERY_STANDARDS.md`](./DELIVERY_STANDARDS.md) v1.0 |
| **Migration audit** | [`docs/migration-audit-2026-11.md`](../migration-audit-2026-11.md) |

---

## Supabase state (live platform)

| Item | Value |
|------|-------|
| **Pre-recovery applied migration** | `20260719120400_fix_convert_lead_call_queue_enrolled.sql` |
| **Baseline recovery target** | `20261101120100_commission_post_receipt_schema_sync.sql` |
| **Post-baseline hotfixes applied** | `20261102120000_platform_baseline_data_api_grants.sql`, `20261102120100_commission_post_receipt_plpgsql_sa_ambiguity_fix.sql` |
| **Migrations applied (recovery)** | 103 (6 demo seeds skipped) |
| **Schema registration** | Lovable synthetic batch rows — **do not rely on filename in `schema_migrations`** |
| **Verification method** | Schema-effect gates + `information_schema` / `pg_proc` probes |

### Commission receipt schema-effect gates (verified PASS)

| Gate | Object | Status |
|------|--------|--------|
| GATE 1 | `upi_commission_invoices.aggregator_invoice_id` | ✅ |
| GATE 2 | `fn_resolve_aggregator_invoice_for_institution_invoice(uuid)` | ✅ |
| GATE 3 | `fn_post_commission_receipt` uses resolver | ✅ |
| Student allocation | `fn_student_commission_open_balance(uuid, uuid)` | ✅ |
| D22 Data API | Table GRANTs on `upi_commission_config`, `upi_commission_aggregator_invoices`, `upi_commission_aggregator_invoice_lines` | ✅ |

### Storage buckets (deployment-only — created outside blocked SQL)

| Bucket | Deviation class |
|--------|-----------------|
| `accounting-attachments` | D1 |
| `upi-commission-receipts` | D11 |
| `upi-commission-aggregator-statements` | D13 |
| Additional buckets per recovery turns | D21 (see Exception Register) |

---

## Exception Register — CLOSED

All deviations from strict migration replay were classified and resolved (GitHub sync or deployment-only documentation).

| ID | Summary | Classification | Resolution |
|----|---------|----------------|--------------|
| D1 | `accounting-attachments` bucket via tool | Deployment-only | [`LOVABLE_PUBLISH_CHECKLIST.md`](../LOVABLE_PUBLISH_CHECKLIST.md) |
| D2–D4 | Inline-apply / GRANT blocks during B2a | No action / Catch-up | Live DB parity; D22 catch-up on GitHub |
| D5 | Turn 2 payload split (A/B/C) | Deployment-only | Documented |
| D6 | Runtime GRANT blocks on commission tables | Catch-up | `20261102120000` applied live + GitHub |
| D7–D10 | Turn 3 payload splits; demo seed skip | Deployment-only | Documented |
| D11 | `upi-commission-receipts` bucket | Deployment-only | Publish checklist |
| D12 | GRANT catch-up (Turn 4) | Catch-up | `20261102120000` |
| D13 | `upi-commission-aggregator-statements` bucket | Deployment-only | Publish checklist |
| D14 | `fn_mark_final_and_create_application` overload | Reflect in migration | `20260901120500` GitHub sync |
| D15 | 6-arg vs 8-arg overload collision | Reflect in migration | `20260902120000` GitHub sync |
| D16 | Inline-apply artifacts | No action | Documented |
| D17, D18, D5 | Deferred greenfield items | No action | Live recovered |
| D19 | VIEW rebuild collision | Reflect in migration | `20261004120000`/`20100` GitHub sync |
| D20 | `country` column partial-DB guard | Reflect in migration | `20261004120150` GitHub sync |
| D21 | Additional storage buckets | Deployment-only | Publish checklist |
| D22 | Missing authenticated/service_role table GRANTs | Catch-up | `20261102120000` applied live + GitHub |
| S0 | `service_catalogue` stale FK in `20260722120000` | Reflect in migration | `to_regclass` guard in GitHub |
| Payload splits (Turns 2–7) | Token / size limits | Deployment-only | Documented |
| Skipped `20261031120000–005` | Pre-authorized demo seeds | Deployment-only | Documented |

**Register status:** CLOSED — no open GitHub-sync items for baseline scope.

---

## GitHub Sync completed

**Report:** [`GITHUB_SYNC_REPORT_2026-07.md`](./GITHUB_SYNC_REPORT_2026-07.md)

| Package | Scope | Status |
|---------|-------|--------|
| A — P0 defects | `service_catalogue` guard, D15 overload DROP, D22 GRANTs | ✅ |
| B — P1 defensive | D14, D19 VIEW DROP, D20 country guard | ✅ |
| C — Documentation | Publish checklist, recovery process, migration review rule | ✅ |

Post-sync hotfix commit `60f37b57` aligned `fn_post_commission_receipt` and UI auto-distribute with live recovery needs.

---

## Smoke tests passed

| Test | Location | Result |
|------|----------|--------|
| Commission receipt post schema verification | `supabase/tests/commission_receipt_post_schema_verification.sql` | ✅ PASS |
| Post-baseline function body check | `fn_post_commission_receipt` contains `v_stu_alloc`; Gate 3 resolver preserved | ✅ PASS |
| Post-baseline GRANT check | `role_table_grants` on three D22 tables | ✅ PASS |

---

## Commission UAT passed

| Field | Value |
|-------|-------|
| **Scenario** | Direct institution commission receipt — Post |
| **Receipt** | CR-2026-45343 |
| **Invoice** | FLC-2025-SEN-001 |
| **Institution** | Seneca Polytechnic |
| **Amount** | CA$10,860 |
| **Result** | ✅ PASS (Post receipt successful after Step 3 save) |
| **UAT guide** | [`docs/commission/DIRECT_INSTITUTION_BUSINESS_UAT_ROUND1.md`](../commission/DIRECT_INSTITUTION_BUSINESS_UAT_ROUND1.md) |

---

## Known follow-ups (outside baseline v1.0 scope)

These do **not** reopen Platform Baseline v1.0:

- ~470 pre-existing TypeScript errors (`npm run typecheck` fails; `npm run build` passes)
- `collectionCategoriesStore.ts` still references retired `service_catalogue`
- Broader Commission UAT scenarios beyond Round 1 Post receipt
- Module-level Business UAT for CRM, HR, Accounting, Performance, Portal — see [`MODULE_READINESS_MATRIX.md`](./MODULE_READINESS_MATRIX.md)

---

## Related docs

- [`PLATFORM_BASELINE_RECOVERY.md`](./PLATFORM_BASELINE_RECOVERY.md) — Process for future recoveries  
- [`MODULE_READINESS_MATRIX.md`](./MODULE_READINESS_MATRIX.md) — ERP module dashboard  
- [`GITHUB_SYNC_REPORT_2026-07.md`](./GITHUB_SYNC_REPORT_2026-07.md) — Repository sync detail  
- [`../migration-audit-2026-11.md`](../migration-audit-2026-11.md) — Phase 1 audit (103 files)

---

## Sign-off record

| Role | Name | Date | Notes |
|------|------|------|-------|
| Live platform recovery | Lovable (Turns B1–B8 + post-baseline) | 2026-07-01 | Schema-effect gates PASS |
| Repository sync | Cursor / GitHub `main` | 2026-07-01 | Commits `42d6539e`, `60f37b57` |
| Business UAT (Commission R1) | Owner confirmed | 2026-07-01 | Post receipt successful |

**Platform Baseline v1.0 is the golden master for all ERP module work until Platform Baseline v1.1 is declared.**
