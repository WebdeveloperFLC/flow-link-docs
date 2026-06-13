# Performance Hub — Phase 5C Deploy

Deploy: **GitHub → Lovable → Publish** (migration required)

## Phase 5C deliverables

| # | Feature | Route |
|---|---------|--------|
| 5C.1 | Unclassified payments queue | `/performance/admin/unclassified` |
| 5C.2 | Discount approval depth matrix | `/performance/admin/approvals` + Give Discount submit |
| 5C.3 | Promotion request workflow | `/performance/offers/requests` |
| 5C.4 | Live L0 suggestion on client strip | Client record → Promotions strip |

## Migration

Apply on Lovable publish:

**`20260619120000_incentive_platform_phase5c.sql`**

Creates:

- `discount_approval_requests`, `promotion_requests`
- RPCs: `fn_submit_discount_request`, `fn_review_discount_request`, `fn_unclassified_payment_count`, `fn_unclassified_payments_for_period`, `fn_classify_payment_service`, `fn_suggest_offer_for_client`, `fn_discount_approval_level`, `fn_can_review_discount_level`

## Depends on

- Phase 5A + 5B deployed
- Incentive Phases 0–4 + wallet RPCs (`fn_apply_offer_discount`, qualifying events)

## UAT checklist

1. **Unclassified queue** — admin/manager sees payments missing service dimensions; classify updates qualifying event.
2. **Give discount** — ≤10% and ≤₹5k applies instantly; 11–20% creates manager queue; >20% creates admin queue.
3. **Approvals** — manager can approve/decline manager-level; admin can approve admin-level; approve runs `fn_apply_offer_discount`.
4. **Promotion requests** — counselor submits; manager/admin updates status; link to offers library for publish.
5. **Client strip** — suggestion card loads from `fn_suggest_offer_for_client`; “Use suggestion” opens Give Discount with offer pre-selected.
6. **Command center** — action queue strip shows counts when > 0.

## Not in 5C

- Telecaller performance home
- Dark mode toggle in prod
- Accept & send (WhatsApp) on suggestion card
- Auto-publish promotion → offer (manual via offers library)

## YOUR ACTION

```bash
git add supabase/migrations/20260619120000_incentive_platform_phase5c.sql \
  src/hooks/usePerformanceQueueCounts.ts \
  src/pages/PerformanceUnclassifiedPayments.tsx \
  src/pages/PerformanceApprovals.tsx \
  src/pages/PerformancePromotionRequests.tsx \
  src/pages/PerformanceCommandCenter.tsx \
  src/pages/GiveDiscount.tsx \
  src/components/clients/ClientPromotionsStrip.tsx \
  src/App.tsx \
  src/components/layout/AppLayout.tsx \
  docs/INCENTIVE_PHASE5C_DEPLOY.md
git commit -m "feat(performance): Phase 5C — approval queues, unclassified payments, promotion requests, L0 suggestion"
git push origin HEAD
# Lovable → Publish (run migration 20260619120000_incentive_platform_phase5c.sql)
```
