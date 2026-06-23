# Fee Master Architecture — Final MD Sign-Off (Phase P2.3)

| Field | Value |
|-------|-------|
| **Status** | **AWAITING MD SIGN-OFF** — design complete; implementation blocked until approved |
| **Phase** | P2.3 |
| **Date** | June 2026 |
| **Prerequisite locks** | [`INSTITUTION_FEE_ARCHITECTURE_LOCKED.md`](./INSTITUTION_FEE_ARCHITECTURE_LOCKED.md), [`GOVERNMENT_FEE_ARCHITECTURE_LOCKED.md`](./GOVERNMENT_FEE_ARCHITECTURE_LOCKED.md) |
| **Foundation** | [`FEE_MASTER_ARCHITECTURE_V1_1.md`](./FEE_MASTER_ARCHITECTURE_V1_1.md), [`GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md`](./GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md) |

---

## Executive summary

Institution (P2.1) and Government (P2.2) fee architectures are **locked**. Thirteen decisions remain for Managing Director approval before P3 implementation begins.

This document consolidates all open items, documents the **recommended resolution** from the design team, and defines the **P3 entry gate**.

**No code, migrations, or UI until MD marks P2.3 complete.**

---

## Design locks already approved (no MD action required)

| Domain | Document | Key rules |
|--------|----------|-----------|
| Cross-cutting | FEE_MASTER_ARCHITECTURE_V1_1 | Payment responsibility, payment status, four-bucket model (Collections / Revenue / Pass-through / Trust), direct-paid principle |
| Institution | FEE_MASTER_ARCHITECTURE_V1_1 §4–§4.6 | Institution Masters only; precedence Route → Program → Default → Manual; Fee Policy Engine (available not forced) |
| Government | GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1 | Service Library only; single write path; component lines; direct-paid proof mandatory |
| Ancillary | FEE_MASTER_ARCHITECTURE_V1_1 §6 | Option A — stay under Third Party + `fee_subgroup` metadata |

---

## MD decision register

**Instructions for MD:** Approve each row (✓ Approved / ✗ Reject / ↔ Alternate). Initials + date in sign-off block at bottom.

### Cross-cutting & third-party (from V1.1)

| ID | Decision | Options | **Recommended resolution** | Impact if deferred |
|----|----------|---------|---------------------------|-------------------|
| **MD-1** | Collection categories for **Forex** and **SIM Card** | New `THIRD_PARTY` leaves vs `OTHER` | **Approve dedicated leaves** (`FOREX`, `SIM_CARD`) under `THIRD_PARTY` when P3 ancillary work starts — defer seed until first production use case | Fees map to `OTHER`; weak trust/COA reporting |
| **MD-2** | **Sponsor billing** model | Separate sponsor invoice vs client invoice + `SPONSOR` responsibility | **Approve client invoice + sponsor metadata** (`payer_party_ref`) for P3; dual sponsor invoice entity deferred | Sponsor settlements manual/off-system |
| **MD-3** | **Memo journal** for direct-paid (no FL cash) | Status-only vs memo JE | **Approve status-only for P3**; memo JE deferred to Accounting Phase 2 (aligns government MD-G4) | GL has no memo trail for direct-paid — acceptable for P3 |
| **MD-4** | **MBBS institution costs** in Service Library | Migrate to Institution Masters vs exception | **Approve gradual migration** — MBBS academy display reads institution snapshot where program linked; no new MBBS tuition in Service Library Fees tab | Dual tuition path until migrated |
| **MD-5** | **Zero-amount informational lines** | Invoice line vs case checklist only | **Approve both** — zero billable line on invoice **and** case checklist row for audit trail | Weaker audit if checklist-only |

### Institution-specific (from V1.1 §4.6)

| ID | Decision | Options | **Recommended resolution** | Impact if deferred |
|----|----------|---------|---------------------------|-------------------|
| **MD-6** | **FL promotional waiver** chargeback (`FLC` responsibility) | Central marketing cost vs branch P&L | **Approve central marketing cost** unless branch-initiated waiver with branch manager approval flag | Branch margin disputes |
| **MD-7** | **FL absorbs gap** when client pays reduced fee but FL remits full base to institution | FL subsidy vs institution-funded waiver | **Approve split:** partner/institution waiver → `INSTITUTION` responsibility; FL promo → `FLC` advance with recoverable or central cost per MD-6 | Trust/AP reconciliation gaps |
| **MD-8** | **Branch constraints** on active institution fee policies | Branch can block waiver vs counselor freedom | **Approve counselor choice when policy Active**; branch may set **guardrails** (max waiver count/month) via config — **not** per-application admin approval | Operational bottleneck if per-app approval returns |

### Government-specific (from P2.2)

