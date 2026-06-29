# FLEOS Phase B — Money Coming In (Production Workflow)

**Status:** Implemented locally · **Not committed** · **Migration proposed, not applied**

---

## 1. Implementation Summary

Phase B completes the first production **Money Coming In** workflow on top of the Phase A platform foundation. No Phase A services were redesigned.

**End-to-end flow (production):**

```
CRM Record Payment
  → EWE (business event + workflow instance)
  → FOE onPaymentRecorded (queue + notifications)
  → Finance verifies (SoD enforced)
  → FOE runMoneyInOrchestrator (official receipt + draft journal)
  → Finance Work Queue → Approve & post journal
  → GL posted + trust subledger + student timeline updated
```

**Phase B additions:**
- Unified **Finance Work Queue** UI (`/accounting/finance-queue`)
- **CRM student financial history** on Payments tab (summary + three statuses + ledger)
- **Financial timeline strip** on Payments tab
- **Finance queue aggregator** (platform queue + live CRM/journal fallback)
- **Payment status resolver** (three independent statuses with DB or derived fallback)
- **Pipeline retry** for incomplete FOE runs
- **Journal approval SoD** (verifier ≠ journal approver when same user)
- **Proposed migration** ready for Lovable Publish

---

## 2. Files Modified

| File | Change |
|------|--------|
| `src/platform/foe/moneyInOrchestrator.ts` | Journal SoD; complete queue on approve; timeline on post |
| `src/platform/workQueue/workQueueEngine.ts` | Queue links → finance-queue |
| `src/platform/index.ts` | Export Phase B services |
| `src/components/clients/ClientPaymentsCard.tsx` | Financial history + timeline + queue link |
| `src/pages/ClientDetail.tsx` | Pass clientName to payments card |
| `src/components/layout/AppLayout.tsx` | Finance queue nav item |
| `src/App.tsx` | Route `/accounting/finance-queue` |
| `src/accounting/pages/journals/AccountingJournalsPage.tsx` | Approve uses FOE with SoD result |

---

## 3. Files Created

| File | Purpose |
|------|---------|
| `src/platform/workQueue/financeQueueService.ts` | Finance adapter over universal queue |
| `src/platform/foe/paymentStatusResolver.ts` | Business / workflow / accounting status resolution |
| `src/platform/foe/pipelineRetry.ts` | Idempotent FOE pipeline retry |
| `src/accounting/pages/finance/FinanceWorkQueuePage.tsx` | Unified finance inbox UI |
| `src/components/clients/ClientFinancialHistoryPanel.tsx` | CRM financial tab |
| `src/components/clients/ClientFinancialTimelineStrip.tsx` | Financial timeline on Payments |
| `src/platform/platform.phase-b.test.ts` | Phase B unit tests |
| `supabase/migrations/20260750120000_foe_platform_foundation.sql` | **Proposed** migration |
| `docs/foe/PHASE_B_DELIVERABLE.md` | This document |

---

## 4. Reusable Platform Services Added (Phase B)

| Service | Reuse |
|---------|-------|
| `financeQueueService` | Pattern for HR/Payroll/Vendor queue adapters |
| `paymentStatusResolver` | Any module displaying three FOE statuses |
| `pipelineRetry` | Any FOE workflow recovery |

Phase A services (`workflowEngine`, `sodEngine`, `moneyInOrchestrator`, etc.) unchanged in architecture — only extended.

---

## 5. Schema Changes

See `supabase/migrations/20260750120000_foe_platform_foundation.sql`:

- `foe_business_events`, `foe_business_event_links`
- `platform_workflow_instances`
- `platform_work_queue_items`
- `foe_cash_registers`
- Payment columns: `business_status`, `workflow_status`, `accounting_status`, `business_event_id`, `lock_state`, `cash_register_id`
- SoD trigger on payment verify
- RLS for events + work queue

**App works without migration** via derived statuses + localStorage queue fallback.

---

## 6. Proposed Migrations

| File | Action |
|------|--------|
| `supabase/migrations/20260750120000_foe_platform_foundation.sql` | Publish in Lovable when approved |

Also documented in `docs/foe/PROPOSED_MIGRATION_phase_a.sql` (reference copy).

---

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Client-side FOE if user closes browser mid-verify | `pipelineRetry` + finance queue retry button; Phase C server trigger |
| Migration not published | Derived statuses + CRM fallback queue |
| Duplicate queue items (platform + fallback) | Dedupe by `kind:sourceRecordId` in `financeQueueService` |
| Journal approver SoD only in app layer until extended | Document for Phase C DB policy |
| StudentFinancialLedger still accounting-centric | Wrapped in CRM panel; full parity in Phase C |

---

## 8. UAT Checklist

### Cash (mandatory)
- [ ] Counselor records cash → Pending cash verification
- [ ] Same counselor cannot verify (UI + after migration: DB trigger)
- [ ] Second user verifies from Finance Work Queue
- [ ] Official receipt auto-generated after verify
- [ ] Draft journal created; not POSTED until approval
- [ ] Approve & post from queue or Journals page
- [ ] Student Payments tab shows three statuses + timeline events

### Non-cash
- [ ] Bank/UPI → verification queue → full FOE pipeline
- [ ] No duplicate receipt or journal on retry

### SoD
- [ ] Verifier cannot approve same payment's journal (if they were verifier)
- [ ] Different finance user can approve journal

### Work queue
- [ ] `/accounting/finance-queue` shows correct counts
- [ ] Tabs filter cash / verify / journal
- [ ] Actions complete without opening client profile (optional client link)

### Regression
- [ ] Invoice create/pay/refund unchanged
- [ ] Manual receipt still available if needed
- [ ] Sync CRM creates draft journals only

---

## 9. Outstanding Before Phase C

1. **Publish migration** + seed `foe_cash_registers` per entity/branch  
2. **Server-side FOE orchestrator** (edge function or trigger on `payment_status → verified`)  
3. **Accounting Overview KPIs** wired to live collections data  
4. **Workflow config admin UI** (DB-driven payment method rules)  
5. **Bank reconciled** status wiring  
6. **Deprecate** standalone verification page in favour of finance queue (optional redirect)  
7. **Multi-level / parallel approval** step engine persistence in `platform_workflow_instances`  
8. **WhatsApp/SMS** notification channels (stubs exist in router)

---

## 10. Tests

```bash
npm test -- --run src/platform/platform.phase-a.test.ts src/platform/platform.phase-b.test.ts
```

---

**No commit · No merge · No publish** — awaiting review before Phase C.
