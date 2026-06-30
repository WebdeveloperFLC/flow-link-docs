# Fee & Currency Architecture

| Field | Value |
|-------|-------|
| **Status** | **LOCKED — permanent CRM reference** |
| **Audience** | Engineering, product, operations, content |
| **Scope** | Consultancy fees, government fees, tuition/living/proof-of-funds display, Currency Master, Fee Sheet import |
| **Related** | [`guides/FEE_MASTER_ARCHITECTURE_V1_1.md`](./guides/FEE_MASTER_ARCHITECTURE_V1_1.md), [`guides/GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md`](./guides/GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md), [`KNOWLEDGE_CENTRE_JSON_SPECIFICATION.md`](./KNOWLEDGE_CENTRE_JSON_SPECIFICATION.md) |

---

## Purpose

This document is the **single permanent reference** for how Future Link Flow stores, imports, converts, and displays fees and currencies across:

- Service Library & Fee Master (consultancy)
- Lead form / service picker
- Knowledge Centre (Cost Planning, KPI tiles)
- Invoicing & CRM billing (consultancy lines)
- Currency Master (exchange rates only)

All new features must comply with these rules. If a requirement conflicts with this document, **update this document first** (with business approval), then implement.

---

## Executive summary

| Domain | Source of truth | Currency Master role |
|--------|-----------------|----------------------|
| **Consultancy fees** | **Fee Sheet** → Fee Master (`picker_variants`, `fee_items`) | **None** — never convert consultancy |
| **Government fees** | Official foreign amount (KC JSON today; Government Fee Master future) | **INR equivalent only** — dynamic |
| **Tuition, living, proof of funds, official estimates** | Official foreign currency in content / institution masters | **INR display only** — dynamic |
| **Exchange rates** | **Currency Master** (`/masters → Currency Master`) | SSOT for all INR derivations |
| **Taxes (GST, etc.)** | Tax module | Separate — not in fee sheet |

---

## 1. Consultancy fees (fixed business prices)

### Business rules

1. Consultancy fees are **fixed business prices** set by Future Link — not authority-mandated, not FX-derived.
2. Amounts are **stored independently per currency** (INR, CAD, USD, AUD, GBP, EUR, etc.).
3. **Currency Master must never modify consultancy fees.** A change to the CAD/INR rate must not change ₹7,080 or CAD $105 on the consultancy line.
4. **Fee Sheet is the source of truth** for consultancy pricing. Import updates Fee Master exactly as provided.
5. GST/tax columns on the fee sheet are **ignored** — tax is calculated in the Tax module only.
6. Import must **match existing Service Library services and packages only** — no new services, no duplicate packages, no renames.

### Storage (current)

| Store | Table / field | Notes |
|-------|---------------|-------|
| Packaged services (visa tiers, etc.) | `service_library_picker_variants.fee_inr`, `fee_cad`, … | One row per package (`variant_key` + `picker_label`) |
| Single-tier services (some coaching/allied) | `service_library_fee_items` — label `Consultancy fee (INR)` / `(CAD)` / etc. | At most one row per currency per library |
| Service identity | `service_library.service` + `service_library.sub_service` | Names must match fee sheet and lead form — **never renamed on import** |

Each currency column holds the **exact numeric value** from the fee sheet. Do not derive CAD from INR or vice versa at storage time or display time.

### Display

| Surface | Behaviour |
|---------|-----------|
| Lead form / service picker | Show stored amount for selected toggle currency (INR / CAD) |
| Knowledge Centre KPI tile | Consultancy fee from Fee Master; e.g. `₹7,080 · CA$105` |
| Cost Planning — FLC section | Fee Master overlay on `fullCostBreakdown` FLC section; labelled **Fee Master — fixed** |
| Invoices | Consultancy line uses stored business price in agreed currency |

### Code reference (enforced)

- `src/lib/feeMaster/crmPricingRules.ts` — classification & stored amount helpers
- `src/lib/feeMaster/applyConsultancyToCostBreakdown.ts` — KC Cost Planning overlay
- `src/lib/service-library/buildAcademyViewModel.ts` — KPI from stored amounts
- `shouldConvertInrViaCurrencyMaster()` returns **`false`** for consultancy / FLC sections

### Fee Sheet (Excel)

The authoritative consultancy fee sheet is maintained in **Service Library** scope:

- Tabs align with Service Library Admin categories: **Coaching**, **Visa & Immigration**, **Allied** (plus MBBS / Travel where applicable).
- Row identity = existing `service` + `sub_service` (and package label where tiered).
- Import pipeline (when run): update-only, validation report for unmatched services/packages.

---

## 2. Government fees (official foreign currency)

### Business rules

