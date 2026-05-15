## Plan: Course Finder — match the Odoo "basic.filter.wizard" experience

The screen recording shows the exact filter form your team uses inside Odoo (`basic.filter.wizard`, menu_id=783). I'll rebuild this same filter inside Fovel's Course Finder, then in a second step plug it into the real Odoo course catalogue.

### Step 1 — Rebuild the filter UI (this iteration)

Replace the current `/course-finder` page with a 2-column filter form mirroring the Odoo wizard, grouped exactly as on Odoo:

**Top filters**
- Country (multi) · State / Province (multi) · City
- Study Area · Discipline Area · Program Level
- Course Intake · Year · Semester · Month

**English Proficiency**
- English Proficiency (dropdown: IELTS / PTE / TOEFL / Duolingo …) · Score Criteria

**Language Eligibility**
- Language Eligibility (dropdown) · Score Criteria

**Aptitude Eligibility**
- Aptitude Eligibility (dropdown: GRE / GMAT / SAT …) · Score Criteria

**Advanced Filter** (toggle reveals)
- Institute · Institute Campus · Program Availability · Program Delivery Mode
- Currency · Grading Scale · Grade Score (min → max) · Tuition Fees Amount (min → max)
- Toggles: GMAT Waiver · GRE Waiver · SAT Waiver · Without Maths · Stem Course
- Conditional Acceptance · Education Gap · Number Of Backlogs · Scholarship Available
- Country of Citizenship · Country of Residence
- Toggles: Application Fees Waiver · German Language Test Waiver · English Proficiency Test Waiver · French Language Test Waiver

**Save Filter** (toggle) → name + visibility, stored in a new `course_finder_saved_filters` table.

**Apply Filter** button → for now runs against an empty result list with a "Connect Odoo course catalogue" empty-state CTA.

Visual style follows the existing Fovel design tokens (no green Odoo chrome) — left rail of section labels, two-column field grid, semantic tokens only.

### Step 2 — Wire to real courses (next iteration, after you confirm the model)

The wizard model `basic.filter.wizard` is a transient search form; the underlying course records live in another model. To finish the wiring I need **one** of these from your Odoo:

1. Open any course record in Odoo with `?debug=1` in the URL → developer tools → "View Fields" → copy the model technical name (e.g. `op.course`, `x_course_master`, `product.template`), **or**
2. From the wizard result list, click any row → the URL will contain `model=...` — paste that here.

Once I have the model name I'll:
- Add `odoo-courses-sync` edge function (XML-RPC `search_read`) → stores courses in a new `courses` table
- Add `odoo-courses-filter` that translates the form above into an Odoo domain and returns matching courses live
- Add a "Sync now" + last-sync indicator on the page (same pattern as the CRM sync card)

### Technical notes
- New table `course_finder_saved_filters` (user_id, name, payload jsonb, is_shared, created_at) with RLS — owner can CRUD, shared filters readable by org.
- Filter state lives in a single Zustand-free `useState` object so we can serialize it 1:1 to the saved-filter payload.
- Multi-selects use the existing `Combobox` pattern from `OccupationSearch`.
- No backend calls in step 1 except saving filters — keeps this iteration shippable independently.

### Open question before I implement
Do you want me to:
- **(A)** Build the full filter UI now with placeholder dropdowns (countries already in `src/lib/countries.ts`, others as static lists for now) and ship it, then wire Odoo in step 2, **or**
- **(B)** Wait until you paste the course model name so I can do UI + live data in one go?

(A) is faster to see progress; (B) avoids throwaway dropdown stubs.
