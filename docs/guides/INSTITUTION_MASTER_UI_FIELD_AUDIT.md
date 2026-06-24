# Institution Master — UI Field Inventory & M1 Gap Analysis

| Field | Value |
|-------|-------|
| **Status** | Audit only — no UI or migration changes |
| **Date** | 2026-06-23 |
| **Scope** | Institution Detail (`InstitutionDetailPage`) + Add Institution modal |
| **Goal** | Reuse existing structure before adding M1 profile fields |

---

## 1. Institution Master Field Inventory

**Load binding:** `supabase.from("upi_institutions").select("*")` on detail page.  
**Save binding:** `saveInst()` → `upi_institutions.update(patch)` (Overview profile + catalog patch only).  
**Edit gate:** `useModulePermission("institutions").canEdit` — view-only users see all tabs read-only where implemented.

### Page chrome (all tabs)

| UI label | Tab | DB column / source | Editable |
|----------|-----|-------------------|----------|
| Institution name (title) | Header | `upi_institutions.name` | Read-only display (editable in Overview) |
| Country · Type (subtitle) | Header | `country_name`, `institution_type` | Read-only display |
| Logo (large) | Header | `logo_url` | Read-only display |

### Overview

| UI label | Section | DB column / source | Editable |
|----------|---------|-------------------|----------|
| KPI tiles (commissions, claims, etc.) | Overview → KPI grid | `upi_commissions`, `upi_commission_claim_cycles`, `upi_commission_invoices`, `upi_ai_suggestions`, etc. | Read-only |
| Recent agreements / cycles / invoices | Overview | `upi_agreements`, claim cycles, invoices | Read-only |
| Client → Commission Sync banner | Overview | N/A (placeholder) | Read-only |
| AI highlights | Overview | `upi_ai_suggestions` | Read-only |
| **Institution logo** | Overview → Institution profile | `logo_url` (+ storage upload) | Editable |
| **Name** | Overview → Institution profile | `name` | Editable |
| **Country** | Overview → Institution profile | `country_name` (free text) | Editable |
| **Website** | Overview → Institution profile | `website_url` | Editable |
| **Email** | Overview → Institution profile | `email` | Editable |
| **Phone** | Overview → Institution profile | `phone` | Editable |
| **Type** | Overview → Institution profile | `institution_type` | Editable |
| **Notes** | Overview → Institution profile | `notes` | Editable |
| **Show in catalog / Course Finder** | Overview → Catalog & partnerships | `catalog_status` | Editable |
| **Promotion notes** | Overview → Catalog & partnerships | `promotion_notes` | Editable |
| Partnership routes (list + dialogs) | Overview → Catalog & partnerships | `upi_partnership_routes.*` | Editable |
| Discovered fields (metadata) | Overview → Institution profile | `metadata` jsonb keys | Read-only |

**Partnership route fields (per route — not institution columns):**  
`application_portal_url`, `processing_sla_days`, `application_fee`, commission slabs, aggregator, channel_type, etc. → `upi_partnership_routes`

### Contacts

| UI label | Tab | DB column / source | Editable |
|----------|-----|-------------------|----------|
| Contact type, name, designation, department | Contacts | `upi_institution_contacts` | Editable |
| Email, phone, mobile | Contacts | `upi_institution_contacts` | Editable |
| Country | Contacts | `country_code` → `cf_countries` | Editable (dropdown) |
| Timezone, preferred communication | Contacts | `timezone`, `preferred_communication_method` | Editable |
| Primary, active, notes | Contacts | `is_primary`, `is_active`, `notes` | Editable |

### Sources

| UI label | Tab | DB column / source | Editable |
|----------|-----|-------------------|----------|
| Source type, URL, linked document | Sources | `upi_institution_sources` | Editable |
| Sync / crawl status | Sources | `crawl_status`, `upi_sync_jobs` | Actions |

### Documents

| UI label | Tab | DB column / source | Editable |
|----------|-----|-------------------|----------|
| Upload, doc kind, pipeline status | Documents | `upi_uploaded_documents` | Editable |
| AI review panel | Documents (dialog) | pipeline fields | Editable |

