# Phase 2A — Receipt Posting + Student Allocation

**Status:** Superseded by detailed design — see **`PHASE2A_COMMISSION_RECEIPT_ALLOCATION_DESIGN.md`**  
**Prior status:** Implementation plan — amendments approved (D1–D5)  
**Approved Phase 2 order:** 2A → 2B → 2C → 2D → 2E  
**Deferred:** Bonus engine, forecast, analytics, sub-agent chains, institution portal, B2B APIs (Phase 3)

**Problem statement:** Phase 1 ends at “Mark invoice paid” — a single flag with no receipt entity, no multi-invoice remittance, no student-level allocation, and no partial-payment ledger. Future Link’s largest post-Phase-1 gap is **commission receipt reconciliation**.

**Design principle:** Mirror proven patterns from `accounting_ap_payments` + `accounting_ap_payment_allocations` and `client_invoice_payments` + `client_invoice_payment_allocations`. Do **not** mutate commission snapshots; allocation references snapshot / line item only.

---

## 1. Database design

### 1.1 New tables

#### `upi_commission_receipts` (money in — header)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `receipt_number` | text UNIQUE | e.g. `CR-2026-00042` (sequenced in 2E; manual OK in 2A) |
| `payer_type` | text | `institution` \| `aggregator` |
| `institution_id` | uuid FK nullable | Set when payer is institution |
| `aggregator_id` | uuid FK nullable | Set when payer is aggregator |
| `remittance_reference` | text | **Institution/aggregator wire ref** (primary tracking key) |
| `bank_reference` | text | FLC bank statement / deposit id |
| `receipt_date` | date | Date funds received |
| `posting_date` | date | Finance posting date (default receipt_date) |
| `amount` | numeric(14,2) | **Gross receipt amount** in `currency` |
| `currency` | text | Receipt currency (CAD, USD, INR, …) |
| `receipt_currency` | text | Same as Phase 1 4-currency model |
| `base_currency` | text | Firm reporting currency (default CAD) |
| `fx_rate` | numeric(12,6) nullable | To base when currency ≠ base |
| `amount_base` | numeric(14,2) nullable | Computed: amount × fx_rate |
| `payment_method` | text | wire, e_transfer, cheque, … |
| `status` | text | `draft` \| `posted` \| `voided` |
| `unallocated_amount` | numeric(14,2) | **Generated/maintained:** amount − sum(invoice allocations) |
| `notes` | text | |
| `metadata` | jsonb | `{ "claim_cycle_id", "institution_refs": [] }` |
| `created_by` | uuid | |
| `posted_by` | uuid | |
| `posted_at` | timestamptz | |
| `voided_at` | timestamptz | |
| `created_at` / `updated_at` | timestamptz | |

**Constraints**

- `CHECK (amount > 0)`
- `CHECK (payer_type = 'institution' AND institution_id IS NOT NULL OR payer_type = 'aggregator' AND aggregator_id IS NOT NULL)`
- Posted receipts: allocations immutable except void/reversal flow

---

#### `upi_commission_receipt_invoice_allocations` (receipt → invoice)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `receipt_id` | uuid FK → receipts ON DELETE RESTRICT | |
| `invoice_id` | uuid FK → `upi_commission_invoices` | |
| `amount_allocated` | numeric(14,2) | Portion of receipt applied to this invoice |
| `currency` | text | Must match receipt currency (2A; FX in 2C) |
| `allocated_at` | timestamptz | |
| `allocated_by` | uuid | |

**Constraints**

- `CHECK (amount_allocated > 0)`
- Unique `(receipt_id, invoice_id)` — one allocation row per pair per receipt (adjust via update while draft)
- Sum per `invoice_id` across all receipts ≤ invoice open balance

---

