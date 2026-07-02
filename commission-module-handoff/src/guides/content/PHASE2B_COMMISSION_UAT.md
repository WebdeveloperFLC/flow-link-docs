# Phase 2B — Aggregator Billing UAT

**Prerequisite:** Phase 2A UAT passed; migrations `20260815120000`–`20260815120500` published.

| ID | Scenario | Pass criteria |
|----|----------|---------------|
| 2B-1 | Open Workbench from Masters → Aggregators | KPI bar shows Expected, Invoiced, Received, Outstanding, **Held** |
| 2B-2 | Claims tab — ApplyBoard 5 students | Transfer badge on transfer rows; lifecycle badges |
| 2B-3 | Create aggregator invoice from 3 institution invoices | AI total = 11,000 |
| 2B-4 | Create remittance batch with aggregator_reference_number | Batch searchable; status open |
| 2B-5 | Upload aggregator statement on batch | File in storage + statement row linked |
| 2B-6 | Full wire 11,000 — receipt linked to batch | 3 invoices + 5 students paid; batch reconciled |
| 2B-7 | Partial wire 6,600 | Batch partially_reconciled |
| 2B-8 | Second receipt 4,400 | Batch reconciled |
| 2B-9 | Post aggregator receipt without batch | Blocked by RPC |
| 2B-10 | Flag batch dispute | dispute_reason, dates set; status disputed |
| 2B-11 | Outstanding tab | Institution + student open balances |
| 2B-12 | Held KPI | Matches sum of active holds |
| 2B-13 | Void receipt updates batch | Totals refresh |
| 2B-14 | No accounting journal | accounting_journal_id NULL |
| 2B-15 | Institution Claims tab unaffected | Direct flows work |
