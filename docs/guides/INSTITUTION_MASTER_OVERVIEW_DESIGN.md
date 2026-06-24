# Institution Master — Overview Page Design (Approved Audit)

| Field | Value |
|-------|-------|
| **Status** | Design only — no code, migrations, or UI changes |
| **Date** | 2026-06-23 |
| **Scope** | `InstitutionDetailPage` → **Overview tab only** |
| **Prerequisites** | [`INSTITUTION_MASTER_UI_FIELD_AUDIT.md`](./INSTITUTION_MASTER_UI_FIELD_AUDIT.md), [`INSTITUTION_DATABASE_CLEANUP_AUDIT.md`](./INSTITUTION_DATABASE_CLEANUP_AUDIT.md) |

---

## Design principles (locked)

| # | Rule |
|---|------|
| 1 | Surface **existing** `upi_institutions` columns only — no new profile columns in this phase |
| 2 | **No new Institution Master tabs** |
| 3 | Expand **Overview** only; Contacts, Fee Schedule, Sources, Documents unchanged |
| 4 | Country via **CRM Country Master** (`master_items` / `CountrySelect` pattern — same as leads & contacts) |
| 5 | **`institution_status`** = governance SSOT |
| 6 | **`is_active`** = derived only (never user-editable) |
| 7 | **`catalog_status`** = independent CF visibility axis (stays in Catalog & partnerships) |
| 8 | DLI / PGWP / PAL **visible only when Country = Canada** |
| 9 | Surface **`city`**, **`state_province`**, **`address`** (already in DB) |
| 10 | **No duplicate** portal URL, notes, verification, or status fields |

---

## 1. Final Overview page wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PAGE HEADER                                                                 │
│  [Logo]  Institution Name                                                   │
│  Canada · Public College                                                    │
│  ┌──────────┐ ┌─────────────┐ ┌──────────────────────┐                      │
│  │ Draft    │ │ 62% complete│ │ CF: Promoted (info)  │  ← badges (read-only  │
│  └──────────┘ └─────────────┘ └──────────────────────┘     catalog hint)    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ TABS ──────────────────────────────────────────────────────────────────────┐
│ [Overview*]  Contacts  Sources  Documents  Fee Schedule  …                  │
└─────────────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════
 OVERVIEW TAB
══════════════════════════════════════════════════════════════════════════════

