## Goal

Replace the current three stacked document surfaces on the client detail page with **one unified, section-based view** so the page is no longer messy or repetitive.

Today the page renders three overlapping surfaces:

1. **Document checklist card** (top) — required items grouped by section, with link/unlink/remove.
2. **Sections cards** (middle) — `SectionBuilderCard` per section for upload + combine binder.
3. **All uploaded documents (flat list)** (bottom accordion) — view/download/share/delete.

We will collapse 1, 2 and 3 into a single "Case documents" surface where each section appears exactly once and contains everything for that section.

## New unified surface

A single card titled **"Case documents"** at the top of the left column. Inside, sections render in order. For each section:

- Section header with: name, `ready / total` counter, `Upload to <section>`, `Auto/Manual order`, and a single section-level **Combine** action (with built-in multi-select).
- Body lists rows in this order:
  1. **Required & optional checklist items** for that section (status badge: Ready / Verified / Pending / Optional / Rejected / Reissue). If a doc is attached → show file name + view/download/share/delete/verify icons inline. If not attached → show `Link doc` + `Remove from checklist` actions (current behavior, just inline).
  2. **Other uploaded docs in this section that aren't tied to a checklist item** — same inline action row (view/download/share/verify/delete/optimize).
- One **checkbox per row** drives multi-select; the section header's **Combine** button uses the selection (or all rows if none selected) to produce / refresh the section binder. This replaces the separate "Combine N files" button currently inside `SectionBuilderCard`.
- Drag-to-reorder stays available when section is in Manual order mode.

Below the unified card we keep, unchanged:
- Generated binders card
- Custom binders panel
- Final binder panel
- Profile / letters / forms / etc.

The top-right **page actions** keep `Grouped binders` and `Full binder` buttons (they operate across all sections).

## What gets removed

- The standalone "Document checklist" card block (lines ~776–933 of `src/pages/ClientDetail.tsx`).
- The standalone "Sections · upload into the right one…" block (lines ~954–997).
- The "All uploaded documents (flat list)" accordion (lines ~999–1075).
- The internal per-row "Combine"/"Merge into one" UI inside `SectionBuilderCard` (replaced by the unified section-header combine + checkbox selection).

## What gets added / changed

- New component `src/components/clients/CaseDocumentsCard.tsx` that renders the unified section list and owns:
  - row composition (checklist item rows + orphan-doc rows),
  - per-row checkbox selection,
  - section header (`Upload`, `Auto/Manual order`, `Combine selected/all`),
  - all row actions currently spread across the three surfaces (view, download, share link, verify, delete, optimize, link/unlink to checklist, remove from checklist, drag reorder).
- `ClientDetail.tsx` is trimmed to render `<CaseDocumentsCard />` once where the checklist card used to be, and the three old blocks are deleted.
- `SectionBuilderCard.tsx` is either deleted or reduced to a small helper used by the new card (the existing combine/merge logic in it is reused — only the UI wrapper changes).
- "New section" button (admin only) moves into the `CaseDocumentsCard` header.
- No backend/schema changes. No changes to upload/extraction logic, checklist linking semantics, or binder generation logic — only UI composition.

## Out of scope

- Auth, user search, password reset (already addressed previously).
- Right-column cards (Access, Portal access, Custom binders, People).
- Changing how documents are auto-classified into sections.
