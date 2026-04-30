# Fix: per-section multi-upload, reorder, and combine

## What's happening today

The `SectionBuilderCard` already supports multi-file upload, drag-to-reorder, manual/auto ordering, and a Combine button — for every section (Identity, Academic, Experience, Financial, Forms, Supporting, Additional). However the experience falls short of what you described in three ways:

1. **Cards are buried.** The big "All uploaded documents" card sits above the section cards, so on a long client page (Manav has many docs) the section cards aren't the first thing you see. You can miss them entirely.
2. **No per-file label.** When you drop 10 marksheets into Academic, every row shows the file name plus the generic subtitle "Academic". You can't see which row is "Grade 10", which is "B.Tech Year 2", etc., so reordering by sequence is painful.
3. **No drag-to-drop zone on the card.** Upload only works through the small "Upload" button. Dragging files directly onto the card body does nothing, which is why it feels like the feature isn't there.
4. **Experience / Forms / Additional sections look "missing"** in the Build-final-binder panel because that panel filters out sections with 0 docs. Users assume the section itself doesn't exist.

## What we'll change

### 1. Promote section cards, demote the flat list

- Move the stack of `SectionBuilderCard`s **above** the "All uploaded documents" card on `ClientDetail`.
- Collapse the flat "All uploaded documents" card into a closed-by-default accordion ("Show flat list of all files"). Keeps the data accessible without competing for attention.

### 2. Drop zone on every section card

- Wrap each `SectionBuilderCard` body in a drag-and-drop zone using the existing `react-dropzone` pattern. Drop one or many files anywhere on the card → they all upload to that section in one batch (current code already loops a `FileList`).
- Visual hover state: dashed border + "Drop files into Academic" label.
- The existing **Upload** button remains for click-to-pick.

### 3. Per-file label (Title)

- Add a **Title** column / inline-editable field for every row. Defaults to the cleaned file name (`B.Tech_Year_2_Marksheet.pdf` → `B.Tech Year 2 Marksheet`). Stored in `client_documents.custom_type` (we'll repurpose it as the human label inside a section).
- Click the title → edit-in-place → save on blur. So a row reads:
  ```text
  ⋮⋮ 03  Grade 12 Marksheet         class_xii.pdf · 412 KB   👁 ⬇ ✕
  ```
- For new uploads done through a section card, set `custom_type = cleaned filename` instead of `custom_type = section.label`. This is the only DB behavior change.

### 4. Show every section, even when empty

- In `FinalBinderPanel`, stop filtering sections with 0 docs. Empty sections render disabled with "0 docs — upload first" so users know the bucket exists. Checkbox stays disabled until docs are present.
- Ensure `case_sections` includes **Experience**, **Additional documents**, etc. (already seeded by the previous migration; we'll just verify on load and re-seed any missing keys).

### 5. Combine button — clearer state

- Rename the Combine button label dynamically:
  - 0 docs → disabled "Combine"
  - 1 doc → "Use as binder" (single-doc passthrough)
  - 2+ docs → "Combine N files into binder"
- On success, scroll the binder strip into view and toast "Academic binder ready · 10 files merged in this order".

### 6. Multi-page combine within one row group (passport pages)

This was approved last round but not yet exposed. Add a small **"Merge with…"** action in the row's overflow menu that lets you pick one or more sibling rows in the same section, merges them into one PDF (using the existing `combinePdfsFromStorage` helper), uploads as a new row, and archives the originals as previous versions. Useful for "passport page 1 + page 2".

## Technical details

Files to edit:

- `src/components/clients/SectionBuilderCard.tsx`
  - Wrap content in a `<div onDragOver onDrop>` (or `react-dropzone` if already in deps; otherwise plain handlers — no new dep needed).
  - In `onUpload`, set `custom_type` to the cleaned filename (strip extension, replace `_`/`-` with spaces, title-case).
  - Add inline-edit `Title` for each row → `update client_documents set custom_type=… where id=…`.
  - Add row overflow menu with "Merge with…" → opens a small picker of sibling rows in the same section, then calls `combinePdfsFromStorage` and writes the result.
  - Dynamic Combine button label.

- `src/components/clients/FinalBinderPanel.tsx`
  - Render all `sections` (not only `sectionsWithDocs`); disable checkbox + button when a section has no docs.

- `src/pages/ClientDetail.tsx`
  - Reorder right column: `SectionBuilderCard` stack first, then `FinalBinderPanel`, then collapsed "All uploaded documents" inside an `<Accordion>`.

- `src/lib/sections.ts`
  - Add `ensureDefaultSections()` that re-seeds any of the seven default keys missing on `case_sections` (idempotent; safety net only).

No new database migration required — the schema (`section_id`, `section_order`, `custom_type`, `client_section_settings`) already supports everything above.

## What the user gets

- Drop ten marksheets onto the Academic card, see ten rows named "Grade 10 Marksheet", "Grade 12 Marksheet", "B.Tech Year 1", etc. (auto-derived from filenames, editable inline).
- Drag rows to put them in submission order, click **Combine 10 files into binder**, get one `Academic_Binder.pdf`.
- Same flow available on Identity, Experience, Financial, Forms, Supporting, and Additional documents — every section card behaves identically.
- Passport page 1 + page 2 → row menu → "Merge with…" → one combined Passport file replaces them.
