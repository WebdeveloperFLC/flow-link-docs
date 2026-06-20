# Future Link Commission — Official UAT Script

**Version:** Phase 1  
**Owner:** Balveer (UAT) · Commission Admin · Finance  
**Prerequisite:** All commission migrations `20260723120000`–`20260723120400` published in Lovable; hard refresh.  
**Role:** Log in as **Commission admin** (institution confidential access) unless noted as Counselor.

**Phase 1 scope reminder:** Payment **allocation engine**, accounting bridge, forecast, credit notes, clawback logic, bonus engine, and institution claim eligibility rules are **out of scope**. Bonus in Scenario 1 is modeled as a **published commission rule**, not a separate bonus engine.

---

## Pre-flight (run once before scenarios)

| # | Action | Expected screen | Expected DB / pass |
|---|--------|-----------------|-------------------|
| PF-1 | Confirm Commission admin role | Institution → Billing / Eligibility / Claims tabs visible (not locked) | `can_view_upi_confidential` = true for user |
| PF-2 | Confirm migrations live | No RPC errors on Claims actions | Tables exist: `upi_billing_profiles`, `upi_commission_eligibility_configs`, `upi_commission_hold_reasons`, `upi_commission_periods`, `upi_commission_transfer_events`, `v_client_commission_status` |
| PF-3 | Note hold code mapping | Holds use master codes | Business label **Outstanding Tuition** → code `tuition_pending` |

---

## Master test data index

| ID | Entity | Key values |
|----|--------|------------|
| **INST-CC** | Centennial College | Country: Canada · Direct route · Campus: Progress |
| **AGG-AB** | ApplyBoard | Aggregator · indirect routes |
| **INST-LAM** | Lambton College | Transfer Scenario 5 — Institution A |
| **INST-CON** | Conestoga College | Transfer Scenario 5 — Institution B |
| **COMM-CC-2026** | Commission (Centennial) | Base + bonus rule → **CAD 3,000 + CAD 500** |
| **CYC-2026-FALL** | Claim cycle | Fall 2026 · status `draft` then `submitted` |
| **BP-FLC-DEFAULT** | Billing profile | Future Link default · CAD invoice/receipt |

### Scenario 1 — Student record (Direct)

| Field | Value |
|-------|-------|
| Student name | **Priya Sharma** |
| Client link | Client `CL-PRIYA-001` (for counselor view) |
| Nationality / origin | India |
| Program | Business (PG Diploma) |
| Campus | Progress Campus |
| Intake | Fall 2026 |
| Partnership route | Centennial **Direct** |
| Tuition | CAD 18,000 |
| Tuition paid date | 2026-08-15 (deposit/eligibility) |
| Study permit approved | 2026-07-20 |
| Enrollment confirmed | 2026-08-28 |
| Expected base commission | CAD 3,000 |
| Expected bonus (rule) | CAD 500 |
| **Expected total commission** | **CAD 3,500** |

### Scenario 2 — ApplyBoard batch (5 students × 3 institutions)

| Student | Institution (route) | Country origin | Program | Base commission |
|---------|---------------------|----------------|---------|-----------------|
| S2-A **Rahul Verma** | Seneca (ApplyBoard) | India | IT | CAD 2,200 |
| S2-B **Sita Gurung** | Humber (ApplyBoard) | Nepal | Business | CAD 1,800 |
| S2-C **Karim Hassan** | George Brown (ApplyBoard) | Bangladesh | Hospitality | CAD 2,000 |
| S2-D **Ananya Patel** | Seneca (ApplyBoard) | India | Nursing | CAD 2,400 |
| S2-E **Bikash Thapa** | Humber (ApplyBoard) | Nepal | Engineering | CAD 2,600 |

| Calculation | Amount |
|-------------|--------|
| **Invoice total (all 5)** | **CAD 11,000** |
| Seneca subtotal (Rahul + Ananya) | CAD 4,600 |
| Humber subtotal (Sita + Bikash) | CAD 4,400 |
| George Brown subtotal (Karim) | CAD 2,000 |

*Phase 1 UI generates invoices **per institution Claims tab**. UAT pass: three draft invoices whose **sum = CAD 11,000**. Single consolidated aggregator invoice is a Phase 2 target.*

### Scenario 3 — Hold (tuition)

