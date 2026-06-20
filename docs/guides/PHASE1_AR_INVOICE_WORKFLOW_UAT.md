# AR Invoice Hybrid Workflow UAT

Use after Lovable **Publish** (migration `20260722120030_ar_invoice_workflow_ledger.sql`) and hard refresh.

**Design decisions (final):**
1. Pass-through services allow top-ups (warn on duplicate open invoice).
2. ON_REQUEST pricing: Accounts may set fee on invoice.
3. Scenario B auto-creates enrollment + `client_service_cases`.
4. Unmapped collection category: block send; draft allowed with warning.
5. Corporate AR (`/accounting/ar/new`) unchanged.

---

## UAT-A — CRM-driven (Scenario A)

| ID | Steps | Pass |
|----|-------|------|
| A1 | Open client → Create invoice | Client context header shows institution, program, intake, country, counselor, visa (read-only) |
| A2 | Client with enrolled services | Eligible service requests listed with collection status badges |
| A3 | Select services, save draft | Lines have `service_id`, library name, `collection_category_id` |
| A4 | No free-text line entry | Cannot save without library service |

## UAT-B — Accounts-initiated (Scenario B)

| ID | Steps | Pass |
|----|-------|------|
| B1 | Client missing service → Add from library | Service enrolled + case created; appears in list |
| B2 | Add duplicate service | Warning → Use existing request |
| B3 | ON_REQUEST service | Accounts can enter unit fee |

## UAT-D — Duplicate prevention

| ID | Steps | Pass |
|----|-------|------|
| D1 | Draft exists for service → new invoice | Prompt to open draft |
| D2 | Outstanding sent invoice | Top-up warning; Finance Admin can force continue |
| D3 | Same service twice on one invoice | Blocked on save |

## UAT-L — Student Financial Ledger

| ID | Steps | Pass |
|----|-------|------|
| L1 | Accounting → Client detail | Service balances table with collection status |
| L2 | After payment | Collected / outstanding / trust held update per service |
| L3 | Category breakdown | Still shows R1 category rows |

See also: [PHASE1_R1_COLLECTION_CATEGORIES_UAT.md](./PHASE1_R1_COLLECTION_CATEGORIES_UAT.md)
