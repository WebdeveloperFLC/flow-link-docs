# Performance User Journeys

**Status:** Approved operational flows (consolidated from staff guides)  
**Sources:** `docs/guides/incentives-module-guide.md`, `docs/guides/offers-wallet-staff-guide.md`, `docs/guides/performance-hub-prototype-gaps.md`, `docs/performance-hub/PERFORMANCE_HUB_READINESS_REVIEW.md`

> Describes **how approved roles move through the system today**. Does not invent new steps or screens.

---

## Journey map overview

```text
                    ┌─────────────────────────────────────┐
                    │         Performance Hub entry        │
                    │  Sidebar → Performance Hub workspace │
                    └─────────────────┬───────────────────┘
                                      │
        ┌──────────────┬──────────────┼──────────────┬──────────────┐
        ▼              ▼              ▼              ▼              ▼
   Counselor      Branch mgr      Director/      Finance/       Admin/
   daily           team coach      viewer         commission     operations
```

---

## 1. Counselor — daily performance journey

**Primary entry:** `/performance` (My performance / My Incentives)

### Goal
Understand achievement, wallet headroom, cash earned, and take **one commercial action** (discount, offer follow-up).

### Approved steps

| Step | Screen | Action |
|------|--------|--------|
| 1 | `/performance` | Review KPI strip: revenue booked, wallet, incentive progress, offers |
| 2 | Same | Check achievement % vs assigned target; revenue mix (core / allied / travel) |
| 3 | Same | View dimension leaderboard filter (counselor / branch / country / service) |
| 4 | `/performance/give-discount` | Apply discount from wallet to client invoice |
| 5 | `/performance/offers/requests` | Submit promotion request (counselor default offers workspace route) |
| 6 | Client record | View offers tab (`ClientOffersPanel`) — active offers on client |
| 7 | `/performance/wallets` | Inspect wallet balances, allocations, type breakdown |
| 8 | Optional | Submit wallet exception request (amount + reason → manager approval) |

### Telecaller variant
**Approved:** Telecaller-only role sees `PerformanceTelecallerHome` — separate simplified home (not counselor KPI strip).

### Connected systems (read-only awareness)
- Verified payments → qualifying events → achievement & incentives
- Wallet spend → reduces net revenue → affects cash incentive

---

## 2. Branch manager — team & branch journey

**Primary entry:** `/performance/team`

### Goal
Monitor branch achievement, coach underperformers, clear operational queues.

### Approved steps

| Step | Screen | Action |
|------|--------|--------|
| 1 | `/performance/team` | Review branch team table — revenue, target %, counselors |
| 2 | `/performance/compare` | Compare periods or entities (role-gated) |
| 3 | `/performance/admin/unclassified` | Resolve unclassified payments — map service library codes |
| 4 | `/performance/admin/approvals` or `/performance/approvals` | Approve discount depth / wallet exceptions |
| 5 | `/performance/wallet/branch-pool` | Manage branch pooled wallet allocations (manager+) |
| 6 | `/performance/executive` | Optional firm-wide view if role includes director/viewer |

### Approved permissions
Preview/calculate/lock runs: **manager** ✅ (with admin/administrator).

---

## 3. Director / viewer — executive read journey

**Primary entry:** `/performance/executive`

### Goal
Firm-wide commercial health, branch rankings, pending approvals — **read-oriented**.

### Approved steps

| Step | Screen | Action |
|------|--------|--------|
| 1 | `/performance/executive` | Executive KPI strip — revenue, margin, wallet utilisation, pending approvals |
| 2 | Same | Branch chart, service mix, leaderboards |
| 3 | Same | Alerts: run not locked, payouts not generated (links to admin routes) |
| 4 | Read-only banner | Operational actions deferred to command center (admin/finance) |

**Director-only / viewer:** Read-only mode — no run lock or payout actions on executive screen (approved behaviour).

---

## 4. Finance / commission admin — profitability journey

**Primary entry:** `/performance/finance`

### Goal
Validate profitability, commissions, multi-currency exposure; support payout release.

### Approved steps

| Step | Screen | Action |
|------|--------|--------|
| 1 | `/performance/finance` | Finance dashboard — commercial finance KPIs |
| 2 | `/performance/profitability` | Profitability matrix |
| 3 | `/performance/commissions` | Commission ledger tracking (CMS) |
| 4 | `/performance/multi-currency` | Currency mix & config |
| 5 | `/incentives/fx-rates` | Set performance FX overrides + buffer + purpose |
| 6 | `/incentives/payouts` | Payout desk — generate, approve, mark paid, CSV export |
| 7 | `/performance/incentives/payouts` | Ledger & liability view (hub CMS) |

**Workspace gate:** Finance & Profitability visible to director, viewer, manager, commission_admin (approved nav rules).

---

## 5. Admin / operations — monthly period journey

**Primary entry:** `/performance/admin` (Command center)

### Goal
Close the commercial period: wallets, incentive run, payouts, exception queues.

### Approved monthly workflow (Incentives Module Guide)

```flow
Set FX rates (start of month)
Configure plan / rules / targets
Counselors earn via verified payments → qualifying events
Period-end: Preview → Calculate → Lock run
Generate payouts → Approve → Mark paid → Export CSV
(Optional) Period Close for wallets — separate module step
```

### Approved command center queues

