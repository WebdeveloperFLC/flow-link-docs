## Plan: Switch to Plan_Studies and run discovery

### Step 1 — Update secret
Update `ODOO_COURSES_DB` from `FLC` → `Plan_Studies`. (Login + API key stay the same since you confirmed one login covers Course Finder access.)

### Step 2 — Run discovery against Plan_Studies
Call `odoo-discover` with `action: "list_models"` using course-related keywords. Paste back the matching model technical names + labels.

### Step 3 — Describe top candidates
For the most likely models (anything containing `course`, `program`, `op.`, `x_course`, `x_program`), call `describe_model` and paste back: every field name + label + type, plus 3 sample rows.

### Step 4 — Field mapping
Once we see real fields, I'll propose the mapping for Course Finder (title, university, country, level, duration, tuition, intake, IELTS/PTE, scholarship, co-op, PR), you confirm, then I'll plan + build `odoo-courses-sync` and the "Sync now" button.

### Notes
- If auth fails on `Plan_Studies` with the current `ODOO_COURSES_LOGIN` / `ODOO_COURSES_API_KEY`, I'll come back and ask you to update those too.
- No code changes needed beyond what's already deployed — only the secret needs updating.