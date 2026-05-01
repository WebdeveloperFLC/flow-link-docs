## Goal

Move from one global "Smart upload" panel to a **section-first** workflow that satisfies the acceptance criteria: extraction stays inside the section the user uploaded into, custom binders can be built from any section with manual ordering, and existing preview/share/verify/optimize features keep working.

## Explicit Confirmations (per user request)

1. **Same-section auto-fill of information fields (AC-2.2)** — When a document is uploaded **inside a section**, all extracted data is auto-filled into the **information fields of that same section** (e.g. Identity → name/DOB/passport in the Identity section's fields; Academics → institution/degree/dates in the Academics section's fields; Finance → balances/dates in the Finance section's fields). Extracted values will **not** be written into a global panel or a different section. Concretely: the section card will own and render its own field block (sourced from `client_profile` / `client_education` for that section's scope), the extractor result is filtered to that section's allowed fields, and `mergeExtractedFields(...)` is invoked with that filtered subset so only the current section's fields get populated.

2. **Unlimited binders, no "single full binder" lock-in (AC-4.1, AC-4.4)** — The new `CustomBindersPanel` lets the user create **as many binders as needed**, each containing any subset of documents from any section, in any order. There is **no system-enforced cap** and **no requirement** to produce one combined "full binder". This is exactly what IRCC separate uploads need (Identity binder, Education binder, Finance binder, etc., each downloadable/shareable on its own). The legacy "Full binder" / "Grouped binders" buttons are kept only as optional shortcuts and are not the default path.

3. **Existing functionality remains fully intact** — The refactor will **not** break any of:
   - **Document preview** at section level *and* binder level — keeps using `openClientDocument` + `InlinePreviewDialog`.
   - **Share links** for both individual documents *and* entire binders — keeps using `ShareLinkDialog` against `share_links` (`target_type='document' | 'binder'`) and the `share-resolve` edge function. Access control unchanged.
   - **Document verification** — section uploads still call `verify-document` after insert; verification records persist on the document and remain visible after binder creation.
   - **File optimization with quality retention** — every uploaded file still flows through `processToPdf` (≤ 4 MB IRCC target, multi-step quality fallback). The "Re-optimize all" / per-doc optimize buttons stay. Optimization will not break preview, sharing, or verification.

## Changes

### 1. Section-based Smart Upload (AC-1, AC-2)

In `src/components/clients/SectionBuilderCard.tsx`:

- Replace the disabled "Smart upload only" button with a real **per-section** upload control (file input + active drag-drop on the card itself).
- When files are dropped/selected on a section:
  - Run `processToPdf` (preserves AC-6.4 optimization + readability) + `classifyDocument`.
  - **Force `section_id = section.id`** on every uploaded row — never call `inferSectionId(...)` here, so the file stays where the user dropped it (AC-2.2).
  - Call `extract-document-data`, then **filter** the returned fields down to the field set owned by this section before calling `mergeExtractedFields(...)`. This guarantees Identity uploads only fill Identity fields, Academics only fill Academics fields, etc.
  - Call `verify-document` so authenticity checks still run (AC-6.3).
- Each section card renders an **"Information"** sub-block showing its own fields (read from `client_profile` / `client_education` and scoped per section) so the user sees auto-filled data in-place (AC-2.3).
- PDF binder splitting (`split-binder`) on the section card keeps every split segment in the **current section** (override `targetSectionId = section.id`).

### 2. Default + custom sections (AC-1.2, AC-1.3)

- The DB already has Identity / Academic(s) / Experience / Financial / Forms / Family / Supporting / Other / Additional. Add **Work Experience** and **Institutional Documents** rows to `case_sections` if missing.
- Add a "+ New section" button on `ClientDetail.tsx`, opening a small dialog (label + key) that inserts into `case_sections` (admin-gated by existing RLS) and reloads sections. **No quantity cap.**

### 3. General (Smart) upload restricted to page-splitting (AC-3)

In `src/pages/ClientDetail.tsx`:

