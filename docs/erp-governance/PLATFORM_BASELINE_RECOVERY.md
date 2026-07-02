# Platform Baseline Recovery

**Status:** Active governance  
**Applies to:** Lovable-managed Supabase deployments when live DB lags GitHub

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

## Exception Register template

| ID | Turn | Description | Classification | GitHub action |
|----|------|-------------|----------------|---------------|
| D… | … | … | Reflect / Catch-up / Deployment-only / No action | File or doc |

---

## Related docs

- [`PLATFORM_BASELINE_v1.0.md`](./PLATFORM_BASELINE_v1.0.md) — Golden master (July 2026 baseline closed)  
- [`MODULE_READINESS_MATRIX.md`](./MODULE_READINESS_MATRIX.md) — ERP module deployment dashboard  
- [`GITHUB_SYNC_REPORT_2026-07.md`](./GITHUB_SYNC_REPORT_2026-07.md) — July 2026 Platform Baseline sync  
- [`../LOVABLE_PUBLISH_CHECKLIST.md`](../LOVABLE_PUBLISH_CHECKLIST.md) — storage pre-steps  
- [`../engineering/04-Migration-Review-Checklist.md`](../engineering/04-Migration-Review-Checklist.md) — legacy table guards
