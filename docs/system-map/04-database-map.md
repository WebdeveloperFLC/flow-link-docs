# Database Map

## Table groups (public schema)

### CRM Core

`clients`, `client_profile`, `client_education`, `client_family_members`, `client_access`, `client_stage_history`, `client_section_settings`, `client_tasks`, `client_timeline`, `client_appointments`, `client_notifications`, `client_notification_prefs`, `client_offers`, `client_portal_invites`, `client_portal_links`, `client_emails`, `case_people`, `case_sections`, `default_team_members`, `team_members`, `teams` (if present).

### Documents

`client_documents`, `client_files`, `client_document_extractions`, `client_document_extraction_queue`, `document_fingerprints`, `document_verifications`, `binders`.

### Leads & Telecaller

`leads`, `lead_remarks`, `lead_handoffs`, `lead_number_sequences`, `call_campaigns`, `call_queue_items`, `call_sessions`, `call_events`, `distribution_rules`, `distribution_rule_members`, `distribution_runs`, `pipeline_stages`.

### Chat

`chat_channels`, `chat_channel_members`, `chat_messages`, `chat_message_attachments`, `chat_message_mentions`, `chat_message_meta`, `chat_message_reactions`, `chat_read_receipts`.

### Email

`email_templates`, `email_threads`, `email_send_log`, `email_send_state`, `email_events`, `email_read_receipts`, `email_attachments`, `email_unsubscribe_tokens`, `app_email_logs`, `notification_settings`, `suppressed_emails`.

**pgmq queues (not Postgres tables — managed by the pgmq extension):**

| Queue                  | Purpose                                                                                                         | DLQ                        | Added      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------- |
| `auth_emails`          | Lovable-managed auth email pipeline                                                                             | `auth_emails_dlq`          | existing   |
| `transactional_emails` | Lovable-managed templated/assessment email pipeline                                                             | `transactional_emails_dlq` | existing   |
| `notification_emails`  | Notification email queue — drained by `process-notification-email-queue` worker via `smtp-send` (customer SMTP) | `notification_emails_dlq`  | 2026-05-29 |

Queue rows are **not** accessible via normal Supabase table queries. Use the RPCs:
`enqueue_email(queue_name, payload)`, `read_email_batch(queue_name, batch_size, vt)`,
`delete_email(queue_name, message_id)`, `move_to_dlq(source_queue, dlq_name, message_id, payload)`.
All four RPCs are `SECURITY DEFINER`, GRANT to `service_role` only.

### In-App Notifications

`app_notifications` — per-user in-app feed. RLS: staff INSERT only (`staff insert notifications` policy — role `viewer` and `client` excluded). Users read/update own rows; admins read all. Realtime publication enabled.
`user_notification_prefs` — per-user `sound_enabled`, `browser_push_enabled`.

### Invoices / Payments / Receipts (**critical**)

`client_invoices`, `client_invoice_installments`, `client_invoice_payments`, `client_invoice_payment_allocations`, `client_invoice_receipts`, `client_invoice_adjustments`, `client_invoice_refund_requests`, `client_invoice_reminders`, `client_invoice_aging`, `client_invoice_snapshots`, `invoice_number_sequences`, `receipt_number_sequences`, `credit_wallet`, `point_transactions`, `point_redemptions`, `financial_accounts`.

### Accounting

`accounting_entities`, `accounting_users`, `accounting_user_module_permissions`, `accounting_user_entity_scope`, `accounting_access_audit`, `accounting_clients`, `accounting_vendors`, `accounting_vendors_safe`, `accounting_coa`, `accounting_journals`, `accounting_journal_lines`, `accounting_ar_invoices`, `ar_invoice_line_items`, `accounting_ap_bills`, `accounting_bank_accounts`, `accounting_card_reconciliation`, `accounting_petty_cash`, `accounting_intercompany`, `accounting_reimbursements`, `accounting_masters`.

### Institutions / UPI

`upi_*` family (commissions, agreements, programs, claims, campaigns, suggestions, sync sources).

### Digital Success Hub

`dsh_media`, `dsh_brand_assets`, `dsh_ai_generations`, `dsh_branch_contacts`, `dsh_branch_notifications`.

### Assessment

`assessment_sessions`, `assessment_questions`, `assessment_programs`, `assessment_invitations`, `assessment_email_verifications`, `assessment_leads`, `assessment_pdf_wrapper`.

### Course Finder

`cf_countries`, `cf_universities`, `cf_courses`, `cf_shortlists`, `cf_saved_searches`, `course_finder_saved_filters`, `countries`, `country_pathways`, `pathway_rules`, `de_chancenkarte_rules`, `de_shortage_occupations`, `noc_occupations`, `noc_category_mappings`, `provincial_noc_targets`.

### Roles / Perms / Identity

`profiles`, `user_roles`, `user_module_permissions`, `branches`, `departments`, `firm_profile`, `integration_settings`, `api_keys`, `activity_logs`.

### Misc

`offers`, `offer_groups`, `offer_group_members`, `offer_audience_targets`, `letter_templates`, `master_lists`, `master_items`, `filled_forms`, `voice_notes` (storage bucket), `ai_help_*`, `ai_summaries`, `ai_summary_sources`, `ai_summary_feedback`.

