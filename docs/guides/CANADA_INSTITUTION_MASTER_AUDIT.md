# Canada Institution Master Audit

| Field | Value |
|-------|-------|
| **Status** | Audit only — expanded scope per MD approval (2026-06-23) |
| **Date** | 2026-06-23 (rev. 2) |
| **Scope** | **All public** Canadian colleges, polytechnics, and universities vs Institution Master + Course Finder |
| **Implementation plan** | [`INSTITUTION_MASTER_COMPLETION_PLAN.md`](./INSTITUTION_MASTER_COMPLETION_PLAN.md) |
| **Data source** | Live `cf_universities` (anon); UPI/fee detail via service-role SQL |

---

## Executive summary

| Metric | Count | Notes |
|--------|------:|-------|
| **Library target** (public colleges + polytechnics + universities) | **~150–180** | CMEC: 150+ public colleges/institutes; ~70–96 public universities (deduped) |
| Previous audit sample | 32 | Ontario-heavy subset — **superseded by full-library target** |
| Present in Course Finder (`cf_universities`, CA) | **6** | 3–4% of target library |
| CF ↔ UPI linked (all 6) | **6 / 6** | Mark Final eligible |
| DLI / PGWP / App portal on Institution Master | **0 / 6** | Columns not implemented |
| Institution Contacts | **0 / 6** | Table not implemented |
| Last LOA Verified Date | **0 / 6** | Field not implemented |
| Institution Status (Draft/Review/Active/…) | **0 / 6** | Uses legacy `is_active` only |
| ACTIVE fee schedule (APPLICATION + TUITION + DEPOSIT) | **0 / 6** visible | Per MD: **warnings only** at activation — not blockers |

**Conclusion:** Linkage is fixed; governance, contacts, expanded Canada library, and profile completeness are the implementation priority. Fee gaps are operational warnings, not activation blockers.

---

## Library target definition (expanded)

Per MD approval, the Canadian Institution Library must cover:

| Include | Exclude |
|---------|---------|
| Public colleges (CAATs, institutes) | Private career colleges |
| Polytechnics (Humber, Seneca, George Brown, etc.) | Theological-only schools (unless degree-granting partner) |
| Public universities (provincial degree-granting) | US/international branch campuses unless separately chartered |
| CEGEPs and public cégeps (Quebec) | |

**Authoritative sources for seed file (M6):**

