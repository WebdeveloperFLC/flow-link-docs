# Email + Voice Notes + AI Summaries

Additive build on top of the existing client workspace. No changes to telephony, telecaller queue, chat, tasks, or timeline core — only new tables, new edge functions, new UI tabs, plus trigger inserts into `client_timeline`.

---

## Phase 1 — Email Integration

### Data model (new tables, all RLS-scoped via `can_view_client` / `can_edit_client`)

- `email_threads` — `client_id, subject, last_message_at, message_count, status (open|archived), created_by`
- `client_emails` — `thread_id, client_id, direction (inbound|outbound), from_address, to_addresses[], cc[], bcc[], subject, body_html, body_text, in_reply_to (msg-id), provider_message_id, status (queued|sent|delivered|opened|bounced|failed), sent_at, received_at, sender_user_id`
- `email_attachments` — `email_id, storage_path, file_name, mime_type, size_bytes`
- `email_events` — `email_id, event_type, payload jsonb, occurred_at` (provider webhook log)
- `email_read_receipts` — `thread_id, user_id, last_read_at`
- `email_templates` — `name, subject, body_html, scope (global|user), created_by`

Triggers:
- `fn_log_email_to_timeline()` on `client_emails` INSERT → `client_timeline` event_type `email`.

Storage: reuse `client-documents` bucket under `email/{clientId}/{emailId}/...`.

### Provider-agnostic architecture

- New edge function `email-send` — accepts `{ client_id, thread_id?, to, cc?, bcc?, subject, body_html, attachments[] }`, validates ACL via `can_edit_client`, persists row, dispatches to provider adapter.
- New edge function `email-inbound` — generic webhook receiver (parses MIME, finds thread by `In-Reply-To` or subject hash, persists `client_emails` + attachments).
- Provider adapter layer in `supabase/functions/_shared/email/provider.ts` with default Resend implementation. Swap by env var `EMAIL_PROVIDER`.
- Required secrets (request only when first send is triggered): `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_INBOUND_SECRET`.

### Frontend

- `src/lib/email.ts` — list threads, list messages, send, mark-read, search.
- `src/components/clients/ClientEmailCard.tsx` — thread list + message viewer + composer with attachments, CC/BCC toggles, template picker, search box, unread badges.
- `src/components/clients/EmailComposerDialog.tsx` — reusable composer; opened from quick actions, task dialog, handoff dialog.
- Wire into `ClientDetail.tsx` as a new tab in the existing right column.
- Apply `applyContactMask` for telecaller role on displayed addresses.

---

## Phase 2 — Voice Notes

### Data model

- `voice_notes` — `client_id, context_type (timeline|chat|task|handoff|remark), context_id, author_id, storage_path, duration_ms, mime_type, size_bytes, status, created_at`
- `voice_note_transcripts` — `voice_note_id, language, text, model, status (pending|done|failed)` (architecture only — generation deferred until AI phase enables it)
- Reuse `email_attachments`-style approach for chat/task linkage via `context_type` + `context_id`.

Storage: new bucket `voice-notes` (private) with RLS via `can_view_client` on the `client_id` prefix.

Trigger: `fn_log_voice_note_to_timeline()` → timeline event_type `voice`.

### Frontend

- `src/lib/voiceNotes.ts` — record (MediaRecorder), upload, list, signed URL helper.
- `src/components/voice/VoiceRecorderButton.tsx` — push-to-record, waveform preview.
- `src/components/voice/VoiceNotePlayer.tsx` — playable audio chip used in timeline rows, chat messages, task cards.
- Hook recorder into:
  - `QuickActionsBar` (record → timeline).
  - `UnifiedChat` paperclip menu (record → chat attachment).
  - `AddTaskDialog` and `HandoffDialog` (optional voice note).
  - `AddRemarkDialog` (optional voice note).

---

## Phase 3 — AI Summaries / Auto-Notes

### Data model

