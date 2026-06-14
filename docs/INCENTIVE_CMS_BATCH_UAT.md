# CMS Prototype — Batch UAT (Screens 01–29)

Run after **Lovable → Sync → Publish** and all pending Performance Hub migrations are approved (see `scripts/ship.sh` checklist).

**Period:** set hub bar to **`2026-06`**.  
**Viewport:** desktop ≥768px unless noted. Mobile cases use **390px** width.  
**Deep functional tests:** cross-check with [`performance-hub/PERFORMANCE_HUB_UAT.md`](./performance-hub/PERFORMANCE_HUB_UAT.md) (51 cases).

---

## Prerequisites

| # | Check | Pass |
|---|-------|------|
| P1 | Demo users from `PERFORMANCE_HUB_DEMO_DATA.md` §2.1 exist | ☐ |
| P2 | Demo seed SQL §4 applied; period **`2026-06`** | ☐ |
| P3 | Migrations through CMS chain approved in Lovable Publish | ☐ |
| P4 | Edge functions published (`incentive-calculate-run`, `offers-lifecycle-tick`) | ☐ |

---

## Pages (01–22)

| Screen | Route | Login | Pass | Notes |
|--------|-------|-------|------|-------|
| 01 Executive | `/performance/executive` | admin / director | ☐ | 4 KPIs, branch chart, approvals preview |
| 02a Counselor home | `/performance` | counselor | ☐ | KPI strip, wallet + incentive cards |
| 02b Finance | `/performance/finance` | admin / finance | ☐ | Revenue control KPIs |
| 02c Branch | `/performance/team` | manager | ☐ | Branch attainment + team table |
| 03 Revenue analytics | `/performance/analytics` | admin | ☐ | Revenue / discount / margin panels |
| 04 Comparison | `/performance/compare` | admin | ☐ | VS comparison workspace |
| 05 Wallets | `/performance/wallets` | counselor / admin | ☐ | Summary strip + wallet list |
| 06 Combinations | `/performance/combinations` | admin | ☐ | Service combination catalog |
| 07 Offer management | `/performance/offers` | marcom / admin | ☐ | Lifecycle + conflict resolution |
| 08 Offer codes | `/performance/offers/codes` | marcom / admin | ☐ | Code table + generate panel |
| 09 Promotion requests | `/performance/offers/requests` | counselor / marcom | ☐ | Proposal → review workflow |
| 10 Client commercials | `/performance/client-commercials` | counselor / admin | ☐ | Apply wallet/offer from client list |
| 11 Incentive plans | `/performance/incentives/plans` | admin | ☐ | Plans + basis config |
| 12 Incentive ledger | `/performance/incentives/payouts` | admin / finance | ☐ | Earned → paid pipeline + forecast |
| 13 Commissions | `/performance/commissions` | commission_admin | ☐ | Partner commission ledger |
| 14 Multi-currency | `/performance/multi-currency` | admin | ☐ | INR base + CAD + FX override |
| 15 Approvals | `/performance/approvals` | manager / admin | ☐ | Auto / manager / director queue |
| 16 Report builder | `/performance/reports` | admin | ☐ | Compose + export reports |
| 17 Profitability | `/performance/profitability` | admin / finance | ☐ | Net profit after discounts |
| 18 Audit trail | `/performance/audit-trail` | admin | ☐ | Append-only commercial timeline |
| 19 Roles | `/performance/roles` | admin | ☐ | 8×11 RBAC matrix (read-only) |
| 20 CRM integration | `/performance/crm-integration` | admin | ☐ | Inherited entities + auto-apply |
| 21 Configuration | `/performance/configuration` | admin | ☐ | Config hub + linked desks |
| 22 Architecture | `/performance/architecture` | admin | ☐ | Tables + API + scalability ref |

---

## Modals (23–27)

| Modal | Trigger | Pass | Notes |
|-------|---------|------|-------|
| 23 Wallet detail | `/performance/wallets` → **Detail** on a row | ☐ | Allocation, rules, lifecycle links |
| 24 Client invoice lock | `/performance/client-commercials` → open commercial row | ☐ | Price breakdown + lock eligibility |
| 25 New wallet | `/performance/wallets` → **New wallet** (admin) | ☐ | Dialog → top-ups desk link |
| 26 New offer code | `/performance/offers/codes` → **New code** | ☐ | Offer + counselor → generate |
| 27 Run payout | `/performance/incentives/payouts` → **Run payout cycle** | ☐ | Preview → Open payout desk |

---

## Mobile (28–29) — 390px viewport

| Screen | Route | Pass | Notes |
|--------|-------|------|-------|
| 28 Mobile dashboard | `/performance` | ☐ | 2×2 KPIs, wallet/incentive cards, bottom quick bar |
| 29 Mobile wallets | `/performance/wallets` | ☐ | Card list + utilization meters (not wide table) |

Quick bar: **Home · Wallets · Discount** — sticky at bottom on mobile only.

---

## Cross-cutting (spot checks)

| # | Test | Pass |
|---|------|------|
| X1 | Hub period bar persists across `/performance/*` routes | ☐ |
| X2 | Prototype theme tokens — light/dark toggle on context bar | ☐ |
| X3 | Command center readiness card (`/performance/admin`) — no blockers for demo period | ☐ |
| X4 | Give discount mobile (`/performance/give-discount`) — 390px sticky submit | ☐ |

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Product | | |
| Finance / admin | | |
| MarCom / offers | | |
| Engineering | | |

**CMS prototype arc:** Phases 1–3Y + mobile 2I — all prototype screens **01–29** mapped.  
**Post-CMS:** intelligence layer UAT in [`INCENTIVE_PHASE5_BATCH_UAT.md`](./INCENTIVE_PHASE5_BATCH_UAT.md).
