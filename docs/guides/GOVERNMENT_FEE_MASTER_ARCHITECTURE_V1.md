# Government Fee Master Architecture V1 (Phase P2.2 — Design Only)

| Field | Value |
|-------|-------|
| **Status** | DESIGN — locked business rules; **no implementation** |
| **Phase** | P2.2 (follows Institution Fee Architecture lock) |
| **Date** | June 2026 |
| **Prerequisite docs** | [`FEE_MASTER_ARCHITECTURE_V1_1.md`](./FEE_MASTER_ARCHITECTURE_V1_1.md), [`INSTITUTION_FEE_ARCHITECTURE_LOCKED.md`](./INSTITUTION_FEE_ARCHITECTURE_LOCKED.md) |
| **Governed by** | [`ACCOUNTING_HARDENING_ARCHITECTURE.md`](./ACCOUNTING_HARDENING_ARCHITECTURE.md) |

---

## Executive summary

Government fees (visa, biometrics, SEVIS, VFS, embassy, authority processing, PCC where government) are **authority-mandated pass-through charges**. They:

- **Originate only from the Service Library Government Fee Master** — never Institution Masters  
- **Map to existing collection categories** (`VISA_FEE`, `BIOMETRIC_FEE`, etc.) — no new taxonomy tree  
- **Consolidate four current duplicate stores** into one authoritative write path  
- **Require direct-paid tracking** even when Future Link never collects money  
- **Never count as Future Link revenue**, trust only when FL collects  

This document locks business rules **before P3 implementation**, mirroring the institution fee lock in P2.1.

**Out of scope:** Migrations, SQL, RPCs, React components, implementation tasks.

---

## Table of contents

