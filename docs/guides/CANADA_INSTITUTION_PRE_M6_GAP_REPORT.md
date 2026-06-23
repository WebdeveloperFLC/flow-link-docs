# Canada Institution Pre-M6 Gap Report

| Field | Value |
|-------|-------|
| **Status** | Audit + targeted remediation (pre-M6) |
| **Date** | 2026-06-23 |
| **Migration** | `20261004120450_canada_institution_pre_m6_remediation.sql` |
| **Scope** | Institution Master (`upi_institutions`) only — no CF / Mark Final changes |

---

## Executive summary

Before large-scale M6 Canada seeding, this pass **audits existing Canadian institutions**, **fills mandatory profile fields**, and **inserts 21 missing Ontario-focused institutions** as `Draft`.

| Metric | Before | After migration (expected) |
|--------|-------:|---------------------------:|
| Canadian UPI institutions (known) | ~6 CF-linked + possible orphans | **~27** targeted set |
| Missing `institution_type` | Unknown (RLS) / likely on shells | **0** on Canadian rows |
| Missing official website | Partial (shells partial) | **0** on seeded set |
| Missing country | Partial | **0** on Canadian rows |
| Missing province (`state_province`) | Partial | **0** on seeded set; orphans flagged |
| CF-linked Canadian institutions | 6 | **6** (unchanged — no CF writes) |

**M6 large-scale seed:** **Not started.** Remaining Ontario colleges + national coverage deferred until this gap report is reviewed post-publish.

---

## 1. Audit — existing Canadian institutions (pre-remediation)

### Course Finder (`cf_universities`, CA) — live 2026-06-23

| Institution | UPI linked | CF province | CF type | Gaps (UPI expected) |
|-------------|------------|-------------|---------|---------------------|
| Algonquin College | Yes | — | Public College | province, website verify |
| Conestoga College | Yes | Ontario | public | UPI type normalize → Public College |
| McGill University | Yes | Quebec | public | UPI type → University |
| Seneca Polytechnic | Yes | Ontario | public | UPI type → Polytechnic |
| University of British Columbia | Yes | BC | public | UPI type → University |
| University of Toronto | Yes | Ontario | public | UPI type → University |

**Note:** UPI detail not readable via anon RLS; enrichment applied by dedup key in migration.

### Other Canadian UPI rows

Any additional `upi_institutions` with `country_name = Canada` or `country_id → CA` are included in migration backfill (`institution_type` inference + country/province defaults). Post-publish, run verification SQL below.

---

## 2. Remediation applied (`20261004120450`)

### A. Enrich existing 6 CF-linked UPI records

Updates by dedup key (preserves IDs — **Mark Final safe**):

| Institution | Type set | Website | Province |
|-------------|----------|---------|----------|
| Algonquin College | Public College | algonquincollege.com | Ontario |
| Conestoga College | Public College | conestogac.on.ca | Ontario |
| Seneca Polytechnic | Polytechnic | senecapolytechnic.ca | Ontario |
| McGill University | University | mcgill.ca | Quebec |
| University of British Columbia | University | ubc.ca | British Columbia |
| University of Toronto | University | utoronto.ca | Ontario |

### B. Insert missing Ontario public colleges (9) — `Draft`

| Institution | Type | City | Website |
|-------------|------|------|---------|
| Cambrian College | Public College | Sudbury | cambriancollege.ca |
| Fleming College | Public College | Peterborough | flemingcollege.ca |
| Lambton College | Public College | Sarnia | lambtoncollege.ca |
| Niagara College | Public College | Welland | niagaracollege.ca |
| Northern College | Public College | Timmins | northernc.on.ca |
| St. Clair College | Public College | Windsor | stclaircollege.ca |
| St. Lawrence College | Public College | Kingston | stlawrencecollege.ca |
| Collège La Cité | Public College | Ottawa | collegelacite.ca |
| Collège Boréal | Public College | Sudbury | collegeboreal.ca |

### C. Insert missing major universities (12) — `Draft`

| Institution | Type | City | Website |
|-------------|------|------|---------|
| McMaster University | University | Hamilton | mcmaster.ca |
| University of Waterloo | University | Waterloo | uwaterloo.ca |
| York University | University | Toronto | yorku.ca |
| Toronto Metropolitan University | University | Toronto | torontomu.ca |
| Western University | University | London | uwo.ca |
| University of Ottawa | University | Ottawa | uottawa.ca |
| Carleton University | University | Ottawa | carleton.ca |
| Wilfrid Laurier University | University | Waterloo | wlu.ca |
| University of Guelph | University | Guelph | uoguelph.ca |
| Trent University | University | Peterborough | trentu.ca |
| Nipissing University | University | North Bay | nipissingu.ca |
| OCAD University | University | Toronto | ocadu.ca |

### D. Global Canadian backfill rules