| Field | Value |
|-------|-------|
| Student | **James Okonkwo** @ Centennial |
| Tuition amount | CAD 16,000 |
| Tuition paid | **Partial CAD 4,000 only** — balance outstanding |
| Hold reason (UI) | **Tuition pending** (`tuition_pending`) |
| Business label | Outstanding Tuition |

### Scenario 4 — Semester break (deferral)

| Field | Value |
|-------|-------|
| Student | **Maria Santos** @ Centennial |
| Status before hold | Eligible, snapshotted, claim ready |
| Hold reason | **Other** (`other`) — notes: *Semester break — return Winter 2027* |
| Expected claim date | **2027-01-15** |

### Scenario 5 — Transfer

| Field | Institution A (Lambton) | Institution B (Conestoga) |
|-------|-------------------------|---------------------------|
| Student | **Ahmed Khan** (same person) | Replacement row after transfer |
| Program | Business | Business |
| Original expected | CAD 2,800 | — |
| Replacement expected (after recalc) | — | CAD 3,100 |

### Scenario 6 — Multi-period (same student, same route)

| Field | Value |
|-------|-------|
| Student | **Li Wei** @ Centennial |
| Period row 1 | `semester_1` · CAD 1,000 |
| Period row 2 | `semester_2` · CAD 1,000 |
| **Combined invoice** | **CAD 2,000** one payment |

---

# SCENARIO 1 — Direct institution (Centennial College)

**Objective:** End-to-end lifecycle from enrollment signals through payment received.

## 1. Test data setup (admin / ops — before Balveer UI steps)

| Item | Value |
|------|-------|
| Institution | Centennial College (`INST-CC`) |
| Billing profile | `FLC — Centennial Direct` · CAD · Net 30 |
| Agreement version | v1 published · effective 2026-01-01 → open |
| Eligibility config | Published · trigger **Visa** (or **Deposit** if visa already set on row) |
| Commission `COMM-CC-2026` | Published · active · currency CAD |
| Rules | Base fixed **CAD 3,000** + conditional/fixed bonus **CAD 500** (India + Business + Progress campus if scoped) |
| Direct route | `default_commission_id` → `COMM-CC-2026` |
| Claim cycle | `CYC-2026-FALL` · Fall 2026 · due date 2026-11-30 |
| Student row | Priya Sharma — tuition paid, SP approved, enrollment confirmed (see master table) |

## 2. Step-by-step actions (Balveer)

| Step | Journey stage | Action (UI) | Location |
|------|---------------|-------------|----------|
| 1 | Offer Issued | Confirm client + program exist in CRM (no commission action) | Client profile · Client Services |
| 2 | Visa Approved | Ensure `study_permit_approved_date` = 2026-07-20 on commission student row | Claims → View student **or** seed data |
| 3 | Enrollment Confirmed | Ensure `enrollment_status` = enrolled · `enrollment_confirmed_date` = 2026-08-28 | Claims → View student |
| 4 | — | **Recalculate** (calculator icon) | Institution → Claims → Priya Sharma |
| 5 | Eligible | **Mark eligible** (green check) · eligibility date 2026-08-28 | Claims → dialog |
| 6 | Snapshot created | Confirm snapshotted badge | Claims row |
| 7 | Claim submitted | Cycle → **Submit Claim** → Confirm | Claims → Fall 2026 cycle |
| 8 | Invoice generated | **Generate Invoice** | Same cycle |
| 9 | Payment received | **Mark as Paid** on invoice | Invoice section |

## 3. Expected screen results

| Step | Expected UI |
|------|-------------|
| 4 Recalculate | Toast: commission recalculated **CAD 3,500** (or 3,000 if bonus rule not matched — investigate rules) |
| 5 Mark eligible | Eligibility preview **Pass** · toast: snapshot created · badges: `Elig: eligible`, `Claim: ready`, `Snapshotted` |
| 6 Snapshot | Student detail → Snapshot: **Created (immutable)** · no edit snapshot action |
| 7 Submit claim | `claim_status` badge **submitted** · student in submit list |
| 8 Invoice | Draft invoice · **CAD 3,500** · 1 line · Priya Sharma |
| 9 Payment | Invoice status **paid** · student legacy status **Paid** |
| Counselor | Client → Payments → **Institution commission status** shows eligible / submitted / paid — **no amounts** |

## 4. Expected database results

