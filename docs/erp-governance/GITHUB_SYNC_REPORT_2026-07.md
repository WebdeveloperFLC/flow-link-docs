# GitHub Sync Report — Platform Baseline July 2026

**Date:** 2026-07-01  
**Live platform:** Platform Baseline COMPLETE (Lovable)  
**Repository sync:** This commit

---

## Summary

| Package | Items | Status |
|---------|-------|--------|
| A — P0 defects | 3 | Applied |
| B — P1 defensive | 3 | Applied |
| C — Documentation | 3 | Applied |
| D — Deferred | D17, D18, D5, D8 | No change |

---

## Package A — Migration defects

| ID | Action | File | Nature |
|----|--------|------|--------|
| S0 | `service_catalogue` `to_regclass` guard | `20260722120000_accounting_collection_categories.sql` | Defect — table retired in `20260610190000` |
| D15 | DROP 6-arg before 8-arg `fn_mark_final_and_create_application` | `20260902120000_application_duplicate_validation.sql` | Defect — signature overload |
| D22 | Idempotent table GRANTs | `20261102120000_platform_baseline_data_api_grants.sql` | Defect — Data API gap |

---

## Package B — Defensive parity

| ID | Action | File | Nature |
|----|--------|------|--------|
| D14 | DROP legacy overloads before CREATE | `20260901120500_mark_final_application_bridge.sql` | Legacy / defensive |
| D19 | DROP VIEW before rebuild | `20261004120000`, `20261004120100` | View column collision |
| D20 | `ADD COLUMN IF NOT EXISTS country` before UPDATE | `20261004120150` | Partial-DB guard |

---

## Package C — Documentation

| Doc | Change |
|-----|--------|
| `docs/LOVABLE_PUBLISH_CHECKLIST.md` | Platform Baseline storage pre-steps |
| `docs/erp-governance/PLATFORM_BASELINE_RECOVERY.md` | Release process + Exception Register |
| `docs/engineering/04-Migration-Review-Checklist.md` | Legacy `to_regclass` guard rule |

---

## Exception Register — no GitHub change (documented only)

| IDs | Classification | Notes |
|-----|----------------|-------|
| D1, D11, D13, D21 | Deployment-only | Storage buckets via Lovable tool; SQL INSERT stripped |
| D2, D3, D9, D10, D12, D16 | No action | Inline-apply artifacts |
| D17, D18, D5 | Deferred | Greenfield GitHub applies succeed; live DB recovered |
| D8 | Deferred | Unmapped file |
| Payload splits (Turns 2–7) | Deployment-only | Token limits |
| Skipped `20261031120000–005` | Deployment-only | Pre-authorized demo seed skip |

---

## Live DB note

The recovered production/staging database **already has** schema from inline recovery. This sync ensures **the next** `db reset`, new environment, or strict publish replay matches live behavior without manual Lovable hotfixes.

**Catch-up migration `20261102120000`:** Will apply on next Lovable Publish if not already granted (idempotent).

---

## Business UAT gate

| Phase | Status |
|-------|--------|
| Platform Baseline (live) | ✅ PASS |
| GitHub Sync (repo) | ✅ This report |
| Business UAT | **Authorized to proceed** |

First test: Commission receipt Post on CR-2026-45343 / FLC-2025-SEN-001.
