# Institution Master — M3 Completion Report

| Field | Value |
|-------|-------|
| **Report date** | 2026-06-23 |
| **Scope** | M1 → M2 → M3 / M3.1 database + data remediation |
| **Status** | **M3 database complete** — Overview UI pending |
| **SSOT** | `upi_institutions` + related tables |
| **Verified by** | Owner SQL editor (Lovable Cloud) post-manual migration apply |

---

## Executive summary

Institution Master Phases **M1** (profile schema), **M2** (flexible contacts), and **M3 / M3.1** (governance RPCs, country standardization, profile guidance ranges) are **applied and verified** on production Supabase.

| Milestone | DB | UI | Data |
|-----------|:--:|:--:|:--:|
| M1 Profile schema | ✅ | ⏳ Overview pending | Partial backfill (Canada pre-M6) |
| M2 Contacts | ✅ | ✅ Contacts tab | Live |
| M2.1 Contact country ISO | ✅ | ✅ CRM dropdown | Live |
| M3.1 Country standardization | ✅ | ⏳ Overview pending | **137 → 0 unmapped** |
| M3.1b Guidance ranges | ✅ | ⏳ Overview pending | Empty (new columns) |
| M3 Governance RPCs | ✅ | ⏳ Governance panel pending | `is_active` drift **0** |

**Mark Final:** unchanged — linkage via `cf_universities.upi_institution_id` only.

---

## 1. M1 deliverables

**Migration:** `20261004120000_upi_institution_profile_phase1.sql`  
**Ship commit:** `60f8064c` (approx.)

### Schema

| Deliverable | Detail |
|-------------|--------|
| `institution_status` | Draft, Review, Active, Inactive, Archived (CHECK) |
| Compliance (Canada) | `dli_number`, `pgwp_eligible`, `pal_required` |
| URLs | `international_student_url`, `application_portal_url`, `deposit_policy_url` |
| Recruitment | `main_intakes[]`, `processing_time`, `application_method`, `institution_description` |
| Verification | `last_loa_verified_at`, `profile_source_*`, `last_human_verified_*`, `human_verification_method` |
| Completeness | `completeness_score` (0–100, trigger-computed) |
| Type normalization | Legacy types mapped to 6-type enum |
| Status backfill | `institution_status` from legacy `is_active` |
| Functions | `fn_upi_institution_is_canada`, `fn_compute_upi_institution_completeness_score` |
| View | `v_upi_institution_profile_readiness` (profile flags) |

### Governance rules (locked)

- Official website mandatory at activation (enforced in M3 RPC)
- Fee schedule: APPLICATION = EXACT, TUITION/DEPOSIT = APPROXIMATE (ws-2 preserved)
- Fees warn at activation — never block

### UI at M1 ship

- Columns loaded via `select("*")` — **no dedicated Overview bindings** (by design; deferred to post-audit UI)

---

## 2. M2 deliverables

**Migrations:**

| File | Phase |
|------|-------|
| `20261004120100_upi_institution_contacts.sql` | M2 |
| `20261004120150_upi_institution_contacts_country_standardization.sql` | M2.1 |

**Ship commits:** `ae8535cf`, `e74efbd8` (approx.)

### M2 — Flexible contacts

| Deliverable | Detail |
|-------------|--------|
| Table | `upi_institution_contacts` — flexible `contact_type` (not fixed 4-role schema) |
| RLS | Catalog-aligned with `institution_fee_schedule` |
| Completeness | +5 active contact with email; +5 active primary (extended in M2 migration) |
| Trigger | `trg_upi_institution_contacts_refresh_parent_score` |
| View | Readiness view extended with contact counts |
| UI | **Contacts tab** — sortable table, add/edit/deactivate, suggested types |

### M2.1 — Contact country ISO

| Deliverable | Detail |
|-------------|--------|
| `country_code` | FK → `cf_countries.code` |
| Legacy backfill | Free-text `country` → ISO via `cf_countries` / `master_items` / aliases |
| Dropped | Free-text `country` column |
| Optional fields | `timezone`, `preferred_communication_method` |
| UI | CRM countries master dropdown (same pattern as leads) |

