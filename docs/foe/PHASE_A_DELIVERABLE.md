# FLEOS Phase A — Money Coming In (Implementation Deliverable)

**Status:** Implemented locally · **Not committed** · **Migration not applied**

---

## 1. Files Modified

| File | Change |
|------|--------|
| `src/accounting/lib/paymentProof.ts` | Delegates method rules to EWE config; cash never auto-verifies |
| `src/accounting/lib/paymentVerification.ts` | SoD gate + FOE orchestrator on verify |
| `src/accounting/lib/crmBridge.ts` | `createPaymentDraftJournal`, `approveAndPostPaymentJournal`, draft-only `postPaymentJournal` |
| `src/accounting/stores/journalsStore.ts` | `promoteJournalToPosted()` for finance approval |
| `src/accounting/stores/crmBridgeStore.ts` | Sync creates draft journals only |
| `src/lib/paymentApprovers.ts` | Cash-specific status label |
| `src/components/clients/ClientInvoicesPanel.tsx` | EWE/FOE on payment record; SoD UI; config-driven methods |
| `src/accounting/pages/ar/AccountingVerificationQueuePage.tsx` | SoD + cash badges |
| `src/accounting/pages/journals/AccountingJournalsPage.tsx` | Approve & post CRM draft journals |

## 2. Files Created

### Platform (`src/platform/`)

| Path | Purpose |
|------|---------|
| `types/*` | Business / workflow / accounting statuses, SoD, work queue, notifications, cash register |
| `config/defaultWorkflowConfig.ts` | Payment method + workflow + SoD + notification seed config |
| `ewe/workflowEngine.ts` | Enterprise Workflow Engine |
| `ewe/approvalEngine.ts` | Role / permission-group approver resolution |
| `ewe/sodEngine.ts` | Generic Separation of Duties |
| `ewe/transactionLockEngine.ts` | Draft → submitted → locked → posted lifecycle |
| `foe/businessEventService.ts` | Business Event ID foundation |
| `foe/receiptService.ts` | Official receipt (separate from money received) |
| `foe/moneyInOrchestrator.ts` | FOE pipeline orchestrator |
| `notifications/notificationRouter.ts` | Config-driven in-app + email routing |
| `workQueue/workQueueEngine.ts` | Universal work queue + finance adapter |
| `cashRegister/cashRegisterService.ts` | Cash register foundation |
| `index.ts` | Public platform exports |
| `platform.phase-a.test.ts` | Unit tests (7 passing) |

### Documentation

| Path | Purpose |
|------|---------|
| `docs/foe/PROPOSED_MIGRATION_phase_a.sql` | **Proposed** DB migration (not applied) |

---

## 3. Architecture Summary

```
CRM Collect Payment
        │
        ▼
┌───────────────────┐
│  EWE              │  resolvePaymentMethodWorkflow()
│  workflowEngine   │  startWorkflowForPayment()
└─────────┬─────────┘
          │ Business Event ID
          ▼
┌───────────────────┐
│  FOE              │  onPaymentRecorded() → work queue + notifications
│  orchestrator     │  runMoneyInOrchestrator() after verify
└─────────┬─────────┘
          │
    ┌─────┴─────┬─────────────┐
    ▼           ▼             ▼
 Receipt    Draft Journal   Work Queue
 (service)  (crmBridge +    (universal
             journalEngine)   engine)
          │
          ▼ Finance Approve
     POSTED Journal + trust subledger
```

**Three independent statuses** (columns proposed; app writes when migration applied):

- `business_status` — money received / verified / receipt issued / closed
- `workflow_status` — verification / receipt / journal approval gates
- `accounting_status` — none / draft_journal / pending_journal_approval / posted

Legacy `payment_status` remains for invoice recompute triggers (`verified` = confirmed).

---

## 4. Reusable Platform Services

| Service | Reuse by |
|---------|----------|
| `workflowEngine` | Payroll, vendor payments, HR, trust, compliance |
| `approvalEngine` | Any approver-spec workflow |
| `sodEngine` | Any record/verify/approve/reconcile pair |
| `notificationRouter` | Any domain event key + rule config |
| `workQueueEngine` | Finance (now), HR, admissions, payroll, etc. |
| `businessEventService` | All FOE workflows |
| `transactionLockEngine` | Any locked lifecycle entity |
| `cashRegisterService` | Cash-heavy modules |

---

## 5. Schema Changes Proposed

See `docs/foe/PROPOSED_MIGRATION_phase_a.sql`:

- `foe_business_events` + `foe_business_event_links`
- `platform_workflow_instances`
- `platform_work_queue_items`
- `foe_cash_registers`
- Payment columns: `business_status`, `workflow_status`, `accounting_status`, `business_event_id`, `lock_state`, `cash_register_id`
- SoD trigger: `trg_enforce_payment_sod_on_verify`

**Until migration is applied:** platform services use DB-first with localStorage fallback; SoD enforced in UI + application layer.

---

## 6. Migrations Proposed (Not Applied)

Copy to `supabase/migrations/` after approval, then Lovable Publish.

---

## 7. Requires Approval Before Phase B

1. **Apply proposed migration** — enables persistent business events, work queue, three statuses, DB SoD
2. **Seed `foe_cash_registers`** per company/branch
3. **Workflow admin UI** — edit payment method config in DB vs code seed
4. **Unified Finance Work Queue page** (`/accounting/finance-queue`) — Phase B UI
5. **Server-side orchestrator** (edge function / trigger on verify) — reliability for production
6. **Student financial tab on CRM** — embed `StudentFinancialLedger` on Payments tab
7. **Remove legacy manual receipt button** as primary path (keep as admin fallback?)
8. **Journal approval SoD** — enforce verify ≠ approve in DB when columns exist

---

## 8. Phase A Behaviour Checklist

- [x] Cash never auto-verifies
- [x] Same user cannot record + verify (UI + proposed DB trigger)
- [x] Config-driven payment methods (not hardcoded in business logic)
- [x] Draft journals only from CRM payments
- [x] Official receipt after verification (orchestrator)
- [x] Business Event ID generated on payment record
- [x] Universal work queue service + finance adapter
- [x] Generic notification routing
- [x] Generic SoD framework
- [x] Cash register foundation
- [x] `journalEngine` unchanged (called with `status: "DRAFT"`)
- [x] No commits / no publish

---

## 9. How to Test Locally

1. Record **cash** payment → must show “Pending cash verification”; recorder cannot verify
2. Different finance user verifies → receipt + draft journal + journal approval queue item
3. Journals → DRAFT CRM entry → **Approve & post**
4. Run `npm test -- --run src/platform/platform.phase-a.test.ts`
