## Goal

Restructure Workflow Templates so each template is organized as:

```text
Country → Application Category → Section (Academics, Experience, Institution Docs,
   Finance Docs, Sponsor Docs, Other Docs, …) → Document Type
```

Everything (sections, document types, mandatory flag, notes) is fully customizable per template, and the section grouping flows through to the client checklist and grouped binders.

## Current state

- `workflow_templates.items` is a flat list `{id,name,mandatory,notes}[]`.
- A `groups jsonb` column already exists on `workflow_templates` but is unused.
- Sections live in `case_sections` (Identity, Academic, Experience, Finance, Institutional, Supporting, Other, Additional, …) — already used by the documents UI.
- ClientDetail renders the checklist as a single flat list (`checklistItems.map`) and relies on `groupForType()` to assign each item to a binder group at generation time.

## Plan

### 1. Data model (no schema change required)

Reuse the existing `groups` JSONB column on `workflow_templates`:

```ts
type TemplateSection = {
  id: string;          // local id
  section_key: string; // case_sections.key (e.g. "academic", "finance", or a custom key)
  label: string;       // editable display label
  sort_order: number;
  item_ids: string[];  // ordered ids referencing items[]
};
// stored at workflow_templates.groups
```

`items` keeps its existing shape so legacy templates (and the matcher / binder code in `lib/checklist.ts` and `lib/binderGroups.ts`) keep working. A migration helper in code will, on first edit, auto-bucket existing items into sections via `groupForType(item.name)` so no SQL migration is needed.

### 2. Template editor — `src/components/templates/TemplateEditorDialog.tsx`

Replace the flat document list with a section-based editor:

- Top: Country + Category selects (unchanged).
- Body: list of **Sections**, each rendered as a collapsible card containing:
  - Editable section label.
  - Section picker / "+ New section" — choose from `case_sections` (Academics, Experience, Institutional Documents, Finance, Supporting, Other, Additional) or create a custom one via `createSection()` from `lib/sections.ts` (also used elsewhere). New labels suggested in the description (Sponsors Docs, Institution Docs, etc.) are added as defaults in the seed list.
  - Drag-and-drop ordering of items inside the section.
  - "Add document type" select (master list `document_types`) + a "Custom type…" inline input so any string is allowed.
  - Per-item: editable name, mandatory toggle, optional note, delete.
- Drag-and-drop ordering of the sections themselves.
- "Add section" button at the bottom.

On save, write both:
- `items`: flattened ordered list (preserves the legacy contract used by `ClientDetail`, `lib/checklist.ts`, `binderGroups.ts`).
- `groups`: the new `TemplateSection[]` describing the hierarchy.

### 3. Templates list — `src/pages/Templates.tsx`

Each template card now shows a compact section breakdown ("Academics · 5 · Finance · 3 · Sponsors · 2") instead of a flat doc count. Hover/expand reveals item names grouped by section. Country grouping unchanged.

### 4. Client checklist — `src/pages/ClientDetail.tsx`

Render the checklist grouped by section when `template.groups` is present:

- Section header rows (label + count "3/5 ready").
- Inside each section, the existing `Pending / Ready / Link doc / Unlink` row UI is kept verbatim (no behaviour change for matching).
- Fallback: if `groups` is empty (legacy template), keep the current flat list.

`completed`, `requiredMissing`, and the `groupForType`-based grouped-binder generation continue to work because `items[]` is still the source of truth. Where `groups` is present, grouped binders use the template's own sections instead of `BINDER_GROUPS` so the user's custom sections are honoured.

### 5. Section seed (one-time, via `data-insert` migration)

Insert a few additional default `case_sections` rows that the user mentioned and don't yet exist:

- `sponsors` → "Sponsor Documents"
- `institution_docs` → "Institution Documents" (alias for institutional, distinct label)

Existing sections cover Academics, Experience, Finance, Supporting, Other, Additional.

### 6. Files to edit

- `src/components/templates/TemplateEditorDialog.tsx` — full rewrite of the body UI; keeps the same props and save contract.
- `src/pages/Templates.tsx` — card preview shows section breakdown; `Template` type extended with optional `groups`.
- `src/pages/ClientDetail.tsx` — checklist render switches to a section-grouped layout when `template.groups` exists; `onGenerateGroupedBinders` prefers `template.groups` over `BINDER_GROUPS` when available.
- `src/lib/sections.ts` — small helper `seedTemplateSectionsFromItems(items)` that buckets a flat list into `TemplateSection[]` for migration of legacy templates inside the editor.
- Data insert: add the two new `case_sections` rows.

### 7. Out of scope

- No change to `client_documents`, `binders`, or auto-classification.
- No change to checklist alias matching (`lib/checklist.ts`) — unchanged contract.
- No change to `master_items.document_types`; users can still pick from it or type a custom value.