### Activation impact

- Contacts **recommended** at activation (warning only) — enforced in M3 validation function

---

## 3. M3 deliverables

**Migrations (applied manually in Lovable SQL editor, 2026-06-23):**

| Order | File | Phase |
|------:|------|-------|
| 1 | `20261004120175_upi_institution_country_standardization.sql` | M3.1 |
| 2 | `20261004120180_upi_institution_profile_guidance_ranges.sql` | M3.1b |
| 3 | `20261004120200_upi_institution_governance_rpcs.sql` | M3 |

**GitHub ship:** `7727fd2f` (+ local fix `fc009554` for view 42P16 — DROP VIEW before recreate)

### M3.1 — Country standardization

| Deliverable | Detail |
|-------------|--------|
| `fn_resolve_institution_country_iso(text)` | Maps `country_name` → ISO-2 via `cf_countries`, `master_items`, aliases |
| Backfill | `country_id` + canonical `country_name` on `upi_institutions` |
| View | `v_upi_institution_country_unmapped` — remediation queue |
| Design | No new institution column — reuse `country_id` + `country_name` |

### M3.1b — Profile guidance ranges (MD add-on)

| Column | Purpose |
|--------|---------|
| `approximate_tuition_range` | Informational counselor hint only |
| `approximate_deposit_range` | Informational counselor hint only |

**Explicitly not:** Fee Schedule, billing, accounting, activation blockers, completeness score.

Readiness view flags: `has_guidance_tuition_range`, `has_guidance_deposit_range`.

### M3 — Governance

| Deliverable | Detail |
|-------------|--------|
| `fn_validate_upi_institution_activation(id)` | Returns `{ errors[], warnings[] }` |
| `fn_upi_institution_set_status(id, status, force_warnings?)` | Governed status transitions |
| `trg_upi_institutions_status_governance` | Derives `is_active`; blocks direct Activate bypass |
| Hard blockers | Name, type, country, website, application portal; CA: DLI + PGWP |
| Warnings only | Fee schedule rows, contacts, LOA date |
| `is_active` | Derived: `true` iff `institution_status = 'Active'` |
| `catalog_status` | **Unchanged** — independent CF visibility axis |

### Post-apply verification (owner-confirmed)

| Check | Result |
|-------|--------|
| `is_active` drift | **0** |
| Governance RPCs present | ✅ |
| Guidance columns present | ✅ |
| Country unmapped (initial) | 137 |
| Country unmapped (final) | **0** |

### Known migration fix

- **42P16** on `CREATE OR REPLACE VIEW` for readiness view — fixed by `DROP VIEW IF EXISTS` + append new columns at end of SELECT (file `20180` updated in repo).

---

## 4. Country remediation results

### Root cause (137 unmapped)

| Issue | Rows affected | Resolution |
|-------|--------------:|------------|
| `upi_countries` empty / missing ISO rows | ~130 | `INSERT INTO upi_countries SELECT FROM cf_countries` |
| ISO resolved but no FK target | (same) | Re-run M3.1 backfill UPDATE |
| `UAE` label + missing `AE` | 7 | Normalize to `United Arab Emirates`; seed AE in both masters |

### Remediation sequence (manual SQL)

1. Seed `upi_countries` from `cf_countries` (no `is_active` column on `upi_countries`)
2. Re-run institution country UPDATE (M3.1 backfill block)
3. UAE: insert `AE`, normalize labels, re-backfill

### Before / after

| Metric | Before | After |
|--------|-------:|------:|
| Unmapped institutions | 137 | **0** |
| Canonical country names | Mixed (`UAE`, `USA`) | CRM standard |
| `country_id` populated | Partial | **100%** of named rows |

### Diagnostic breakdown (pre-remediation)

| `country_name` (raw) | Count | `resolved_iso` |
|----------------------|------:|:--------------:|
| Canada | 55 | CA |
| United Kingdom | 28 | GB |
| Germany | 23 | DE |
| New Zealand | 10 | NZ |
| USA / United States | 8 | US |
| UAE | 7 | NULL → fixed |
| Australia | 5 | AU |
| Ireland | 1 | IE |

