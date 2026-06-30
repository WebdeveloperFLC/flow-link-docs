# Knowledge Centre — Government Fee Reference Architecture (Proposal)

| Field | Value |
|-------|-------|
| **Status** | **Proposal — submit for approval before P3** |
| **Scope** | Knowledge Centre JSON cost items only (no implementation) |
| **Prerequisite** | [`GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md`](./GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md) |
| **Date** | June 2026 |

---

## Executive summary

ZIP Knowledge Centre guides (`fullCostBreakdown`, KPI government fee rows) currently embed **human-readable fee strings** and numeric `cadAmount` / `baseAmount` fields. Before Phase P3 consolidates government fees into the **Government Fee Master**, this document proposes a **`govtFeeCode` reference field** on JSON cost items so guides can point at a future authoritative catalogue without duplicating rates in content JSON.

**This document does not authorize implementation.** It defines resolution order and data contracts for MD sign-off.

---

## 1. Problem

| Source today | Issue |
|--------------|-------|
| `fullCostBreakdown.sections[].items[]` | Rates duplicated in JSON; drift vs IRCC/authority updates |
| KPI `"Government fee"` row | String-only; not linked to fee master |
| `service_library_fee_items` | Authoritative for CRM but not referenced from KC JSON |

Consolidation target: [`GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md`](./GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md) §2 — single write path via Service Library Government Fee Master.

---

## 2. Proposed JSON field: `govtFeeCode`

Optional on each `fullCostBreakdown` item where `official: true` and the charge is authority-mandated:

```json
{
  "label": "Study permit application fee",
  "govtFeeCode": "CA_STUDY_PERMIT_APP",
  "cadAmount": 150,
  "inr": "auto",
  "official": true
}
```

| Property | Type | Required | Notes |
|----------|------|----------|-------|
| `govtFeeCode` | string | No | Stable code in future Government Fee Master catalogue |
| `cadAmount` / `baseAmount` | number \| range | Yes (until master live) | Authoring fallback; retained for offline JSON bundles |
| `official` | boolean | Recommended | Distinguishes IRCC/authority lines from planning estimates |

**Non-government lines** (living costs, airfare, language test market rates) must **not** use `govtFeeCode`.

---

## 3. Resolution order (runtime — future P3)

When rendering Knowledge Centre **Fees / Cost Planning** tab:

1. **If `govtFeeCode` present and master row exists** → use master native amount + effective date (see GFM V1 §5 authority rate governance).
2. **Else if `cadAmount` / `baseAmount` numeric** → use JSON amount (current behaviour).
3. **Else if string `amount` / `range`** → display as-is (counsellor verify).
4. **INR column** → always via Currency Master FX snapshot (`currencyConfig` + `resolveCostBreakdownFx`); never hardcoded FX in KC paths.

Precedence aligns with GFM V1 **BR-G3**: `academy_metadata.feeBreakdown` and JSON KPI strings are **read fallback only** after master consolidation.

---

## 4. Catalogue shape (future — not implemented)

Proposed master row keys (illustrative):

| govtFeeCode | library_id scope | country | component | native_currency |
|-------------|------------------|---------|-----------|-----------------|
| `CA_STUDY_PERMIT_APP` | canada-student-visa | Canada | visa | CAD |
| `CA_BIOMETRICS` | canada-student-visa | Canada | biometrics | CAD |

Full schema deferred to P3 data contracts in GFM V1 §10.

---

## 5. What stays unchanged in P2

- No `binderMigration` or approval metadata on guides.
- No admin comparison UI for binders or fees.
- `workflow_templates` remain fallback for Document Binder tab when JSON `documentBinder.categories` is empty.
- Client `application_document_requirements` are never retroactively modified by KC saves.

---

## 6. Approval checklist (MD)

- [ ] Approve optional `govtFeeCode` on `fullCostBreakdown.items` in FLC schema v1.1+
- [ ] Approve resolution order §3 before P3 fee master wiring
- [ ] Confirm JSON numeric fallback remains until all visa services have master rows
- [ ] Confirm INR always from Currency Master (no `govtFeeFx.ts` in KC paths)

---

## 7. References

- [`GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md`](./GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md) — locked business rules BR-G1–G14
- [`FEE_MASTER_ARCHITECTURE_V1_1.md`](./FEE_MASTER_ARCHITECTURE_V1_1.md) — collection categories
- `content/service-library/canada-student-visa.json` — reference `fullCostBreakdown` + `currencyConfig` shape
- `src/lib/service-library/knowledgeGuide/resolveCostBreakdownFx.ts` — INR resolution (implemented)

---

**Next step after approval:** Extend FLC knowledge guide schema, seed `govtFeeCode` on Canada pilot items, wire P3 read path from Government Fee Master.
