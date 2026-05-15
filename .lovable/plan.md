## Plan: Wire Course Finder to the new Odoo instance

### Step 1 — Point discovery at the new Odoo
Update `supabase/functions/odoo-discover/index.ts` to read the new credentials first, falling back to the CRM ones only if the new ones are absent:

- `ODOO_COURSES_URL` → fallback `ODOO_URL`
- `ODOO_COURSES_DB` → fallback `ODOO_DB`
- `ODOO_COURSES_LOGIN` → fallback `ODOO_LOGIN`
- `ODOO_COURSES_API_KEY` → fallback `ODOO_API_KEY`

Deploy the function.

### Step 2 — Run discovery against the new instance
Call `odoo-discover` with `action: "list_models"` using keywords: `course, program, education, school, university, faculty, student, academic, subject, degree, intake, x_`.

Return to you:
- The full list of matching model technical names + labels
- For the top 2–3 candidates (e.g. `op.course`, `op.program`, `x_course`, anything with "course"/"program"), call `describe_model` and paste back: every field name + label + type, plus 3 sample rows.

### Step 3 — Confirm field mapping with you
Once we see real fields, I'll propose the mapping for Course Finder:
- title, university/institution, country, study level, duration, tuition, intake, IELTS/PTE, scholarship, co-op, PR/pathway flags
- You confirm or correct.

### Step 4 — Build the sync (separate plan after mapping is confirmed)
- New edge function `odoo-courses-sync` using the `ODOO_COURSES_*` secrets
- New "Sync now" button on the existing Odoo discovery card in Settings
- Upserts into the existing Course Finder tables, replacing mock entries

### Technical notes
- The CRM Odoo (`ODOO_URL` etc.) keeps working untouched — `odoo-sync` is not changed.
- Discovery still requires admin auth in the preview.
- After Step 1 deploy, I'll run discovery and paste the output here so you can verify before we build the sync.