| ID | Decision | Options | **Recommended resolution** | Impact if deferred |
|----|----------|---------|---------------------------|-------------------|
| **MD-G1** | **Direct-paid amount tolerance** vs master | Strict match vs tolerance band | **Approve ±5% or ±CAD/INR 5** (whichever greater) without accounts review; above requires accounts | Counselors blocked on minor FX/rounding differences |
| **MD-G2** | **UK IHS** classification | Government fee master vs third-party insurance | **Approve government fee master** — mandatory statutory levy for student visa route; map to new or existing health-surcharge category leaf | Misclassified pass-through/revenue |
| **MD-G3** | **Pipeline hard gate** on direct-paid proof | Soft reminder vs hard block | **Approve hard gate** for submission-ready visa stages — stage cannot advance without `PAID_BY_CLIENT` + proof or `FLC_COLLECTS` paid | Cases advance without govt fee proof |
| **MD-G4** | **Memo journal** for government direct-paid at scale | Same as MD-3 | **Approve defer** — tracking + proof sufficient for P3 (same as MD-3) | — |
| **MD-G5** | **PCC** — government vs ancillary | `POLICE_CLEARANCE` vs vendor medical | **Approve:** statutory police certificate → `POLICE_CLEARANCE`; private clinic medical exam → `MEDICAL` ancillary | Wrong category/trust bucket |

---

## Recommended resolutions summary (quick approve)

If MD accepts the design team bundle **without line-by-line review**, approve this summary:

1. **MD-1** — Dedicated Forex/SIM categories when needed; not blocking P3 start.  
2. **MD-2** — Sponsor on client invoice with metadata.  
3. **MD-3 / MD-G4** — No memo JE in P3; status + proof only.  
4. **MD-4** — MBBS gradual migration to institution snapshots.  
5. **MD-5** — Zero billable invoice line + checklist for direct-paid/informational fees.  
6. **MD-6** — Central cost for FL promo waivers unless branch-initiated.  
7. **MD-7** — Institution vs FL responsibility split for fee gaps.  
8. **MD-8** — Counselor choice under active policy; branch guardrails only.  
9. **MD-G1** — ±5% / ±5 currency tolerance on direct-paid.  
10. **MD-G2** — UK IHS in government master.  
11. **MD-G3** — Hard pipeline gate on govt fee proof.  
12. **MD-G5** — PCC government vs medical ancillary split.

---

## P3 entry gate (blocked until sign-off)

| Gate | Requirement |
|------|-------------|
| G1 | P2.1 Institution architecture locked | ✓ Complete |
| G2 | P2.2 Government architecture locked | ✓ Complete |
| G3 | **P2.3 MD sign-off** — all MD-* and MD-G* resolved | ☐ Pending |
| G4 | Accounting A1.5 bridge/trust deployed + UAT (parallel) | ☐ Owner — see [`ACCOUNTING_A1_5_PREREQ_DEPLOY.md`](./ACCOUNTING_A1_5_PREREQ_DEPLOY.md) |

---

## P3 implementation sequence (after P2.3)

| Order | Workstream | Doc reference |
|-------|------------|---------------|
| 1 | Line-item data contract (TypeScript validation) | V1.1 §9 |
| 2 | Institution fee schedule + precedence resolver | V1.1 §4.3 |
| 3 | Institution Fee Policy Engine (admin + counselor audit) | V1.1 §4.6 |
| 4 | Government fee consolidation + Government Fees admin tab | GOVERNMENT §4, §10 |
| 5 | Direct-paid proof UI (govt + institution) | V1.1 §7, GOVERNMENT §6 |
| 6 | Payments tab — responsibility, status, four-bucket totals | V1.1 §2–§5 |
| 7 | `collection_category_id` end-to-end wiring | V1 §4.4 |
| 8 | Remove institution fee authoring from Service Library Admin | V1.1 BR-3 |
| 9 | Reporting slices | V1.1 §10, GOVERNMENT §9 |

**Do not start P3 until G3 is checked.**

---

## MD sign-off block

| Field | Value |
|-------|-------|
| Approver name | _________________________ |
| Role | Managing Director |
| Date | _________________________ |
| Decision | ☐ Approve all recommended resolutions ☐ Approve with exceptions (attach) ☐ Reject — return to design |
| Exceptions / notes | |

**On approval:** Update this document status to **LOCKED**, rename phase to P2.3 Complete, and authorize P3 kickoff.

---

## Related documents

| Document | Role |
|----------|------|
| [`FEE_MASTER_ARCHITECTURE_V1.md`](./FEE_MASTER_ARCHITECTURE_V1.md) | V1 reuse inventory, screen flows |
| [`FEE_MASTER_ARCHITECTURE_V1_1.md`](./FEE_MASTER_ARCHITECTURE_V1_1.md) | Cross-cutting + institution |
| [`GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md`](./GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md) | Government + direct-paid |
| [`ACCOUNTING_HARDENING_ARCHITECTURE.md`](./ACCOUNTING_HARDENING_ARCHITECTURE.md) | Refunds, immutability (parallel) |

---

**Phase P2.3 — awaiting MD signature. Implementation blocked.**
