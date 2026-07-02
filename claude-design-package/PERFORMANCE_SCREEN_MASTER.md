# Performance Screen Master

**Status:** Approved screen inventory (as deployed)  
**Sources:** `src/AppRoutes.tsx`, `src/incentives/lib/performanceWorkspaceNav.ts`, `docs/performance-hub/PERFORMANCE_HUB_READINESS_REVIEW.md`, `docs/guides/incentives-module-guide.md`

> Complete route → screen mapping. **Do not add screens here without product approval.**

**Legend:** ✅ Full implementation · 🟡 Partial / wrapper · 🔗 Legacy alias

---

## Shell & layout (shared)

| Component | File (package) | Applies to |
|-----------|----------------|------------|
| CRM app shell | `LAYOUT/AppLayout.tsx` | All routes |
| Hub context bar | `LAYOUT/PerformanceHubContextBar.tsx` | `/performance/*` |
| Hub page header | `COMPONENTS/performance/PerformanceHubHeader.tsx` | Hub pages |
| Workspace sub-nav | `COMPONENTS/performance/PerformanceWorkspaceNav.tsx` | Most hub workspaces |
| Offers studio tabs | `COMPONENTS/offers/OffersStudioNav.tsx` | Offers studio routes |
| Period selector | `LAYOUT/PerformancePeriodBar.tsx` | Hub + incentive pages |

---

## Workspace 1 — Dashboard

| Label | Route | Page component | Workspace | Role gate |
|-------|-------|----------------|-----------|-----------|
| My performance | `/performance` | `PerformanceHome.tsx` | dashboard | All |
| My Incentives (legacy) | `/incentives` | `MyIncentives.tsx` → Home | dashboard | All |
| Executive overview | `/performance/executive` | `PerformanceExecutive.tsx` | dashboard | admin, administrator, director, viewer |
| Finance overview | `/performance/finance` | `PerformanceFinance.tsx` | dashboard | adminOnly (sub-link) |
| Command center | `/performance/admin` | `PerformanceCommandCenter.tsx` | dashboard | adminOnly (nav); page guard varies |
| How it works | `/performance/how-it-works` | `PerformanceHowItWorks.tsx` | dashboard | All |

---

## Workspace 2 — Discounts & Wallets

| Label | Route | Page component | Role gate |
|-------|-------|----------------|-----------|
| My wallets | `/performance/wallets` | `PerformanceWallets.tsx` | All |
| Give discount | `/performance/give-discount` | `GiveDiscount.tsx` | All |
| Give discount (legacy) | `/incentives/give-discount` | → redirect `/performance/give-discount` | All |
| Client commercials | `/performance/client-commercials` | `PerformanceClientCommercials.tsx` | manager, director, viewer, counselor+ |
| Service combinations | `/performance/combinations` | `PerformanceCombinations.tsx` | hideFromCounselor |
| Branch pool | `/performance/wallet/branch-pool` | `PerformanceBranchPool.tsx` | manager, admin, administrator |
| Wallet policy | `/performance/wallet/policy` | `PerformanceWalletPolicy.tsx` | adminOnly |
| Wallet top-ups | `/incentives/wallet-topups` | `WalletTopups.tsx` | adminOnly |
| Period close | `/incentives/period-close` | `PeriodClose.tsx` | adminOnly |

---

## Workspace 3 — Offers & Promotions

| Label | Route | Page component | Notes |
|-------|-------|----------------|-------|
| Promotion requests | `/performance/offers/requests` | `PerformancePromotionRequests.tsx` | Counselor default |
| Offers studio | `/performance/offers` | `PerformanceOffersStudio.tsx` | Studio hub |
| Offers library | `/performance/offers/library` | `PerformanceOffersLibrary.tsx` | Wrapper → OffersAdmin |
| Offer wizard (new) | `/performance/offers/new` | `PerformanceOfferWizard.tsx` | |
| Tracking codes | `/performance/offers/codes` | `PerformanceOffersCodes.tsx` | |
| Eligibility | `/performance/offers/eligibility` | `PerformanceOffersEligibility.tsx` | |
| Offer analytics | `/performance/offers/analytics` | `PerformanceOffersAnalytics.tsx` | Wrapper → OffersAnalytics |
| Promotions calendar | `/performance/offers/calendar` | `PerformanceOffersCalendar.tsx` | |
| Segments | `/performance/offers/segments` | `PerformanceOffersSegments.tsx` | |
| Automation | `/performance/offers/automation` | `PerformanceOffersAutomation.tsx` | |
| Journeys | `/performance/offers/journeys` | `PerformanceOffersJourneys.tsx` | |
| A/B tests | `/performance/offers/ab-tests` | `PerformanceOffersAbTests.tsx` | |
| AI studio | `/performance/offers/ai-studio` | `PerformanceOfferAiStudio.tsx` | Permission-gated |
| Legacy offers admin | `/offers-admin` | → redirect `/performance/offers/library` | 🔗 |

**Offers studio nav:** Applies to `/performance/offers` and library/codes/eligibility/new/analytics/calendar/segments/automation/journeys/ab-tests/ai-studio — **not** requests.

---

## Workspace 4 — Incentives & Payouts

