# Institution Fee Architecture — LOCKED (Phase P2.1 Complete)

| Field | Value |
|-------|-------|
| **Status** | **LOCKED** — design approved; no further institution-fee architecture changes without MD review |
| **Closed** | June 2026 |
| **Canonical document** | [`FEE_MASTER_ARCHITECTURE_V1_1.md`](./FEE_MASTER_ARCHITECTURE_V1_1.md) §4, §4.6, BR-3, BR-12–BR-18 |
| **Implementation** | Deferred to P3a/P3b — **do not implement until Government Fee Master (P2.2) is also locked** |

---

## Scope closed

The following institution fee architecture is **final for design purposes**:

| Topic | Location |
|-------|----------|
| Institution fee ownership (Institution Masters only) | V1.1 §4.1, BR-3 |
| Hierarchy: Institution → Program → fees | V1.1 §4.2 |
| Precedence: Route → Program → Institution Default → Manual Exception | V1.1 §4.3, BR-12 |
| Operational snapshot on application | V1.1 §4.4 |
| **Institution Fee Policy Engine** (waivers/discounts/promotions) | V1.1 §4.6, BR-13–BR-18 |
| Policy audit + accounting treatment | V1.1 §4.6 |
| Institution fee data contracts | V1.1 §9.2, §9.2a, §9.2b |
| Institution fee reporting | V1.1 §4.6, §10.1 |

---

## Explicit exclusions (institution domain)

- **Not** authored in Service Library Admin Fees tab  
- **Not** counselor discount wallet / Offers Studio  
- **Not** `accounting_ar_invoices` (corporate AR)  
- **Not** commission receipt domain (`upi_commission_*`)

---

## Open MD decisions (institution — pending sign-off)

Carried to P2.2 / P3 — see V1.1 document closure §2: MD-6, MD-7, MD-8.

---

## Next design phase

**Government Fee Master + Direct-Paid Tracking** — [`GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md`](./GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md)

---

**Institution Fee Architecture: CLOSED.**