1. **`institution_type` where NULL** — inferred from name (Polytechnic / University / Public College / Other).
2. **`country_name`** → `Canada` + `country_id` from `upi_countries` (CA).
3. **`state_province`** — filled from seed; orphans default Ontario only when province was NULL.

---

## 3. Post-remediation gap matrix (target set = 27 institutions)

| Institution Name | Exists (UPI)? | Website? | Country? | Province? | Type? | CF linked? |
|------------------|---------------|----------|----------|-----------|-------|------------|
| Algonquin College | Yes | Yes | Yes | Yes | Public College | Yes |
| Conestoga College | Yes | Yes | Yes | Yes | Public College | Yes |
| Seneca Polytechnic | Yes | Yes | Yes | Yes | Polytechnic | Yes |
| McGill University | Yes | Yes | Yes | Yes | University | Yes |
| UBC | Yes | Yes | Yes | Yes | University | Yes |
| U of Toronto | Yes | Yes | Yes | Yes | University | Yes |
| Cambrian … OCAD (21 new) | Yes (Draft) | Yes | Yes | Yes | Yes | No |

**Still missing from Institution Master (M6 P1 candidates — not in this migration):**

| Institution | Category |
|-------------|----------|
| Humber Polytechnic | ON college |
| Sheridan College | ON college |
| George Brown Polytechnic | ON college |
| Fanshawe College | ON college |
| Centennial College | ON college |
| Durham College | ON college |
| Mohawk College | ON college |
| Canadore College | ON college |
| Loyalist College | ON college |
| Confederation College | ON college |
| Georgian College | ON college |
| Sault College | ON college |
| Queen's University | ON university |
| Lakehead University | ON university |
| Laurentian University | ON university |
| Ontario Tech University | ON university |
| Brock University | ON university |
| All BC/AB/QC/Atlantic public institutions | M6 P2–P3 |

---

## 4. Mandatory field checklist (per MD)

| Field | Blocker for M6 bulk seed? | Status after 20261004120450 |
|-------|---------------------------|------------------------------|
| Official website (`website_url`) | Yes | ✅ Seeded set complete |
| Country (`country_name` / `country_id`) | Yes | ✅ Backfilled |
| Province (`state_province`) | Yes | ✅ Seeded set complete |
| `institution_type` | Yes | ✅ Populated / inferred |
| DLI / PGWP / App portal | No (M3 governance) | ❌ Still open |
| Application fees | No (warnings only) | ❌ Still open |
| CF linkage | No (separate publish) | 6 linked only |

---

## 5. Verification SQL (run after Lovable publish)

```sql
-- Canadian UPI completeness
SELECT
  i.name,
  i.institution_status,
  i.institution_type,
  i.country_name,
  i.state_province,
  i.website_url,
  i.completeness_score,
  EXISTS (
    SELECT 1 FROM cf_universities cu
    WHERE cu.upi_institution_id = i.id AND cu.country_code = 'CA'
  ) AS cf_linked
FROM upi_institutions i
WHERE lower(coalesce(i.country_name, '')) IN ('canada', 'ca')
   OR i.country_id IN (SELECT id FROM upi_countries WHERE iso_alpha2 = 'CA')
ORDER BY i.name;

-- Gap counts (should be 0 for type/website/country on seeded rows)
SELECT
  count(*) FILTER (WHERE institution_type IS NULL OR trim(institution_type) = '') AS missing_type,
  count(*) FILTER (WHERE website_url IS NULL OR trim(website_url) = '') AS missing_website,
  count(*) FILTER (WHERE country_name IS NULL OR trim(country_name) = '') AS missing_country,
  count(*) FILTER (WHERE state_province IS NULL OR trim(state_province) = '') AS missing_province
FROM upi_institutions i
WHERE lower(coalesce(i.country_name, '')) IN ('canada', 'ca')
   OR i.country_id IN (SELECT id FROM upi_countries WHERE iso_alpha2 = 'CA');
```

---

## 6. M6 readiness gate

| Gate | Pass? |
|------|-------|
| Pre-M6 gap report produced | ✅ |
| Targeted ON colleges (9) in UPI | ✅ (migration) |
| Targeted ON universities (12) in UPI | ✅ (migration) |
| Existing 6 enriched | ✅ (migration) |
| `institution_type` NULL cleared | ✅ (migration) |
| Full ~150–180 public library | ❌ — **defer to M6a–M6d** |
| M2 contacts | Pending |
| M3 activation governance | Pending |

**Recommendation:** Publish `20261004120450` + M1 → run verification SQL → proceed **M2 contacts**, then **M6a** (remaining 12 Ontario colleges).

---

## Related

- [`CANADA_INSTITUTION_MASTER_AUDIT.md`](./CANADA_INSTITUTION_MASTER_AUDIT.md)
- [`INSTITUTION_MASTER_COMPLETION_PLAN.md`](./INSTITUTION_MASTER_COMPLETION_PLAN.md)
