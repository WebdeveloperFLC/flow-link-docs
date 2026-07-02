# Screenshots

**Status:** Not included in this handoff package.

No UI screenshots were captured during the architecture audit (requires a running app with Commission admin credentials and seeded institution data).

## Screens to capture manually

### Institution workspace (`/institutions/:id`)

- Overview (recent claim cycles snippet)
- Billing tab — `BillingProfilesPanel`
- Eligibility tab — `EligibilityConfigPanel`
- Agreements tab — `AgreementsPanel`
- Commissions tab — `CommissionsPanel` (rules + simulator)
- Claims tab — `ClaimsPanel` (student rows, lifecycle actions)
- Receipts tab — `CommissionReceiptsPanel` + wizard

### Global

- `/commissions` — dashboard (invoice counts + claim cycles table)

### Aggregator

- `/institutions/aggregators/:aggregatorId/workbench` — KPIs, batches, reconciliation

### Performance Hub

- `/performance/commissions` — ledger + KPI strip

### CRM

- Client detail → Institution commission status panel (no amounts)

## Suggested capture settings

- Role: Commission admin or Accounting member
- Browser width: 1440px
- Include at least one institution with published commission, eligibility config, claim cycle, and student rows
