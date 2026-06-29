# FLEOS Phase C — Production Hardening

**Status:** Implemented locally · **Not committed** · **Migrations proposed**

---

## 1. Implementation Summary

Phase C hardens the Money Coming In workflow and extends reusable platform services for all future FOE/EWE consumers. **Phase A/B architecture unchanged.**

**Production hardening:**
- **DB-driven platform config** (`platform_config`) with code fallback
- **Workflow step persistence** — sequential step advancement in `platform_workflow_instances`
- **Durable FOE pipeline jobs** — server trigger on verify + client reconciliation
- **Edge function `foe-pipeline-tick`** — background reconciliation of incomplete pipelines
- **Journal SoD at DB layer** — verifier cannot post CRM payment journal
- **Cash register seed** — `fn_seed_foe_cash_registers()` from firm × branch
- **Bank reconciled → accounting status** bridge
- **Live finance KPIs** on Accounting Overview
- **Platform workflow config admin page** (read-only inspector)
- **Verification queue redirect** → `/accounting/finance-queue`
- **Notification channel registry** — pluggable in-app, email, WhatsApp/SMS stubs

---

## 2. Files Created

| File | Purpose |
|------|---------|
| `src/platform/config/platformConfigService.ts` | DB config hydration + cache |
| `src/platform/ewe/workflowStepEngine.ts` | Step completion + persistence |
| `src/platform/notifications/notificationChannelRegistry.ts` | Channel handlers |
| `src/platform/foe/pipelineJobService.ts` | Pipeline job queue client API |
| `src/platform/foe/bankReconciliationBridge.ts` | Bank reconciled status wiring |
| `src/platform/foe/financeKpiService.ts` | Reusable finance KPI queries |
| `src/accounting/pages/settings/PlatformWorkflowConfigPage.tsx` | Config inspector UI |
| `src/platform/platform.phase-c.test.ts` | Phase C unit tests |
| `supabase/migrations/20260751120000_foe_platform_phase_c.sql` | Phase C migration |
| `supabase/functions/foe-pipeline-tick/index.ts` | Server reconciliation tick |

---

## 3. Files Modified

| File | Change |
|------|--------|
| `moneyInOrchestrator.ts` | Workflow step advancement, pipeline job completion |
| `workflowEngine.ts` | Uses `platformConfigService` |
| `notificationRouter.ts` | Channel registry + DB rules |
| `sodEngine.ts` | DB SoD rules |
| `paymentStatusResolver.ts` | Bank reconciled status |
| `paymentVerification.ts` | Pipeline job enqueue + config hydrate |
| `defaultWorkflowConfig.ts` | Notification links → finance queue |
| `FinanceWorkQueuePage.tsx` | Auto-reconcile pending pipeline jobs |
| `AccountingOverviewPage.tsx` | Live KPIs + payments by source |
| `AccountingVerificationQueuePage.tsx` | Redirect to finance queue |
| `AccountingARPage.tsx` | Finance queue nav link |
| `App.tsx` / `AppLayout.tsx` | Platform config route + nav |
| `src/platform/index.ts` | Phase C exports |

---

## 4. Reusable Platform Services Added

| Service | Future consumers |
|---------|------------------|
| `platformConfigService` | Vendor payments, payroll, trust workflows |
| `workflowStepEngine` | Multi-step HR/payroll/banking approvals |
| `notificationChannelRegistry` | WhatsApp/SMS when channels go live |
| `pipelineJobService` | Any FOE orchestrator with server backup |
| `bankReconciliationBridge` | Treasury / bank reconciliation module |
| `financeKpiService` | Dashboards, exec reporting |

---

## 5. Schema Changes

See `supabase/migrations/20260751120000_foe_platform_phase_c.sql`:

- `platform_config` — workflow/notification/SoD JSON config
- `platform_foe_pipeline_jobs` — durable post-verify queue
- Trigger: enqueue pipeline job on `payment_status → verified`
- Trigger: journal SoD on `accounting_journals.status → POSTED`
- `fn_seed_foe_cash_registers()` — idempotent cash register seed

Requires Phase A+B migration (`20260750120000_foe_platform_foundation.sql`) first.

---

## 6. Proposed Migrations (publish order)

1. `20260750120000_foe_platform_foundation.sql` (Phase A+B)
2. `20260751120000_foe_platform_phase_c.sql` (Phase C)

Deploy edge function: `foe-pipeline-tick` (schedule via cron or invoke after verify).

---

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Empty `platform_config` rows | Code fallback when JSON array length = 0 |
| Edge function cannot create receipt/journal | Client orchestrator remains primary; server reconciles state |
| `foe_pipeline_failed` queue items may duplicate | Dedupe by kind+source in finance queue service |
| Config admin is read-only | Edit via SQL/DB until Phase D config editor |

---

## 8. UAT Checklist

### Pipeline durability
- [ ] Verify payment → `platform_foe_pipeline_jobs` row created (post-migration)
- [ ] Close browser mid-orchestrator → finance queue retry completes pipeline
- [ ] `foe-pipeline-tick` marks job completed when receipt + journal exist

### SoD (DB)
- [ ] Verifier cannot post journal (app + DB trigger after migration)
- [ ] Recorder cannot verify cash (existing trigger)

### Config
- [ ] `/accounting/settings/platform-config` shows code defaults
- [ ] After seeding DB config, page shows "Database" source

### KPIs
- [ ] Accounting Overview shows live collected MTD/YTD, AR, queue counts
- [ ] Payments by source table populated

### Navigation
- [ ] `/accounting/ar/verification` redirects to finance queue
- [ ] AR page links to finance queue

### Bank reconcile
- [ ] Mark payment bank reconciled → accounting status `reconciled` on CRM tab

---

## 9. Outstanding Before Phase D

1. Visual workflow config editor (replace JSON/SQL editing)
2. Cron schedule for `foe-pipeline-tick`
3. Full server-side receipt/journal creation in edge function
4. Parallel approval step engine (persistence exists; UI pending)
5. WhatsApp/SMS channel implementations
6. Universal Business Events across non-CRM modules
7. Workflow versioning + simulation

---

## 10. Tests

```bash
npm test -- --run src/platform/platform.phase-a.test.ts src/platform/platform.phase-b.test.ts src/platform/platform.phase-c.test.ts
```

---

**No commit · No merge · No publish** — awaiting review.
