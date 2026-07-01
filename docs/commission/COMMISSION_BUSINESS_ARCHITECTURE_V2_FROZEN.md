# Commission & Revenue Management — Business Architecture V2.0 (FROZEN)

**Declaration date:** 30 June 2026  
**Status:** **FROZEN** — no business requirement changes without ERP RFC  
**Internal module name:** **Commission & Revenue Management**  
**User-facing UI label:** *Commission* (unchanged)

---

## Freeze declaration

Future Link declares the **Commission & Revenue Management** business architecture **Version 2.0** frozen as of **30 June 2026**, following:

1. Business Domain Validation (approved)  
2. Business Requirements Addendum V1.1 (approved, final)  
3. Architecture Certification (accepted)  
4. Implementation Bible V2 (approved)

From this date forward:

- **Business requirements are frozen** — changes require **ERP Change Request (RFC)**.  
- **Engineering improvements are not frozen** — UI/UX, performance, bugs, refactor, tests, and security fixes proceed without RFC. See [ERP Delivery Standards](../erp-governance/DELIVERY_STANDARDS.md).  
- **No further business discussions during coding** for behaviours already specified.  
- **Implementation authorized** — delivery phase per Implementation Bible V2 §12.

---

## Frozen document set

| Document | Path | Role |
|----------|------|------|
| Business Requirements Addendum V1.1 | [COMMISSION_BUSINESS_REQUIREMENTS_ADDENDUM_V1.1.md](./COMMISSION_BUSINESS_REQUIREMENTS_ADDENDUM_V1.1.md) | Business SSOT — rules, scenarios, config, domain model, glossary |
| Implementation Bible V2 | [Commission_Module_Implementation_Bible_V2.md](./Commission_Module_Implementation_Bible_V2.md) | Build spec — phases, features, migration order |
| Architecture Certification | [COMMISSION_ARCHITECTURE_CERTIFICATION.md](./COMMISSION_ARCHITECTURE_CERTIFICATION.md) | Lifecycle + explainability + multi-model certification |
| Domain Validation Report | [COMMISSION_BUSINESS_DOMAIN_VALIDATION_REPORT.md](./COMMISSION_BUSINESS_DOMAIN_VALIDATION_REPORT.md) | Validation record (historical) |

**Archive (superseded, read-only):**

- Implementation Bible v1.0 — `Commission module claude files/Commission_Module_Implementation_Bible.txt`  
- Addendum V1.0 — [COMMISSION_BUSINESS_REQUIREMENTS_ADDENDUM_V1.md](./COMMISSION_BUSINESS_REQUIREMENTS_ADDENDUM_V1.md)

---

## Architecture certification summary

| Certification | Result |
|---------------|--------|
| Multi-model support without core redesign | **YES** (Conditional — REUSE → EXTEND → CREATE) |
| Direct Institutions | Supported — P0 delivery track (F3B.*) |
| Aggregators | Supported — Phase 2B seam + P1 extensions |
| B2B Partners | Supported — Phase 5 payee/earning |
| Referral Partners | Supported — §1.11 lifecycle + Phase 5 |
| Future Revenue Sources | Supported — ERP P-04 plug-in contract |
| Financial explainability (when built) | **YES** — per frozen entity model |

---

## Complete actor lifecycles (frozen)

### Student business lifecycle

```
Lead → Application Submitted → Offer Issued → Admission Accepted
  → Enrollment → Study Started → Completed → Graduated
```

*(Plus commission events: Withdrawal, Transfer, Visa Refused, Clawback, etc.)*

### Institution

```
Agreement → Claim → Approval → Payment → Adjustment → Clawback
```

### Aggregator

```
Agreement → Claim → Payment → Allocation
```

### Future Link

```
Revenue → Verification → Submission → Receipt → Settlement → Reconciliation
```

### B2B Partner

```
Agreement → Settlement → Payment → Reconciliation
```

### Referral Partner

```
Referral → Approval → Settlement → Payment → Reconciliation
```

### Finance

```
Financial Events → Journal → Reconciliation → Audit
```

---

## Implementation authorization

| Track | Status |
|-------|--------|
| Phase 3 technical (F3.4 → F3.3 → F3.1 → F3.2) | **Authorized** — complete F3.4 UAT close first |
| Phase 3B business P0 (F3B.1–F3B.5) | **Authorized** — per Bible V2 §8.5 |
| Phases 4–6 | **Authorized** — per Bible V2 §12 sequence |

---

## ERP delivery methodology (platform standard)

All future modules should follow:

1. Business discovery  
2. Technical inventory  
3. Enterprise review  
4. Implementation Bible  
5. Business validation  
6. **Architecture freeze** ← *Commission & Revenue Management completed here*  
7. Implementation  
8. UAT  
9. Production  

**Reference modules:** Performance Hub (architecture frozen); Commission & Revenue Management (architecture frozen V2.0).

---

## Approval

| Role | Status | Date |
|------|--------|------|
| Business owner / Commission sponsor | **Approved** | 2026-06-30 |
| Architecture Certification | **Accepted** | 2026-06-30 |
| Business Architecture V2.0 | **FROZEN** | 2026-06-30 |

---

*Changes to frozen business requirements: ERP RFC only. Implementation proceeds against this architecture.*
