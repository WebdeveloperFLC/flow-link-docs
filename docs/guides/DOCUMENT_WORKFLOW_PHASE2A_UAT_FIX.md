# Phase 2A UAT Fix — Root Cause Report

## Issue 1: Add Document dialog — no search

**Root cause:** `AddDocTypeDialog` used a plain `<Select>` over all document master labels — unusable for 100+ types.

**Fix:** Replaced with Command + Popover typeahead (`AddDocTypeDialog.tsx`). Search matches label, code, metadata aliases, and common counselor terms (PCC, SOP, wedding photos, etc.). Keyboard navigation via cmdk.

---

## Issue 2: Add Document succeeds but item not visible

**Root cause:** Phase 2A Documents tab reads **`application_document_requirements` (ADR)**. Add Document still wrote to legacy **`clients.extra_items` JSON** via `onAddExtraItem` in `ClientDetail.tsx`. Toast fired from legacy path; new UI never queried ADR → item invisible in Section/Flat views and search.

**Fix:**
- `DocumentsTabContent` owns Add Document dialog.
- Submit calls `fn_add_case_document_requirement` (`addCaseDocumentRequirement.ts`).
- Inserts ADR with `source = manual_add`, `section_key = other`, `section_label = Other Documents`.
- `reload()` + `onChanged()` refresh hook immediately after insert.
- Auto-expands Other Documents section and scrolls to new row.

**Verified path:**
```
Add → RPC fn_add_case_document_requirement → ADR row → useCaseDocumentWorkflow refetch → Section + Flat views
```

---

## Issue 3: Progress bar unchanged after add

**Root cause:** Same as Issue 2 — nothing added to ADR, so progress inputs unchanged.

**Expected behavior (now documented + tested):**

| Add type | Required count | Missing count | Completion % |
|----------|----------------|---------------|--------------|
| Optional (`mandatory = false`) | Unchanged | Unchanged | Unchanged |
| Required (`mandatory = true`) | +1 | +1 | Recalculated |

Progress summary footnote: *"Progress counts required documents only."*

Tests: `computeProgress.test.ts`

---

## Issue 4: Manual documents placement

**Fix:** All manual adds use RPC defaults:
- `p_section_key = 'other'`
- `p_section_label = 'Other Documents'`

UI shows `· Other Documents` tag on `source = manual_add` rows.

---

## UAT checklist (retest)

- [ ] Add Document opens searchable typeahead (type "PCC", "wedding", "marriage")
- [ ] Optional add (Required toggle OFF) → appears in Other Documents section + Flat view
- [ ] Optional add → progress Required/Missing/% unchanged
- [ ] Required add → progress Required +1, Missing +1, % drops
- [ ] Search in toolbar finds manually added document by name
- [ ] Click missing chip still jumps to upload row
- [ ] Upload still satisfies requirement and updates progress

## Screenshots (capture after Lovable Publish)

1. Add Document typeahead with search results
2. Wedding Photos in Other Documents section (Section view)
3. Same item in Flat view
4. Progress before/after optional vs required add

## Database objects touched

| Object | Operation |
|--------|-----------|
| `application_document_requirements` | INSERT via `fn_add_case_document_requirement` |
| `clients.extra_items` | **No longer written** on Add Document |

Legacy `extra_items` rows from before this fix are not auto-migrated; re-add via Add Document if needed.
