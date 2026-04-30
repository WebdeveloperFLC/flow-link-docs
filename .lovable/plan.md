# Plan: Configurable Letters + Section Document Builder

Three changes that work together:
1. **Letters** — make the 3 hardcoded kinds configurable via Masters so admins can add unlimited letter types.
2. **Sections** — every section (Identity, Academic, Experience, Financial, Forms, Supporting, plus a new "Additional documents") supports multiple individual files arranged in a sequence (auto or manual drag-drop) and combined into one section binder on demand.
3. **Multi-page combine** — same primitive lets a single document type (e.g. Passport pages 1 & 2) accept multiple files merged into one PDF.

---

## 1. Configurable letter kinds

Today `src/lib/letterKinds.ts` hardcodes three kinds (`cover`, `rcic`, `statdec`). The Letter Templates page and Letter generation read from this constant, so adding new types requires code changes.

Move letter kinds into the existing **Masters** system as a new list `letter_kinds` (label + description in `metadata`). Admins manage them from `/masters` like every other dropdown.

- Add `letter_kinds` master list with the 3 existing kinds seeded (cover / rcic / statdec) so nothing breaks.
- Replace the hardcoded `LETTER_KINDS` constant with a hook `useLetterKinds()` that reads from `master_items`.
- Update `LetterTemplates.tsx` to iterate from masters (so uploading a 4th type "Invitation Letter" instantly gives it its own card with global default + scoped variants).
- Update `LetterCard.tsx` and `generate-letter` edge function to accept the dynamic kind code instead of the union type.
- The kind's `code` (e.g. `invitation`) becomes the storage path prefix and the value stored in `letter_templates.kind`.

---

## 2. Section-based document builder

The DB schema already supports this (`client_documents.section_id`, `section_order`; `client_section_settings.order_mode`; `binders.section_id`, `scope`, `included_items`, `order_mode`). What's missing is the UI and the per-section binder generator.

### Sections

`case_sections` already exists with default sections. We'll seed/ensure these defaults:
- Identity & Personal
- Academic
- Experience / Employment
- Financial
- Visa Forms & Statements
- Supporting documents
- **Additional documents** (new — free-form bucket where the user uploads anything and combines)

### New UI: Section Builder card per section

On the client detail page, replace the single flat "All uploaded documents" list with a stack of **Section cards**. Each card shows:

```text
┌─ Academic ────────────────────────────────  [Auto ▾] [+ Upload] [Combine ▶] ┐
│ ⋮⋮ 01  transcript_bachelors.pdf       [👁] [⬇] [✕]                          │
│ ⋮⋮ 02  ielts_trf.pdf                  [👁] [⬇] [✕]                          │
│ ⋮⋮ 03  offer_letter.pdf               [👁] [⬇] [✕]                          │
│                                                                              │
│ Section binder: Academic_Manav.pdf · 3 docs · [Download] [Re-generate]      │
└──────────────────────────────────────────────────────────────────────────────┘
```

Behavior:
- **Upload**: drops files into this section (writes `client_documents.section_id`).
- **Auto / Manual** toggle: persists to `client_section_settings.order_mode`. Auto = sort by document_type/upload time; Manual = drag rows to reorder, persisting `section_order`.
- **Drag handle** (⋮⋮): only active in Manual mode; uses `@dnd-kit/sortable` (already pulled in indirectly via shadcn or to be added).
- **Combine**: calls a new helper `generateSectionBinder()` that merges every doc in this section in current order into one PDF, uploads to storage, and inserts a `binders` row with `scope='section'`, the `section_id`, and `order_mode` snapshot.
- **Re-generate**: same action; replaces the previous section binder.

### Final binder selector

Above the section list, add a **"Build final binder"** panel with:
- Checkboxes for each section ("include section binder" or "include individual docs")
- Option to **Select all** or **Select few** sections
- Generates one combined binder OR multiple binders (one per selected group), reusing existing `generateBinder()` with the chosen items. Stores with `scope='final'`.

### Multi-file per checklist item (passport pages, etc.)

Same primitive: when the user uploads two files for "Passport" (pages 1 and 2), they appear as two rows under that document type. A small **"Combine into one"** button on rows sharing the same `document_type` merges them in order into a single PDF and replaces the rows with the combined version (keeps originals as previous versions).

---

## 3. Technical details

### Database (migration)

