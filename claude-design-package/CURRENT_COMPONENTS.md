# Current components — Performance Hub UI inventory

## Shell & navigation (`LAYOUT/`)

| Component | Role |
|-----------|------|
| `AppLayout.tsx` | CRM shell + Performance Hub sidebar group + hub wrapper |
| `PerformanceHubContextBar.tsx` | Sticky hub top bar |
| `PerformanceHubHeader.tsx` | Page title/subtitle |
| `PerformanceWorkspaceNav.tsx` | In-page workspace tabs |
| `PerformancePeriodBar.tsx` | Period + branch selector |
| `PerformanceMobileQuickBar.tsx` | Mobile quick nav |
| `Topbar.tsx` | Global topbar (notifications; defers on hub) |
| `NotificationCenter.tsx` | Notification bell panel |

## KPI & dashboards (`COMPONENTS/performance/`)

| Component | Role |
|-----------|------|
| `PerformanceHomeKpiStrip.tsx` | Counselor KPI rail |
| `PerformanceExecutiveKpiStrip.tsx` | Executive KPI rail |
| `PerformanceMetricCard.tsx` | Single metric tile |
| `PerformanceMoneyRail.tsx` | Cash/wallet/offer summary rail |
| `PerformanceExecutiveBranchChart.tsx` | Branch comparison chart |
| `PerformanceExecutiveServiceMix.tsx` | Service mix viz |
| `PerformanceExecutiveLeaderboards.tsx` | Leaderboards |
| `PerformanceBranchTeamTable.tsx` | Branch team table |
| `PerformanceTelecallerHome.tsx` | Telecaller variant home |

## Wallets

`PerformanceWalletTable`, `PerformanceWalletMobileList`, `PerformanceWalletSummaryStrip`, `PerformanceWalletTypeBreakdown`, `PerformanceWalletAllocationCard`, `PerformanceWalletDialogs`

## Incentives & payouts

`PerformanceIncentiveProgressCard`, `PerformanceIncentivePlansTable`, `PerformanceIncentiveLedgerTable`, `PerformanceCommissionLedgerTable`, `PerformanceRunPayoutDialog`, structure/payout panels

## Offers

`PerformanceOfferManagementTable`, codes/eligibility tables, lifecycle strip, wizard dialogs, `OffersStudioNav`

## Analytics & finance

`PerformanceRevenueTrendChart`, `PerformanceProfitabilityMatrix`, `PerformanceComparison*`, `PerformanceReportBuilderConfig`, `PerformanceFinanceQuickActions`

## Admin CMS

`PerformanceConfiguration*`, `PerformanceArchitecture*`, `PerformanceRolesMatrix`, `PerformanceAuditTimeline`, `PerformanceApprovalQueueTable`

## Shared primitives (`COMPONENTS/ui/`)

62 shadcn components including **Card**, **Table**, **Chart**, **Progress**, **Tabs**, **Dialog**, **Drawer**, **Badge**, **status-badge**, **stat-card**, **empty-state**

## Cross-surface CRM widgets (`COMPONENTS/clients/`)

`ClientOffersPanel`, `ClientPromotionsStrip`, `ClientCommissionStatusPanel` — promotions context on client record (related UX)
