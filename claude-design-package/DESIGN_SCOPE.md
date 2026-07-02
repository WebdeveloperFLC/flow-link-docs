# Design scope — Performance Hub UX

## In scope

- Layout and information architecture for `/performance/*` and `/incentives/*`
- Dashboard hierarchy: counselor home, executive, branch, admin command center, finance
- KPI strips, scorecards (embedded), leaderboards, wallet UI, incentives ledger, competitions/rewards
- Workspace sidebar + in-page sub-nav (`PerformanceWorkspaceNav`)
- Context bar: period, branch, role preview, theme
- Mobile quick bar patterns
- Offers studio navigation and promotion flows (UI)
- Empty states, loading, role-gated visibility
- Light/dark hub theme (`data-performance-hub`)

## Out of scope

- Database schema, RLS, edge functions
- Incentive engine, wallet engine, payout calculation logic
- CAE / commercial agreement engine / FOE / EWE
- Accounting module UI (`/accounting/*`)
- Commission institution claims (`/commissions` UPI module)
- Deploy, migrations, API keys

## Primary personas

| Persona | Entry | Key screens |
|---------|-------|-------------|
| Counselor | `/performance` | My performance, wallets, give discount |
| Branch manager | `/performance/team` | Team table, branch leaderboard |
| Director / viewer | `/performance/executive` | Executive KPIs, leaderboards |
| Finance / commission admin | `/performance/finance`, payouts | Ledger, profitability, FX |
| Administrator | `/performance/admin`, CMS routes | Command center, configuration |

## Known gaps (design opportunities)

See `CONSTITUTIONS/guides/performance-hub-prototype-gaps.md`:

- Unified period command center workflow strip
- Client-record promotions strip + AI suggestions
- Dedicated scorecard page (today: KPI strips only)
- Approval workflow UI polish
- Service offers convergence banner UX

## Success criteria for redesign

- One mental model: **Performance & Promotions**
- Preserve 8 workspace groups and role gates
- Improve scanability of KPI / money rails without breaking period-first model
- Accessible contrast in both hub themes