### Fee Schedule

| UI label | Tab | DB column / source | Editable |
|----------|-----|-------------------|----------|
| Fee type, amount, currency, accuracy | Fee Schedule | `institution_fee_schedule` | Editable |
| Verification method, source URL, last verified | Fee Schedule | `institution_fee_schedule` | Editable |
| Confidence score, status, notes | Fee Schedule | `institution_fee_schedule` | Editable |
| Resolver preview | Fee Schedule | computed from schedule rows | Read-only |

### Commission tabs (restricted)

Billing, Eligibility, Agreements, Commissions, Claims, Receipts → respective `upi_*` tables (not institution profile).

### Promotions / Campaigns / AI Suggestions

| Tab | Primary tables | Institution fields |
|-----|----------------|-------------------|
| Promotions | `upi_promotions` | None |
| Campaigns | `upi_marketing_campaigns` | None |
| AI Suggestions | `upi_ai_suggestions` | None |

### `upi_institutions` columns — in DB, **not displayed** on Detail UI

| Column | In DB | Notes |
|--------|-------|-------|
| `slug` | Yes | Set by migrations/seeds only |
| `country_id` | Yes | FK to `upi_countries`; UI uses `country_name` text only |
| `address` | Yes | Not in UI |
| `city` | Yes | Not in UI |
| `state_province` | Yes | Not in UI |
| `ranking_info` | Yes | Not in UI |
| `accreditation` | Yes | Not in UI |
| `established_year` | Yes | Not in UI |
| `total_programs` | Yes | Not in UI |
| `is_active` | Yes | List filter only; not on Detail |
| `is_partner` | Yes | Derived from routes / list badges |
| `partner_since` | Yes | Not in UI |
| **All M1 columns (below)** | Yes | Loaded via `select("*")` but **no UI controls** |

---

## 2. M1 Gap Analysis

Comparison of M1 schema columns vs Institution Detail UI (2026-06-23).

| M1 field | In DB (M1) | Displayed in UI | Editable in UI | Gap |
|----------|------------|-----------------|----------------|-----|
| `institution_status` | Yes | **No** | — | **Full gap** — list uses legacy `is_active` filter only |
| `dli_number` | Yes | **No** | — | **Full gap** |
| `pgwp_eligible` | Yes | **No** | — | **Full gap** |
| `pal_required` | Yes | **No** | — | **Full gap** |
| `international_student_url` | Yes | **No** | — | **Full gap** |
| `application_portal_url` | Yes | **No** (institution level) | — | **Partial overlap** — route-level URL in Partnership Routes |
| `deposit_policy_url` | Yes | **No** | — | **Full gap** |
| `main_intakes` | Yes | **No** | — | **Full gap** |
| `processing_time` | Yes | **No** (institution level) | — | **Partial overlap** — `processing_sla_days` per route |
| `application_method` | Yes | **No** | — | **Partial overlap** — route `channel_type` (different enum) |
| `institution_description` | Yes | **No** | — | **Overlap risk** — `notes` used for internal notes |
| `last_loa_verified_at` | Yes | **No** | — | **Full gap** |
| `profile_source_url` | Yes | **No** | — | **Partial overlap** — fee row `source_url` on Fee Schedule tab |
| `profile_source_type` | Yes | **No** | — | **Partial overlap** — fee `verification_method` |
| `profile_source_reference` | Yes | **No** | — | **Partial overlap** — fee `detected_source_reference` |
| `profile_source_notes` | Yes | **No** | — | **Full gap** |
| `last_human_verified_at` | Yes | **No** | — | **Partial overlap** — fee `last_verified_at` |
| `last_human_verified_by` | Yes | **No** | — | **Full gap** |
| `human_verification_method` | Yes | **No** | — | **Partial overlap** — fee verification method |
| `completeness_score` | Yes | **No** | — | **Full gap** — computed in DB only |

**Summary:** **0 / 20** M1 fields have dedicated UI. Data loads on institution object but is invisible/non-editable.

---

## 3. Duplicate Detection & Merge Opportunities

### A. Fields already present in UI (legacy / partial M1 coverage)

