# Phase 1.1 — Installment & Deposit Billing UAT

Use after Lovable **Publish** (migration `20260722120040_installment_billing_controls.sql`) and hard refresh.

**Scope:** Deposit billing, installment billing, balance billing, over-invoicing controls.  
**Gate:** Balveer sign-off required before R2 Recoverables.

---

## Setup

| Step | Expected |
|------|----------|
| Publish + hard refresh | Migration applied |
| Tuition Collection → collection category mapped | — |
| Student enrolled with open service case | Case shows billing profile fields |

---

## UAT-D — Deposit billing (CAD 20,000 requested)

| ID | Steps | Pass |
|----|-------|------|
| D1 | Set Requested CAD 20,000, Institution deposit CAD 5,000, Trigger = Deposit | Profile saves |
| D2 | Create invoice CAD 5,000 (first bill) | Stage badge **Deposit**; not top-up/duplicate |
| D3 | Composer shows Requested / Invoiced / Collected / Remaining billable / Outstanding AR | Remaining billable **15,000** after save |
| D4 | Ledger service row | Requested 20k, Invoiced 5k, Remaining 15k |
| D5 | Collect CAD 5,000 on deposit | Collected 5k; Outstanding AR 0; Remaining billable still 15k |
| D6 | Invoice CAD 10,000 | Stage **Installment** |
| D7 | Invoice CAD 5,000 | Stage **Balance**; Remaining billable **0** |
| D8 | Totals | Requested = Invoiced = 20,000 |
| D9 | Attempt invoice CAD 10,000 | **Blocked** (top-up / cap) |
| D10 | Finance override without reason | **Blocked** |
| D11 | Finance override with reason | Allowed once; line stage **Top-up** |

---

## UAT-I — Installment path (no deposit label on first full tranche)

| ID | Steps | Pass |
|----|-------|------|
| I1 | Requested 20k; first invoice 10k | Deposit or Installment badge (partial first bill = Deposit) |
| I2 | Second 5k + third 5k | Installment then Balance |
| I3 | Fourth 10k | Blocked |

---

## UAT-L — Ledger

| ID | Steps | Pass |
|----|-------|------|
| L1 | Service balances columns | Requested, Invoiced, Collected, Remaining billable, Outstanding AR |
| L2 | Invoice breakdown rows | Deposit / Installment / Balance labels per invoice |
| L3 | Institution deposit ref visible | When set on case |

---

## Pass criteria

- D1–D9 pass without workarounds
- Invoice 4 (10k after 20k invoiced) blocked by default
- billing_stage stored on **line items**, not invoice header

See also: [PHASE1_AR_INVOICE_WORKFLOW_UAT.md](./PHASE1_AR_INVOICE_WORKFLOW_UAT.md)
