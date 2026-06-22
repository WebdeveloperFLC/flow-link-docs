# Flow: Documents, OCR & Binders

> **Locked architecture:** [`docs/guides/DOCUMENT_MANAGEMENT_ARCHITECTURE.md`](../guides/DOCUMENT_MANAGEMENT_ARCHITECTURE.md)
>
> Three separate entities: **Documents** (raw uploads) → **Binders** (logical collections) → **Submission Packages** (final file).
> Do not simplify into direct PDF merge.

## Upload (Entity #1 — Documents)
1. UI: `src/components/documents/*`, `DocumentsTabContent` → uploads to `client-documents` bucket.
2. Row in `client_documents` with `storage_path`, `mime`, `master_item_code`, `is_active_version`.
3. Permission: `can_upload_client(uid, client_id)`.
4. Documents are **source of truth** — never auto-merged; editable/replaceable with version history.

## Classification & extraction
1. After upload, frontend enqueues into `client_document_extraction_queue` (or directly invokes edge fn).
2. `classify-document` → assigns `classified_kind`.
3. `extract-document-data` → writes structured fields to `client_document_extractions`.
4. `verify-document` (optional human/AI review) → writes `document_verifications`.
5. `document_fingerprints` used to detect duplicates across clients.

## Binders (Entity #2 — target model)

**Target:** A binder is a **logical collection** (selected documents + order + status), not a PDF.

- Standard types: identity, relationship, financial, employment, academic, travel, forms, supporting_documents
- Service profile defines default binder set — see `scripts/lib/document-service-profiles.mjs`
- Generate Binder PDF = **manual** action; version history preserved
- New upload affecting binder → status **OUTDATED** → counselor clicks **Rebuild Binder**
- Generated PDF never replaces source documents

**Current (legacy):** `CustomBindersPanel`, `PersonWorkspaceCard` merge PDFs directly into `binders` table — to be refactored to target model.

- `binders` row today groups documents into a single PDF
- `split-binder` edge function splits a multi-doc PDF back into individual files
- `process-large-file` handles >25MB uploads in chunked extraction

## Submission Packages (Entity #3 — target model)

**Target:** Ordered set of **binder versions** → manual **Generate Package PDF**.

- Service profile defines default package order
- All versions audited: generated_by, generated_at, included binders + document versions

**Current (legacy):** `FinalBinderPanel` merges section documents directly — to be replaced by binder-version assembly.

## Letter / form generation
- Letter templates: `letter_templates` + `letter-templates` bucket → `parse-letter-template`, `generate-letter`.
- Forms: `visa-forms` bucket + `parse-form-fields`, `fill-form`, `build-published-form`, `filled_forms` table.

## Service Library Document Binder tab
- HTML counselor guide / training only (`ServiceBinderTab`, checklist HTML pipeline)
- **Never** creates upload requirements, binders, or packages

## Checklist
- QA / submission milestones — separate from documents and binders
- Never creates upload rows (see `requirement_kind: milestone` in workflow templates)

## Permission
- Read/write on storage buckets follows table RLS via storage policies that join through `client_documents` → `can_view_client`.
- Letter/form templates: admin/documentation only.

## Failure modes
- Storage upload succeeds but row insert fails → orphan file. Clean-up cron not currently implemented.
- Extraction queue stalls if edge fn errors silently — check edge function logs for `extract-document-data`.