## Triggers (critical ones)

| Table                                         | Trigger fn                                               | Purpose                                                           |
| --------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| `client_invoices` (BEFORE UPDATE)             | `fn_take_invoice_snapshot`                               | Immutable snapshot on first_sent / paid. **Never bypass.**        |
| `client_invoices` (BEFORE INSERT)             | `fn_assign_invoice_number`                               | Allocates invoice number from sequence.                           |
| `client_invoice_payments` (AFTER ins/upd/del) | `fn_recompute_invoice_totals`                            | Recomputes paid/balance/status. **Source of truth for `status`.** |
| `client_invoice_payments` (AFTER INSERT)      | `fn_log_invoice_payment_timeline`                        | Writes `payment_received` / `refund_processed` timeline.          |
| `client_invoice_receipts` (BEFORE INSERT)     | `fn_take_receipt_snapshot`                               | Immutable receipt snapshot + invoice stamp.                       |
| `client_invoice_receipts` (AFTER INSERT)      | `fn_log_invoice_receipt_timeline`                        | Writes `receipt_generated` timeline.                              |
| `client_invoice_reminders`                    | `fn_log_invoice_reminder_timeline`                       | Reminder timeline + invoice header stamp.                         |
| `client_tasks`                                | `fn_log_task_to_timeline`                                | Task timeline.                                                    |
| `clients` (AFTER UPDATE status)               | `fn_log_status_change`, `fn_notify_client_status_change` | Timeline + client_notifications.                                  |
| `clients` (AFTER INSERT/UPDATE)               | `fn_sync_accounting_client`                              | Upserts `accounting_clients`.                                     |
| `clients` (AFTER INSERT)                      | `ensure_applicant_for_client`                            | Creates default `case_people` applicant.                          |
| `clients` (BEFORE INSERT)                     | `set_client_owner_defaults`                              | Sets owner_id/created_by.                                         |
| `clients` (BEFORE UPDATE)                     | `fn_recalc_lead_score`                                   | Lead scoring.                                                     |
| `accounting_journals`                         | `generate_journal_number`                                | JE-YYYY-NNNN.                                                     |
| `accounting_user_module_permissions`          | `fn_log_acct_perm_change`                                | Audit row.                                                        |
| `point_transactions`                          | `fn_recompute_wallet`                                    | Wallet rebuild.                                                   |
| `ai_summaries`                                | `fn_log_ai_summary`                                      | Timeline.                                                         |
| Multiple                                      | `touch_updated_at` / `touch_*_updated_at`                | `updated_at` stamp.                                               |

## Foreign-key hotspots

- `client_id` is FK in ~40 tables — renaming a client cascades widely.
- `accounting_clients.linked_crm_client_id` → `clients.id` (sync trigger).
- `client_invoice_payments.invoice_id` → `client_invoices.id`.
- `client_invoice_receipts.invoice_id` + optional `payment_id`.
- `accounting_users.auth_user_id` → `auth.users.id` (used by `is_accounting_*`).
- `user_roles.user_id` → `auth.users.id`.

## RLS shape

- Most CRM tables use `can_view_client(uid, client_id)` / `can_edit_client` / `can_upload_client` helpers.
- Accounting tables use `is_accounting_user(uid)` (read/write all-or-nothing in `ALL` policies) with entity-scoped policies on `accounting_bank_accounts` (`entity_scope` on `accounting_users`).
- Commissions: `is_commission_admin(uid)` (admin role OR accounting admin).
- Public-facing tables (assessment public funnel, share-resolve) have policy combos with `auth.uid() IS NULL` allowances tied to invitation tokens.
- All role checks go through `SECURITY DEFINER` helpers — **never** inline `EXISTS (SELECT FROM user_roles ...)` in a policy on the same table (recursion risk).
- `app_notifications` INSERT restricted to staff roles via `staff insert notifications` policy (added 2026-05-28). Viewers and clients cannot write to the notification feed.
- `app_email_logs` INSERT/UPDATE used by both `smtp-send` (direct writes) and `process-notification-email-queue` worker (failure + DLQ rows + metadata stamping). The `metadata` jsonb column carries `message_id` for idempotency tracking by the worker.

## Storage buckets (all private)

| Bucket                  | Used by                             |
| ----------------------- | ----------------------------------- |
| `client-documents`      | client document panel, OCR pipeline |
| `letter-templates`      | letter generator                    |
| `visa-forms`            | form builder                        |
| `dsh-media`             | digital success hub                 |
| `institution-documents` | UPI                                 |
| `branding`              | firm/entity logos                   |
| `voice-notes`           | call recordings / voice notes       |
| `assessment-pdf-assets` | assessment PDF wrapper              |

All buckets are **private** — clients access via signed URLs generated server-side or by authenticated reads filtered by RLS-equivalent storage policies.

## Key migrations (2026-05-29)

| Migration file                                | What it adds                                                                                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260529120000_notification_email_queue.sql` | Creates `notification_emails` and `notification_emails_dlq` pgmq queues; registers `process-notification-email-queue` pg_cron job (every 1 min) |
| `20260528024339_4a6a0662-*.sql`               | `staff insert notifications` RLS policy on `app_notifications`; converts `vw_client_current_stage` and `vw_portal_stages` to `security_invoker` |