1. Government fees store the **official foreign currency amount** as the source of truth (e.g. CAD $100 TRV, GBP £115, USD $185 MRV).
2. **Only the INR equivalent** is calculated dynamically using Currency Master (effective rate = base + buffer).
3. When Currency Master changes, **only the INR guide value updates** — the official foreign amount stays fixed until the government officially changes its fee.
4. Government fees are **not imported from the consultancy Fee Sheet**.
5. Values must trace to **official government / embassy sources** (canada.ca, IRCC, gov.uk, travel.state.gov, etc.).

### Storage (current)

| Store | Field | Role |
|-------|-------|------|
| Picker variants | `govt_amount`, `govt_currency` | Native authority amount |
| Picker variants | `govt_fee_inr` | Optional override; else computed at read time |
| KC JSON | `fullCostBreakdown` sections with `official: true` | Canonical for Cost Planning display today |
| Fee items | Government / IRCC labelled rows | Lead-form hints |

### Display

| Surface | Primary | Secondary |
|---------|---------|-----------|
| Lead form — government column | Native `govt_amount` + currency | INR ≈ via Currency Master (when INR toggle) |
| KC Cost Planning — government section | Foreign column (fixed) | INR column (dynamic from CM) |
| KPI — government fee | From official source / fee master | Not converted from consultancy |

### Code reference (enforced)

- `src/lib/feeMaster/officialFigureFx.ts` — `convertOfficialFigureToInr()`
- `src/lib/leads/govtFeeFx.ts` — deprecated hardcoded rates removed; CM snapshot required for INR
- `src/lib/service-library/knowledgeGuide/resolveCostBreakdownFx.ts` — FX applied only when `shouldConvertInrViaCurrencyMaster()` is true

### Future: Government Fee Master

See [`guides/GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md`](./guides/GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md).

When implemented, Government Fee Master will **centrally manage** official government fees and sync Knowledge Centre guides automatically. Conversion rules **do not change**:

- Foreign currency amount = SSOT
- INR = Currency Master at runtime
- No consultancy cross-contamination

---

## 3. Tuition, living costs, proof of funds & official financial figures

### Business rules

1. Store and display the **official foreign currency amount** (university fee page, IRCC living-cost guidance, blocked-account rules, etc.).
2. Calculate **INR dynamically** using Currency Master for counselor-facing guides.
3. Foreign currency remains SSOT; INR is indicative for India-market discussions.
4. These categories **use Currency Master** — unlike consultancy.

### Typical sources

| Figure type | Source | KC location |
|-------------|--------|-------------|
| University tuition | Institution / program fee schedules | `fullCostBreakdown`, institution tab |
| Living costs | Official immigration / embassy guidance | `fullCostBreakdown`, country insights |
| Proof of funds | Authority minimums | Eligibility, Cost Planning |
| Third-party planning estimates (VAC, medical, courier) | Planning benchmarks | `fullCostBreakdown` — `official: false`, non-FLC |

### Code reference

- `resolveCostBreakdownFx.ts` — `inr: "auto"` on non-consultancy items → CM conversion
- `src/lib/feeMaster/institutionScheduleResolver.ts` — institution tuition (separate domain; see Institution Fee architecture)

---

## 4. Currency Master (exchange rates only)

### Business rules

1. **Currency Master is the single source of truth for exchange rates** — effective rate = base rate + buffer (fixed or %).
2. Currency Master applies to:
   - Government fee INR equivalents
   - Tuition / living / proof-of-funds INR guides
   - Budget equivalents on leads
   - Official financial figures in Knowledge Centre Cost Planning
3. Currency Master **must never**:
   - Modify consultancy fees
   - Derive one consultancy currency from another
   - Back-fill fee sheet values

### Configuration

- UI: **Masters → Currency Master** (`/masters?section=__currencies`)
- Data: `fx_rates` table, `rate_purpose = 'general'`
- Runtime: `fetchFxSnapshot()` → `convertWithSnapshot()` / `convertOfficialFigureToInr()`

### Implementation modules

| Module | Path |
|--------|------|
| FX policy | `src/lib/fxPolicy.ts` |
| Currency Master client | `src/lib/currencyMaster.ts` |
| Official figure → INR | `src/lib/feeMaster/officialFigureFx.ts` |

---

## 5. Fee Sheet import (consultancy only)

### Preconditions

- Fee sheet shared in Service Library (Excel): tabs **Coaching**, **Visa Service**, **Allied Service** aligned to existing catalogue.
- Service names in the sheet **must match** Service Library and lead-form package names exactly.

### Import rules