1. [Business rules (locked)](#1-business-rules-locked)
2. [Government Fee Master ownership](#2-government-fee-master-ownership)
3. [Fee catalogue & collection categories](#3-fee-catalogue--collection-categories)
4. [Master precedence & consolidation](#4-master-precedence--consolidation)
5. [Authority rate governance](#5-authority-rate-governance)
6. [Direct-paid tracking (locked)](#6-direct-paid-tracking-locked)
7. [Counselor & accounts workflows](#7-counselor--accounts-workflows)
8. [Accounting & trust treatment](#8-accounting--trust-treatment)
9. [Reporting requirements](#9-reporting-requirements)
10. [Future data contracts (P3)](#10-future-data-contracts-p3)
11. [Relationship to other domains](#11-relationship-to-other-domains)
12. [Document closure](#12-document-closure)

---

## 1. Business rules (locked)

| # | Rule |
|---|------|
| **BR-G1** | **Government fees originate only from Service Library Government Fee Master** — never Institution Masters, never hardcoded-only sources in production |
| **BR-G2** | **Single authoritative write path:** `service_library_fee_items` (government-labelled rows) + `service_library_picker_variants` govt columns — one admin surface |
| **BR-G3** | `academy_metadata.feeBreakdown` and `feeBreakdown/*.ts` are **read fallback only** after P3 consolidation — not co-equal authoring stores |
| **BR-G4** | Every government fee charge (billable or direct-paid tracked) **must** map to an `accounting_collection_categories` leaf before case completion milestone |
| **BR-G5** | Government fees are **non-refundable by default** (Phase A4 `refund_policy_config`) — counselor cannot override without A4 approval path |
| **BR-G6** | **Direct-paid government fees must be tracked** with proof when client pays authority/vendor directly — even when FL collections = ₹0 |
| **BR-G7** | Government fees are **pass-through / trust** when FL collects — **never** Future Link revenue, branch sales targets, or incentive qualifying revenue |
| **BR-G8** | **Native authority currency** is stored on master; FX display amounts snapshotted at **invoice issue** or **direct-paid record** — not live FX on historical rows |
| **BR-G9** | Biometrics and VFS charges are **government fee domain** (mandated immigration process) even when payee is VFS/vendor — not ancillary third-party |
| **BR-G10** | **Institution Fee Policy Engine does not apply** to government fees — authority sets rates; FL does not waive IRCC/UKVI statutory fees via institution promotions |
| **BR-G11** | **Discount wallets and Offers Studio do not apply** to government fee lines |
| **BR-G12** | **Payment responsibility**, **payment status**, and **collection path** are line-level (inherit V1.1 §2–§3) |
| **BR-G13** | Consolidated master row is keyed by **`(library_id, country, fee_component, effective_from)`** — fee_component = visa, biometrics, sevis, vfs, etc. |
| **BR-G14** | When multiple government components apply to one service (e.g. visa + biometrics), each is a **separate line** — never bundled into one opaque “government fees” line on invoice |

---

## 2. Government Fee Master ownership

### 2.1 Locked boundary

```
┌─────────────────────────────────────────────────────────────┐
│  SERVICE LIBRARY (authoritative)                             │
│  • Government Fee Master — rates, authority, effective dates │
│  • Consultancy/revenue fees (separate — not this doc)        │
├─────────────────────────────────────────────────────────────┤
│  INSTITUTION MODULE — NOT government fees                    │
│  (see INSTITUTION_FEE_ARCHITECTURE_LOCKED.md)                │
├─────────────────────────────────────────────────────────────┤
│  ACCOUNTING — taxonomy + trust + disbursement only           │
│  • accounting_collection_categories                          │
│  • Trust subledger, AP to authority/vendor                   │
├─────────────────────────────────────────────────────────────┤
│  CRM PAYMENTS TAB — operational lines + direct-paid proof    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Hierarchy

```
Service Library (service_library.id)
└── Country (service_library_countries / picker variant country)
    └── Service package / variant (service_library_picker_variants) — optional
        └── Government fee components (one row per component)
            ├── Visa / IRCC / UKVI fee
            ├── Biometrics
            ├── VFS service charge
            ├── SEVIS (USA)
            ├── Embassy / consular fee
            └── Other authority surcharge
```

**Not in hierarchy:** Institution application fees, tuition, GIC (institution domain).

---

## 3. Fee catalogue & collection categories

### 3.1 Standard components (reuse seeded categories)

| Fee component | Collection category | Payee type | Trust | Refundable default |
|---------------|---------------------|------------|-------|-------------------|
| Visa / immigration application fee | `VISA_FEE` | GOVERNMENT | Yes | No |
| Embassy / consular fee | `EMBASSY_FEE` | GOVERNMENT | Yes | No |
| SEVIS (USA) | `SEVIS_FEE` | GOVERNMENT | Yes | No |
| Biometrics | `BIOMETRIC_FEE` | VENDOR (VFS) | Yes | No |
| VFS service charge | `VFS_FEE` | VENDOR (VFS) | Yes | No |
| Police clearance (PCC) — government | `POLICE_CLEARANCE` | GOVERNMENT | Yes | No |
| Country surcharge / levy | `VISA_FEE` or `EMBASSY_FEE` | GOVERNMENT | Yes | No |
| Unmapped authority fee | `OTHER` + mandatory notes | GOVERNMENT | Yes | No |

### 3.2 Country examples (illustrative masters)

| Country / service | Components typically on master |
|-------------------|----------------------------------|
| Canada study permit | IRCC visa fee, biometrics |
| UK Student visa | UKVI application, IHS (if tracked as govt — **MD-G2**) |
| USA F-1 | SEVIS, visa (MRV), optional VFS where applicable |
| Schengen | Embassy fee, vfs where applicable |
| Australia | Visa application charge |
| Germany / NZ | Authority processing fees per service library seeds |

### 3.3 V1 duplicate stores (to consolidate in P3 — not duplicate in design)

| Store | P3 role |
|-------|---------|
| `service_library_fee_items` | **Primary write** for govt-labelled rows |
| `service_library_picker_variants.govt_*` | **Primary write** for package-scoped govt amounts |
| `service_library.academy_metadata.feeBreakdown` | Display override; sync from master or deprecated |
| `src/lib/service-library/feeBreakdown/*.ts` | **Fallback read** until migration complete |
| `cost_summary_html` | Display only — never authoritative |

---

## 4. Master precedence & consolidation

### 4.1 Rate resolution order (locked)

When resolving default government fee amounts for a service + country + date:

| Priority | Source |
|----------|--------|
| **1** | Picker variant govt columns (`govt_amount`, `govt_currency`, `govt_fee_inr`, `govt_fee_cad`) for matching `library_id + country + variant_key` |
| **2** | `service_library_fee_items` row matching library + country + component label |
| **3** | `academy_metadata.feeBreakdown` if present and `effective_from` valid |
| **4** | Hardcoded `feeBreakdown/{country}.ts` — **fallback read only** |
| **5** | Manual exception on invoice line with reason + actor (accounts role) |

**First match wins.** Log `precedence_level` on snapshot.

### 4.2 Effective dating

| Field | Rule |
|-------|------|
| `effective_from` | Required on master row when authority announces future rate |
| `effective_to` | Optional; null = open-ended until superseded |
| Historical invoices | Keep snapshotted amounts — never retroactive master change |

### 4.3 Example — Canada study permit

| Component | Master (effective 2026-04-01) | Category |
|-----------|------------------------------|----------|
| IRCC application | CAD 235 | `VISA_FEE` |
| Biometrics | CAD 85 | `BIOMETRIC_FEE` |

Counselor enrolls Canada Student Visa → system proposes **two lines** (BR-G14), not one combined “CAD 320 government.”

---

## 5. Authority rate governance

Government fees change when **authorities** change tariffs (IRCC, UKVI, US DOS). FL admin workflow (design):

| Step | Actor | Action |
|------|-------|--------|
| 1 | MarCom / Service Library admin | Draft new rate + `effective_from` + source URL |
| 2 | Accounts reviewer | Verify against authority gazette |
| 3 | Publish | Set master `ACTIVE`; prior row `effective_to` = day before |
| 4 | Notify | Service Library changelog + optional counselor alert |

**No counselor approval** for using published rate — same spirit as institution policy (rate is factual, not discretionary).

**No FL “fee policy engine”** for statutory discounts — if IRCC reduces a fee nationally, update master; do not per-client waive statutory portion without A4 refund path.

---

## 6. Direct-paid tracking (locked)

### 6.1 Purpose

Clients often pay government or VFS **directly** (online portal, credit card to IRCC, VFS appointment). Future Link must still record:

- That the obligation exists  
- That it was satisfied  
- Proof for audit and case progression  

**BR-G6:** Tracking is mandatory even when **Collections = 0** and **Trust = 0**.

### 6.2 Collection path matrix (government fees)

| Pattern | collection_path | FL collects? | Trust? | payment_status |
|---------|-----------------|--------------|--------|----------------|
| Client pays FL invoice line | `FLC_COLLECTS` | Yes | Yes (when verified) | `PENDING` → `PAID_BY_CLIENT` |
| Client pays IRCC/VFS direct | `CLIENT_DIRECT` | No | No | `PAID_BY_CLIENT` |
| FL wire to IRCC on behalf | `FLC_ADVANCE` | Outbound first | On recovery | `PAID_BY_FLC` → reimbursed |
| Not yet required | — | — | — | `NOT_REQUIRED` |
| Authority fee refunded (A5) | — | — | Reversal | `REFUNDED` |

### 6.3 Direct-paid proof contract (mandatory fields)

| Field | Required when `CLIENT_DIRECT` |
|-------|--------------------------------|
| `tracked_amount` | Yes — full authority amount |
| `billable_amount` | Yes — **0** on FL invoice (informational line) or case checklist row |
| `direct_paid_proof.paid_at` | Yes |
| `direct_paid_proof.reference` | Yes — receipt / confirmation number |
| `direct_paid_proof.payer` | Yes — usually `CLIENT` or `SPONSOR` |
| `direct_paid_proof.attachment_id` | Strongly recommended — screenshot/PDF |
| `recorded_by`, `recorded_at` | Yes |

### 6.4 Locked examples

| Fee | Scenario | tracked | billable | proof |
|-----|----------|---------|----------|-------|
| IRCC visa CAD 235 | Client paid IRCC online | 235 | 0 | IRCC receipt # |
| Biometrics CAD 85 | Client paid VFS direct | 85 | 0 | VFS appointment receipt |
| SEVIS USD 350 | Client paid FMJfee.com | 350 | 0 | SEVIS ID confirmation |
| Visa CAD 235 | On FL invoice, client paid FL | 235 | 235 | FL payment receipt |
| Biometrics | Not required (exempt) | 0 | 0 | `NOT_REQUIRED` |

### 6.5 Case progression rule

**Visa pipeline stages must not advance** on “government fee paid” checkpoints unless:

- `payment_status` ∈ `{ PAID_BY_CLIENT, PAID_BY_FLC, NOT_REQUIRED, WAIVED }`, **or**  
- `collection_path = FLC_COLLECTS` and invoice line paid  

(Configurable per pipeline in P3 — design default: **hard gate** for submission-ready stages.)

### 6.6 Audit events

| Event | Trigger |
|-------|---------|
| `govt_fee_direct_paid_recorded` | CLIENT_DIRECT + proof saved |
| `govt_fee_master_snapshotted` | Service enroll / invoice issue |
| `govt_fee_line_status_changed` | Any payment_status transition |

Append-only per A2 alignment.

---

## 7. Counselor & accounts workflows

### 7.1 Service enrollment — government fee preview

When counselor adds visa service:

```
Service:     Canada Study Visa
Government fees (from master, effective today):
  • IRCC application fee     CAD 235
  • Biometrics               CAD  85
Consultancy (revenue):       INR … (separate)

How will government fees be paid?
  [ ] Collect via Future Link invoice
  [ ] Client will pay authority directly (track each component)
  [ ] Mixed (specify per component)
```

### 7.2 Per-component direct-paid entry

For each component marked direct:

1. Show master reference amount  
2. Counselor confirms paid date + reference + upload  
3. System sets `payment_status = PAID_BY_CLIENT`, `collection_path = CLIENT_DIRECT`  
4. **No finance verification required** for status-only direct-paid (unless amount differs from master by > tolerance — **MD-G1**)

### 7.3 Mixed invoice example (V1.1 §5.2 extended)

| Line | Billable | Path | Status after client pays FL for visa only |
|------|----------|------|-------------------------------------------|
| Service fee | 1,500 | FLC_COLLECTS | Paid |
| IRCC visa | 235 | FLC_COLLECTS | Paid → trust 235 |
| Biometrics | 0 (tracked 85) | CLIENT_DIRECT | PAID_BY_CLIENT (proof on file) |

**Collected:** 1,735 | **Revenue:** 1,500 | **Pass-through (case):** 320 | **Trust:** 235

---

## 8. Accounting & trust treatment

| Scenario | Collections | Revenue | Pass-through | Trust |
|----------|-------------|---------|--------------|-------|
| All govt via FL | Includes govt | Consultancy only | Govt lines | Until disbursed |
| All direct-paid | Excludes govt | Consultancy only | Tracked govt | 0 |
| Mixed | Partial | Consultancy only | Sum of all components | FL-collected portion only |

**Disbursement:** Trust → wire to IRCC / VFS / authority via `accounting_trust_disbursements` + category vendor mapping.

**Direct-paid:** No trust movement; optional memo policy (V1.1 MD-3) — status tracking sufficient for P3.

---

## 9. Reporting requirements

| Report | Definition |
|--------|------------|
| Government fees collected by FL | Sum billable govt lines where `FLC_COLLECTS` + verified |
| Government fees direct-paid | Sum `tracked_amount` where `CLIENT_DIRECT` + proof complete |
| Government fees outstanding | `PENDING` by component + service |
| FL advance on government fees | `PAID_BY_FLC` uncleared |
| Master vs applied variance | Master rate vs invoiced/direct-recorded |
| By authority / category | Group by `collection_category_id` |
| By country / service | Group by library + country |
| Counselor direct-paid compliance | % components with proof within SLA |
| Trust pending disbursement (govt) | Trust balance on VISA_FEE, BIOMETRIC_FEE, etc. |

---

## 10. Future data contracts (P3)

**Semantics only — no SQL.**

### 10.1 `government_fee_master` (logical)

| Field | Description |
|-------|-------------|
| `library_id`, `country`, `variant_key` | Scope |
| `fee_component` | `VISA` \| `BIOMETRIC` \| `SEVIS` \| `VFS` \| `EMBASSY` \| `OTHER` |
| `collection_category_id` | Required |
| `authority` | IRCC, UKVI, US_DOS, … |
| `amount`, `currency` | Native authority amount |
| `inr_display`, `cad_display` | Cached display |
| `effective_from`, `effective_to` | Rate validity |
| `source_ref` | URL / gazette |
| `lifecycle_status` | DRAFT \| ACTIVE \| ARCHIVED |

### 10.2 Line / checklist extensions (government)

Extends V1.1 §9.1:

| Field | Description |
|-------|-------------|
| `fee_domain` | `GOVERNMENT` |
| `fee_component` | Component code |
| `govt_fee_reference` | Master amount at snapshot |
| `govt_fee_applied` | Billable amount |
| `govt_fee_tracked` | Economic amount (direct or collected) |
| `direct_paid_proof` | §6.3 |

### 10.3 Admin UI (design)

| Surface | Role |
|---------|------|
| Service Library Admin → **Government Fees** tab | Single write path (split from generic Fees tab) |
| Service Library Academy | Read-only breakdown from master |
| CRM Payments / service case | Direct-paid proof + mixed path |
| Lead picker `ServicePickerRow` | Govt column reads master — one source |

---

## 11. Relationship to other domains

| Domain | Relationship |
|--------|--------------|
| **Institution fees** | Separate — never mix institution application fee into government master |
| **Third-party ancillary** | Courier/medical **not** government — unless PCC government-issued (`POLICE_CLEARANCE`) |
| **Institution Fee Policy Engine** | Does not apply (BR-G10) |
| **Discount wallet** | Does not apply (BR-G11) |
| **Phase A4 refunds** | Line-based; govt lines default non-refundable |

---

## 12. Document closure

### What this document locks

- Government fee ownership (Service Library only)  
- Single write path consolidation plan  
- Component-level line model (not bundled)  
- Direct-paid tracking with proof  
- Collection / trust / revenue separation for government lines  
- P3 data contracts  

### Open decisions requiring MD approval

| # | Decision | Recommendation |
|---|----------|----------------|
| MD-G1 | Tolerance for direct-paid amount ≠ master without accounts review | ±5% or ±CAD 5 — above requires accounts |
| MD-G2 | UK IHS — government fee master vs third-party insurance | Government master if mandatory statutory levy |
| MD-G3 | Pipeline hard gate on direct-paid proof | Hard gate for submission stages |
| MD-G4 | Memo journal for direct-paid at scale | Defer — tracking first (align MD-3) |
| MD-G5 | PCC — government vs ancillary when paid to private agency | `POLICE_CLEARANCE` when statutory; vendor medical stays ancillary |

### Recommended next phase after P2.2 approval

| Phase | Scope |
|-------|-------|
| **P2.3** | MD sign-off MD-G1–G5 |
| **P3c** | Government fee consolidation + Service Library Government Fees admin tab |
| **P3b** | Direct-paid UI on service case + Payments tab (parallel with institution P3b) |
| **P3d** | Category wiring + trust disbursement for govt categories |

**Gate:** Institution + Government design both locked before P3 implementation starts.

### Risks if implementation starts without these rules

| Risk | Consequence |
|------|-------------|
| Govt fees remain in 4 stores | Wrong invoice defaults; IRCC rate drift |
| No direct-paid tracking | Pipeline advances without proof; audit failure |
| Bundled “government fees” line | Cannot trust-disburse or refund per component (A4) |
| Govt fees in institution module | Domain violation; precedence conflicts |
| Direct-paid counted as revenue | KPI corruption |
| Wallet discounts on visa lines | Illegal margin manipulation on statutory fees |

---

## Related documents

- [`FEE_MASTER_ARCHITECTURE_V1_1.md`](./FEE_MASTER_ARCHITECTURE_V1_1.md) — payment responsibility, status, four-bucket model, §7 operational tracking  
- [`INSTITUTION_FEE_ARCHITECTURE_LOCKED.md`](./INSTITUTION_FEE_ARCHITECTURE_LOCKED.md) — institution domain closed  
- [`FEE_MASTER_ARCHITECTURE_V1.md`](./FEE_MASTER_ARCHITECTURE_V1.md) — reuse inventory, screen flows  

**End of document — design only. No implementation.**
