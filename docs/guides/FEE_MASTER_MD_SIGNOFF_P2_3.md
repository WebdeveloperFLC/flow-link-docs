# Fee Master Architecture — Final MD Sign-Off (Phase P2.3)

| Field | Value |
|-------|-------|
| **Status** | **COMPLETE — LOCKED** |
| **Phase** | P2.3 complete |
| **Signed** | June 2026 — Managing Director |
| **Decision** | **Approve all recommended resolutions** + clarifications below |
| **Prerequisite locks** | [`INSTITUTION_FEE_ARCHITECTURE_LOCKED.md`](./INSTITUTION_FEE_ARCHITECTURE_LOCKED.md), [`GOVERNMENT_FEE_ARCHITECTURE_LOCKED.md`](./GOVERNMENT_FEE_ARCHITECTURE_LOCKED.md) |
| **P3 readiness** | [`FEE_MASTER_P3_READINESS_REPORT.md`](./FEE_MASTER_P3_READINESS_REPORT.md) |

---

## Executive summary

All thirteen MD decisions are **approved** with the clarifications in §Approved resolutions. Design phase **P2.1–P2.3 is complete**. P3 implementation is **authorized at design level** — execution remains blocked on operational prerequisites (see P3 readiness report).

**No code or migrations in this sign-off.**

---

## MD decision register — final disposition

| ID | Status | **Approved resolution** |
|----|--------|-------------------------|
| **MD-1** | ✓ Approved | Dedicated `FOREX` / `SIM_CARD` collection categories **only when first production use case is activated**; until then use `OTHER`. |
| **MD-2** | ✓ Approved | Client invoice + sponsor metadata (`payer_party_ref`); dual sponsor invoice deferred. |
| **MD-3** | ✓ Approved | Status-only + proof for P3; memo JE deferred to Accounting Phase 2. |
| **MD-4** | ✓ Approved | MBBS gradual migration — display reads institution snapshot where linked. |
| **MD-5** | ✓ Approved | Zero billable invoice line **and** case checklist row for direct-paid/informational fees. |
| **MD-6** | ✓ Approved | **Default = Central Marketing Cost.** Branch-specific promotions require **branch manager approval** and **branch cost attribution**. |
| **MD-7** | ✓ Approved | Institution-funded waivers and FLC-funded promotions **must be separately reportable** (`INSTITUTION` vs `FLC` responsibility / funding source dimension). |
| **MD-8** | ✓ Approved | Counselor choice when policy Active; branch guardrails via config only — not per-application admin approval. |
| **MD-G1** | ✓ Approved | Direct-paid tolerance: **lesser of 5% OR CAD 10 equivalent** (apply in client currency) before Accounts review required. |
| **MD-G2** | ✓ Approved | UK IHS in government fee master (mandatory statutory levy). |
| **MD-G3** | ✓ Approved | Hard pipeline gate on government fee proof for submission-ready visa stages. |
| **MD-G4** | ✓ Approved | Defer memo JE — tracking + proof for P3 (same as MD-3). |
| **MD-G5** | ✓ Approved | Statutory PCC → `POLICE_CLEARANCE`; private medical → `MEDICAL`. |

---

## MD-approved clarifications (locked)

### C1 — Forex and SIM categories (MD-1)

Create dedicated collection category leaves only when the **first production use case** is activated. Until then, map to `OTHER` with mandatory notes. Do not seed empty category leaves in P3.

### C2 — FLC promotional waivers (MD-6)

| Promotion type | Cost attribution | Approval |
|----------------|------------------|----------|
| Company-wide / central marketing | **Central Marketing Cost** | Policy-level (default) |
| Branch-specific promotion | **Branch cost attribution** | **Branch manager approval** required |

Report dimension: `flc_subsidy_source = CENTRAL \| BRANCH`.

### C3 — Institution fee gap reporting (MD-7)

| Funding source | Responsibility | Reporting bucket |
|----------------|----------------|------------------|
| Partner / institution waiver | `INSTITUTION` | Institution-funded waivers |
| FL promotional subsidy | `FLC` | FLC-funded promotions (split central vs branch per C2) |

Must not aggregate into a single “waived fees” total without source breakdown.

### C4 — Direct-paid tolerance (MD-G1)

Accounts review required when direct-paid `tracked_amount` differs from master by more than:

```
tolerance = min(master × 5%, CAD_10_equivalent_in_client_currency)
```

Within tolerance: counselor may record without accounts review.

### C5 — Payment status: `EXEMPT` (new)

Add to payment status enum (V1.1 §3):

| Status | Meaning |
|--------|---------|
| `EXEMPT` | Fee **never applicable** to this case/pathway (structural exemption — e.g. biometrics not required for age/category). **Not** a waiver. |
| `WAIVED` | Fee **was applicable**; obligation removed by institution/FL policy or counselor decision under active policy. |

**Do not use `NOT_REQUIRED` for new P3 work** — use `EXEMPT`. Legacy `NOT_REQUIRED` may map to `EXEMPT` on read.

---

## P3 entry gate

| Gate | Requirement | Status |
|------|-------------|--------|
| G1 | P2.1 Institution architecture locked | ✓ Complete |
| G2 | P2.2 Government architecture locked | ✓ Complete |
| G3 | P2.3 MD sign-off | ✓ **Complete** |
| G4 | Accounting A1.5 bridge/trust deployed + UAT | ☐ Operational prerequisite — see [`ACCOUNTING_A1_5_PREREQ_DEPLOY.md`](./ACCOUNTING_A1_5_PREREQ_DEPLOY.md) |
| G5 | P3 kickoff review | ☐ See [`FEE_MASTER_P3_READINESS_REPORT.md`](./FEE_MASTER_P3_READINESS_REPORT.md) |

**Design gate G1–G3: PASSED.** P3 coding may begin on non-trust workstreams; trust-linked features require G4.

---

## MD sign-off record

| Field | Value |
|-------|-------|
| Approver | Managing Director |
| Date | June 2026 |
| Decision | **Approve all recommended resolutions** + clarifications C1–C5 |
| Phase | **P2.3 LOCKED** |

---

## Related documents

| Document | Role |
|----------|------|
| [`FEE_MASTER_P2_3_LOCKED.md`](./FEE_MASTER_P2_3_LOCKED.md) | Phase closure index |
| [`FEE_MASTER_P3_READINESS_REPORT.md`](./FEE_MASTER_P3_READINESS_REPORT.md) | P3 prerequisites & workstreams |
| [`FEE_MASTER_ARCHITECTURE_V1_1.md`](./FEE_MASTER_ARCHITECTURE_V1_1.md) | Cross-cutting + institution (updated EXEMPT) |
| [`GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md`](./GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md) | Government + direct-paid |

---

**Phase P2.3 — COMPLETE. Design locked. P3 authorized subject to readiness prerequisites.**