| Queue | Route | Purpose |
|-------|-------|---------|
| Unclassified payments | `/performance/admin/unclassified` | Map service codes before lock |
| Discount & wallet approvals | `/performance/admin/approvals` | Depth matrix + exceptions |
| Promotion requests | `/performance/offers/requests` | Field → MarCom |

### Approved admin destinations (from command center links)

Runs & preview → `/incentives/admin`  
Plans & rules → `/incentives/plans` or `/performance/incentives/plans`  
Wallet top-ups → `/incentives/wallet-topups`  
Period close → `/incentives/period-close`  
Competitions → `/incentives/competitions`  
Simulator → `/incentives/simulator`  
Offers studio → `/performance/offers`  
Wallet policy → `/performance/wallet/policy`

### Run detail journey

| Step | Screen | Action |
|------|--------|--------|
| 1 | `/incentives/admin` | Preview → Calculate → Lock |
| 2 | `/incentives/runs/:runId` | Audit line items; manual adjustments on locked run |
| 3 | `/incentives/payouts` | Generate payouts with TDS; approve; mark paid |

---

## 6. MarCom / offers administrator journey

**Primary entry:** `/performance/offers` (Offers studio — non-counselor)

### Goal
Manage offer lifecycle, codes, eligibility, campaigns, analytics.

### Approved steps

| Step | Screen | Action |
|------|--------|--------|
| 1 | `/performance/offers` | Offers studio dashboard |
| 2 | `/performance/offers/library` | CRUD offer library |
| 3 | `/performance/offers/new` | Offer wizard |
| 4 | `/performance/offers/codes` | Tracking codes |
| 5 | `/performance/offers/eligibility` | Eligibility rules |
| 6 | `/performance/offers/analytics` | ROI & counselor stats |
| 7 | `/performance/offers/calendar` | Promotions calendar |
| 8 | `/performance/offers/segments` | Audience segments |
| 9 | `/performance/offers/automation` | Automation templates |
| 10 | `/performance/offers/journeys` | Journeys |
| 11 | `/performance/offers/ab-tests` | A/B experiments |
| 12 | `/performance/offers/ai-studio` | AI studio (permission-gated) |
| 13 | `/performance/offers/requests` | Review counselor promotion requests |

**Counselor offers default:** `/performance/offers/requests` (approved `offersWorkspaceDefaultRoute`).

---

## 7. Incentive plan administrator journey

**Primary entry:** `/incentives/plans` or `/performance/incentives/plans`

### Approved configuration flow

| Step | Tab | Action |
|------|-----|--------|
| 1 | Plans | Create plan — period type, settlement currency, scope |
| 2 | Rules | Scope preset, scope JSON, metric, rate type |
| 3 | Slabs | Continuous chain validation |
| 4 | Targets | Manual targets or auto-suggest RPC (`fn_suggest_incentive_targets`) |
| 5 | Competitions | `/incentives/competitions` — branch contests, campaign overlays |

---

## 8. Wallet administrator journey

**Primary entry:** `/incentives/wallet-topups`, `/incentives/period-close`

| Step | Screen | Action |
|------|--------|--------|
| 1 | `/incentives/wallet-topups` | Create / fund counselor wallets |
| 2 | `/performance/wallet/policy` | Wallet policy configuration |
| 3 | `/incentives/period-close` | Month-end close + rollover; achievement via `fn_counselor_period_achievement` |
| 4 | `/performance/wallets` | Verify balances post-close |

---

## 9. Client / portal touchpoint (approved boundary)

Performance Hub staff journeys **link to** but do not replace:

| Touchpoint | Route | Role |
|------------|-------|------|
| Client claims offer | `/portal/offers` | Client portal |
| Staff sees client offers | Client record → Offers tab | Counselor |

**Approved gap (prototype):** Unified promotions strip on client record — partial today (`ClientPromotionsStrip`, `ClientOffersPanel`).

---

## 10. Cross-journey dependencies (approved)

| Dependency | Rule |
|------------|------|
| Run lock before payouts | Payout generation requires locked run |
| FX before calculate | Purpose-specific rates should be set for period |
| Unclassified queue before lock | Documented blocker in readiness review — fix payments before lock |
| Period close vs run lock | Separate steps — wallet period close does not replace incentive lock |
| Customer ownership | Any settlement path must pass attribution gate (constitution) |

---

## 11. Known journey gaps (approved — not invented)

From prototype gaps doc — **not yet one unified flow in UI:**

- Single **period command center** screen combining all four KPI tiles + linear workflow strip
- **Client-record promotions strip** with inline apply discount
- **Hard block** at Give Discount when over unlocked wallet (partial 🟡)
- Unified Performance Hub theme on all `/incentives/*` paths (readiness PH-R-009)

UX redesign may **visualize** these approved gaps — must not change underlying step order or business rules without product sign-off.

---

## Source index

| Guide | Package path |
|-------|--------------|
| Incentives Module Guide | `CONSTITUTIONS/guides/incentives-module-guide.md` |
| Offers & Wallet Guide | `CONSTITUTIONS/guides/offers-wallet-staff-guide.md` |
| Prototype gaps | `CONSTITUTIONS/guides/performance-hub-prototype-gaps.md` |
| Readiness review | `CONSTITUTIONS/performance-hub/PERFORMANCE_HUB_READINESS_REVIEW.md` |
