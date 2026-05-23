## Goal

Add a fast, non-blocking OCR + extraction + verification layer that reuses what's already in the project:

- `client_documents`, `client_files`, `case_people`, `client_family_members`, `client_profile`, `workflow_templates`, `client_timeline`
- `SmartUploadZone`, `SectionBuilderCard`, `PersonWorkspaceCard`
- Existing edge functions: `classify-document`, `extract-document-data`, `verify-document`
- Existing table: `document_verifications`

No redesign of CRM, invoicing, payments, binders, portal, or applicant/mirrored-person model.

---

## Phase 1 — Foundation (storage for OCR + extracted fields, no UI yet)

Goal: have a single, cacheable place to store one OCR pass + extracted fields per document, so nothing re-runs.

1. New table `client_document_extractions` (one row per `client_documents.id`):
   - `document_id` (unique FK), `client_id`, `person_id`
   - `doc_type_detected`, `classify_confidence`
   - `ocr_text` (truncated), `ocr_lang`, `ocr_pages`
   - `fields jsonb` (`{ key: { value, confidence, source_page } }`)
   - `overall_confidence`, `status` (`queued | processing | extracted | needs_review | failed`)
   - `error`, `processed_at`, timestamps
   - RLS mirrors `client_documents` (view/edit by client scope).
2. New table `client_document_extraction_queue`:
   - `document_id`, `priority` (1 = passport/IELTS/marksheet/bank, 2 = others), `attempts`, `state` (`queued | running | done | failed`), `scheduled_at`.
3. Extend `client_documents.status` allowed values with: `processing`, `extracted`, `pending_review`, `verified`, `rejected`, `mismatch`. Keep `uploaded` as default. No data migration of existing rows.
4. Reuse `document_verifications` as-is for the human verification record (no schema change).

No frontend changes in this phase.

---

## Phase 2 — Fast classify on upload (non-blocking)

Goal: classification result is shown immediately, heavy extraction is deferred.

1. In `SmartUploadZone` upload callback: after the `client_documents` row is inserted, fire-and-forget `supabase.functions.invoke("classify-document", …)`. Do NOT await before closing the upload UI.
2. `classify-document` edge function:
   - Reads file header / filename / first-page text only (use `extractFirstPageText`).
   - Returns `{ doc_type, confidence, suggested_person_id? }`.
   - Writes initial row into `client_document_extractions` with `status='queued'` and `doc_type_detected`.
   - Enqueues into `client_document_extraction_queue` with priority based on type (passport / test score / marksheet / bank / sponsor docs / experience letter / photo / refusal = priority 1, everything else = 2).
3. Update `client_documents.status` → `processing`.
4. Append `client_timeline` event `document_classified`.

Upload UI shows: `uploaded → processing` instantly. No blocking.

---

## Phase 3 — Background extraction worker

Goal: one OCR pass per document, only for priority items first, cached forever.

1. New edge function `extraction-worker` (cron every 30s via `pg_cron` + `pg_net`):
   - Pulls up to N queued rows ordered by `priority, scheduled_at`.
   - Marks them `running`, calls the existing `extract-document-data` function per file.
   - Stores `ocr_text` + `fields` + `overall_confidence` in `client_document_extractions`.
   - Updates `client_documents.status` to `extracted` (high confidence) or `pending_review` (low).
   - Idempotent: skips any document already `extracted`/`verified`.
2. Thresholds (centralized in `src/lib/extractionConfig.ts`):
   - `AUTO_FILL_MIN = 85`
   - `REVIEW_MIN = 60`
   - Below 60 → `needs_review`, never auto-fill.
3. Concurrency cap: max 3 workers per tick, single OCR pass per document, never re-OCR on page open.
4. Timeline events: `ocr_extracted`, with field count + confidence.

---

## Phase 4 — Safe auto-fill into profile structures

Goal: fill only high-confidence fields; never overwrite; flag conflicts.

1. New module `src/lib/autoFillFromExtraction.ts` with pure functions mapping field keys → target table/column:
   - `client_profile`: name, DOB, nationality, gender, passport_no, passport_issue, passport_expiry, address fields
   - `case_people` / `client_family_members`: same per person
   - Test scores → existing test-score storage on `client_profile`/questionnaire
   - Academic %, CGPA, institution → assessment/questionnaire mapping fields already in use
