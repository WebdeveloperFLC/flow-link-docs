## Goal
Replace the mock data in **Course Finder** with real data pulled from your **Odoo CRM**, using the Odoo credentials already stored in Lovable Cloud.

## Good news: API key already configured
Your project already has these Odoo secrets stored securely (used today by the CRM client sync):

- `ODOO_URL`
- `ODOO_DB`
- `ODOO_LOGIN`
- `ODOO_API_KEY`

You do **not** need to paste the key anywhere. The new sync will reuse them automatically. If you ever want to rotate it, you can update `ODOO_API_KEY` from Cloud → Secrets — never put it in the code.

## What I need from you (one clarifying answer)
Course data in Odoo isn't standard — it lives in a custom model. Before I build the sync I need to know **where the courses live in your Odoo instance**. Pick one:

1. A custom Odoo model (e.g. `x_course`, `op.course` from Odoo OpenEduCat, or similar) — please share the **model technical name** and the field names for: course name, university/institution, country, study level, field, duration, tuition, intake, IELTS/PTE, scholarship/coop/PR flags.
2. Stored as **products** (`product.template`) tagged with a category like "Course".
3. Something else — describe briefly.

If you're not sure, I can add a one-time **discovery endpoint** that lists your Odoo models and fields so we can pick the right one together.

## Plan once the model is known

### 1. New edge function `odoo-courses-sync`
- Authenticates against Odoo via XML-RPC using existing secrets (same pattern as `odoo-sync`).
- Reads courses + related university/country from the chosen Odoo model.
- Upserts into the existing Supabase tables already used by Course Finder:
  - `countries`
  - `universities`
  - `courses`
- Maps Odoo fields → Lovable schema (study_level, intake_months, tuition_fee, currency, ielts_overall, flags, etc.).
- Returns `{ pulled, upserted, errors }`.

### 2. Settings UI: "Course Finder · Odoo sync" card
Added under Settings (next to existing Odoo card), admin-only:
- "Test connection" (reuses Odoo test).
- "Sync now" → invokes `odoo-courses-sync`.
- Shows last sync time, count, status.
- Optional toggle: auto-sync every N minutes (reuses existing pg_cron pattern from `odoo-cron`).

### 3. Course Finder page
- No UI changes required — it already reads `countries` / `universities` / `courses` from Supabase. Once data is upserted, mock entries are replaced by live ones.
- Add a small "Synced from Odoo · {timestamp}" line in the header.

### 4. Safety
- Sync is **upsert by Odoo external id** (stored in a new `odoo_id` column on `courses` and `universities`) so re-runs don't duplicate.
- Existing manually-created rows are left untouched (we only touch rows with `odoo_id` set).
- Admin-only RLS on the sync trigger.

## Files that will be touched
- **New:** `supabase/functions/odoo-courses-sync/index.ts`
- **New migration:** add `odoo_id` columns + indexes on `courses`, `universities`, `countries`
- **New:** `src/components/settings/OdooCoursesSyncCard.tsx`
- **Edited:** `src/pages/Settings.tsx` (mount new card)
- **Edited:** `src/pages/CourseFinder.tsx` (small "last synced" label only)

No CRM functionality, auth, or unrelated modules are changed. No new npm packages. The Odoo API key stays in Lovable Cloud secrets — never in code.

---

**Please reply with which Odoo model holds your courses (option 1, 2, or 3 above), or say "discover" and I'll add the discovery endpoint first.**