1. [CMEC — Directory of Educational Institutions in Canada](https://www.cmec.ca/299/education-in-canada-an-overview/index.html)
2. Provincial college registries (Ontario 24 public colleges, BC, AB, etc.)
3. [Universities Canada](https://www.univcan.ca/) member list (public members)
4. IRCC DLI list (compliance backfill — optional M7)

---

## Provincial inventory (seed phases)

### Ontario — 24 public colleges / polytechnics

| # | Institution | In CF? | UPI linked? |
|---|-------------|--------|-------------|
| 1 | Algonquin College | Yes | Yes |
| 2 | Boréal (Collège Boréal) | No | — |
| 3 | Cambrian College | No | — |
| 4 | Canadore College | No | — |
| 5 | Centennial College | No | — |
| 6 | Conestoga College | Yes | Yes |
| 7 | Confederation College | No | — |
| 8 | Durham College | No | — |
| 9 | Fanshawe College | No | — |
| 10 | Fleming College | No | — |
| 11 | George Brown Polytechnic | No | — |
| 12 | Georgian College | No | — |
| 13 | Humber Polytechnic | No | — |
| 14 | La Cité (Collège La Cité) | No | — |
| 15 | Lambton College | No | — |
| 16 | Loyalist College | No | — |
| 17 | Mohawk College | No | — |
| 18 | Niagara College | No | — |
| 19 | Northern College | No | — |
| 20 | Sault College | No | — |
| 21 | Seneca Polytechnic | Yes | Yes |
| 22 | Sheridan College | No | — |
| 23 | St. Clair College | No | — |
| 24 | St. Lawrence College | No | — |

**Ontario CF coverage:** 3 / 24 colleges (**12.5%**)

### Ontario — public universities (sample)

| Institution | In CF? | UPI linked? |
|-------------|--------|-------------|
| University of Toronto | Yes | Yes |
| McMaster University | No | — |
| University of Ottawa | No | — |
| Western University | No | — |
| Queen's University | No | — |
| University of Waterloo | No | — |
| York University | No | — |
| Toronto Metropolitan University | No | — |
| Carleton University | No | — |
| Ontario Tech University | No | — |
| Lakehead University | No | — |
| Laurentian University | No | — |
| Trent University | No | — |
| Wilfrid Laurier University | No | — |
| University of Guelph | No | — |
| Brock University | No | — |
| Nipissing University | No | — |
| OCAD University | No | — |
| Ontario College of Art & Design | No | — |
| Royal Military College of Canada | No | — |
| Université de l'Ontario français | No | — |

**Ontario university CF coverage:** 1 / 21 sample (**~5%**)

### Other provinces (seed in M6b–M6f — not individually audited in v2)

| Province | Public colleges / institutes (approx.) | Public universities (approx.) | Seed phase |
|----------|---------------------------------------:|------------------------------:|------------|
| British Columbia | 11+ | 11 | P2 |
| Alberta | 11+ | 6 | P2 |
| Quebec | CEGEPs + colleges | 18 | P3 |
| Manitoba | 7 | 4 | P3 |
| Saskatchewan | 7 | 2 | P3 |
| Nova Scotia | 5 | 4 | P3 |
| New Brunswick | 5 | 4 | P3 |
| Newfoundland & Labrador | 2 | 1 | P3 |
| PEI | 1 | 1 | P3 |
| Territories | 3 | 0–1 | P3 |

Full row-level audit will be generated by `scripts/canada-institution-master-audit.mjs` after M6 seed.

---

## Live system snapshot (Course Finder, Canada)

| Institution Name | Exists? | Website Present? | Application URL Present? | DLI Present? | PGWP Present? | App Fee? | Tuition? | Deposit? |
|------------------|---------|------------------|--------------------------|--------------|---------------|----------|----------|----------|
| Algonquin College | Yes | Unknown¹ | No | No | No | No² | No² | No² |
| Conestoga College | Yes | Unknown¹ | No | No | No | No² | No² | No² |
| McGill University | Yes | Yes³ | No | No | No | No² | No² | No² |
| Seneca Polytechnic | Yes | Partial¹ | No | No | No | No² | No² | No² |
| University of British Columbia | Yes | Yes³ | No | No | No | No² | No² | No² |
| University of Toronto | Yes | Yes³ | No | No | No | No² | No² | No² |

**Footnotes:** ¹ Anon RLS hides UPI rows. ² No ACTIVE fees visible via anon. ³ Shell migration `20261002130000` set `website_url`.

**Gap vs full library:** **6 / ~165 ≈ 3.6%** present in CF; **~159 institutions missing** from Course Finder entirely.

---

## Governance rules (approved — for implementation)

### Activation blockers

- Institution Name, Type, Country
- **Official Website URL** (mandatory)
- Application Portal URL
- DLI Number (Canada)
- PGWP Status (Canada)

### Warnings only (do not block)

- Application Fee, Tuition Fee, Deposit Fee (ACTIVE schedule rows)
- Empty Institution Contacts
- Missing Last LOA Verified Date

### Mark Final

Unchanged — requires `cf_universities.upi_institution_id` only.

---

## Verification SQL (service role / Lovable SQL editor)

```sql
-- Canada CF vs UPI readiness (run after M1–M6)
SELECT
  cu.name AS cf_name,
  cu.upi_institution_id IS NOT NULL AS cf_linked,
  i.institution_status,
  i.website_url IS NOT NULL AS website_ok,
  i.application_portal_url IS NOT NULL AS app_portal_ok,
  i.dli_number IS NOT NULL AS dli_ok,
  i.pgwp_eligible IS NOT NULL AS pgwp_ok,
  i.last_loa_verified_at IS NOT NULL AS loa_date_ok,
  (SELECT count(*) FROM upi_institution_contacts c WHERE c.institution_id = i.id) AS contact_count,
  EXISTS (SELECT 1 FROM institution_fee_schedule f WHERE f.upi_institution_id = i.id AND f.fee_type = 'APPLICATION' AND f.status = 'ACTIVE') AS app_fee,
  EXISTS (SELECT 1 FROM institution_fee_schedule f WHERE f.upi_institution_id = i.id AND f.fee_type = 'TUITION' AND f.status = 'ACTIVE') AS tuition,
  EXISTS (SELECT 1 FROM institution_fee_schedule f WHERE f.upi_institution_id = i.id AND f.fee_type = 'DEPOSIT' AND f.status = 'ACTIVE') AS deposit
FROM cf_universities cu
LEFT JOIN upi_institutions i ON i.id = cu.upi_institution_id
WHERE cu.country_code = 'CA'
ORDER BY cu.name;

-- Full Canada library count (after M6 seed)
SELECT institution_status, count(*)
FROM upi_institutions
WHERE country_name = 'Canada'
   OR country_id IN (SELECT id FROM upi_countries WHERE iso_alpha2 = 'CA')
GROUP BY 1
ORDER BY 1;
```

---

## Recommended backfill priority

| Tier | Scope | Rationale |
|------|-------|-----------|
| **P0** | 6 existing CF institutions | UAT client programs; linkage already live |
| **P1** | 21 remaining Ontario public colleges | Highest recruitment volume |
| **P2** | Ontario universities + BC/AB public set | Brand + pathway coverage |
| **P3** | QC, Prairies, Atlantic, Territories | Complete national library |

---

## Related documents

- [`INSTITUTION_MASTER_COMPLETION_PLAN.md`](./INSTITUTION_MASTER_COMPLETION_PLAN.md) — approved implementation plan
- [`INSTITUTION_FEE_ARCHITECTURE_LOCKED.md`](./INSTITUTION_FEE_ARCHITECTURE_LOCKED.md)
- CF ↔ UPI remediation: `20261002130000_cf_upi_institution_shell_remediation.sql`

---

**Next step:** Acknowledge implementation plan §15 → begin M1 migration + UI. Re-run this audit via script after M6 seed.
