# Flow: Accounting & Approvals

## Access gate
`/accounting` mounts only if `useAccountingAccess()` is granted. New users land on `AccountingNoAccessPage`. Admin grants via `/accounting/settings/access` (writes `accounting_users` + `accounting_user_module_permissions`).

## Modules
| Module | Page | Tables |
|---|---|---|
| Overview | `AccountingOverviewPage` | aggregates |
| Journals | `journals/*` | `accounting_journals`, `accounting_journal_lines` |
| COA | `coa/*` | `accounting_coa` |
| Bank | `bank-accounts/*` | `accounting_bank_accounts` (entity-scoped RLS) |
| Petty cash | `petty-cash/*` | `accounting_petty_cash` |
| Intercompany | `intercompany/*` | `accounting_intercompany` |
| Reimbursements | `reimbursements/*` | `accounting_reimbursements` |
| Reconciliation | `reconciliation/*` + `card-reconciliation/*` | `accounting_card_reconciliation` |
| AP | `ap/*` (bills) | `accounting_ap_bills` |
| AR | `ar/*` (invoices) | `accounting_ar_invoices`, `ar_invoice_line_items` |
| Vendors | `vendors/*` | `accounting_vendors`, `accounting_vendors_safe` view |
| Clients (acct) | `clients/*` | `accounting_clients` |
| Documents | `documents/*` | shares `client_documents` + entity scoping |
| Approvals | `approvals/*` | journal/bill/invoice approvals |
| Reports | `reports/*` | computed views (P&L, BS, CF, TB, GL, consolidated) |
| Tax | `tax/*` | tax filings, notices |
| Fraud | `fraud/*` | anomaly detection |
| AI | `ai/*` | `ai-financial-assistant` |
| Settings | `settings/*` | entities, users, access matrix |

## Sync with CRM
`fn_sync_accounting_client` upserts `accounting_clients` whenever `clients` is inserted/updated. The accounting Clients page is therefore a mirror — do not write to `accounting_clients` directly from CRM flows.

## Approvals
- Multi-stage: ACCOUNTANT submits → AUDITOR approves → FINAL_AUDITOR signs off (high-value).
- Logged in `accounting_access_audit` for perm changes; approval rows in module-specific status columns.

## Entity scope
- `accounting_users.entity_scope text[]` — `*` for all entities, else specific entity IDs.
- Enforced in `accounting_bank_accounts` via RLS subquery. Other modules currently grant access to any `accounting_user` and rely on UI to filter by selected entity.

## Numbering
- `accounting_journals.journal_number` auto via `generate_journal_number` (`JE-YYYY-NNNN`).
- Invoice/receipt numbering covered in invoices flow.