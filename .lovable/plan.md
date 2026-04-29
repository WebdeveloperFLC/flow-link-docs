
# Multi-applicant cases (then Odoo)

Two changes, in order:

1. **Multi-applicant roster + per-person uploads** (this plan)
2. **Odoo two-way configurable sync** (already approved — built right after)

---

## 1. Multi-applicant roster + per-person uploads

### Concept

Today a "case" = one client = one person. In reality a case often involves multiple people:

- Visitor visa (family): husband (applicant) + wife (co-applicant) + kids (dependants)
- Study permit + spouse: student (applicant) + spouse (co-applicant on OWP/visitor) + kids
- PR: principal applicant + spouse co-applicant + dependant children

We keep **one case** (`clients` row, one `application_id`) and add a **roster of people** under it. Documents, profile fields, and letters become person-aware. The main applicant is always the `clients` row itself — co-applicants and dependants are extra people attached to that case.

### Roster rules

- Every case has exactly **1 Applicant** (the existing `clients` row, role auto-assigned).
- 0+ **Co-applicants** (spouse, partner, sibling, parent — any adult filing alongside).
- 0+ **Dependants** (typically children).
- Each person has: full_name, role, relationship, date_of_birth, passport_number, gender.
- Roster is editable any time. Removing a person archives (not deletes) their docs.

### Upload behaviour (the core change)

```text
User drops 8 mixed files for a multi-person case
        ↓
Classifier detects doc type + owner name on each
        ↓
matchPersonName runs against the FULL ROSTER, not just main applicant
        ↓
For each file:
  ├─ High confidence single match  →  chip: "Detected: Wife — Anjali Sharma ✓" (one-click change)
  ├─ Ambiguous / low score          →  inline "Who is this for?" picker (Applicant / each Co-app / each Dependant / Shared)
  └─ No name detected               →  same picker, no default — user must confirm
        ↓
On multi-person cases we ALWAYS show the person chip (even on confident matches)
so the user reconfirms before save. Single-person cases: unchanged behaviour.
        ↓
File renamed per person, stored under person folder, profile fields routed to that person
```

**"Shared" owner** is a special pick for documents that legitimately belong to multiple people (joint bank statement, marriage certificate, family photo, IMM 5645 Family Information). Stored once, listed under each linked person.

### File naming

Pattern changes from `{Type}_{Client}_v{n}.pdf` to:

```
{Type}_{Role}_{PersonName}_v{n}.pdf
```

Examples:
- `Passport_Applicant_RahulSharma_v1.pdf`
- `Passport_CoApplicant_AnjaliSharma_v1.pdf`
- `BirthCertificate_Dependant_AaravSharma_v1.pdf`
- `MarriageCertificate_Shared_v1.pdf`

Storage path: `{case_id}/{person_id}/{doctype}/{timestamp}_{filename}` (was `{case_id}/{doctype}/...`). Existing files stay where they are; new uploads use the new path.

### Per-person profile