- `ai_summaries` — `client_id, scope (call|email_thread|voice_note|chat_burst|client_overview), source_id, status (suggested|approved|rejected|edited), title, summary_md, key_points jsonb, next_action text, follow_up_role (counselor|telecaller|none), client_intent text, urgency (hot|warm|cold), generated_by_model, created_by, approved_by, approved_at`
- `ai_summary_sources` — `summary_id, source_type, source_id` (many-to-one back-refs to call_sessions, emails, voice_notes, chat_messages)
- `ai_summary_feedback` — `summary_id, user_id, action (approve|edit|reject), note, created_at`

Audit: every action also writes to existing `activity_logs` and inserts a `client_timeline` row of event_type `ai_summary`.

### Edge function

- `ai-summarize` — uses **Lovable AI Gateway** (`google/gemini-3-flash-preview`) with tool-calling for structured output (`key_points`, `next_action`, `urgency`, etc.). Triggered:
  - on call_session status → `completed` (Postgres trigger calls `pg_net` → function, or client-side after-call hook — we'll use client-side hook to avoid pg_net dependency).
  - on email thread activity (debounced client-side).
  - on voice note upload (client-side after upload).
  - manual "Summarize" button on the AI summary panel.

ACL: function checks `can_view_client` for the requesting user before generating.

### Frontend

- `src/lib/aiSummaries.ts` — list, generate, approve, edit, reject.
- `src/components/clients/AiSummaryPanel.tsx` — top-of-detail card showing latest approved summary + suggested summaries with Approve / Edit / Reject buttons. Realtime subscribed.
- "Use as note" / "Use as task" actions on a suggested summary that prefill the existing dialogs.

---

## Timeline wiring (new event types added — renderers extended)

`email`, `voice`, `ai_summary` added to `ClientTimelineCard` filter set and icon map. Existing renderer pattern reused.

---

## Permissions / Security

- All new tables enable RLS using existing `can_view_client` / `can_edit_client` helpers.
- Storage buckets use folder-prefix policies keyed on `client_id`.
- Telecaller role: addresses masked in UI via `applyContactMask`; AI summaries hide raw phone/email fields.
- Internal-only emails flagged with `internal_only` boolean (default false) — hidden from any future client portal.
- Audit: every send, generate, approve, reject writes to `activity_logs`.

---

## Out of scope (kept as hooks)

- Real-time IMAP polling — webhook-only inbound.
- Voice transcription model wiring (table exists, generation off).
- Omnichannel inbox page.

---

## File list

**Database**: one new migration `<ts>_email_voice_ai.sql`.

**Edge functions**: `email-send`, `email-inbound`, `ai-summarize`.

**New code**:
- `src/lib/email.ts`, `src/lib/voiceNotes.ts`, `src/lib/aiSummaries.ts`
- `src/components/clients/ClientEmailCard.tsx`, `EmailComposerDialog.tsx`, `AiSummaryPanel.tsx`
- `src/components/voice/VoiceRecorderButton.tsx`, `VoiceNotePlayer.tsx`
- `supabase/functions/_shared/email/provider.ts`

**Edited (additive only)**:
- `src/pages/ClientDetail.tsx` — add Email + Voice + AI Summary panels/tabs.
- `src/components/clients/ClientTimelineCard.tsx` — extend filter chips and icon map.
- `src/components/clients/QuickActionsBar.tsx` — add Email + Voice Note actions.
- `src/components/chat/UnifiedChat.tsx` — add voice attachment.
- `src/components/clients/AddTaskDialog.tsx`, `HandoffDialog.tsx`, `AddRemarkDialog.tsx` — optional voice attachment.

No telephony or telecaller files modified.

---

## Risks called out

- **Inbound email** requires the email provider to forward to the `email-inbound` webhook. User must paste the webhook URL into their provider after we deploy. We'll surface this clearly when secrets are added.
- **AI summary generation** uses Lovable AI credits — rate limits (429) and credit exhaustion (402) are surfaced as toasts.
- **Voice recording** depends on `MediaRecorder` browser support (modern Chromium/Firefox/Safari OK; iOS Safari 14+).
- The migration is large; it will be applied in one transaction. Existing data is untouched.

Order: Phase 1 (email tables + send/receive + UI) → Phase 2 (voice tables + recorder + players) → Phase 3 (AI tables + edge fn + panel) → Timeline wiring + audit polish.