# Backend Map

## Edge functions (Deno, in `supabase/functions/`)

### Auth & users
- `admin-users` — admin CRUD of CRM users (service-role).
- `accounting-create-user`, `accounting-update-user` — accounting role mgmt.
- `client-portal-invite-create`, `client-portal-invite-redeem` — portal onboarding.

### Email
- `smtp-send` — single send via firm SMTP. **Central choke point** for all outbound mail.
- `notifications-dispatch` — Phase-1 dispatcher (payment_received, receipt_generated). Resolves recipients (client + counselor + accounting inbox), renders HTML, calls `smtp-send`, writes `client_timeline`.
- `email-send` — generic transactional send (templated).
- `email-inbound` — IMAP/webhook ingest into `email_threads`.
- `process-email-queue` / `send-transactional-email` / `preview-transactional-email` — queued pipeline (pgmq), used for bulk/templated mail. **Not** the path used by `notifications-dispatch`.
- `handle-email-unsubscribe`, `handle-email-suppression` — list mgmt.
- `smtp-admin` — SMTP config CRUD.

### Documents / OCR
- `classify-document`, `extract-document-data`, `verify-document` — AI document pipeline.
- `extract-card-statement` — bank/card statement OCR.
- `upi-extract-commission-sheet`, `upi-extract-programs-from-doc`, `upi-process-document`, `upi-document-orchestrator` — institution doc pipeline.
- `process-large-file`, `split-binder` — file splitting for the binder.
- `parse-form-fields`, `parse-letter-template`, `fill-form`, `build-published-form`, `generate-letter` — form/letter generation.

### Assessment
- `assessment-register`, `assessment-verify-email`, `assessment-session-create`, `assessment-invite-create`, `assessment-submit`, `assessment-pdf-download`, `assessment-resend-report`, `assessment-crs`.

### Telephony
- `telephony-webhook` (no JWT — provider callback), `telephony-click-to-call`, `telephony-queue-next`, `telephony-recording-url`, `telephony-sbc-credentials`, `telephony-admin-config`.

### AI
- `ai-help-chat`, `ai-summarize`, `ai-financial-assistant`.
- DSH: `dsh-ai-edit-image`, `dsh-ai-generate-copy`, `dsh-ai-generate-poster`, `dsh-ai-generate-poster-openai`, `dsh-ai-generate-stock`, `dsh-notify-branches`.
- UPI: `upi-analyze-agreement`, `upi-ask-suggestions`, `upi-detect-promotions`, `upi-extract-*`, `upi-generate-content`, `upi-publish-courses`, `upi-renewal-scan`, `upi-run-campaign`, `upi-sync-process-batch`, `upi-sync-source`, `upi-upsert-courses`.

### Integrations
- `odoo-api`, `odoo-cron`, `odoo-sync` — accounting bridge.
- `share-resolve` — public share-link viewer.
- `questionnaire-resolve`, `questionnaire-save` — public questionnaire.

## verify_jwt overrides (see `supabase/config.toml`)

Public (no JWT): `share-resolve`, `extract-card-statement`, `odoo-api`, `questionnaire-resolve`, `questionnaire-save`, `telephony-webhook`, `preview-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression`, `assessment-register`, `assessment-verify-email`, `assessment-crs`.

Authenticated (default true) for everything else.

## RPCs (selected, see 04 for full list)

- `has_role(uid, role)`, `is_accounting_user`, `is_accounting_admin`, `is_commission_admin`, `is_telephony_admin`, `is_team_member`.
- `user_client_permission`, `can_view_client`, `can_edit_client`, `can_upload_client`, `user_has_module`, `acct_user_has_module`, `dsh_can`.
- `claim_next_queue_item` — telecaller dialer.
- `distribute_leads` — round-robin/random lead assignment.
- `import_lead`, `import_lead_v2` — CSV import.
- `generate_invoice_number`, `generate_receipt_number`, `generate_journal_number`, `generate_lead_number`.
- Snapshot/total recompute: `fn_take_invoice_snapshot`, `fn_take_receipt_snapshot`, `fn_recompute_invoice_totals`, `fn_recompute_wallet`.
- Timeline writers: `fn_log_invoice_payment_timeline`, `fn_log_invoice_receipt_timeline`, `fn_log_invoice_reminder_timeline`, `fn_log_task_to_timeline`, `fn_log_status_change`, `fn_log_ai_summary`, `fn_log_acct_perm_change`.
- CRM↔Accounting: `fn_sync_accounting_client`.
- Lead scoring: `fn_recalc_lead_score`.
- Email queue: `delete_email`, `move_to_dlq`.
- Notifications: `fn_notify_client_status_change`.
- Hooks (currently disabled stubs): `on_visa_approved`, `on_application_submitted`, `on_consent_form_submitted`.