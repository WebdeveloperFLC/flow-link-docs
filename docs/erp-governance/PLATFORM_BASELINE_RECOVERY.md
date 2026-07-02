# Platform Baseline Recovery

**Status:** July 2026 recovery **CLOSED** — process remains active for future drift events  
**Applies to:** Lovable-managed Supabase deployments when live DB lags GitHub  
**Golden master:** [`PLATFORM_BASELINE_v1.0.md`](./PLATFORM_BASELINE_v1.0.md)

---

## Deployment rule

> **A feature is not deployed until both the live database and the GitHub repository are synchronized.**

Business UAT requires:

1. **Phase 1 — Live platform** (Lovable): Platform Baseline Report + Exception Register + smoke tests PASS  
2. **Phase 2 — Repository sync** (Cursor): GitHub Sync Report PASS  
3. **Phase 3 — Business UAT**

---

## Platform Recovery Freeze Rule

While Platform Baseline recovery is in progress:

- No new features, refactors, TS cleanup, UI changes, or new migrations  
- Only: finish migration recovery → verify schema → smoke tests → reports → GitHub sync

---

## Release sequence

```text
Cursor Development
        ↓
GitHub
        ↓
Lovable Publish / inline migration recovery
        ↓
Platform Schema Verification (schema-effect gates)
        ↓
Smoke Tests
        ↓
Platform Deployment Verification Report
        ↓
Platform Baseline Exception Register
        ↓
Cursor GitHub Sync
        ↓
GitHub Sync Report
        ↓
Business UAT
        ↓
Production
```

---

## Exception Register classifications

| Class | Meaning | GitHub action |
|-------|---------|---------------|
| **Reflect in migration** | Objective migration defect | Edit source file (recovery exception to R10) |
| **Catch-up migration** | Platform gap or idempotent parity | New timestamped `.sql` after repo head |
| **Deployment-only** | Lovable tool/process (buckets, payload splits) | Document in publish checklist |
| **No action** | Greenfield GitHub already correct | Record only |

---

## Schema-effect gates (commission receipt)

After recovery through `20261101120100`:

| Gate | Check |
|------|-------|
| GATE 1 | `upi_commission_invoices.aggregator_invoice_id` exists |
| GATE 2 | `fn_resolve_aggregator_invoice_for_institution_invoice(uuid)` exists |
| GATE 3 | `fn_post_commission_receipt` uses resolver |
| Student allocation | `fn_student_commission_open_balance(uuid, uuid)` exists |
| Smoke | `supabase/tests/commission_receipt_post_schema_verification.sql` PASS |

---

## Exception Register — reconciled (July 2026)

**Register status:** **CLOSED** — all items reconciled 2026-07-01.

| ID | Turn | Description | Disposition | Item status | Rationale / resolution |
|----|------|-------------|-------------|-------------|------------------------|
| **S0** | 1 | Stale `service_catalogue` FK in `20260722120000` | Reflected in GitHub | Closed | `to_regclass` guard in `20260722120000_accounting_collection_categories.sql` |
| **D1** | 1 | `accounting-attachments` bucket via Lovable tool | Deployment-only | Closed | SQL `INSERT INTO storage.buckets` blocked; documented in [`LOVABLE_PUBLISH_CHECKLIST.md`](../LOVABLE_PUBLISH_CHECKLIST.md) |
| **D2** | 1 | Runtime GRANT block on `client_service_billing_events` | Reflected in GitHub | Closed | Parity via `20261102120000` + live inline apply |
| **D3** | 1 | Runtime GRANT block on billing-event tables (B2a) | Reflected in GitHub | Closed | Parity via `20261102120000` + live inline apply |
| **D4** | 1 | Runtime GRANT block on HR/accounting tables (B2a) | Reflected in GitHub | Closed | Parity via `20261102120000` + live inline apply |
| **D5** | 2 | Turn 2 split into payloads A/B/C (size limit) | Deployment-only | Closed | Token/payload constraint; strict sort preserved within turn |
| **D6** | 2 | Runtime GRANT blocks on commission Phase 1 tables | Reflected in GitHub | Closed | `20261102120000_platform_baseline_data_api_grants.sql` applied live + GitHub |
| **D7** | 3 | Turn 3 split into payloads A–D | Deployment-only | Closed | Token/payload constraint; strict sort preserved within turn |
| **D8** | 3 | Unmapped inline-apply artifact (Turn 3) | Deferred | Closed | No repo file maps to live-only step; greenfield replay unaffected |
| **D9** | 3 | Inline-apply ordering artifact | Deferred | Closed | Live DB recovered; GitHub strict sort applies cleanly on greenfield |
| **D10** | 3 | Pre-authorized skip of demo seeds `20261031120000–005` | Deployment-only | Closed | Data-only seeds; no downstream schema dependency |
| **D11** | 4 | `upi-commission-receipts` bucket via tool | Deployment-only | Closed | Bucket pre-step before `20260801120200`; publish checklist |
| **D12** | 4 | Runtime GRANT catch-up (Turn 4) | Reflected in GitHub | Closed | Covered by `20261102120000` |
| **D13** | 5 | `upi-commission-aggregator-statements` bucket via tool | Deployment-only | Closed | Bucket pre-step before `20260815120500`; publish checklist |
| **D14** | 6 | `fn_mark_final_and_create_application` overload collision | Reflected in GitHub | Closed | DROP legacy overloads in `20260901120500_mark_final_application_bridge.sql` |
| **D15** | 6 | 6-arg → 8-arg signature change collision | Reflected in GitHub | Closed | DROP 6-arg before CREATE in `20260902120000_application_duplicate_validation.sql` |
| **D16** | 6 | Function definition ordering in doc-workflow RPCs | Deferred | Closed | Inline apply preserved caller order; greenfield GitHub file order succeeds |
| **D17** | 6 | Backfill reorder in `20260923120000` | Deferred | Closed | Live-only reorder for partial DB; greenfield applies in filename order |
| **D18** | 7 | VIEW/column rebuild hotfix during Turn 7 | Deferred | Closed | Live recovered; optional GitHub hardening deferred — no live gap |
| **D19** | 7 | VIEW rebuild column collision | Reflected in GitHub | Closed | DROP VIEW before rebuild in `20261004120000` / `20261004120100` |
| **D20** | 7 | `country` column UPDATE before ADD on partial DB | Reflected in GitHub | Closed | `ADD COLUMN IF NOT EXISTS country` guard in `20261004120150` |
| **D21** | 7 | `kc-downloads` and related storage buckets via tool | Deployment-only | Closed | Bucket pre-step before `20261005120000`; publish checklist |
| **D22** | 8 | Missing authenticated/service_role table GRANTs (Data API) | Reflected in GitHub | Closed | `20261102120000` applied live; GRANTs verified on three commission tables |
| **PS** | 2–7 | Payload splits across Turns 2–7 | Deployment-only | Closed | Lovable inline-SQL size limits; not a schema divergence |
| **DS** | 8 | Skipped demo/UAT seeds `20261031120000–005` | Deployment-only | Closed | Pre-authorized; INSERT-only; no schema dependency |