- Move `SmartUploadZone` out of the always-visible right column into a collapsed accordion titled **"Advanced: split a multi-doc PDF"**, with helper copy that this is only for splitting binders into pages — not the default upload.
- Section uploaders become the primary surface above the accordion.

### 4. Multi-binder builder with cross-section selection + ordering (AC-4)

Replace the current `FinalBinderPanel` with a **CustomBindersPanel**:

- Lists all binders for the client (uses existing `binders` table — `scope`, `group_label`, `included_items` columns already exist; **no schema change**).
- "New binder" opens a dialog where the user:
  - Names the binder (e.g. "Identity binder").
  - Sees all documents grouped by section with checkboxes — pick any across sections (AC-4.2).
  - Reorders the picked list with up/down (or dnd-kit) controls (AC-4.3).
  - On save, runs `combinePdfsFromStorage(orderedPaths)`, uploads to storage, inserts a `binders` row with `scope='custom'`, `group_label=<name>`, `included_items=[{id, file_name, section_id}]` in chosen order. Order is preserved on export and sharing (AC-4.3).
- Each binder row supports: **download**, **view (preview)**, **share-link** (reuse `ShareLinkDialog`), **edit** (re-opens dialog and regenerates), **delete** (admin only).
- **No cap on number of binders** — the user can build as many independent IRCC-style binders as they need (AC-4.1, AC-4.4). Existing one-click "Full binder" / "Grouped binders" buttons are kept as optional shortcuts only.

### 5. Required-docs visibility per binder (AC-5)

In the binder dialog and on each binder card:

- Show a **"Required documents"** strip driven by the workflow template's mandatory items.
- For each required item, mark ✅ when at least one document in the binder matches that type, otherwise show a red "Missing" pill. Computed live from current `client_documents`, refreshes in real time (AC-5.2).

### 6. Preserve existing features (AC-6) — verified end-to-end

- **Preview**: `openClientDocument` + `InlinePreviewDialog` reused on both section docs and binder rows.
- **Sharing**: `ShareLinkDialog` entry points kept for both `target_type='document'` and `target_type='binder'`. RLS / `share-resolve` unchanged.
- **Verification**: section uploader calls `verify-document` after insert; existing `/verification` page links continue to work; verification status persists after extraction and after binder creation.
- **Optimization**: every upload runs through `processToPdf`; the per-doc optimize button and "Re-optimize all" stay. Output stays viewable, shareable, and verifiable.

### 7. End-to-end flow (AC-7)

```text
Upload inside section → fields auto-fill in same section ✓
Create N custom binders, pick docs from any sections ✓
Reorder docs inside binder → order persisted in included_items ✓
Preview / share / verify / optimize keep working on docs and binders ✓
```

## Technical Details

Files to edit / add:

- `src/components/clients/SectionBuilderCard.tsx` — wire real upload input, force `section_id`, run extract (scoped to this section's fields) + verify, render in-section "Information" block, replace the "Smart upload only" toast button.
- `src/pages/ClientDetail.tsx` — add "+ New section" button, wrap `SmartUploadZone` in an "Advanced: split a multi-doc PDF" accordion, swap `FinalBinderPanel` for `CustomBindersPanel`.
- `src/components/clients/CustomBindersPanel.tsx` (new) — list + create/edit dialog with cross-section picker, reorder, required-docs strip, share/download/delete. **Unlimited binders.**
- `src/components/clients/AddSectionDialog.tsx` (new) — admin dialog to insert a row into `case_sections`.
- `src/lib/sections.ts` — add `createSection({ key, label })` helper and a `fieldsForSection(key)` map used to filter extracted fields per section.

No DB schema changes required (sections, binders, included_items already exist). No new edge functions. Existing extract / verify / split / share-resolve functions are reused.

## Out of scope

- No changes to auth, RLS, or storage buckets.
- No changes to `processToPdf` or `combinePdfsFromStorage`.
- The flat-list view stays available inside its existing accordion.