# Institution Master — M3 / M3.1 Implementation Plan

| Field | Value |
|-------|-------|
| **Status** | Approved — migrations in this repo; Overview UI in follow-up PR |
| **Date** | 2026-06-23 |
| **Prerequisite design** | [`INSTITUTION_MASTER_OVERVIEW_DESIGN.md`](./INSTITUTION_MASTER_OVERVIEW_DESIGN.md) |

---

## Executive summary

Ship database governance (M3.1 → profile guidance → M3) first, then Overview UI expansion in a single UI PR. **No new tabs.** Approximate tuition/deposit ranges are **informational profile fields only** — they do not replace `institution_fee_schedule`, billing, or accounting.

---

## Migration sequence (this delivery)

| Order | File | Phase | Purpose |
|------:|------|-------|---------|
| 1 | `20261004120175_upi_institution_country_standardization.sql` | **M3.1** | Backfill `country_id` + canonical `country_name` from CRM/`cf_countries` |
| 2 | `20261004120180_upi_institution_profile_guidance_ranges.sql` | **M3.1b** | Add `approximate_tuition_range`, `approximate_deposit_range` (text, optional) |
| 3 | `20261004120200_upi_institution_governance_rpcs.sql` | **M3** | Activation validation, status RPC, `is_active` derived trigger |

**Not in this delivery:** M5 shell remediation, Overview UI, list page status filters (next PR).

---

## Locked constraints (unchanged)

| Rule | Implementation |
|------|----------------|
| No new Institution Master tabs | UI changes only on Overview `TabsContent` |
| Country CRM master | `CountrySelect` + sync `country_name` + `country_id` (no `country_code` column on institutions yet) |
| `institution_status` = governance SSOT | Status RPC + activation validation |
| `is_active` derived only | `BEFORE INSERT OR UPDATE` trigger |
| `catalog_status` independent | Unchanged in `PartnershipRoutesPanel` |
| Canada compliance conditional | UI hides DLI/PGWP/PAL unless country resolves to CA |
| No duplicate portal/notes/verification | See Overview design §3 |
| Fee Schedule unchanged | Activation **warns** on missing fee rows; never blocks |
| Mark Final unchanged | No RPC changes |

---

## New profile guidance fields (MD requirement)

| Column | Type | UI section | Purpose |
|--------|------|------------|---------|
| `approximate_tuition_range` | `text` | Recruitment profile | Counselor-facing hint, e.g. `Approx. CAD 15,000 – 22,000 / year` |
| `approximate_deposit_range` | `text` | Recruitment profile | Counselor-facing hint, e.g. `Approx. CAD 2,000 – 5,000` |

| Explicitly **not** | Reason |
|--------------------|--------|
| Used in billing / accounting | Informational only |
| Replacement for Fee Schedule | EXACT/APPROXIMATE fees stay on `institution_fee_schedule` |
| Activation hard blocker | Optional — may add **soft warning** in UI later, not in M3 RPC |
| Included in `completeness_score` | Avoid conflating with governed fee rows |

**UI copy:** *“Informational only — for counselor guidance. Official fees are managed on the Fee Schedule tab.”*

---

## M3.1 — Country standardization

### Database

1. `fn_resolve_institution_country_iso(country_name)` — resolves ISO-2 via `cf_countries`, `master_items`, alias map (same as M2.1 contacts).
2. Backfill all `upi_institutions` rows:
   - Set `country_id` from `upi_countries` where `iso_alpha2 = resolved code`
   - Set `country_name` to canonical `cf_countries.name`
3. `v_upi_institution_country_unmapped` — rows still missing `country_id` after backfill.
4. `RAISE NOTICE` count of unmapped rows (non-blocking).

### Application (UI PR)

- Replace free-text Country on Overview + Add Institution with `@/components/leads/CountrySelect` or code-based variant from `institutionContactCountries`.
- On save:
  ```ts
  country_name = selectedLabel
  country_id   = upi_countries.id WHERE iso_alpha2 = masterCode
  ```
- `isCanada` = `countryCodeFromLabel(...) === 'CA'`.

### Verification SQL

```sql
SELECT count(*) FILTER (WHERE country_id IS NULL AND country_name IS NOT NULL) AS unmapped
FROM upi_institutions;

SELECT * FROM v_upi_institution_country_unmapped;
```

---

## M3 — Governance

### Functions

| Function | Returns | Purpose |
|----------|---------|---------|
| `fn_validate_upi_institution_activation(id)` | `{ errors[], warnings[] }` | Checklist for Activate modal |
| `fn_upi_institution_set_status(id, status, force_warnings?)` | `{ ok, errors[], warnings[] }` | **Only** supported path for status transitions from UI |

### Hard blockers (errors)

