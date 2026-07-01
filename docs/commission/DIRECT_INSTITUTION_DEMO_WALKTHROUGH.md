# Direct Institution Partner — Demo Data & UAT Walkthrough

**Demo pack:** `crm-direct-uat-v1`  
**UAT guide:** [Business UAT Round 1](./DIRECT_INSTITUTION_BUSINESS_UAT_ROUND1.md)

**Migrations:**
- `20261031120000` … `20261031120003` — base demo seed
- `20261031120004` — UAT Round 1 templates + extra students (`fn_apply_commission_demo_uat_templates`)
- `20261031120005` — seed hook (calls template apply after base seed)

**Re-apply after Publish:** `SELECT public.fn_seed_commission_direct_partner_demo();` (only works once the function migration has succeeded)

---

## Institutions (Ontario direct partners)

| Institution | UPI ID | Slug | Route |
|-------------|--------|------|-------|
| Seneca Polytechnic | `11111111-1111-1111-1111-111111110001` | `seneca-polytechnic` | Seneca Direct Partnership |
| Conestoga College | `11111111-1111-1111-1111-111111110002` | `conestoga-college` | Conestoga Direct Partnership |
| Humber Polytechnic | *resolved at seed* (existing Institution Master row) | `humber-polytechnic` | Humber Direct Partnership |
| Sheridan College | *resolved at seed* (existing Institution Master row) | `sheridan-college` | Sheridan Direct Partnership |

Humber and Sheridan IDs are looked up by normalized name + country (`upi_institution_dedup_key`) so the seed never violates `idx_upi_institutions_dedup_unique`. Find the live ID: Institutions list → search **Humber Polytechnic** or **Sheridan College**.

**Navigation:** Institutions → select institution → tabs **Overview · Agreements · Commissions · Billing · Eligibility · Fee Schedule · Claims · Commission payments**.

---

## Seeded configuration (all four institutions)

Each institution has:

- **Agreement** + **published version** (effective 2026-01-01)
- **Direct partnership route** linked to agreement
- **Published commission structure** + rules (see table below)
- **Default billing profile** (FLC legal entity, CAD, Net 30/45)
- **Published eligibility config** (trigger varies by institution)
- **Fee schedule** rows: APPLICATION (EXACT), TUITION (APPROXIMATE), DEPOSIT where applicable
- **Fall 2026 claim cycle**

| Institution | Commission plan | Base rule | Eligibility trigger |
|-------------|-----------------|-----------|---------------------|
| Seneca | Seneca Fall 2026 Direct | CAD 3,000 fixed + CAD 500 India/Business bonus | Visa approved |
| Conestoga | Conestoga Fall 2026 Direct | CAD 2,800 fixed | Deposit paid |
| Humber | Humber Fall 2026 Direct | 14% of tuition paid | Enrollment confirmed |
| Sheridan | Sheridan Fall 2026 Direct | 15% of tuition paid | Deposit paid |

---

## Student scenarios (master index)

| # | Student | Institution | Scenario | Key state |
|---|---------|-------------|----------|-----------|
| 1 | **Priya Sharma** | Seneca | Fully commissionable + **partial payment** | Eligible · submitted · invoice · **CAD 2,000 received / CAD 1,500 outstanding** |
| 2 | **Ananya Kapoor** | Seneca | **Scholarship** (net commissionable tuition) | Eligible · submitted · CAD 2,055 expected (13,700 × 15%) |
| 3 | **Rohan Mehta** | Seneca | **Interactive — Mark Eligible** | Pending · visa + deposit + enrolled — exercise UI |
| 4 | **James Okonkwo** | Conestoga | **Hold — outstanding tuition** | Hold `tuition_pending` · CAD 4,000 / 16,800 paid |
| 5 | **Fatima Hassan** | Conestoga | **Institution reduced commission** | Approved CAD 2,400 vs submitted CAD 2,800 · invoice open |
| 6 | **Daniel Chen** | Humber | **Withdrawn** | Enrollment withdrawn · eligibility cancelled |
| 7 | **Maria Santos** | Sheridan | **Deferred** | Hold `other` · expected claim **2027-01-15** |
| 8–9 | **Ahmed Khan** | Seneca → Conestoga | **Transfer** | Source cancelled · replacement ready CAD 3,100 |

---

## End-to-end UAT paths

### Path A — Seneca happy path + partial receipt (Priya Sharma)

1. **Institutions → Seneca Polytechnic → Claims**
2. Open **Fall 2026** cycle — confirm Priya row: badges `eligible`, `submitted`, snapshotted
3. View student detail → Snapshot: **Created (immutable)** · expected **CAD 3,500**
4. Scroll to invoice **FLC-2026-SEN-DEMO-001** — status **partially_paid** · outstanding **CAD 1,500**
5. **Receipts** tab → open **RCPT-2026-SEN-DEMO-001** (posted) — CAD 2,000 allocated to Priya
6. **Optional:** Create new draft receipt for remaining CAD 1,500 via Receipt Wizard

