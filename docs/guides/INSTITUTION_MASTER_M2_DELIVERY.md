# Institution Master M2 — Delivery Report

| Field | Value |
|-------|-------|
| **Status** | M2 complete — ready for Lovable publish |
| **Date** | 2026-06-23 |
| **Migration** | `20261004120100_upi_institution_contacts.sql` |
| **Next** | M3 governance (activation RPC + checklist UI) — **not started** |

---

## 1. Migration plan (M2 — shipped)

| Step | Object | Purpose |
|------|--------|---------|
| 1 | `upi_institution_contacts` table | Flexible contact records |
| 2 | RLS policies | Mirror `institution_fee_schedule` catalog permissions |
| 3 | `fn_compute_upi_institution_completeness_score` | +10 pts for contacts (capped 100) |
| 4 | `trg_upi_institution_contacts_refresh_parent_score` | Recompute institution score on contact CRUD |
| 5 | `v_upi_institution_profile_readiness` | Add `active_contact_count`, `active_contact_with_email_count` |

### Schema: `upi_institution_contacts`

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `contact_type` | text | Yes | Free-form; UI suggests common types |
| `contact_name` | text | No | |
| `designation` | text | No | Job title |
| `department` | text | No | |
| `email` | text | No | Completeness +5 if any active with email |
| `phone` | text | No | |
| `mobile` | text | No | |
### Contact fields (M2 + M2.1)

| Field | Storage | UI |
|-------|---------|-----|
| Contact type | Free text + suggestions | Dropdown + custom |
| Country | `country_code` → `cf_countries` | CRM countries master dropdown (ISO code) |
| Timezone | `timezone` text (optional) | Suggested IANA list |
| Preferred communication | Enum (optional) | Email, Phone, WhatsApp, Teams, Zoom, Portal |

**M2.1 migration:** `20261004120150_upi_institution_contacts_country_standardization.sql` — maps legacy free-text `country` to ISO code, drops text column.
| `notes` | text | No | |
| `is_primary` | boolean | No | Multiple primaries allowed — **no unique constraint** |
| `is_active` | boolean | Default true | Deactivate vs delete |
| `sort_order` | int | Default 0 | Display order within type |

**Explicitly NOT enforced:**
- One contact per role/type
- One primary per institution or per type

### Completeness score (contacts portion)

| Condition | Points |
|-----------|-------:|
| ≥1 active contact with email | +5 |
| ≥1 active primary contact | +5 |

Total profile+contacts weights can exceed 100 before `least(100, …)` cap.

### Unchanged (per requirements)

| Area | Status |
|------|--------|
| `fn_mark_final_and_create_application` | No change |
| `institution_fee_schedule` | No change |
| Course Finder / CF tables | No change |
| Canada M6 seeding | Not started |

---

## 2. UI impact report

### New / modified files

| File | Change |
|------|--------|
| `InstitutionContactsPanel.tsx` | **New** — table, add/edit dialog, deactivate/restore |
| `institutionContacts.ts` | **New** — fetch, upsert, deactivate, delete |
| `InstitutionDetailPage.tsx` | **Contacts** tab after Overview |
| `types/upi.ts` | `UpiInstitutionContact` type |

### Institution Detail — Contacts tab

- Sortable table grouped by load order (`contact_type`, `sort_order`, name)
- **Add contact** dialog with all 11 fields
- Contact type: suggested dropdown + custom free text
- **Primary** and **Active** toggles (no enforcement of single primary)
- **Deactivate** (soft) preferred; permanent delete only from inactive edit dialog
- **Show inactive** toggle
- Amber banner when no active contact with email (recommended, not blocking)

### Permissions

- View: `can_view_upi_catalog` or `can_view_upi_confidential`
- Edit: `can_manage_upi_catalog` (same as fee schedule panel)

### Not in M2 (deferred to M3)

- Activation checklist modal
- Status dropdown (Draft → Active)
- `fn_upi_institution_set_status` RPC
- Fee/contact warnings at activation time (DB-level)
- Completeness badge on Institutions list page

---

## 3. M3 preview (for approval — not implemented)

| Migration | Scope |
|-----------|-------|
| `20261004120200_upi_institution_governance_rpcs.sql` | `fn_validate_upi_institution_activation`, `fn_upi_institution_set_status`, `is_active` sync |
| UI | Activate button, error vs warning checklist, list status badges |

### Planned activation rules (from approved plan)

**Blockers:** name, type, country, official website, application portal, DLI+PGWP (Canada)

**Warnings only:** fees (APPLICATION/TUITION/DEPOSIT), contacts, LOA date

---

## 4. Verification SQL (after publish)

```sql
-- Table exists
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'upi_institution_contacts';

-- Readiness view columns
SELECT active_contact_count, active_contact_with_email_count
FROM v_upi_institution_profile_readiness
LIMIT 1;

-- Insert test (optional — via UI preferred)
-- Completeness should increase after adding active contact with email + primary
SELECT name, completeness_score FROM upi_institutions
WHERE country_name = 'Canada' ORDER BY name LIMIT 5;
```

---

## 5. Rollout

1. Lovable → Publish → approve `20261004120100_upi_institution_contacts.sql`
2. Hard refresh
3. Open any institution → **Contacts** tab → add test contact
4. Confirm `completeness_score` increases on institution row
5. Approve **Proceed M3** when ready

---

**Related:** [`INSTITUTION_MASTER_COMPLETION_PLAN.md`](./INSTITUTION_MASTER_COMPLETION_PLAN.md)
