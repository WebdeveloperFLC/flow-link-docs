## Goal

Reset all client-related data so you can upload fresh documents and confirm whether the passport extraction fix is fully working. No code/schema changes — data only.

## Scope: what gets wiped

All rows tied to clients and their documents/binders/forms/verifications/activity, plus the underlying files in storage.

Tables to clear (in dependency-safe order):

1. `document_fingerprints`
2. `document_verifications`
3. `client_documents`
4. `binders`
5. `filled_forms`
6. `questionnaire_instances`
7. `client_education`
8. `client_profile`
9. `client_section_settings`
10. `case_people`
11. `share_links` where `target_type` in (`document`, `binder`, `client`)
12. `activity_logs` where `entity_type` in (`client`, `document`, `binder`, `form`, `questionnaire`)
13. `clients` (last)

Storage buckets to empty:
- `client-documents` — all objects (uploaded PDFs/images, generated binders, etc.)

What is preserved (intentionally untouched):
- `auth.users`, `profiles`, `user_roles` — your login + team
- `firm_profile`, `branding` bucket — firm settings/logo
- `case_sections`, `master_lists`, `master_items` — config
- `letter_templates`, `letter-templates` bucket
- `visa_forms`, `visa-forms` bucket, `questionnaire_schemas`, `questionnaire_email_templates`, `workflow_templates`
- `integration_settings`, `api_keys`

## Execution steps (once approved)

1. Run a single SQL transaction (via the insert/data tool) that deletes from the tables above in the listed order.
2. Empty the `client-documents` storage bucket (list + delete all objects).
3. Verify counts: all listed tables return 0 rows for client-scoped data; `client-documents` bucket is empty.
4. Report back with a short confirmation summary so you can start fresh uploads.

## After the wipe — how to retest

1. Create a new client.
2. Upload the passport into the Identity section first.
3. Click Re-extract.
4. Verify on the profile card:
   - DOB, passport number, expiry come from MRZ (validated)
   - "File No." is not used as passport number
   - Mother/Father names are not mapped to Spouse
   - Place of birth is not pulled from address
5. Upload the rest of the documents and confirm passport-derived fields are not overwritten.

## Risks / notes

- This is destructive and not reversible from the app — all existing client records, uploaded files, generated binders, filled forms, questionnaires, and verification history will be permanently deleted.
- Firm settings, templates, masters, forms library, and user accounts remain intact, so the app is immediately usable for new clients after the wipe.
- If you want to keep one specific client for comparison, tell me the client ID before approving and I'll exclude it.