#### `upi_commission_receipt_student_allocations` (receipt → student commission row)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `receipt_id` | uuid FK | |
| `invoice_allocation_id` | uuid FK nullable | Parent invoice slice |
| `student_commission_id` | uuid FK → `upi_commission_students` | |
| `invoice_line_item_id` | uuid FK nullable → `upi_invoice_line_items` | Tie to billed line |
| `snapshot_id` | uuid FK nullable | **Read-only link** to immutable snapshot |
| `amount_allocated` | numeric(14,2) | Student’s share of this receipt |
| `currency` | text | |
| `allocated_at` | timestamptz | |
| `allocated_by` | uuid | |
| `allocation_method` | text | `manual` \| `pro_rata` \| `fifo` \| `full_line` |

**Constraints**

- `CHECK (amount_allocated > 0)`
- Sum per `student_commission_id` across posted receipts ≤ student open balance (`COALESCE(amended_expected_amount, expected_amount, commission_amount)`)
- Snapshot id must match student’s `commission_snapshot_id` at post time (guard in RPC)

---

#### `upi_commission_remittance_batches` (optional grouping — recommended for 2A)

Groups one physical remittance (e.g. ApplyBoard wire) to many invoice allocations before student split.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `batch_reference` | text UNIQUE | External remittance id |
| `payer_type` | text | institution \| aggregator |
| `aggregator_id` / `institution_id` | uuid | |
| `total_amount` | numeric(14,2) | |
| `currency` | text | |
| `received_date` | date | |
| `status` | text | `open` \| `reconciled` \| `disputed` |
| `notes` | text | |

`upi_commission_receipts.remittance_batch_id` FK nullable → batch.

---

### 1.2 Extensions to existing tables

#### `upi_commission_invoices`

| Column | Purpose |
|--------|---------|
| `amount_received` | numeric — **running total** from posted receipt invoice allocations |
| `amount_outstanding` | generated or maintained: `total_amount − amount_received` |
| `last_receipt_id` | uuid FK nullable |
| Deprecate direct write to `payment_received_amount` | Sync via trigger from allocations for backward compat |

Status derivation:

- `amount_received = 0` → unchanged (sent/submitted/approved)
- `0 < amount_received < total_amount` → **`partially_paid`**
- `amount_received >= total_amount` → **`paid`**

#### `upi_commission_students`

| Column | Purpose |
|--------|---------|
| `amount_received` | numeric — cumulative from posted student allocations |
| `amount_outstanding` | expected − received |
| `last_receipt_id` | uuid FK nullable |
| `remittance_reference_number` | text — **populated** when fully paid from a receipt (uses receipt.remittance_reference) |
| `payment_status` | Updated by trigger/RPC: `unpaid` \| `partially_paid` \| `paid` |
| `commission_paid_date` | Set when `payment_status = paid` |

Phase 1 legacy `commission_status` continues to sync from three-axis trigger.

#### `upi_invoice_line_items`

| Column | Purpose |
|--------|---------|
| `amount_received` | numeric — optional line-level tracking |
| `line_outstanding` | line_amount − received |

---

### 1.3 Indexes & RLS

- Indexes: `receipts(remittance_reference)`, `receipts(aggregator_id, receipt_date)`, `student_alloc(receipt_id)`, `student_alloc(student_commission_id)`, `invoice_alloc(invoice_id)`
- RLS: confidential tier — same as `upi_commission_invoices` (`can_view_upi_confidential`)
- Receipt post: commission admin + accounting member (align with `is_accounting_user` OR commission admin)

---

### 1.4 RPCs (2A)

| RPC | Purpose |
|-----|---------|
| `fn_create_commission_receipt(draft)` | Create draft receipt |
| `fn_allocate_receipt_to_invoices(receipt_id, allocations[])` | Invoice-level split; validate sum ≤ receipt.amount |
| `fn_allocate_receipt_to_students(receipt_id, student_allocations[])` | Student-level split; validate ⊆ invoice open balances |
| `fn_auto_allocate_receipt_pro_rata(receipt_id, invoice_id)` | Optional: spread invoice slice across line items by line_amount ratio |
| `fn_post_commission_receipt(receipt_id)` | Lock allocations; update invoice/student balances; set statuses |
| `fn_void_commission_receipt(receipt_id, reason)` | Reverse balances (2A: full void only; partial reversal Phase 2A.1 if needed) |
| `fn_receipt_open_balance(receipt_id)` | Diagnostics |