---

## 5. Institution counts by country (post-remediation)

**Total institutions with country:** **137**

| Country (canonical) | Count | Share |
|---------------------|------:|------:|
| Canada | 55 | 40.1% |
| United Kingdom | 28 | 20.4% |
| Germany | 23 | 16.8% |
| New Zealand | 10 | 7.3% |
| United States | 8 | 5.8% |
| United Arab Emirates | 7 | 5.1% |
| Australia | 5 | 3.6% |
| Ireland | 1 | 0.7% |
| **Total** | **137** | **100%** |

### Canada subset (governance note)

- **55** Canadian institutions in UPI library (includes pre-M6 seed + CF-linked enrichments)
- **6** remain in Course Finder (CF publish unchanged by M3)
- Canada compliance fields (DLI, PGWP, PAL) apply to all 55 at activation

---

## 6. Outstanding items

### P0 — Required for production UX

| Item | Phase | Notes |
|------|-------|-------|
| **Overview UI expansion** | UI | Governance panel + sectioned profile per [`INSTITUTION_MASTER_OVERVIEW_DESIGN.md`](./INSTITUTION_MASTER_OVERVIEW_DESIGN.md) |
| CRM `CountrySelect` on Overview + Add Institution | UI | Sync `country_name` + `country_id` on save |
| Activation modal (errors vs warnings) | UI | Calls `fn_upi_institution_set_status` |
| List page status badges/filters | UI | Replace `is_active` filter with `institution_status` |
| Ship `20180` view fix + **M3.1.2** seed migration | DB | Auto-seed `upi_countries` from `cf_countries` on fresh envs |

### P1 — Data & governance

| Item | Phase | Notes |
|------|-------|-------|
| M5 shell status remediation | `20261004120400` | Incomplete shells → Draft; preserves Mark Final linkage |
| Profile field backfill (55 CA) | Data | DLI, PGWP, URLs, fees — operational not schema |
| Fee schedule population | Data | APPLICATION EXACT + TUITION/DEPOSIT APPROXIMATE for CA library |
| Pre-M6 / M6 Canada seed remainder | M6a–d | ~12+ ON colleges + national batches deferred |

### P2 — Future phases

| Item | Phase | Notes |
|------|-------|-------|
| M4 AI readiness schema | M4 | Columns only — no automation |
| Mark Final smoke test | QA | Post-remediation linkage dry-run |
| Deprecate unused columns | Hygiene | `ranking_info`, `accreditation`, etc. — no UI |
| `country_code` on institutions | Optional | Currently `country_id` + CRM label sufficient |

### Explicitly frozen / unchanged

| Item | Rule |
|------|------|
| Mark Final RPC | No status/fee/compliance checks |
| Course Finder UI | Feature frozen |
| New Institution Master tabs | Not allowed |
| Fee activation blockers | Warnings only — never block |

---

## 7. Production readiness assessment

### Database layer — **READY**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| M1 schema applied | ✅ | Columns + completeness trigger live |
| M2 contacts + RLS | ✅ | Contacts tab in production |
| M3 RPCs callable | ✅ | Functions + grants applied |
| `is_active` derived | ✅ | Drift = 0 |
| Country SSOT aligned | ✅ | Unmapped = 0; canonical names |
| Mark Final safe | ✅ | No M3 changes to bridge RPC |
| Rollback risk | Low | Additive migrations; triggers replaceable |

### Application layer — **NOT READY**

| Criterion | Status | Blocker |
|-----------|--------|---------|
| M1 fields visible/editable | ❌ | Overview UI not built |
| Governance status control | ❌ | No RPC wiring in UI |
| Activation checklist UX | ❌ | Modal not built |
| Country CRM dropdown (institution) | ❌ | Still free-text on Detail/List create |
| Guidance ranges in UI | ❌ | Columns exist; no inputs |
| List status filters | ❌ | Still uses legacy `is_active` |

### Data layer — **PARTIAL**

