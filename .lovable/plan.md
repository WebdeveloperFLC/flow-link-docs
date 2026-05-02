## Problem

Two seed migrations created **duplicate sections** in `case_sections` with different keys but overlapping meaning. Today the DB has 13 rows including these duplicate pairs:

| Pair | Keys |
|------|------|
| Academic vs Academics | `academic` (id `462ac0…`) + `academics` (id `682b5a…`) |
| Experience vs Work Experience | `experience` (`351136…`) + `work_experience` (`66c87e…`) |
| Finance vs Financial | `finance` (`ad69ad…`) + `financial` (`a9cdb9…`) |
| Other vs Supporting vs Additional | three near-duplicates of the catch-all bucket |

That is why the screenshot shows two "Academic" sections, and there is no way in the UI to rename or delete them. There is also no edit/delete affordance on existing sections — only `AddSectionDialog` is wired up.

## Plan

### 1. Database cleanup (migration)

Migrate documents off the duplicate sections, then archive the duplicates so they disappear from the UI but no FK breaks:

```text
Keep                 Merge into Keep & archive
-------------------  -----------------------------
academics      ←     academic
work_experience ←    experience
financial      ←     finance
supporting     ←     other, additional
```

For each pair: `UPDATE client_documents SET section_id = <keep>` and `UPDATE client_section_settings SET section_id = <keep>` (or delete dupes if a row with `(client_id, keep)` already exists), then `UPDATE case_sections SET is_archived = true` on the loser. We keep the row archived rather than deleting it so any historical FK/audit references stay valid; `loadSections()` already filters `is_archived = false`.

Resulting visible sections: Identity, Academics, Work Experience, Institutional Documents, Financial, Visa Forms & Statements, Family, Supporting Documents.

I will also align `SECTION_FIELD_MAP` and `GROUP_TO_SECTION` in `src/lib/sections.ts` so the surviving keys are listed first (the legacy keys are already there as fallbacks, so nothing breaks).

### 2. Inline rename + delete on every section

Add a small "⋯" menu (DropdownMenu) on each section header in `SectionBuilderCard.tsx`, admin-only. Options:

- **Rename** — opens a tiny inline input (or a small dialog) and calls `UPDATE case_sections SET label = ?`. Key is left untouched so field-mapping logic keeps working.
- **Delete** — confirm dialog. If the section has documents, refuse with a toast (`Move or delete the N documents first`). If empty, set `is_archived = true` and `onChanged()` reloads.

Rationale for soft-delete: keeps `client_documents.section_id` FKs intact and reversible; matches existing `is_archived` filter in `loadSections`.

### 3. Helpers in `src/lib/sections.ts`

Add:

```ts
export async function renameSection(id: string, label: string): Promise<boolean>
export async function archiveSection(id: string): Promise<{ ok: boolean; reason?: string }>
```

`archiveSection` checks `client_documents` count for that `section_id` first and returns `{ ok: false, reason: "has_documents" }` so the UI can show a clear toast.

### 4. "Add section" entry point

`AddSectionDialog` already exists and works. Confirm it is reachable from `ClientDetail.tsx` (the `+ Add section` button at the bottom of the sections list). No code changes expected — just verify wiring still works after sections are de-duplicated.

## Files to change

- New migration: archive duplicate sections + repoint FKs.
- `src/lib/sections.ts` — add `renameSection`, `archiveSection`; tidy field map ordering.
- `src/components/clients/SectionBuilderCard.tsx` — add admin-only ⋯ menu with Rename / Delete on the section header.
- `src/pages/ClientDetail.tsx` — only if the "Add section" button is missing or hidden; otherwise no change.

## Out of scope

- Renaming `key` (it is referenced by `SECTION_FIELD_MAP`); only `label` is editable.
- Hard-deleting sections (we soft-archive instead).
- Restoring archived sections — can be added later if needed.