| Rule | Action |
|------|--------|
| Match service | By `service` + `sub_service` (or approved stable key) — flag if unmatched |
| Match package | By existing `picker_label` / `variant_key` — flag if unmatched |
| Consultancy amounts | Write exact numeric values per currency column |
| GST / tax columns | **Ignore** |
| Government columns (if present) | **Ignore** — govt fees are not sheet-driven |
| Currency conversion | **Do not** use Currency Master during import |
| New services | **Block** — never create |
| New packages | **Block** — never create |
| Duplicate packages | **Block** — flag |

### Post-import

- `service_library_picker_variants` updated in place
- `service_library_fee_items` consultancy rows updated for non-packaged services
- Validation log: matched / updated / flagged rows
- Knowledge Centre JSON consultancy KPI is **display-overridden** by Fee Master at runtime (JSON may retain copy for audit)

---

## 6. Knowledge Centre display rules

| Content | Source | INR column |
|---------|--------|------------|
| Government fees (Cost Planning) | KC JSON `fullCostBreakdown` + official sources | Currency Master (dynamic) |
| Consultancy fees (KPI + FLC section) | Fee Master | Stored INR — **not** CM |
| Tuition / living / estimates | KC JSON foreign amounts | Currency Master (dynamic) |

Cost Planning UI note (when FX active):

> Official fees & estimates: INR guide from Currency Master. Consultancy fees are fixed business prices from Fee Master — not converted.

---

## 7. Separation matrix (quick reference)

```
┌─────────────────────┬──────────────────┬─────────────────────┬──────────────────┐
│ Fee type            │ SSOT             │ CM for INR?         │ Fee Sheet?       │
├─────────────────────┼──────────────────┼─────────────────────┼──────────────────┤
│ Consultancy         │ Fee Sheet/Master │ NO                  │ YES (import)     │
│ Government          │ Official foreign │ YES                 │ NO               │
│ Tuition (inst.)     │ Institution mast.│ YES (display)       │ NO               │
│ Living / PoF        │ Official foreign │ YES (display)       │ NO               │
│ Tax (GST)           │ Tax module       │ N/A                 │ NO (ignore col)  │
│ Exchange rate       │ Currency Master  │ —                   │ NO               │
└─────────────────────┴──────────────────┴─────────────────────┴──────────────────┘
```

---

## 8. Anti-patterns (never do)

| Anti-pattern | Why forbidden |
|--------------|---------------|
| `CAD = INR / rate` for consultancy KPI | Violates fixed business pricing |
| Syncing `fee_cad` from `fee_inr` via CM migration | Creates drift from fee sheet |
| Importing government fees from consultancy sheet | Wrong SSOT |
| Hardcoded FX tables in application code | Bypasses Currency Master |
| Renaming services on import to “match” sheet | Breaks lead form & pipelines |
| Applying GST from fee sheet to stored fee | Tax is separate module |
| Using JSON `kpis[].Consultancy fee` over Fee Master when master exists | Caused ₹10,000 vs ₹7,080 drift |

---

## 9. Developer checklist (PR review)

Before merging any fee- or currency-related change:

- [ ] Does it call `shouldConvertInrViaCurrencyMaster()` before applying CM to a cost line?
- [ ] Are consultancy paths free of `convertWithSnapshot` / `fetchFxSnapshot`?
- [ ] Do government/tuition paths use `convertOfficialFigureToInr()` with CM snapshot?
- [ ] Are fee sheet imports update-only with validation reporting?
- [ ] Are service names unchanged?
- [ ] Are taxes excluded from fee storage?

---

## 10. Document history

| Date | Change |
|------|--------|
| Jun 2026 | Initial locked architecture — consultancy vs CM separation, govt INR-only conversion, Fee Sheet SSOT, Government Fee Master future alignment |

---

## Appendix A — Key database tables

| Table | Consultancy | Government |
|-------|-------------|------------|
| `service_library` | Service identity | — |
| `service_library_picker_variants` | `fee_inr`, `fee_cad`, … | `govt_amount`, `govt_currency` |
| `service_library_fee_items` | Consultancy fee rows | Government / IRCC rows |
| `service_library.academy_metadata` | Reference copy | `fullCostBreakdown` official fees |
| `fx_rates` | **Not used** | INR conversion input |

## Appendix B — Related locked documents

- Institution fees: [`guides/INSTITUTION_FEE_ARCHITECTURE_LOCKED.md`](./guides/INSTITUTION_FEE_ARCHITECTURE_LOCKED.md)
- Government fee master (future build): [`guides/GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md`](./guides/GOVERNMENT_FEE_MASTER_ARCHITECTURE_V1.md)
- Fee master billing domains: [`guides/FEE_MASTER_ARCHITECTURE_V1_1.md`](./guides/FEE_MASTER_ARCHITECTURE_V1_1.md)
- KC JSON schema: [`KNOWLEDGE_CENTRE_JSON_SPECIFICATION.md`](./KNOWLEDGE_CENTRE_JSON_SPECIFICATION.md)
