# Document Workflow Phase 2A — Completion Notes

## Shipped features

1. **Documents Progress Summary** — required / uploaded / missing counts + completion % + progress bar
2. **Missing Required widget** — clickable chips jump to upload row (`#req-{id}`)
3. **Section View (default)** — ADR grouped by `section_key` / `section_label`, collapsible accordion
4. **Upload matching** — uploads set `master_item_code`; satisfaction via code + label fallback
5. **Status badges** — Missing, Uploaded, Under Review, Approved, Need Replacement, Rejected
6. **Documents toolbar** — Section / Party (disabled) / Flat views; All / Missing / Uploaded / Approved / Need Replacement filters; search

## Database objects read/written (runtime)

| Object | Usage |
|--------|--------|
| `application_document_requirements` | SELECT checklist per case |
| `client_documents` | SELECT active docs; INSERT on upload; UPDATE `is_active_version` |
| `fn_assign_case_workflow_template` | Auto-call when case has no ADR rows |
| `case_sections` | Resolve `section_id` for uploads |
| `master_items` (document_types) | Label ↔ code mapping |
| Storage `client-documents` | Upload files |

## UI entry point

`ClientDetail` → Documents tab → `DocumentsTabContent`

## Screenshots

Capture after Lovable Publish + hard refresh:

1. Client with open case → Documents tab → progress summary + missing chips
2. Click missing chip → highlighted upload row in section accordion
3. Flat view + Missing filter
4. After upload → chip removed, progress updated

## Not in 2A (deferred)

- Party View UI (2B)
- Submission milestones UI (2C)
- Version history expander (2D)
- Admin template page (2E)
- Portal integration (2F)
- OCR / AI verification
