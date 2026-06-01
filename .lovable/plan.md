
## Goal

Canonical Service Library: one master per **(Service Category, Service, Sub-service)** with country mappings, full country-scoped overrides, versioned checklist files, Quick Guide, Cost Summary with multi-format copy, Internal SOP, and a configurable Mandatory Submission Checklist.

## Data model

```
service_library                                  ← master, one per (category, service, sub_service)
  id, service_category, service, sub_service,
  quick_guide_what_to_do,                        -- NEW
  quick_guide_common_mistakes,                   -- NEW
  quick_guide_escalation_rules,                  -- NEW
  quick_guide_important_reminders,               -- NEW
  checklist_text,
  cost_summary_html,
  internal_sop_html,
  process_flow (jsonb),
  display_order, is_active
  UNIQUE (service_category, service, sub_service)   -- per request

service_library_countries                        ← M2M applicability, allow-list enforced by trigger
  id, library_id, country
  UNIQUE (library_id, country)

service_library_overrides                        ← per-country override of any/all text sections
  id, library_id, country,
  quick_guide_what_to_do NULL,
  quick_guide_common_mistakes NULL,
  quick_guide_escalation_rules NULL,
  quick_guide_important_reminders NULL,
  checklist_text NULL,
  process_flow NULL,
  cost_summary_html NULL,
  internal_sop_html NULL
  UNIQUE (library_id, country)

service_library_fee_items                        ← existing + country column NULL=all
service_library_attachments                      ← existing + country column NULL=all
service_library_checklist_files                  ← NEW, versioned uploads, country NULL=all
  id, library_id, country NULL,
  file_name, file_path, mime_type, size_bytes,
  version int, is_current bool,
  uploaded_by uuid, uploaded_at timestamptz, notes

service_library_sop_tasks                        ← NEW, ordered SOP items (admin-edited)
  id, library_id, country NULL, task_text, sort_order, is_active

service_library_sop_completions                  ← NEW, counselor "mark done"
  id, task_id, user_id, completed_at, lead_id NULL, client_id NULL
  UNIQUE (task_id, user_id, lead_id, client_id)

service_library_submission_checklist             ← NEW, per-master configurable items
  id, library_id, country NULL,
  item_key text,                                 -- e.g. 'documents_verified'
  item_label text,                               -- display label
  is_mandatory bool default true,
  sort_order int, is_active bool
  -- Seeded on master creation with 6 defaults:
  --   documents_verified, checklist_completed, fees_collected,
  --   client_approval_received, quality_review_completed, submission_approved

service_library_submission_completions           ← NEW, per-lead/client completion
  id, item_id, user_id, completed_at,
  lead_id NULL, client_id NULL
  UNIQUE (item_id, lead_id, client_id)

service_library_migration_log                    ← one-row summary banner
```

All new tables: RLS + GRANTs. Write gated by `can_manage_service_library`; counselors get read + insert on `*_completions` for their own rows. Country allow-list enforced by trigger on `service_library_countries` (~40 countries from `REGIONS`).

Storage: existing `service-library-files` bucket. Checklist files at `checklist/{library_id}/{version}-{name}`.

## Migration (single file)

1. Create new tables + columns + indexes + RLS + GRANTs + allow-list trigger + log table.
2. Add `country` nullable column to `service_library_fee_items` and `service_library_attachments`.
3. **Dedupe pass** keyed by `(service_category, service, sub_service)`:
   - Canonical = longest `checklist_text` (tiebreaker earliest `created_at`).
   - Insert distinct countries into `service_library_countries`.
   - Re-point fee_items + attachments to canonical.
   - For non-canonical rows whose text differs → write to `service_library_overrides` for that country (fields: checklist_text, process_flow if different).
   - Delete non-canonical masters.
4. Drop `country` column on `service_library`; add `UNIQUE (service_category, service, sub_service)`.
5. Seed `service_library_submission_checklist` with the 6 default items for every existing master.
6. Write counts to `service_library_migration_log`.

## Admin page `/service-library-admin`

Left: tree by Category → Service → Sub-service. Right: tabbed master detail.

Tabs (in this order):
- **Overview** — read-only key + display order + active toggle + dismissible migration banner from log.
- **Quick Guide** — 4 short fields: What to do, Common mistakes, Escalation rules, Important reminders.
- **Countries** — allow-list chip selector → `service_library_countries`.
- **Checklist** — text + file uploads (multi-file, versioned, per-country scope).
- **Submission Checklist** — list of items (default 6 seeded). Admin can edit labels, toggle mandatory, add/remove items, set per-country scope.
- **Fees** — table, per-row country scope.
- **Cost Summary** — rich text + 3 copy buttons (see counselor view).
- **Client Process Flow** — ordered steps.
- **Internal SOP** — rich text + ordered SOP task list.
- **Country Overrides** — accordion per assigned country with override fields for **all** of: Quick Guide (4 fields), Checklist text, Process Flow, Cost Summary, Internal SOP. Fee items, checklist files, SOP tasks, and submission-checklist items use their per-row `country` column for country-specific variants.

## Counselor view `/service-library`

Filters: Country, Category, Service, Sub-service, search.

Detail panel (when master + country selected), top-down:
1. **Counselor Quick Guide** box (prominent, distinct styling) — resolved from override else master, showing the 4 fields.
2. **Mandatory Submission Checklist** — items where `country IS NULL OR country = selected`. Checkbox writes to `service_library_submission_completions` for current user. Mandatory items rendered with a required marker; shows progress count.
3. **Checklist** text + checklist files sidebar (current versions, version history collapsed).
4. **Fees** — country-scoped table + Copy-as-table (TSV).
5. **Complete Cost Summary** with three buttons:
   - **Copy Cost Summary** — rendered plain text.
   - **Copy WhatsApp Version** — formatted with `*bold*`, line breaks, emoji-free.
   - **Copy Email Version** — HTML mirroring the rich text.
   All three derive from the same `cost_summary_html` source via a single formatter in `src/lib/serviceLibrary.ts`.
6. **Client Process Flow** — visual steps.
7. **Internal SOP** — rich text + SOP task checklist (writes to `service_library_sop_completions`).

Resolver: `getServiceLibraryForCombo({ category, service, subService, country })` returns master merged with country override + country-scoped fees/files/tasks/checklist items. Used by counselor view and (future) Lead/Client Detail.

## Roles
- Admin / Documentation: full CRUD on masters and all child tables.
- Counselors: read everything; write only `service_library_sop_completions` and `service_library_submission_completions` rows for themselves.

## Files changed / created
- **New migration** (single file): schema, dedupe, seed, RLS, grants, trigger, log.
- **`src/pages/ServiceLibraryAdmin.tsx`** — full rewrite to the tabbed layout above.
- **`src/pages/ServiceLibrary.tsx`** — rewrite to country-filtered list + resolved detail with Quick Guide, Submission Checklist, Cost Summary copy buttons, SOP, etc.
- **`src/lib/serviceLibrary.ts`** (new) — resolver + Cost Summary formatters (plain / WhatsApp / email HTML).
- **`src/integrations/supabase/types.ts`** — regenerated.
- Reuse existing rich-text editor component if present; otherwise a minimal contenteditable wrapper (no new dependency).

## Out of scope
- Lead Detail / Client Detail UI integration (data layer ready via resolver, UI deferred).
- Share-via-email / WhatsApp send flow (deferred).
- No changes to lead-form UI or master countries list used elsewhere.