| Concept | Existing UI | M1 column | Recommendation |
|---------|-------------|-----------|----------------|
| Institution type | Overview → Type dropdown | `institution_type` | **Already Exists** — keep; align with M3 activation |
| Official website | Overview → Website | `website_url` | **Already Exists** |
| Country | Overview → Country (text) | `country_name` / `country_id` | **Reuse** — upgrade to CRM country master dropdown + `country_id` |
| Internal notes | Overview → Notes | `notes` | **Do not merge** into `institution_description` |
| Application portal URL | Partnership route form | `application_portal_url` (institution) | **Merge UX** — institution default + route override display |
| Processing time | Route `processing_sla_days` | `processing_time` | **Keep both** — institution SLA text vs route SLA days |
| Application method | Route `channel_type` | `application_method` | **Keep both** — institution default vs partnership channel |
| Verification / source | Fee Schedule rows | `profile_source_*`, human verification | **Keep both** — profile-level vs per-fee |

### B. Stored in DB but not displayed (institution table)

| Column | Recommendation |
|--------|----------------|
| `city`, `state_province`, `address` | **Add To Existing Section** — Location subsection on Overview |
| `country_id` | **Reuse** — wire when country dropdown added |
| `slug` | System-managed; read-only in admin/debug if needed |
| `is_active` | **Merge with** `institution_status` in M3 — do not add separate toggle |
| `is_partner`, `partner_since` | Keep derived from routes; optional read-only badge |
| `ranking_info`, `accreditation`, `established_year`, `total_programs` | Defer or optional “Extended profile” — not in M1 activation set |

### C. Displayed but duplicated across tabs

| Duplication | Tabs | Resolution |
|-------------|------|------------|
| Application portal URL | Overview routes vs M1 institution field | Institution = **default**; route = override; show inheritance in route UI |
| Website URL | Overview profile vs Sources (`website_url` source type) | Profile = canonical; Sources = crawl inputs |
| Phone / email | Overview profile vs Contacts tab | Profile = switchboard; Contacts = named people — **keep separate** |
| Lifecycle / visibility | `catalog_status` vs future `institution_status` | **Do not merge** — catalog (CF publish) vs governance (M3) |
| `notes` vs `promotion_notes` vs `institution_description` | Overview | Three distinct purposes — **do not merge** |

### D. Fields that should be merged rather than recreated

1. **`notes` ≠ `institution_description`** — Keep both; rename UI labels (“Internal notes” vs “Public description”).
2. **`application_portal_url`** — Add institution field; pre-fill new routes from institution default (already partially done via aggregator default).
3. **`country_name` + `country_id`** — Single country control; stop free-text duplicate paths (Contacts already uses ISO via `country_code`).
4. **`is_active` + `institution_status`** — M3 should sync; do not add a second Active toggle on Overview.

---

## 4. Recommendations by M1 Field

| M1 field | Classification | Target UI placement |
|----------|----------------|---------------------|
| `institution_status` | **Requires New Section** | Overview header badge + status control (M3); replace list `is_active` filter |
| `completeness_score` | **Requires New Section** | Overview profile header (read-only %) |
| `dli_number` | **Add To Existing Section** | Overview → “Compliance (Canada)” conditional block |
| `pgwp_eligible` | **Add To Existing Section** | Compliance block — boolean/tristate |
| `pal_required` | **Add To Existing Section** | Compliance block |
| `international_student_url` | **Add To Existing Section** | Overview → “URLs & portals” |
| `application_portal_url` | **Reuse Existing UI** | URLs section + show as default in Partnership Routes |
| `deposit_policy_url` | **Add To Existing Section** | URLs section |
| `website_url` | **Already Exists** | Keep in profile card |
| `institution_type` | **Already Exists** | Keep dropdown |
| `main_intakes` | **Add To Existing Section** | Overview → “Recruitment profile” multi-select |
| `processing_time` | **Add To Existing Section** | Recruitment profile (institution SLA text) |
| `application_method` | **Add To Existing Section** | Recruitment profile dropdown |
| `institution_description` | **Add To Existing Section** | Recruitment profile textarea (not Notes) |
| `last_loa_verified_at` | **Add To Existing Section** | Overview → “Verification” date picker |
| `profile_source_url` | **Add To Existing Section** | Verification block |
| `profile_source_type` | **Add To Existing Section** | Verification block |
| `profile_source_reference` | **Add To Existing Section** | Verification block |
| `profile_source_notes` | **Add To Existing Section** | Verification block |
| `last_human_verified_at` | **Add To Existing Section** | Verification block |
| `last_human_verified_by` | **Add To Existing Section** | Verification block (staff picker / read-only) |
| `human_verification_method` | **Add To Existing Section** | Verification block |

