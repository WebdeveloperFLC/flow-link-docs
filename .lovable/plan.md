## Goal
Empty the Clients module so it can be rebuilt from scratch, while keeping the existing UI, edge functions, workflow templates, letter templates, forms library, masters, and user accounts intact.

## What gets deleted
**Storage**
- All objects in the `client-documents` bucket (uploaded PDFs, images, generated binders).

**Per-client tables (truncated, FK-safe order):**
- `binders`
- `document_verifications`
- `document_fingerprints`
- `client_documents`
- `filled_forms`
- `questionnaire_instances`
- `share_links` (only rows targeting clients/documents/binders)
- `client_section_settings`
- `client_education`
- `client_profile`
- `case_people`
- `clients`
- `activity_logs` rows where `entity_type` ∈ ('client','document','binder','case_person','filled_form','questionnaire')

**Sequence**
- `application_id_seq` reset to 1, so the next new client gets `FL-1`.

## What is preserved
- `workflow_templates`, `letter_templates`, `visa_forms`, `questionnaire_schemas`, `questionnaire_email_templates`
- `case_sections` (the master section list)
- `master_lists`, `master_items`
- `firm_profile`, `integration_settings`, `api_keys`
- `profiles`, `user_roles`, all auth users
- All code, edge functions, and routes — Clients UI keeps working

## Execution steps

1. **Storage cleanup** — list and delete every object in the `client-documents` bucket via a one-off script using the service role key (`/tmp/wipe-bucket.ts`, run with bun). Output is ephemeral and not committed.

2. **Database migration** — single migration file that runs in a transaction:
   ```sql
   BEGIN;
   DELETE FROM public.binders;
   DELETE FROM public.document_verifications;
   DELETE FROM public.document_fingerprints;
   DELETE FROM public.client_documents;
   DELETE FROM public.filled_forms;
   DELETE FROM public.questionnaire_instances;
   DELETE FROM public.share_links
     WHERE target_type IN ('client','document','binder','filled_form','questionnaire');
   DELETE FROM public.client_section_settings;
   DELETE FROM public.client_education;
   DELETE FROM public.client_profile;
   DELETE FROM public.case_people;
   DELETE FROM public.clients;
   DELETE FROM public.activity_logs
     WHERE entity_type IN ('client','document','binder','case_person','filled_form','questionnaire');
   ALTER SEQUENCE public.application_id_seq RESTART WITH 1;
   COMMIT;
   ```
   `DELETE` (not `TRUNCATE`) is used because RLS-protected tables and the activity_logs filter need row-level predicates.

3. **Verify** — run `SELECT count(*)` on each wiped table to confirm zero rows, and a list on the storage bucket to confirm empty.

4. **Report back** — confirm counts are zero and the next created client will be `FL-1`.

## Risk notes
- Irreversible. User confirmed no export needed.
- If a Synergy-Gate verification or binder generation is in flight while this runs, it will fail — best run when no one is uploading.
- Edge function code is unchanged, so the existing PDF-loading bug (the original complaint) still needs to be fixed separately. Reverting via History remains an option for that.

## After approval
On approval I will: run the storage wipe script, submit the migration for your confirmation, then verify the tables are empty.