**Disposition key:** **Reflected in GitHub** = source migration or catch-up `.sql` shipped · **Deployment-only** = Lovable tool/process · **Deferred** = live recovery artifact; greenfield GitHub replay OK without change.

---

## Platform Baseline Closure (July 2026)

**Recovery project status:** **OFFICIALLY CLOSED** — 2026-07-01

| Exit criterion | Result | Evidence |
|----------------|--------|----------|
| Platform Baseline completed | ✅ | 103 schema migrations applied (Turns B1–B8); head `20261101120100` |
| Live database verified | ✅ | Schema-effect gates PASS; post-baseline `20261102120000`, `20261102120100` applied |
| GitHub Sync completed | ✅ | Packages A + B + C shipped — [`GITHUB_SYNC_REPORT_2026-07.md`](./GITHUB_SYNC_REPORT_2026-07.md) |
| Exception Register reconciled | ✅ | All items above marked Closed (see disposition column) |
| Commission Receipt smoke test | ✅ PASS | `supabase/tests/commission_receipt_post_schema_verification.sql` |
| Commission Receipt Business UAT | ✅ PASS | CR-2026-45343 / FLC-2025-SEN-001 — Post receipt CA$10,860 |
| Recovery officially closed | ✅ | This section + [`PLATFORM_BASELINE_v1.0.md`](./PLATFORM_BASELINE_v1.0.md) |

**Post-close rule:** Platform Recovery Freeze **lifted** for general ERP work. Module-specific freezes apply — see [`MODULE_READINESS_MATRIX.md`](./MODULE_READINESS_MATRIX.md).

### Commission module — post-recovery engineering freeze

Effective **2026-07-01**, Commission engineering is **frozen** except:

- **Business UAT defects** — fixes required to pass frozen UAT scenarios  
- **Explicit business request** — new scope requires sponsor approval + RFC if behaviour changes  

**Not permitted without business approval:**

- New Commission features  
- Refactoring, TS cleanup, or UI changes unrelated to UAT defects  
- New migrations except UAT-defect hotfixes  

Track module progress in [`MODULE_READINESS_MATRIX.md`](./MODULE_READINESS_MATRIX.md).

---

## Exception Register template (future recoveries)

| ID | Turn | Description | Disposition | Item status | Rationale / GitHub action |
|----|------|-------------|-------------|-------------|---------------------------|
| D… | … | … | Reflected in GitHub / Deployment-only / Deferred | Open → Closed | File, doc, or defer rationale |

---

## Related docs

- [`PLATFORM_BASELINE_v1.0.md`](./PLATFORM_BASELINE_v1.0.md) — Golden master (July 2026 baseline closed)  
- [`MODULE_READINESS_MATRIX.md`](./MODULE_READINESS_MATRIX.md) — ERP module deployment dashboard  
- [`GITHUB_SYNC_REPORT_2026-07.md`](./GITHUB_SYNC_REPORT_2026-07.md) — July 2026 Platform Baseline sync  
- [`../LOVABLE_PUBLISH_CHECKLIST.md`](../LOVABLE_PUBLISH_CHECKLIST.md) — storage pre-steps  
- [`../engineering/04-Migration-Review-Checklist.md`](../engineering/04-Migration-Review-Checklist.md) — legacy table guards