| Table / field | After step 5 (eligible) | After step 8 (invoice) | After step 9 (paid) |
|---------------|-------------------------|------------------------|---------------------|
| `upi_commission_students.eligibility_status` | `eligible` | `eligible` | `eligible` |
| `claim_status` | `ready` → `submitted` (step 7) | `submitted` | `submitted` |
| `payment_status` | `unpaid` | `unpaid` | **`paid`** |
| `expected_amount` | 3500.00 | 3500.00 | 3500.00 |
| `commission_snapshot_id` | UUID set | unchanged | unchanged |
| `upi_commission_snapshots` | 1 row · total 3500 · INSERT only | unchanged | unchanged |
| `upi_commission_invoices.total_amount` | — | 3500.00 | 3500.00 · status `paid` |

## 5. Pass / fail criteria

| Pass | Fail |
|------|------|
| Snapshot UUID created once; cannot UPDATE snapshot row | Snapshot missing or editable |
| Full CAD 3,500 on student + invoice | Wrong currency or amount |
| Three-axis + legacy `commission_status` stay consistent | Status drift / submit while on hold |
| Counselor view shows status without amounts | Amounts visible to counselor |

---

# SCENARIO 2 — Aggregator (ApplyBoard)

**Objective:** Multi-institution indirect routes; one business payment covering five students.

## 1. Test data

- Aggregator: **ApplyBoard** (`AGG-AB`)
- Three institutions with **indirect** routes → ApplyBoard, each with published commission + eligibility config
- Five students (master table) — all **tuition paid**, **eligible**, same aggregator claim period **Q4 2026**
- Each student: `channel_type` = indirect · `aggregator_id` = ApplyBoard

## 2. Step-by-step actions (Balveer)

| Step | Action |
|------|--------|
| 1 | For each institution (Seneca, Humber, George Brown): publish commission rules matching student expected amounts |
| 2 | Link each ApplyBoard route → default commission |
| 3 | Add all 5 students to claim cycle **Q4 2026-ApplyBoard** (same cycle id if cross-institution cycle supported; else same period label per institution) |
| 4 | Recalculate + Mark eligible for **each** student |
| 5 | Submit claim at each institution cycle |
| 6 | Generate invoice at **each** institution Claims tab |
| 7 | Finance records **one receipt** CAD 11,000 — Mark each of the 3 invoices paid (Phase 1) |

## 3. Expected screen results

| Check | Expected |
|-------|----------|
| Route badge | Indirect · ApplyBoard on each student |
| Eligible count | 5 total across institutions |
| Invoices | **3 draft invoices** (Phase 1): Seneca CAD 4,600 · Humber CAD 4,400 · GBC CAD 2,000 |
| Line items | 2 + 2 + 1 students respectively |
| After payment | All 5 students `payment_status` = paid |

## 4. Expected database results

| Metric | Value |
|--------|-------|
| Sum of `upi_commission_invoices.total_amount` | **11,000.00 CAD** |
| Student-level `expected_amount` sum | 11,000.00 |
| Snapshots | 5 immutable snapshot rows |
| `payment_status` after receipt | all 5 = `paid` |

**Student-level allocation after receipt (business target vs Phase 1):**

| Business expectation | Phase 1 actual |
|---------------------|----------------|
| ApplyBoard receipt CAD 11,000 split to 5 students with institution attribution | **No allocation RPC** — mark each invoice paid; students linked via `invoice_id` get `payment_status=paid` |
| Pass Phase 1 | Totals reconcile; each student paid flag set |
| Fail / defer | Partial student paid without invoice link |

## 5. Pass / fail criteria

| Pass | Fail |
|------|------|
| Breakdown matches table (4600 + 4400 + 2000 = 11000) | Any student amount wrong |
| All 5 snapshotted before claim | Missing snapshot |
| Phase 1: 3 invoices + combined paid total 11000 | Cannot generate any invoice |

---

# SCENARIO 3 — Hold (outstanding tuition)

**Objective:** Commission blocked by tuition hold; release; complete claim.

## 1. Test data

- Student: **James Okonkwo** @ Centennial · Fall 2026
- Tuition CAD 16,000 · paid CAD 4,000 only · **no full payment date**
- Commission recalculated: CAD 3,000 (example)

## 2. Step-by-step actions (Balveer)

| Step | Action |
|------|--------|
| 1 | Recalculate James |
| 2 | Attempt **Mark eligible** | Expect **fail** if eligibility = deposit and deposit not met — OR mark eligible if visa trigger used; then continue |
| 3 | **Apply hold** → **Tuition pending** · notes: *Outstanding tuition balance* |
| 4 | Confirm **not** in Submit Claim eligible list |
| 5 | Record tuition paid in full · date 2026-09-10 |
| 6 | **Release hold** |
| 7 | **Mark eligible** → snapshot |
| 8 | Submit claim → Generate invoice |

