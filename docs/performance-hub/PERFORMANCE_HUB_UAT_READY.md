# Performance Hub — UAT Readiness

**Date:** 2026-07-01 (updated post Agent 2 v1 build)  
**Scope:** Performance Hub v1 implementation complete — proceed to structured UAT  
**Related:** [`PERFORMANCE_HUB_BUILD_REPORT.md`](./PERFORMANCE_HUB_BUILD_REPORT.md) · [`PERFORMANCE_HUB_UAT.md`](./PERFORMANCE_HUB_UAT.md)

---

## Ready for UAT: **YES**

Agent 2 v1 build is complete. Remaining items are **deployment gates** and **UAT execution**, not implementation gaps.

---

## Fixed in v1 build (Agent 2)

| ID | Issue | Resolution |
|----|-------|------------|
| **PH-R-001** | Wallet KPI `budget_kind` filter | `isPersonalWalletBudgetKind` in metrics hooks |
| **PH-R-002** | Give discount ignored hub period | `usePerformancePeriod()` in GiveDiscount |
| **PH-R-004** | `/offers-admin` legacy route | Redirect to `/performance/offers/library` |
| **PH-R-006** | Director/viewer approvals | Read-only queue on Approvals + Approvals CMS |
| **PH-R-007** | MarCom publish | `canPublish` (offers edit) split from `canReview` (manager) |
| **PH-R-008** | Command center URL guard | `Navigate` if not admin |
| **PH-R-009** | Incentives outside hub shell | `isPerformanceHubPath` includes `/incentives/*`; AppLayout wraps hub shell |
| **Dashboard** | Six-question home, leaderboards tier | Bible §11 structure |
| **Trace** | TraceGraph entry points | Home, analytics, wallets, incentive ledger |
| **Payout desk** | Bulk cohort processing | `PayoutCohortBar` + `BulkActionBar` |
| **Admin wizard** | Plan setup | `PerformanceSetupWizard` → existing editor |

---

## Remaining known issues (do not block UAT start)

| ID | Summary | UAT impact | Workaround |
|----|---------|------------|------------|
| **PH-R-015** | `offer_events` CHECK for `'sent'` | O10 influence card if migration missing | Apply `20260712120000` migration + re-seed |
| **PH-R-010** | Director RLS on wallet exceptions | Director sees discount queue only | Test wallet exceptions as admin/manager |
| **PH-R-011** | Wallet policy not in sidebar | Nav discoverability | Command center / How it works / ⌘K |
| **PH-R-013** | Incomplete director RPC guards | Mitigated by UI/RLS | None for UAT |
| **PH-R-020–028** | Copy, types, SLA UI, AI module polish | Non-blocking | Log in sign-off doc |

---

## Deployment gates (owner)

| Gate | Action |
|------|--------|
| Migrations | Lovable Publish — approve pending (see `docs/LOVABLE_PUBLISH_CHECKLIST.md`) |
| Demo seed | Run `PERFORMANCE_HUB_DEMO_DATA.md` §4 on staging |
| Period setup | Set hub period **`2026-06`**, branch **Genda Circle** |

---

## Minimum smoke before UAT handoff

1. Counselor home — six-question layout + TraceGraph  
2. ⌘K command palette opens  
3. Command center — admin only; wallet KPI > ₹0 with demo seed  
4. `/performance/admin/approvals` — director read-only; admin can approve  
5. `/performance/offers/requests` — MarCom publish on approved (not approve/decline)  
6. `/incentives/admin` — hub context bar visible  
7. Payout desk — cohort filter + bulk actions  

**Next:** [`PERFORMANCE_HUB_UAT.md`](./PERFORMANCE_HUB_UAT.md) → stabilization sprint → [`PERFORMANCE_HUB_UAT_SIGNOFF.md`](./PERFORMANCE_HUB_UAT_SIGNOFF.md)

---

*Do not start new Performance Hub v1 features. V2 → `/V2_BACKLOG.md`.*
