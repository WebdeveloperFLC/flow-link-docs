# Flow: Documents, OCR & Binders

## Upload
1. UI: `src/components/documents/*` → uploads to `client-documents` bucket using signed upload URL.
2. Row in `client_documents` (or `client_files`) with `storage_path`, `mime`, `classified_kind`.
3. Permission: `can_upload_client(uid, client_id)`.

## Classification & extraction
1. After upload, frontend enqueues into `client_document_extraction_queue` (or directly invokes edge fn).
2. `classify-document` → assigns `classified_kind`.
3. `extract-document-data` → writes structured fields to `client_document_extractions`.
4. `verify-document` (optional human/AI review) → writes `document_verifications`.
5. `document_fingerprints` used to detect duplicates across clients.

## Binder
- `binders` row groups documents into a single PDF.
- `split-binder` edge function splits a multi-doc PDF back into individual files.
- `process-large-file` handles >25MB uploads in chunked extraction.

## Letter / form generation
- Letter templates: `letter_templates` + `letter-templates` bucket → `parse-letter-template`, `generate-letter`.
- Forms: `visa-forms` bucket + `parse-form-fields`, `fill-form`, `build-published-form`, `filled_forms` table.

## Permission
- Read/write on storage buckets follows table RLS via storage policies that join through `client_documents` → `can_view_client`.
- Letter/form templates: admin/documentation only.

## Failure modes
- Storage upload succeeds but row insert fails → orphan file. Clean-up cron not currently implemented.
- Extraction queue stalls if edge fn errors silently — check `supabase--edge_function_logs` for `extract-document-data`.