```sql
-- Seed the new letter_kinds master list
insert into public.master_lists (key, label, description)
values ('letter_kinds', 'Letter kinds',
        'Types of letters generated for clients (cover, RCIC, declarations, etc.)')
on conflict (key) do nothing;

insert into public.master_items (list_key, code, label, sort_order, metadata) values
  ('letter_kinds', 'cover',   'Applicant Cover Letter', 10,
     '{"description":"Letter of explanation written in the client''s voice."}'::jsonb),
  ('letter_kinds', 'rcic',    'RCIC Submission Letter', 20,
     '{"description":"Submission letter signed by the RCIC on the firm''s letterhead."}'::jsonb),
  ('letter_kinds', 'statdec', 'Statutory Declaration',  30,
     '{"description":"Sworn declaration by sponsor / family member."}'::jsonb)
on conflict do nothing;

-- Seed default case_sections if missing (idempotent)
insert into public.case_sections (key, label, sort_order, is_default) values
  ('identity',   'Identity & Personal',     10, true),
  ('academic',   'Academic',                20, true),
  ('experience', 'Experience / Employment', 30, true),
  ('financial',  'Financial',               40, true),
  ('forms',      'Visa Forms & Statements', 50, true),
  ('supporting', 'Supporting Documents',    60, true),
  ('additional', 'Additional Documents',    70, true)
on conflict (key) do nothing;
```

No schema changes needed — `client_documents.section_id`, `section_order`, `client_section_settings`, and `binders.section_id/scope` already exist.

### New / updated files

- `src/lib/letterKinds.ts` — replace static list with `useLetterKinds()` hook reading `master_items` (keep type alias `LetterKind = string`).
- `src/pages/LetterTemplates.tsx` — iterate `useLetterKinds()` instead of `LETTER_KINDS`.
- `src/components/letters/LetterCard.tsx` & `supabase/functions/generate-letter/index.ts` — accept any string kind.
- `src/lib/sections.ts` (new) — helpers: `loadSections()`, `assignDocToSection()`, `reorderSection()`, `getSectionOrderMode()`, `setSectionOrderMode()`.
- `src/lib/binder.ts` — add `generateSectionBinder({ section, documents, orderMode })` that produces a per-section PDF (cover + TOC + merged pages).
- `src/components/clients/SectionBuilderCard.tsx` (new) — one card per section: list, drag-drop reorder, upload, auto/manual toggle, combine button.
- `src/components/clients/FinalBinderPanel.tsx` (new) — checkbox list of sections, "Select all / few", generate one or many final binders.
- `src/components/clients/CombinePagesButton.tsx` (new) — small inline action that merges multiple rows of the same document type into one PDF (used for passport pages etc.).
- `src/pages/ClientDetail.tsx` — replace the single "All uploaded documents" card with a stack of `SectionBuilderCard` (one per `case_sections` row), keep `LetterCard` and `ClientFormsCard` where they are, and put `FinalBinderPanel` at the top of the right column.
- Add `@dnd-kit/core` + `@dnd-kit/sortable` for drag-drop.

### Section auto-assignment

When a doc is uploaded via `SmartUploadZone`, infer its section from the existing `BINDER_GROUPS` map in `src/lib/binderGroups.ts` (Passport→identity, Transcripts→academic, etc.) and write `section_id`. User can move a doc to a different section from the row's "⋯" menu.

### Combine logic (single shared helper)

```ts
async function combinePdfs(paths: string[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const p of paths) {
    const { data } = await supabase.storage.from("client-documents").download(p);
    const src = await PDFDocument.load(await data.arrayBuffer(), { ignoreEncryption: true });
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((pg) => out.addPage(pg));
  }
  return out.save();
}
```

Used by both **section combine** and **multi-page combine**. Non-PDFs are converted via the existing `processFile.ts` pipeline before merging.

---

## What the user gets

- Letter Templates page now lists every kind defined in Masters; admins add a new kind in 30 seconds without code.
- Each client page shows one card per section; upload many files, drag to reorder (or leave on Auto), click **Combine** to get a single section PDF.
- An **Additional documents** section captures anything that doesn't fit the standard sections.
- Multi-page documents (passport, marriage certificate scans) can be uploaded as separate files and merged with one click.
- A top-level **Build final binder** panel lets you tick sections and produce either one combined final binder or multiple per-section binders.