**Pass:** Partial payment visible on student, invoice, and posted receipt; outstanding balances consistent.

---

### Path B — Scholarship (Ananya Kapoor)

1. **Seneca → Claims → Fall 2026 → Ananya Kapoor**
2. Confirm tuition **CAD 18,200** · metadata notes scholarship **CAD 4,500**
3. Expected commission **CAD 2,055** on net base **CAD 13,700**
4. Snapshot breakdown shows scholarship adjustment

**Pass:** Commission reflects reduced commissionable base, not gross tuition.

---

### Path C — Interactive eligibility (Rohan Mehta)

1. **Seneca → Claims → Rohan Mehta**
2. Confirm: study permit approved · deposit paid · enrolled
3. Click **Mark Eligible** (lifecycle dialog) → preview should pass (visa trigger)
4. Confirm snapshot created · claim moves to **ready**
5. **Submit Claim** for cycle (with Ananya if desired) → **Generate Invoice**

**Pass:** Counselor/finance can complete eligibility → claim → invoice without seed changes.

---

### Path D — Tuition hold (James Okonkwo)

1. **Conestoga → Claims → James Okonkwo**
2. Confirm hold **Tuition pending** · partial tuition **CAD 4,000 / 16,800**
3. **Release hold** after verifying notes (or document why hold remains)
4. Re-run **Recalculate** → **Mark Eligible** when business approves

**Pass:** Hold blocks claim readiness until tuition condition met.

---

### Path E — Institution reduced commission (Fatima Hassan)

1. **Conestoga → Claims → Fatima Hassan**
2. Confirm `expected_amount` **CAD 2,800** · `approved_amount` **CAD 2,400**
3. Institution validation notes explain reduction
4. Invoice **FLC-2026-CON-DEMO-001** total **CAD 2,400**
5. **Receipts** → draft **RCPT-2026-CON-DRAFT-001** — complete allocation in **Receipt Wizard** → mark ready → post

**Pass:** Invoice and receipt use institution-approved amount, not original expected.

---

### Path F — Withdrawn (Daniel Chen)

1. **Humber → Claims → Daniel Chen**
2. Confirm enrollment **withdrawn** · eligibility **cancelled**
3. No claim / invoice actions available

**Pass:** Withdrawn student excluded from commission workflow.

---

### Path G — Deferred (Maria Santos)

1. **Sheridan → Claims → Maria Santos**
2. Confirm hold **Other** · notes *Semester break — return Winter 2027*
3. **Expected claim date: 2027-01-15**
4. Claim status **not_ready** despite deposit paid

**Pass:** Deferral visible; claim deferred without cancelling eligibility.

---

### Path H — Transfer (Ahmed Khan)

1. **Seneca → Claims → Ahmed Khan (SEN-2026-0991)** — source row cancelled / carried forward
2. **Conestoga → Claims → Ahmed Khan (CON-2026-7744)** — replacement **ready** · expected **CAD 3,100**
3. View transfer event (source → replacement institutions)

**Pass:** Transfer preserves audit trail; replacement commission recalculated at new institution.

---

## Configuration tabs (smoke check)

| Tab | What to verify |
|-----|----------------|
| **Agreements** | Active commission agreement + published v1 |
| **Commissions** | Published plan with base (+ Seneca bonus) rules |
| **Billing** | Default FLC profile · CAD · payment terms |
| **Eligibility** | Published config · correct trigger type |
| **Fee Schedule** | ACTIVE APPLICATION / TUITION rows |
| **Partnership routes** | Direct route · default commission linked |

---

## Finance checklist (all scenarios)

- [ ] Priya partial receipt balances (student / invoice / line item)
- [ ] Ananya scholarship net commission
- [ ] Rohan mark eligible → submit → invoice (interactive)
- [ ] James tuition hold visible and releasable
- [ ] Fatima approved amount on invoice + receipt wizard
- [ ] Daniel withdrawn — no payable commission
- [ ] Maria deferral + expected claim date
- [ ] Ahmed transfer source + replacement linked

---

## Notes

- **No new functionality** in this pack — data only, aligned with frozen business requirements (Addendum V1.1).
- Full tuition decomposition (separate commissionable base column) remains **F3B.1** future work; scholarship scenario uses `metadata` + net paid amounts on the student row.
- Re-seed is safe: `fn_seed_commission_direct_partner_demo()` deletes prior `crm-direct-uat-v1` rows before re-inserting.
- After Lovable Publish, hard refresh before UAT.