| Label | Route | Page component | Role gate |
|-------|-------|----------------|-----------|
| Ledger & liability | `/performance/incentives/payouts` | `PerformanceIncentiveLedger.tsx` | incentives workspace |
| Incentive plans (CMS) | `/performance/incentives/plans` | `PerformanceIncentivePlans.tsx` | adminOnly |
| Approvals (CMS) | `/performance/approvals` | `PerformanceApprovalsCms.tsx` | manager, director+ |
| Payout desk | `/incentives/payouts` | `IncentivePayoutDesk.tsx` | adminOnly |
| Runs & preview | `/incentives/admin` | `IncentivesAdmin.tsx` | adminOnly |
| Plans & rules (legacy desk) | `/incentives/plans` | `IncentivePlans.tsx` | adminOnly |
| Run detail | `/incentives/runs/:runId` | `IncentiveRunDetail.tsx` | adminOnly |
| Competitions | `/incentives/competitions` | `IncentiveCompetitions.tsx` | adminOnly |
| Simulator | `/incentives/simulator` | `IncentiveSimulator.tsx` | adminOnly |
| Legacy approvals desk | `/performance/admin/approvals` | `PerformanceApprovals.tsx` | adminOnly |

---

## Workspace 5 — Teams & Performance

| Label | Route | Page component | Role gate |
|-------|-------|----------------|-----------|
| Team & branch | `/performance/team` | `PerformanceTeam.tsx` | manager, director, viewer+ |
| Comparison | `/performance/compare` | `PerformanceComparison.tsx` | manager, director, viewer+ |
| Unclassified payments | `/performance/admin/unclassified` | `PerformanceUnclassifiedPayments.tsx` | manager, admin+ |

---

## Workspace 6 — Analytics & Reports

| Label | Route | Page component | Role gate |
|-------|-------|----------------|-----------|
| Revenue analytics | `/performance/analytics` | `PerformanceRevenueAnalytics.tsx` | manager, director, viewer+ |
| Report builder | `/performance/reports` | `PerformanceReportBuilder.tsx` | manager, director, viewer+ |

---

## Workspace 7 — Finance & Profitability

| Label | Route | Page component | Role gate |
|-------|-------|----------------|-----------|
| Finance dashboard | `/performance/finance` | `PerformanceFinance.tsx` | adminOnly (sub-link); workspace: director, viewer, manager, commission_admin |
| Profitability | `/performance/profitability` | `PerformanceProfitability.tsx` | director, viewer, manager+ |
| Commissions | `/performance/commissions` | `PerformanceCommissions.tsx` | director, viewer, manager+ |
| Multi-currency | `/performance/multi-currency` | `PerformanceMultiCurrency.tsx` | director, viewer, manager+ |
| Currency Master | `/masters?section=__currencies` | CRM Masters (external) | adminOnly |
| Performance FX overrides | `/incentives/fx-rates` | `IncentiveFxRates.tsx` | adminOnly |

---

## Workspace 8 — Administration

| Label | Route | Page component | Role gate |
|-------|-------|----------------|-----------|
| Configuration | `/performance/configuration` | `PerformanceConfiguration.tsx` | adminOnly |
| Roles & permissions | `/performance/roles` | `PerformanceRolesPermissions.tsx` | director, viewer, manager+ |
| Audit trail | `/performance/audit-trail` | `PerformanceAuditTrail.tsx` | director, viewer, manager+ |
| CRM integration | `/performance/crm-integration` | `PerformanceCrmIntegration.tsx` | director, viewer, manager+ |
| Architecture & API | `/performance/architecture` | `PerformanceArchitecture.tsx` | director, viewer, manager+ |

---

## Related CRM surfaces (approved cross-links)

Not Performance Hub routes — referenced by hub pages:

| Surface | Route / location | Package component |
|---------|------------------|-------------------|
| Client offers panel | Client detail tab | `COMPONENTS/clients/ClientOffersPanel.tsx` |
| Client promotions strip | Client detail | `COMPONENTS/clients/ClientPromotionsStrip.tsx` |
| Client commission status | Client detail | `COMPONENTS/clients/ClientCommissionStatusPanel.tsx` |
| Portal offers | `/portal/offers` | Not in package |
| Legacy offer analytics | `/offers-analytics` | `OffersAnalytics.tsx` (if routed) |

---

## Dashboard variants by persona (approved)

| Persona | Primary screen | Route |
|---------|----------------|-------|
| Counselor | My commercial performance | `/performance` |
| Telecaller | Telecaller home | `/performance` (role branch) |
| Branch manager | Team & branch | `/performance/team` |
| Director / viewer | Executive command center | `/performance/executive` |
| Finance admin | Finance dashboard | `/performance/finance` |
| Operations admin | Command center | `/performance/admin` |

---

## Screens without dedicated routes (approved gaps)

From prototype gaps — **KPI components exist, no standalone route:**

| Concept | Current artifact | Status |
|---------|------------------|--------|
| Performance Score breakdown | Leaderboard rank only | 🔲 Planned in gaps doc |
| Unified period command center | Pieces across admin + executive | 🟡 Partial |
| Dedicated rewards page | Competitions at `/incentives/competitions` | No separate `/rewards` route |

---

## Route count summary

| Prefix | Count (approved) |
|--------|------------------|
| `/performance/*` | 40+ routes (see `ROUTES/AppRoutes.tsx`) |
| `/incentives/*` | 10 routes + run detail param |
| Redirects | 2 (`/offers-admin`, `/incentives/give-discount`) |

---

## Source index

| Artifact | Package path |
|----------|--------------|
| Route definitions | `ROUTES/AppRoutes.tsx` |
| Workspace nav | `ROUTES/performanceWorkspaceNav.ts` |
| Hub path detection | `ROUTES/performanceHubTokens.ts` |
| All page TSX | `PERFORMANCE_HUB/pages/` |
| Key dashboards (quick) | `DASHBOARDS/` |
| Readiness audit | `CONSTITUTIONS/performance-hub/PERFORMANCE_HUB_READINESS_REVIEW.md` |