| Criterion | Status | Notes |
|-----------|--------|-------|
| Canada library coverage | ⚠️ | 55 UPI / ~150–180 target |
| CF linkage | ⚠️ | 6 CF institutions linked |
| Profile completeness | ⚠️ | Scores computed; many Draft/incomplete profiles |
| Fee schedule data | ⚠️ | Schema ready; sparse ACTIVE rows |
| Contact records | ⚠️ | Model live; population varies |

### Overall verdict

| Layer | Readiness | Gate |
|-------|-----------|------|
| **Schema & governance (M3)** | **Production-ready** | Verified in SQL editor |
| **End-user Institution Master** | **Not production-ready** | **Overview UI PR required** |
| **Canada public library SSOT** | **In progress** | M5 + M6 + profile backfill |

**Recommended go-live sequence:**

```
1. Ship Overview UI + governance panel + country dropdown
2. Lovable Publish (UI only — migrations already applied)
3. M5 shell remediation migration
4. Operational backfill sprint (55 CA profiles + fees)
5. M6a–d seed phases (remaining public colleges/universities)
```

---

## 8. Verification SQL (regression pack)

```sql
-- Objects present
SELECT
  to_regclass('public.v_upi_institution_country_unmapped') IS NOT NULL AS m3_1_view,
  to_regprocedure('public.fn_upi_institution_set_status(uuid,text,boolean)') IS NOT NULL AS m3_rpc;

-- Data quality
SELECT count(*) AS unmapped FROM v_upi_institution_country_unmapped;
SELECT count(*) AS is_active_drift FROM upi_institutions
WHERE is_active IS DISTINCT FROM (institution_status = 'Active');

-- Country distribution
SELECT country_name, count(*) AS n FROM upi_institutions
WHERE country_id IS NOT NULL GROUP BY 1 ORDER BY n DESC;

-- Activation smoke (replace UUID)
-- SELECT fn_validate_upi_institution_activation('<institution-id>');
```

---

## 9. Related documents

| Document | Purpose |
|----------|---------|
| [`INSTITUTION_MASTER_COMPLETION_PLAN.md`](./INSTITUTION_MASTER_COMPLETION_PLAN.md) | Master plan M1–M6 |
| [`INSTITUTION_MASTER_UI_FIELD_AUDIT.md`](./INSTITUTION_MASTER_UI_FIELD_AUDIT.md) | UI inventory |
| [`INSTITUTION_DATABASE_CLEANUP_AUDIT.md`](./INSTITUTION_DATABASE_CLEANUP_AUDIT.md) | Column cleanup |
| [`INSTITUTION_MASTER_OVERVIEW_DESIGN.md`](./INSTITUTION_MASTER_OVERVIEW_DESIGN.md) | Approved Overview wireframe |
| [`INSTITUTION_MASTER_M3_IMPLEMENTATION_PLAN.md`](./INSTITUTION_MASTER_M3_IMPLEMENTATION_PLAN.md) | M3 implementation plan |
| [`INSTITUTION_MASTER_M2_DELIVERY.md`](./INSTITUTION_MASTER_M2_DELIVERY.md) | M2 delivery report |
| [`CANADA_INSTITUTION_PRE_M6_GAP_REPORT.md`](./CANADA_INSTITUTION_PRE_M6_GAP_REPORT.md) | Canada seed gap |
| [`../backlog/PORTAL_ACCESS_VAULT.md`](../backlog/PORTAL_ACCESS_VAULT.md) | Phase 2 — encrypted portal credentials (high priority) |

---

## 10. Sign-off

| Phase | Database | UI | Owner verified |
|-------|:--------:|:--:|:--------------:|
| M1 | ✅ | ⏳ | ✅ (prior publish) |
| M2 / M2.1 | ✅ | ✅ | ✅ |
| M3 / M3.1 / M3.1b | ✅ | ⏳ | ✅ (2026-06-23) |
| Country remediation | ✅ | — | ✅ (unmapped 0) |

**Next action:** Overview UI implementation (`InstitutionGovernancePanel` + `InstitutionProfileOverview`).