2. Rules:
   - Only when field confidence ≥ `AUTO_FILL_MIN` AND target cell is empty.
   - If target has a different value → write to `client_document_extractions.fields[key].conflict = true`, do NOT overwrite, add timeline `field_conflict_flagged`.
   - On successful write: timeline `field_auto_filled`.
3. Triggered from `extraction-worker` immediately after extraction completes — still server-side, still non-blocking for UI.

No questionnaire/assessment schemas are changed; only existing fields get filled.

---

## Phase 5 — Review UI (lightweight, inside existing cards)

Goal: surface extractions in places staff already look — no new top-level page.

1. New small component `ExtractionReviewPanel` rendered inside:
   - `SectionBuilderCard` (per uploaded document row)
   - `PersonWorkspaceCard` (aggregated "needs review" count per person)
2. Panel shows: file preview link, detected type, person, extracted key/value list with confidence chips, conflict warnings, and actions:
   - Accept (writes value into target, marks field `accepted`)
   - Edit (inline edit then accept)
   - Reject field
   - Verify document / Reject document / Mark mismatch / Request reupload
3. Verify/Reject/Mismatch actions write to existing `document_verifications` and set `client_documents.status` accordingly (`verified | rejected | mismatch`).
4. New global page `/review-queue` (very thin — reuses existing list components) listing all `pending_review` + `mismatch` docs across clients the user can access, filterable by person type (applicant/co-applicant/dependent/sponsor/co-sponsor).

---

## Phase 6 — Verification semantics + timeline + audit

1. Enforce in code + RLS: upload alone never sets `verified`. Only the explicit verify action on `document_verifications` (with `reviewer_status='verified'`) flips `client_documents.status` to `verified`.
2. Trigger on `document_verifications` writes `client_timeline` events:
   - `document_verified`, `document_rejected`, `document_mismatch_flagged`.
3. `SmartUploadZone` replace flow writes timeline `document_replaced` and re-enqueues extraction for the new version (old extraction row archived, not deleted).
4. Status badge component reused across `SectionBuilderCard`, `PersonWorkspaceCard`, portal views, binders: `uploaded | processing | extracted | pending_review | verified | rejected | mismatch`.

---

## Phase 7 — Performance hardening + compatibility pass

1. Caching: `client_document_extractions` is the single source of truth. ClientDetail and PersonWorkspaceCard read it once via React Query with `staleTime: 5m`; never trigger extraction on mount.
2. Realtime: subscribe to `client_document_extractions` for the open client only, so badges flip from `processing → extracted` live without polling.
3. Confirm compatibility (smoke-pass, no schema changes):
   - Applicant + mirrored person workspaces (uses `person_id`)
   - Binders (read `client_documents` as before)
   - Questionnaires + assessments (auto-fill writes to fields they already read)
   - Portal uploads (same insert path → same queue)
   - AI summaries, reminders, access control (unchanged, just new statuses respected)
4. Add a small admin toggle in `extractionConfig.ts` to disable auto-fill globally if needed.

---

## Technical notes

- Edge functions touched/added: `classify-document` (extend), `extract-document-data` (reuse), new `extraction-worker`, new `extraction-autofill` (or inline in worker).
- Cron via `pg_cron` + `pg_net` posting to `extraction-worker` every 30s (insert tool, not migration, since it contains URL + anon key).
- No changes to: `client_invoices`, `accounting_*`, receipts, payments, `workflow_templates`, portal auth, binder code.
- No edits to `src/integrations/supabase/client.ts` or `types.ts`.
- Concurrency: extraction worker uses `FOR UPDATE SKIP LOCKED` when pulling from the queue.
- Thresholds and priority list live in one file: `src/lib/extractionConfig.ts`.

---

## Out of scope (explicit)

- Rebuilding documents/binder/portal/applicant model
- Any finance/invoice/receipt/payment change
- New workflow templates or new client form sections
- Re-OCR of historic documents (only new uploads enter the queue; a manual "Extract now" button can backfill on demand)