**No accounting journal in 2A** — `accounting_journal_id` column on receipt reserved nullable for **2C**.

---

### 1.5 Migration order (when approved)

| # | Migration | Contents |
|---|-----------|----------|
| M1 | `202608xx120000_commission_receipts_schema.sql` | Tables + column extensions + RLS |
| M2 | `202608xx120100_commission_receipt_rpcs.sql` | RPCs + balance triggers |
| M3 | `202608xx120200_commission_receipt_legacy_sync.sql` | Sync Phase 1 `payment_received_*` from first posted receipt per invoice |

---

## 2. Receipt allocation architecture

### 2.1 Layer model

```
┌─────────────────────────────────────────────────────────────┐
│  REMITTANCE (physical money in)                              │
│  upi_commission_remittance_batches (optional)                │
│  upi_commission_receipts                                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ amount (e.g. CAD 11,000)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  INVOICE ALLOCATION (which invoices this receipt settles)    │
│  upi_commission_receipt_invoice_allocations                  │
│  Seneca 4,600 + Humber 4,400 + GBC 2,000 = 11,000          │
└──────────────────────────┬──────────────────────────────────┘
                           │ per invoice slice
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STUDENT ALLOCATION (which students / lines are paid)        │
│  upi_commission_receipt_student_allocations                  │
│  Rahul 2,200 + Ananya 2,400 = 4,600 (Seneca invoice)         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STATUS SYNC (no snapshot mutation)                          │
│  invoice.amount_received, status                             │
│  student.amount_received, payment_status, remittance_ref     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Allocation rules

1. **Receipt amount is source of truth** for cash in.
2. **Invoice allocations** must sum to ≤ receipt.amount (equality required before `posted` unless `unallocated_amount` intentionally held for fees — 2A: must fully allocate to post).
3. **Student allocations** per invoice must sum to ≤ that invoice’s allocation slice (equality required for full invoice settle).
4. **Open balance** on student = `COALESCE(amended_expected_amount, expected_amount, commission_amount) − amount_received`.
5. **Snapshots** never updated; `snapshot_id` on student allocation is audit pointer only.
6. **Phase 1 “Mark as Paid”** replaced by **Post Receipt** in UI (legacy button hidden or wraps single-invoice full receipt for migration).

### 2.3 UI surfaces (2A — plan only)

| Screen | Actions |
|--------|---------|
| Institution → Claims → Receipts (new tab) | List receipts, create draft, post |
| Invoice detail | Show receipt history + outstanding |
| Student row | Show received / outstanding; allocation drill-down |
| Post receipt wizard | Step 1: remittance details → Step 2: invoice split → Step 3: student split → Post |

### 2.4 Reconciliation invariants (enforced at post)

| Invariant | Rule |
|-----------|------|
| R1 | Σ invoice allocations ≤ receipt.amount |
| R2 | Σ student allocations per invoice ≤ invoice allocation amount |
| R3 | Σ student allocations per student (all receipts) ≤ student expected |
| R4 | Posted receipt cannot change allocations (void + recreate) |
| R5 | `remittance_reference` unique per payer per receipt_date (soft warning, not hard block) |

---

## 3. Aggregator payment scenarios

*Phase 2A supports multi-invoice receipt; Phase 2B adds consolidated billing UI. 2A data model must not block 2B.*

### Scenario A — One wire, three institution invoices (ApplyBoard UAT)

| Step | Data |
|------|------|
| Receipt | payer_type=`aggregator`, aggregator=ApplyBoard, amount=**11,000 CAD**, remittance=`AB-WIRE-2026-Q4-001` |
| Invoice alloc | Seneca invoice 4,600 · Humber 4,400 · GBC 2,000 |
| Student alloc | 5 rows matching Phase 1 UAT Scenario 2 breakdown |
| Post | All 5 students `payment_status=paid`; 3 invoices `paid` |

### Scenario B — One wire, partial batch (institution pays 2 of 3 invoices)

| Receipt | 6,600 CAD |
| Invoice alloc | Seneca 4,600 + Humber 2,000 (partial Humber invoice) |
| Humber invoice | status `partially_paid`; students on Humber partially paid per student alloc |
| Remaining | Second receipt later for Humber 2,400 + GBC 2,000 |

### Scenario C — Institution direct (Centennial Scenario 1)

| Receipt | payer_type=`institution`, Centennial, 3,500 CAD, remittance=`CC-EFT-88421` |
| Invoice alloc | Single invoice 3,500 |
| Student alloc | Priya Sharma 3,500 (one line) |
| Student | `remittance_reference_number` = `CC-EFT-88421` |

### Scenario D — Overpayment (dispute path)

| Receipt | 11,200 CAD for 11,000 expected |
| 2A behaviour | Block post if invoice+student rules require exact match; **OR** allow 200 unallocated with `status=posted` + `unallocated_amount=200` ( **recommend:** block in 2A; finance voids and re-enters — document in UAT) |

---

## 4. Partial payment scenarios

### 4.1 Partial at invoice level

| Field | Before | After partial receipt |
|-------|--------|------------------------|
| Invoice total | 4,600 | 4,600 |
| Receipt alloc to invoice | — | 2,000 |
| `amount_received` | 0 | 2,000 |
| `amount_outstanding` | 4,600 | 2,600 |
| status | submitted | **partially_paid** |

### 4.2 Partial at student level (same invoice)

| Student | Expected | Receipt 1 | Receipt 2 | Final status |
|---------|----------|-----------|-----------|--------------|
| Sita | 1,800 | 900 | 900 | paid |
| Bikash | 2,600 | 1,100 | 1,500 | paid |

Invoice partially paid until Σ student received = invoice total.

### 4.3 Pro-rata auto-allocate (optional RPC)

When finance posts **2,000** against invoice with students A=2,200 and B=2,400 (total 4,600):

- A receives `2000 × (2200/4600)` = 956.52  
- B receives `2000 × (2400/4600)` = 1,043.48  

Manual override always allowed before post.

### 4.4 Multi-period partial (Scenario 6 extension)

Li Wei semester_1 row 1,000 · semester_2 row 1,000 · one invoice 2,000:

- Receipt 1,000 → allocate 100% to semester_1 line → row1 `partially_paid`/`paid`, row2 unpaid  
- Receipt 1,000 → semester_2 → both paid  

---

## 5. Remittance tracking model

### 5.1 Identifiers ( hierarchy )

| Level | Field | Example | Used for |
|-------|-------|---------|----------|
| Batch | `upi_commission_remittance_batches.batch_reference` | `AB-2026-Q4-REM-001` | Finance inbox / bank deposit grouping |
| Receipt | `upi_commission_receipts.remittance_reference` | `AB-WIRE-2026-Q4-001` | Institution/aggregator payment advice |
| Receipt | `bank_reference` | `TD-DEP-20261102-4421` | Bank reconciliation (2C) |
| Receipt | `receipt_number` | `CR-2026-00042` | Internal FLC sequence |
| Student | `remittance_reference_number` | Copy of receipt remittance when **fully paid** | Counselor-safe audit (no amount) |
| Invoice | `metadata.last_remittance_ref` | Optional denormalized | Invoice PDF / export |

### 5.2 Lifecycle

```
Bank deposit confirmed
  → Create remittance_batch (optional)
  → Create receipt (draft) with remittance_reference
  → Allocate to invoices
  → Allocate to students
  → Post receipt (immutable)
  → Sync payment_status + remittance refs
  → [2C] Link accounting_journal_id