| Check | Scope |
|-------|-------|
| Name non-empty | All |
| Institution type set | All |
| Country (`country_id` or `country_name`) | All |
| `website_url` | All |
| `application_portal_url` | All |
| `dli_number` | Canada (`fn_upi_institution_is_canada`) |
| `pgwp_eligible IS NOT NULL` | Canada |

### Warnings only

| Check | Scope |
|-------|-------|
| ACTIVE institution-default APPLICATION fee row | All |
| ACTIVE institution-default TUITION row (`APPROXIMATE`) | All |
| ACTIVE institution-default DEPOSIT row (`APPROXIMATE`) | All |
| ≥1 active contact with email | All |
| `last_loa_verified_at` empty | All |

### Trigger behaviour

`trg_upi_institutions_status_governance` (BEFORE INSERT OR UPDATE):

- `NEW.is_active := (NEW.institution_status = 'Active')`
- If transitioning **to** `Active` without session bypass → run validation; **RAISE** on errors
- RPC sets `app.upi_skip_activation_check = on` after validating (including `force_warnings` handling)

### One-time sync

```sql
UPDATE upi_institutions SET is_active = (institution_status = 'Active');
```

### Status transitions (UI)

```
Draft ──► Review ──► Active
  │          │         ├──► Inactive ──► Archived
  └──────────┴─────────┘
```

Non-Active transitions: allowed without activation validation.

---

## Overview UI — follow-up PR (file plan)

| File | Change |
|------|--------|
| `src/institutions/pages/InstitutionDetailPage.tsx` | Extract Overview sections; wire all existing columns + guidance ranges |
| `src/institutions/components/InstitutionGovernancePanel.tsx` | **New** — status, completeness, Activate modal |
| `src/institutions/components/InstitutionProfileOverview.tsx` | **New** — sectioned profile form |
| `src/institutions/lib/institutionGovernanceApi.ts` | **New** — RPC wrappers |
| `src/institutions/types/upi.ts` | Add guidance range fields |
| `src/institutions/pages/InstitutionsListPage.tsx` | Status badges/filters; CRM country on create |
| `src/institutions/components/PartnershipRoutesPanel.tsx` | Portal override helper text only |

### Overview sections (final)

1. **Governance** — status RPC, completeness %, derived operational badge  
2. **Core identity** — logo, name, country (CRM), type, website, email, phone  
3. **Location** — city, state_province, address  
4. **URLs & portals** — intl student, application portal (default), deposit policy  
5. **Compliance (Canada)** — DLI, PGWP, PAL  
6. **Recruitment** — intakes, processing time, application method, public description, **approx tuition range**, **approx deposit range**  
7. **Verification** — LOA + profile source + human verification  
8. **Internal notes** — `notes`  
9. **Catalog & partnerships** — unchanged component  
10. **Discovered fields** — metadata read-only  

### Save paths

| Data | Path |
|------|------|
| Profile fields | `saveInst()` → direct update |
| Country | Atomic `{ country_name, country_id }` |
| Status | `fn_upi_institution_set_status` RPC only |
| Catalog | Existing `onCatalogChange` |

---

## Testing checklist

### M3.1

- [ ] Canadian institutions have `country_id` → CA after publish
- [ ] Alias names (`Canada`, `ca`, `CAN`) normalize to `Canada` + correct UUID
- [ ] Unmapped view empty or documented exceptions

### M3

- [ ] Activate blocked without website (error returned)
- [ ] Activate blocked for CA without DLI/PGWP (errors)
- [ ] Activate succeeds with fee gaps when `force_warnings = true`
- [ ] `is_active` true only when `institution_status = 'Active'`
- [ ] Direct SQL `UPDATE ... SET institution_status = 'Active'` blocked when invalid
- [ ] Mark Final still works on Draft institutions (no status check added)

### Guidance ranges

- [ ] Columns nullable; save/load on institution row
- [ ] Fee Schedule tab unchanged
- [ ] No fee resolver reads guidance columns

### UI (follow-up)

- [ ] Canada section hidden when country ≠ CA
- [ ] No `is_active` toggle anywhere
- [ ] Route portal shows institution default when blank
- [ ] Guidance fields show informational disclaimer

---

## Rollout

```
1. Lovable → Publish (M3.1 + guidance + M3 migrations)
2. Run verification SQL in Lovable SQL editor
3. Ship Overview UI PR (same session or immediately after)
4. Lovable → Publish → hard refresh
5. M5 shell remediation (separate, after UI smoke test)
```

---

## Related

- [`INSTITUTION_MASTER_OVERVIEW_DESIGN.md`](./INSTITUTION_MASTER_OVERVIEW_DESIGN.md)
- [`INSTITUTION_DATABASE_CLEANUP_AUDIT.md`](./INSTITUTION_DATABASE_CLEANUP_AUDIT.md)
- [`INSTITUTION_MASTER_COMPLETION_PLAN.md`](./INSTITUTION_MASTER_COMPLETION_PLAN.md)