┌─ KPI DASHBOARD (unchanged) ───────────────────────────────────────────────┐
│  OverviewPanel — commissions, claims, recent activity, AI highlights      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ GOVERNANCE ───────────────────────────────────────────── max-w-3xl ──────────┐
│  Institution status *                                                       │
│  [ Draft ▼ ]                    [ Move to Review ]  [ Activate… ]           │
│                                                                             │
│  Completeness        62 / 100  ████████░░░░░░░░  (read-only, DB trigger)    │
│  Operational flag    Inactive  (derived from status — not editable)         │
│                                                                             │
│  ⓘ Activation checklist opens on Activate — errors block, fees warn only    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ INSTITUTION PROFILE ────────────────────────────────── max-w-3xl ──────────┐
│                                                                             │
│  ── Branding ──                                                             │
│  [ Logo upload / fetch ]                                                    │
│                                                                             │
│  ── Core identity ──                                                        │
│  Name *              [________________________________]                     │
│  Country *           [ Canada              ▼ ]  ← CRM CountrySelect         │
│  Institution type *  [ Public College      ▼ ]                              │
│  Official website *  [https://___________________]  ← website_url           │
│  Email               [___________________________]                          │
│  Phone               [___________________________]                          │
│                                                                             │
│  ── Location ──                                                             │
│  City                [___________________________]                            │
│  Province / state    [___________________________]  ← state_province        │
│  Address             [___________________________]                          │
│                      [ multiline if needed      ]                           │
│                                                                             │
│  ── URLs & portals ──                                                       │
│  International student page   [https://___________]                         │
│  Application portal (default) [https://___________]  ⓘ Route overrides    │
│  Deposit policy URL           [https://___________]                         │
│                                                                             │
│  ── Compliance (Canada) ──          ← hidden unless Country = Canada        │
│  DLI number *            [ O193______________ ]                             │
│  PGWP eligible *         ( ) Yes  ( ) No  ( ) Unknown                       │
│  PAL required            [ ] Required for international students            │
│                                                                             │
│  ── Recruitment profile ──                                                  │
│  Main intakes            [ Fall ▼ ] [ Winter ▼ ] [ + add ]  ← main_intakes[]│
│  Processing time         [ e.g. 4–6 weeks for LOA ______ ]                  │
│  Application method      [ Direct ▼ ]                                       │
│  Public description      [ textarea — counselor-facing copy ]              │
│                           ← institution_description (NOT notes)             │
│                                                                             │
│  ── Profile verification ──                                                 │
│  Last LOA verified       [ date picker ____________ ]                       │
│  Primary source URL        [https://___________]                            │
│  Source type               [ WEBSITE ▼ ]                                    │
│  Source reference          [ e.g. LOA doc ref, page section ]               │
│  Source notes              [ textarea ]                                     │
│  Last human verified       [ date ]  by [ Staff name — read-only ]          │
│  Verification method       [ MANUAL ▼ ]                                     │
│                                                                             │
│  ── Internal notes ──                                                       │
│  Staff notes (internal)  [ textarea ]  ← notes — not public description   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ CATALOG & PARTNERSHIPS (unchanged component, relabeled) ─── max-w-3xl ─────┐
│  Course Finder catalog visibility *                                         │
│  [ Promoted ▼ ]   ← catalog_status (independent of institution_status)      │
│  Promotion notes     [ textarea ]                                           │
│  … partnership routes CRUD …                                                │
│  Route dialog “Portal URL” shows: “Defaults to institution portal when blank”│
└─────────────────────────────────────────────────────────────────────────────┘

┌─ DISCOVERED FIELDS (unchanged, read-only) ──────────────────────────────────┐
│  metadata key / value pairs from seeds & crawls                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Header badge behaviour

| Badge | Source | Editable |
|-------|--------|----------|
| Status (Draft / Review / …) | `institution_status` | Governance section only (RPC) |
| Completeness % | `completeness_score` | Never — trigger-computed |
| CF catalog hint | `catalog_status` | Catalog section only — informational in header |

### Save behaviour by section

| Section | Save path |
|---------|-----------|
| Profile fields (blur / explicit Save) | `saveInst()` → direct `upi_institutions.update` |
| Country change | Atomic patch: `country_name` + `country_id` from CRM master code |
| Status transition | `fn_upi_institution_set_status` RPC only — never raw `institution_status` update from generic save |
| `is_active` | Never written from UI — DB trigger/RPC side-effect |
| `catalog_status` | Existing `onCatalogChange` in `PartnershipRoutesPanel` |

---

## 2. Final field grouping

All columns bind to **existing** `upi_institutions` fields unless noted as derived/UI-only.

### Group A — Governance (Overview → Governance card)

| UI label | Column | Control | Editable | Notes |
|----------|--------|---------|----------|-------|
| Institution status | `institution_status` | Select + action buttons | RPC-gated | SSOT for lifecycle |
| Completeness | `completeness_score` | Progress bar + % | Read-only | Trigger on profile change |
| Operational flag | `is_active` | Text badge “Active / Inactive” | **Never** | Derived: `status = Active` |
| Activate / Review | — | Buttons → activation modal | RPC | M3 checklist |

**Explicitly excluded:** no `is_active` toggle, no second status field.

### Group B — Branding & core identity (Overview → Institution profile)

| UI label | Column | Control | Editable |
|----------|--------|---------|----------|
| Logo | `logo_url` | `InstitutionLogoField` | Yes |
| Name | `name` | Input | Yes |
| Country | `country_name` + `country_id` | CRM `CountrySelect` | Yes |
| Institution type | `institution_type` | Select (6-type enum) | Yes |
| Official website | `website_url` | URL input | Yes |
| Email | `email` | Input | Yes |
| Phone | `phone` | Input | Yes |

**Country binding (no new column):**

```
User picks label in CountrySelect (master_items countries)
  → resolve master_items.code (ISO-2)
  → country_name = master label (canonical)
  → country_id = upi_countries.id WHERE iso_alpha2 = code
```

Reuse helpers from `@/institutions/lib/institutionContactCountries` (`countryCodeFromLabel`, `useInstitutionContactCountries`).

**Canada detection for conditional UI:**

```ts
isCanada = countryCodeFromLabel(country_name, countries) === 'CA'
  || inst.country_id maps to upi_countries.iso_alpha2 === 'CA'
```

Aligns with existing `fn_upi_institution_is_canada()` server-side.

### Group C — Location (Overview → Institution profile)

| UI label | Column | Control | Editable |
|----------|--------|---------|----------|
| City | `city` | Input | Yes |
| Province / state | `state_province` | Input | Yes |
| Address | `address` | Textarea | Yes |

### Group D — URLs & portals (Overview → Institution profile)

| UI label | Column | Control | Editable | Duplicate rule |
|----------|--------|---------|----------|----------------|
| International student page | `international_student_url` | URL input | Yes | — |
| Application portal (institution default) | `application_portal_url` | URL input | Yes | **Single institution field**; routes inherit when blank |
| Deposit policy URL | `deposit_policy_url` | URL input | Yes | — |

**Route dialog:** keep existing `application_portal_url` on `upi_partnership_routes` — label as **“Portal URL (override)”** with placeholder showing institution default. No second institution-level portal field.

### Group E — Compliance — Canada only (Overview → Institution profile)

Shown when `isCanada === true`. Hidden (not cleared) when country changes away from Canada.

| UI label | Column | Control | Editable |
|----------|--------|---------|----------|
| DLI number | `dli_number` | Input | Yes |
| PGWP eligible | `pgwp_eligible` | Tristate radio | Yes |
| PAL required | `pal_required` | Checkbox | Yes |

### Group F — Recruitment profile (Overview → Institution profile)

| UI label | Column | Control | Editable |
|----------|--------|---------|----------|
| Main intakes | `main_intakes` | Multi-select / chips | Yes |
| Processing time | `processing_time` | Input (free text) | Yes |
| Application method | `application_method` | Select | Yes |
| Public description | `institution_description` | Textarea | Yes |

**Not duplicated:** route `processing_sla_days` (numeric, per-route) stays in Partnership Routes dialog only. Route `channel_type` stays separate from institution `application_method`.

### Group G — Profile verification (Overview → Institution profile)

| UI label | Column | Control | Editable | Duplicate rule |
|----------|--------|---------|----------|----------------|
| Last LOA verified | `last_loa_verified_at` | Date picker | Yes | Institution-level LOA stamp |
| Primary source URL | `profile_source_url` | URL input | Yes | ≠ fee row `source_url` |
| Source type | `profile_source_type` | Enum select | Yes | Profile attestation |
| Source reference | `profile_source_reference` | Input | Yes | — |
| Source notes | `profile_source_notes` | Textarea | Yes | — |
| Last human verified | `last_human_verified_at` | Date picker | Yes | ≠ fee `last_verified_at` |
| Verified by | `last_human_verified_by` | Staff display (FK) | Set on verify action | Optional picker in M3+ |
| Verification method | `human_verification_method` | Enum select | Yes | Profile-level |

**Fee Schedule tab:** unchanged — row-level verification remains per fee type. Overview copy: *“Fee-level verification is managed on the Fee Schedule tab.”*

### Group H — Internal notes (Overview → Institution profile)

| UI label | Column | Control | Editable |
|----------|--------|---------|----------|
| Staff notes (internal) | `notes` | Textarea | Yes |

**Label change only:** placeholder “Notes” → **“Staff notes (internal)”** to distinguish from `institution_description`.

### Group I — Catalog & partnerships (unchanged component)

| UI label | Column | Control | Editable |
|----------|--------|---------|----------|
| Course Finder catalog visibility | `catalog_status` | Select | Yes |
| Promotion notes | `promotion_notes` | Textarea | Yes |
| Partnership routes | `upi_partnership_routes` | CRUD | Yes |

**Relabel:** “Show in catalog / Course Finder” → **“Course Finder catalog visibility”** to separate from governance status.

### Group J — System / not surfaced in profile form

| Column | Treatment |
|--------|-----------|
| `id`, `slug` | System |
| `is_partner`, `partner_since` | Derived from routes — list badges only |
| `ranking_info`, `accreditation`, `established_year`, `total_programs` | Deprecated — no UI |
| `metadata` | Read-only “Discovered fields” block (unchanged) |
| `created_at`, `updated_at` | Optional footer “Last updated” — low priority |

### Columns surfaced by this design (net new to UI)

**22 fields** move from hidden → Overview:

`institution_status`, `completeness_score`, `city`, `state_province`, `address`, `international_student_url`, `application_portal_url`, `deposit_policy_url`, `dli_number`, `pgwp_eligible`, `pal_required`, `main_intakes`, `processing_time`, `application_method`, `institution_description`, `last_loa_verified_at`, `profile_source_url`, `profile_source_type`, `profile_source_reference`, `profile_source_notes`, `last_human_verified_at`, `last_human_verified_by`, `human_verification_method`

Plus **`country_id`** wired implicitly via Country dropdown (replacing free-text-only `country_name`).

---

## 3. Duplicate prevention map

| Risk | Prevention in this design |
|------|---------------------------|
| Two portal URLs at institution level | One field: `application_portal_url` in URLs section |
| Portal on institution vs route | Institution = default; route = override with helper text |
| Two note fields | `notes` = internal; `institution_description` = public — distinct labels |
| Two status controls | `institution_status` in Governance; `catalog_status` in Catalog — distinct labels |
| `is_active` toggle | Removed — derived badge only |
| Two verification blocks | Profile verification on Overview; fee verification on Fee Schedule tab |
| Country free text vs ISO | Single CRM dropdown → sync `country_name` + `country_id` |

---

## 4. Migration impact analysis

### 4.1 Summary

| Category | Migrations needed? | Notes |
|----------|-------------------|-------|
| Surface existing M1 + location columns | **No new columns** | UI-only binding |
| Country CRM dropdown | **Backfill migration recommended** | Sync `country_id` + canonical `country_name` from existing text |
| `institution_status` governance | **Yes — M3 (planned)** | RPC + validation + `is_active` sync trigger |
| `country_code` on institutions | **Deferred** | Not required if `country_id` + master label pattern used |
| Dedup index change | **Deferred (C4)** | After country backfill ≥95% |
| Shell remediation | **Yes — M5 (planned)** | Draft shells; preserves linkage |
| Mark Final | **No change** | Locked |

### 4.2 Required migrations (implementation phase)

#### M3 — `20261004120200_upi_institution_governance_rpcs.sql` (planned)

| Object | Purpose | Impact |
|--------|---------|--------|
| `fn_validate_upi_institution_activation(id)` | Returns `{ errors[], warnings[] }` | Activation modal data source |
| `fn_upi_institution_set_status(id, status, force_warnings?)` | Status transitions | **Only** path to set `institution_status` → Active |
| `trg_upi_institution_status_sync` (or equivalent) | `is_active := (institution_status = 'Active')` | Makes `is_active` derived |
| RLS / grants on RPCs | authenticated + institutions module | Low risk |

**Breaking risk:** Medium — any external script that sets `is_active` directly will be overwritten on next status touch. Document: use status RPC.

**UI dependency:** Governance card + activation modal cannot ship without M3.

#### M3.1 — Country backfill (recommended companion)

**File (proposed):** `20261004120350_upi_institution_country_standardization.sql`

| Step | Action |
|------|--------|
| 1 | Map `country_name` → `cf_countries` / `master_items` (same alias map as M2.1 contacts) |
| 2 | Set `country_id` from `upi_countries` where `iso_alpha2 = resolved code` |
| 3 | Normalize `country_name` to canonical master label (e.g. `canada` → `Canada`) |
| 4 | Log unmapped rows to remediation view |

**No new column** on `upi_institutions` in this phase.

**Breaking risk:** Low — dedup unique index uses normalized country name; canonicalization may surface existing duplicates for manual merge.

**Optional later:** add `country_code text REFERENCES cf_countries(code)` for parity with contacts — **not in this design phase**.

#### M5 — Shell status remediation (planned)

Sets incomplete / shell institutions to `Draft`, `is_active = false`. Overview will show Draft badge. **No linkage changes.**

### 4.3 Migrations NOT required for Overview UI

| Item | Reason |
|------|--------|
| M1 profile columns | Already applied (`20261004120000`) |
| Location columns | Already in base schema |
| M2 contacts | Already applied — Contacts tab unchanged |
| New tabs | None |
| Fee schedule structure | Unchanged |
| `catalog_status` | Already exists |

### 4.4 Application / code changes (for planning — not in this deliverable)

| Area | Change | Migration paired? |
|------|--------|-------------------|
| `InstitutionDetailPage.tsx` | Refactor Overview into sectioned cards | No |
| New `InstitutionProfileOverview.tsx` (optional extract) | Grouped form component | No |
| `InstitutionsListPage.tsx` | Filter/badge on `institution_status` not `is_active` | After M3 trigger |
| Add Institution modal | CRM CountrySelect + sync `country_id` | After M3.1 backfill |
| `UpiInstitution` type | Already has M1 fields | No |
| `saveInst()` | Split: field save vs status RPC | M3 |
| `PartnershipRoutesPanel` | Portal override helper text only | No |
| `fn_upi_institution_is_canada` | Already uses `country_name` + `country_id` | Works after backfill |

### 4.5 Data migration risk matrix

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Country backfill fails for edge aliases | Medium | Alias table + manual SQL report |
| `is_active` drift during M3 rollout | Medium | One-time sync UPDATE before enabling trigger |
| Duplicate institutions after country canonicalization | Low | Run dedup report pre-migration |
| Canada block hidden but data retained | None | Fields stay in DB when country ≠ CA |
| Activation blocked for valid CF-linked shells | Expected | M5 sets Draft; activation checklist guides completion |

### 4.6 Rollout sequence

```
1. M3.1  Country backfill (country_name + country_id canonical)
2. M3    Governance RPCs + is_active sync trigger
3. UI     Overview profile sections (all existing columns)
4. UI     Governance card + activation modal
5. UI     List page status filters/badges
6. M5    Shell remediation (can parallel step 3 if needed)
```

### 4.7 Verification queries (post-migrate)

```sql
-- Country alignment
SELECT count(*) FILTER (WHERE country_id IS NULL AND country_name IS NOT NULL) AS name_without_id
FROM upi_institutions;

-- is_active sync
SELECT count(*) FROM upi_institutions
WHERE (institution_status = 'Active') <> is_active;

-- Hidden fields now populated (spot check)
SELECT id, name, city, dli_number, completeness_score, institution_status
FROM upi_institutions
WHERE country_name = 'Canada'
LIMIT 10;
```

---

## 5. Out of scope (explicit)

| Item | Reason |
|------|--------|
| New Institution Master tabs | User constraint |
| New `upi_institutions` columns | Surface existing only |
| `country_code` column on institutions | Deferred — use `country_id` + CRM master |
| Fee Schedule UI changes | Separate tab; verification stays per-fee |
| Course Finder UI | Frozen |
| Mark Final RPC changes | Locked |
| Deprecating `ranking_info` etc. | Separate schema-hygiene pass |
| List page redesign detail | Mentioned for M3; not wireframed here |

---

## 6. Sign-off

| Deliverable | Status |
|-------------|--------|
| Final Overview wireframe | §1 |
| Final field grouping | §2 |
| Migration impact analysis | §4 |
| Duplicate prevention | §3 |
| Governance / catalog / is_active model | §1, §2 Group A & I |

**Ready for implementation:** Overview UI expansion + M3 + M3.1 country backfill.

---

## Related

- [`INSTITUTION_MASTER_UI_FIELD_AUDIT.md`](./INSTITUTION_MASTER_UI_FIELD_AUDIT.md)
- [`INSTITUTION_DATABASE_CLEANUP_AUDIT.md`](./INSTITUTION_DATABASE_CLEANUP_AUDIT.md)
- [`INSTITUTION_MASTER_COMPLETION_PLAN.md`](./INSTITUTION_MASTER_COMPLETION_PLAN.md)