```

### 5.3 Search & reconciliation views (2A)

| View | Purpose |
|------|---------|
| `v_commission_receipt_open_items` | Invoices with outstanding > 0 |
| `v_commission_student_receipt_ledger` | Student expected / received / outstanding |
| `v_commission_remittance_reconciliation` | Receipt ↔ invoice ↔ student totals |

---

## 6. UAT plan (Phase 2A)

**Prerequisite:** Phase 1 UAT signed off.  
**Role:** Commission admin + Finance (accounting member).

### 6.1 Test data (reuse Phase 1)

| ID | Use |
|----|-----|
| Scenario 1 Priya / Centennial | Full receipt 3,500 |
| Scenario 2 ApplyBoard 5 students | Multi-invoice receipt 11,000 |
| Scenario 6 Li Wei multi-period | Partial per semester |

### 6.2 Test cases

| # | Case | Steps | Expected screen | Expected DB |
|---|------|-------|---------------|-------------|
| 2A-1 | Full institution receipt | Draft receipt 3,500 → alloc 1 invoice → alloc Priya → Post | Invoice paid; student paid | 1 receipt posted; sums match |
| 2A-2 | Aggregator multi-invoice | Receipt 11,000 → 3 invoice allocs → 5 student allocs → Post | 3 invoices paid | Σ student = 11,000 |
| 2A-3 | Partial invoice | Receipt 2,000 on 4,600 invoice | partially_paid badge | outstanding 2,600 |
| 2A-4 | Partial student | Two receipts complete one student | Second post completes paid | amount_received cumulative |
| 2A-5 | Pro-rata | Auto-allocate partial on 2-student invoice | Split shown before post | Ratio correct ± 0.01 |
| 2A-6 | Multi-period partial | 1,000 then 1,000 on Li Wei rows | Each period paid sequentially | Two student alloc rows |
| 2A-7 | Remittance search | Find by `AB-WIRE-2026-Q4-001` | Receipt detail shows all allocs | remittance_reference indexed |
| 2A-8 | Post immutability | Edit posted receipt | Blocked | status posted unchanged |
| 2A-9 | Void receipt | Void draft vs void posted | Posted void reverses balances | students unpaid again |
| 2A-10 | Over-allocate block | Student alloc > expected | Error toast | Post rejected |
| 2A-11 | Snapshot integrity | Post then query snapshot | Unchanged | snapshot row identical |
| 2A-12 | Counselor view | Client Payments tab | Status paid; **no amounts** | v_client_commission_status |
| 2A-13 | Legacy sync | Post receipt on old Phase 1 invoice | payment_received_amount synced | backward compat |

### 6.3 Pass / fail (sign-off)

| Pass | Fail |
|------|------|
| All 13 cases pass | Any allocation sum mismatch |
| Aggregator 11,000 reconciles to 5 students | Manual SQL required for routine receipt |
| Partial paths update outstanding correctly | Snapshot mutated |
| Posted receipts immutable | Double-post same remittance without void |

### 6.4 Out of scope for 2A UAT (defer)

- Accounting journal (2C)  
- Consolidated aggregator **single invoice** UI (2B)  
- Claim eligibility gate (2D)  
- CRM auto-link (2E)  
- FX gain/loss posting  

---

## 7. Open decisions (need approval before build)

| # | Question | Recommendation |
|---|----------|----------------|
| D1 | Allow `unallocated_amount > 0` on posted receipt? | **No** in 2A — must fully allocate |
| D2 | Void posted receipt in 2A? | **Yes** — full reversal only |
| D3 | Replace “Mark as Paid” button? | **Yes** — redirect to Post Receipt wizard |
| D4 | `remittance_batches` table in 2A? | **Yes** — lightweight; helps 2B |
| D5 | Accounting users can post receipts? | **Yes** — commission admin OR accounting member |

---

## 8. Effort estimate (implementation, post-approval)

| Area | Estimate |
|------|----------|
| Migrations + RPCs | 3–4 days |
| Receipt UI + wizard | 4–5 days |
| Invoice/student balance sync + tests | 2–3 days |
| UAT script + seed helpers | 1 day |
| **Total 2A** | **~10–13 days** |

---

*Awaiting product approval on Sections 1–7 and open decisions D1–D5 before any code or migrations.*