## 3. Expected screen results

| Step | Expected UI |
|------|-------------|
| 3 Hold | Badge **On hold** · `hold_reason` tuition_pending |
| 4 Blocked | Submit Claim count excludes James |
| 6 Release | Hold cleared · `Claim: ready` if eligible |
| 8 Complete | Invoice includes James CAD 3,000 |

## 4. Expected database results

| Event | `hold_status` | `hold_reason` | `claim_status` |
|-------|---------------|---------------|----------------|
| After hold | `active` | `tuition_pending` | `not_ready` |
| After release + eligible | `released` | null | `ready` → `submitted` |
| RPC | `fn_apply_commission_hold` / `fn_release_commission_hold` used | | |

## 5. Pass / fail criteria

| Pass | Fail |
|------|------|
| Held student excluded from invoice | Invoice includes held student |
| After release, full claim path works | Hold stuck active |

---

# SCENARIO 4 — Semester break (deferral)

**Objective:** Defer claim with expected date; resume after return.

## 1. Test data

- Student: **Maria Santos** @ Centennial — already **eligible + snapshotted**
- Hold: **Other** · notes *Semester break — return Winter 2027*
- **Expected claim date:** 2027-01-15

## 2. Step-by-step actions (Balveer)

| Step | Action |
|------|--------|
| 1 | On Maria → **Apply hold** → Other · expected claim date **2027-01-15** · semester break notes |
| 2 | Verify excluded from current cycle submit |
| 3 | (Time skip / date change simulation) Return confirmed 2027-01-10 |
| 4 | **Release hold** |
| 5 | Submit claim in **Winter 2027** cycle (or same cycle if still open) |

## 3. Expected screen results

| Check | Expected |
|-------|----------|
| Hold dialog | Expected claim date visible on row after save |
| Counselor view | Shows on hold + expected claim date — no amounts |
| After release | Ready for claim again |

## 4. Expected database results

| Field | While on hold | After release |
|-------|---------------|---------------|
| `hold_status` | `active` | `released` |
| `expected_claim_date` | 2027-01-15 | null or retained per policy |
| `commission_snapshot_id` | **unchanged** (immutable) | unchanged |

## 5. Pass / fail criteria

| Pass | Fail |
|------|------|
| `expected_claim_date` stored | Date missing |
| Snapshot not mutated during deferral | Snapshot amount changed |
| Claim completes after release | Cannot release or claim |

---

# SCENARIO 5 — Transfer (Lambton → Conestoga)

**Objective:** Transfer through Future Link; cancel original; replacement + new snapshot; preserve original snapshot.

## 1. Test data

| | Lambton (A) | Conestoga (B) |
|---|-------------|---------------|
| Student row | **Ahmed Khan** · eligible · snapshot S1 | **Ahmed Khan (replacement)** · new row |
| Expected | CAD 2,800 | CAD 3,100 after recalc |
| Route | Lambton direct | Conestoga direct |

## 2. Step-by-step actions (Balveer)

| Step | Action |
|------|--------|
| 1 | Lambton: Ahmed eligible + snapshotted (note snapshot id **S1**) |
| 2 | **Initiate transfer** → destination route Conestoga · reason *FL-managed transfer* |
| 3 | Verify **transfer_under_review** hold on Lambton row |
| 4 | **Resolve transfer** → outcome **Replaced** · replacement cycle = Conestoga Fall 2026 |
| 5 | Conestoga Claims: find **new** Ahmed row |
| 6 | Recalculate → **Mark eligible** (snapshot **S2**) |
| 7 | Query/check snapshots S1 and S2 |

## 3. Expected screen results

| Check | Expected |
|-------|----------|
| Open transfers banner | 1 open until resolved |
| Lambton Ahmed | Cancelled / rejected lifecycle · original snapshot badge remains |
| Conestoga Ahmed | Pending → eligible · new snapshotted badge |
| Transfer fee | **Not** on commission invoice (CRM AR separate) |

## 4. Expected database results

