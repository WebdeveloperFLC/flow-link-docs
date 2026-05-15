## Plan: Run discovery against FLC for Course Finder models

The Course Finder URL you shared is the same Odoo host (`crm.futurelinkconsultants.com`), so Course Finder is a module installed in the **FLC** database, not a separate DB.

### Step 1 — Repoint secret
Set `ODOO_COURSES_DB` back to `FLC`. Login + API key already updated.

### Step 2 — List course/program models
Call `odoo-discover` with course-related keywords (course, program, university, school, faculty, intake, basic.filter, etc.). Paste the matching model technical names.

The URL you shared references `model=basic.filter.wizard` — that's a search wizard, so the underlying course model is likely `op.course`, `op.program`, or a custom `x_*` model. Discovery will reveal it.

### Step 3 — Describe top candidates
For the most likely model(s), call `describe_model` and paste back: every field name + label + type, plus 3 sample rows.

### Step 4 — Field mapping
Propose mapping → you confirm → I plan + build `odoo-courses-sync` and the "Sync now" button in a follow-up.