**No new tabs required for M1.** Extend Overview “Institution profile” card into collapsible sections.

---

## 5. Add Institution Modal Review

**Current fields** (`InstitutionsListPage`):

| Field | Required | DB column | Control |
|-------|----------|-----------|---------|
| Name | Yes | `name` | Free text |
| Country | Yes (dedup) | `country_name` | Free text |
| Website URL | No | `website_url` | Free text |

**Not collected at create:** `institution_type`, `institution_status`, logo, all M1 fields.

### Recommendation: Institution Type at creation

| Option | Pros | Cons |
|--------|------|------|
| **A. Defer type to profile (recommended)** | Minimal create friction; matches current flow; type required at M3 activation not at insert | Draft rows may lack type until edited |
| **B. Add type to create modal** | Earlier completeness; better list cards | Extra step; duplicates Overview dropdown |

**Recommendation:** **Option A — defer to Institution Profile (Overview).**  
Add **optional** Institution Type to create modal only if list filtering by type becomes a daily workflow.

**Also recommend (non-blocking, no new fields yet):**
- Replace create-modal Country free text with **CRM `CountrySelect`** (same as leads) when profile country is upgraded.
- Set `institution_status = 'Draft'` explicitly on insert (already DB default post-M1).

---

## 6. Recommended UI Layout (reuse-first)

Extend **Overview → Institution profile** card only — **no new top-level tabs**.

```
Overview
├── KPI dashboard (unchanged)
├── Institution profile
│   ├── Header: [Logo] Name · Completeness % · Status badge (M3)
│   ├── Core (existing): Name, Country*, Type, Website, Email, Phone
│   ├── Location (new subsection): City, Province, Address — reuse DB columns
│   ├── URLs & portals (new): Intl student URL, Application portal, Deposit policy
│   ├── Compliance — Canada only (new): DLI, PGWP, PAL
│   ├── Recruitment (new): Intakes, Processing time, Application method, Description
│   ├── Verification (new): LOA date, Human verified, Profile source fields
│   └── Internal notes (existing Notes field — relabel)
├── Catalog & partnerships (unchanged — route portal URL shows institution default)
└── Metadata (unchanged, read-only)

Contacts tab — unchanged
Fee Schedule tab — unchanged (fee verification stays per-fee)
```

\* Upgrade Country to CRM master dropdown + `country_id` when implementing profile fields.

---

## 7. Duplicate Prevention Report

| Risk | Severity | Prevention |
|------|----------|------------|
| Second application portal field | High | Institution default in Overview; routes inherit + override label |
| `notes` used for public description | Medium | Relabel Notes; add `institution_description` separately |
| `is_active` vs `institution_status` | High | M3 single control; hide legacy `is_active` toggle |
| `catalog_status` vs `institution_status` | Medium | Document: catalog = CF visibility; status = governance |
| Profile vs fee verification fields | Low | Profile = institution attestation; fees = row-level evidence |
| Country free text vs ISO | Medium | Align Overview with Contacts (`country_code` / master) |
| Create modal vs profile country | Low | Same CountrySelect component both places |

---

## 8. Implementation gate (explicit)

Per MD directive:

- **Do not** add M1 fields to UI until this audit is approved.
- **Do not** create migrations for UI work.
- **Next step after approval:** M3 governance UI + Overview profile section expansion (single PR, Overview only).

---

## Related

- M1 schema: `20261004120000_upi_institution_profile_phase1.sql`
- M2 contacts: `InstitutionContactsPanel`
- Plan: `INSTITUTION_MASTER_COMPLETION_PLAN.md`