| Object | Expected |
|--------|----------|
| `upi_commission_transfer_events.outcome` | `replaced` |
| Source student | `eligibility_status` = cancelled · `claim_status` = rejected |
| Replacement student | new `id` · new `commission_snapshot_id` = S2 |
| Snapshot S1 | **Row unchanged** · UPDATE/DELETE blocked |
| Snapshot S2 | New row · total ≈ 3100 |

## 5. Pass / fail criteria

| Pass | Fail |
|------|------|
| Two distinct snapshot UUIDs | S1 overwritten |
| Source cancelled; replacement active | Both active |
| Transfer event `resolved` | Stuck `open` |

---

# SCENARIO 6 — Multi-period (Semester 1 + 2)

**Objective:** Two commission period rows; one combined invoice; one payment.

## 1. Test data

- Student: **Li Wei** @ Centennial · same client · same route
- Row A: `commission_period_code` = **semester_1** · expected **CAD 1,000**
- Row B: `commission_period_code` = **semester_2** · expected **CAD 1,000**
- Both eligible + snapshotted before invoicing

## 2. Step-by-step actions (Balveer)

| Step | Action |
|------|--------|
| 1 | Create / seed two student commission rows (same client, different period) |
| 2 | Recalculate + Mark eligible **each** row |
| 3 | Confirm two snapshots (S-sem1, S-sem2) |
| 4 | Submit claim for cycle including **both** rows |
| 5 | **Generate Invoice** once |
| 6 | **Mark as Paid** once CAD 2,000 |

## 3. Expected screen results

| Check | Expected |
|-------|----------|
| Claims table | Two rows for Li Wei · badges show `semester_1` / `semester_2` |
| Invoice | **1 invoice** · **2 line items** · total **CAD 2,000** |
| Line items | Each line references period / student id |

## 4. Expected database results (student ledger outcome)

| Row | period | expected_amount | snapshot | invoice_id | payment_status |
|-----|--------|-----------------|----------|------------|----------------|
| Li Wei #1 | semester_1 | 1000.00 | S-sem1 | same UUID | paid |
| Li Wei #2 | semester_2 | 1000.00 | S-sem2 | same UUID | paid |
| Invoice | — | total 2000.00 | — | — | status paid |

## 5. Pass / fail criteria

| Pass | Fail |
|------|------|
| Unique index: one row per client×route×period | Duplicate period rows merge incorrectly |
| Single payment closes both rows | Only one row paid |
| Two immutable snapshots | One snapshot for both periods |

---

# Consolidated Balveer execution order

Recommended single UAT session (≈ 3–4 hours):

1. **PF-1–PF-3** Pre-flight  
2. **Scenario 1** — full golden path (Centennial / Priya)  
3. **Scenario 3** — hold tuition (James)  
4. **Scenario 4** — semester deferral (Maria)  
5. **Scenario 6** — multi-period (Li Wei)  
6. **Scenario 5** — transfer (Ahmed)  
7. **Scenario 2** — ApplyBoard batch (5 students) — last due to setup volume  

Record for each scenario: screenshot of Claims row, invoice total, counselor Payments tab.

---

# Global pass / fail (sign-off)

**Phase 1 sign-off requires:**

| # | Criterion |
|---|-----------|
| G-1 | All six scenarios pass per scenario tables |
| G-2 | No snapshot UPDATE/DELETE succeeds in DB |
| G-3 | Counselor view never shows commission amounts |
| G-4 | Held students never appear on submit/invoice until released |
| G-5 | Transfer preserves original snapshot |
| G-6 | Multi-period produces correct line-item invoice total |

**Known Phase 1 limitations (do not fail UAT):**

- Aggregator **single** invoice across institutions (Scenario 2: pass on 3 invoices summing to 11,000)
- No payment allocation split after receipt (Scenario 2: pass on `payment_status=paid` per student)
- Invoice numbers `FLC-YYYY-AUTO-*`
- Manual `client_id` link for counselor view

---

# UAT sign-off log

| Scenario | Tester | Date | Pass / Fail | Notes |
|----------|--------|------|-------------|-------|
| 1 Direct | | | | |
| 2 Aggregator | | | | |
| 3 Hold | | | | |
| 4 Semester break | | | | |
| 5 Transfer | | | | |
| 6 Multi-period | | | | |
| **Overall** | | | | |

---

*Official Future Link Commission UAT — Phase 1. Aligns with `docs/guides/PHASE1_COMMISSION_UAT_READINESS.md` and backlog `docs/backlog/INSTITUTION_CLAIM_ELIGIBILITY_RULES.md`.*