Profile fields (passport #, DOB, IELTS, etc.) currently live on `client_profile` keyed by `client_id`. They become keyed by `person_id` so the wife's IELTS doesn't overwrite the husband's. A backfill copies every existing `client_profile` row to the new applicant person.

### Visa forms (per-person vs shared)

Workflow templates already define `items`. We add a `scope` flag per item:
- `per_person` (default for things like Passport, Photo, Police Clearance, IMM 5257)
- `shared` (Family Info form, marriage cert, joint statement)
- `applicant_only` (e.g. SOP, LOA for the principal)

Checklist on `ClientDetail` then renders the right rows per person, and "missing" only counts per-person items the people in the roster actually need.

### Letters & binders

Letter generation context gets the full roster. RCIC/cover letters can address all parties. Binders get a roster cover page. Per-person sections in the binder.

### UX additions on `ClientDetail`

- New **"People on this case"** card (top of the page, beside the existing client header).
  - Shows applicant + co-applicants + dependants with role chips, DOB, passport #.
  - "Add person" button (modal: name, role, relationship, DOB, passport #).
  - Inline edit / promote (e.g. dependant turning 22 → co-applicant).
- Document list groups by person with collapsible sections + "Shared" group at the top.
- Smart upload zone gets a roster-aware picker (replaces today's single-person mismatch warning).
- Top of upload zone shows a small reminder when 2+ people on case: *"Multi-person case — confirm who each document belongs to."*

### Edge cases handled

- Adding a co-applicant after some uploads → existing docs stay where they are; can be reassigned later via dropdown on the doc row.
- Same-name dependants (e.g. Jr.) → picker shows DOB to disambiguate.
- Single-person case → zero behaviour change. Roster is invisible until "Add person" is clicked.
- Legacy docs with no `person_id` → automatically attributed to the applicant on first read.

---

## Database changes (one migration)

```sql
-- people on a case
create type person_role as enum ('applicant', 'co_applicant', 'dependant');

create table case_people (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  role person_role not null,
  full_name text not null,
  relationship text,           -- "spouse", "son", "daughter", "father", etc.
  date_of_birth date,
  passport_number text,
  gender text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index one_applicant_per_case
  on case_people (client_id) where role = 'applicant' and not is_archived;
create index case_people_client_idx on case_people (client_id);

-- documents now know the person
alter table client_documents
  add column person_id uuid references case_people(id),
  add column is_shared boolean not null default false;
create index client_documents_person_idx on client_documents (person_id);

-- profile becomes per-person (rename + repoint)
alter table client_profile add column person_id uuid references case_people(id);
create unique index client_profile_person_uniq on client_profile (person_id) where person_id is not null;

-- workflow item scope
-- (no schema change — items is jsonb; we add `scope` field in JSON, default 'per_person')
```

**Backfill** (data migration, runs after schema):
```sql
-- 1. create an applicant person for every existing client
insert into case_people (client_id, role, full_name)
  select id, 'applicant', full_name from clients;

-- 2. point existing documents at it
update client_documents d
   set person_id = p.id
  from case_people p
 where p.client_id = d.client_id and p.role = 'applicant' and d.person_id is null;

-- 3. point existing profile rows at it
update client_profile cp
   set person_id = p.id
  from case_people p
 where p.client_id = cp.client_id and p.role = 'applicant' and cp.person_id is null;
```

**RLS**: `case_people` follows the same pattern as `clients` (read = authenticated; insert/update = admin + counselor; delete = admin).

---

## Code changes

**New files**
- `src/components/clients/CasePeopleCard.tsx` — roster UI on ClientDetail
- `src/components/clients/AddPersonDialog.tsx` — add/edit person modal
- `src/lib/casePeople.ts` — fetch/upsert helpers + role labels
- `src/lib/matchPersonRoster.ts` — extends `matchPersonName` to take an array, returns best match + score + alternatives

**Modified**
- `src/lib/constants.ts` — `buildDocumentName` accepts optional `person` + `role`
- `src/lib/classifyDocument.ts` — `matchPersonName` kept for back-compat; new `matchPersonRoster` exported
- `src/lib/extractedFields.ts` — `mergeExtractedFields` keyed by `person_id` (back-compat: falls back to applicant if not provided)
- `src/components/documents/SmartUploadZone.tsx` — accepts `people` prop, replaces single-person mismatch UI with roster picker, always shows confirmation chip on multi-person cases
- `src/pages/ClientDetail.tsx` — loads roster, mounts `CasePeopleCard`, groups docs by person, passes `people` to `SmartUploadZone`
- `src/components/clients/ClientProfileCard.tsx` — accepts `personId`, shows per-person fields with a person tab strip when multiple people
- `src/lib/binder.ts` — roster cover page + per-person sections
- `supabase/functions/generate-letter/index.ts` — roster in prompt context
- `src/pages/Templates.tsx` + workflow item type — add optional `scope` field on items

**Out of scope for this plan (do later)**
- Cross-case people (same person appearing on two cases) — for now each case has its own roster
- Importing roster from Odoo (covered by the Odoo plan below)

---

## 2. Odoo two-way configurable sync (queued)

Already approved — exact plan as before:

- `odoo_settings.mode` = `off` / `pull` / `push` / `two_way`
- 15-min cron + on-open auto-pull + on-save auto-push, all gated by `mode`
- Field discovery + mapping UI, secrets reused
- Roster sync: when pulling a `crm.lead`, related contacts (`partner_id`, `partner_name`, family-line custom fields) become co-applicants/dependants in our `case_people` table

I'll start on multi-applicant immediately after approval, ship it, then move to Odoo.
