# Operationalize Client Workspace

Additive enhancements to the existing client workspace. No rebuild — every change layers on top of `ClientChatWorkspace`, `UnifiedChat`, `ClientTimelineCard`, and the documents panel already on `/clients/:id`.

---

## 1. Database (one migration)

New tables (all RLS-scoped via `can_view_client` / `can_edit_client`):

- **`client_tasks`** — `client_id, title, description, assigned_to, created_by, due_at, priority (low|normal|high|urgent), status (open|in_progress|done|cancelled), kind (task|callback|reminder), completed_at, completed_by`.
- **`chat_message_meta`** — extends `chat_messages` without altering it: `message_id (unique), parent_id (reply thread), pinned, edited_at, deleted_at`.
- **`chat_message_reactions`** — `message_id, user_id, emoji` (unique triple).
- **`chat_message_mentions`** — `message_id, mentioned_user_id, read_at`.
- **`chat_message_attachments`** — `message_id, storage_path, file_name, mime_type, size_bytes`.
- **`chat_read_receipts`** — `channel_key (text), user_id, last_read_at` for unread indicators.

Extend existing tables:
- `chat_messages`: nothing changed (we use `chat_message_meta` for additive fields → safe).
- `lead_handoffs`: add `status` (`pending|accepted|completed|rejected`) and `responded_at` if not present.

Trigger / function additions:
- `fn_log_call_session_to_timeline()` → on INSERT/UPDATE of `call_sessions` insert into `client_timeline` (event_type `call`, summary built from direction + status + duration, metadata includes recording_url, disposition).
- `fn_log_handoff_to_timeline()` → on INSERT of `lead_handoffs`.
- `fn_log_document_to_timeline()` → on INSERT of `client_documents`.
- `fn_log_task_to_timeline()` → on INSERT/UPDATE of `client_tasks` (created/completed).
- `fn_log_status_change()` → on UPDATE of `clients.status`.
- `fn_log_access_change()` → on INSERT of `client_access`.

Realtime publication: add `client_tasks`, `chat_message_meta`, `chat_message_reactions`, `chat_message_mentions`, `chat_message_attachments`, `lead_handoffs` (if not already), `client_timeline` (already).

Storage bucket: reuse existing `client-documents` bucket for chat attachments under prefix `chat/{clientId}/...`.

---

## 2. Activity Timeline expansion

Edit `src/components/clients/ClientTimelineCard.tsx`:
- Add filter chips (All / Calls / Chat / Handoffs / Tasks / Documents / Notes / Status).
- Add search input (debounced, filters client-side over loaded rows).
- Add cursor pagination ("Load more") via `created_at < cursor` query.
- Realtime already wired — extend to render new event types: `task`, `status_change`, `assignment`, `reminder`, `recording`.
- New row renderers per event type with proper icon + colored badge.

Backend triggers (above) ensure all events auto-populate. No frontend code needs to insert manually for those flows.

---

## 3. Internal team thread upgrade

New file `src/components/chat/EnhancedChat.tsx` — wraps `UnifiedChat` behavior but adds:
- **Mentions**: `@` triggers a popover listing profiles (filter by name/email). Selected mention writes `<@uuid>` token; renderer resolves to `@Name` chip. On send, insert rows into `chat_message_mentions`.
- **Reply threads**: each message has a "Reply" action → opens a side drawer showing parent + child messages (filtered by `parent_id`).
- **Reactions**: emoji picker on hover; toggles row in `chat_message_reactions`.
- **Pinned notes**: pin toggle on message; pinned strip rendered at top of thread.
- **File sharing**: paperclip → uploads to `client-documents/chat/{clientId}/...`, inserts attachment row, sends a message with attachment chip.
- **Search**: search bar filters messages by `ilike` over `message`.
- **Quick client actions**: in internal thread only, slash menu (`/call`, `/task`, `/handoff`, `/note`) opens existing dialogs prefilled.
- **Task from message**: "Create task" action on a message → opens task dialog with message excerpt prefilled.

Used only by internal thread (`channelType="staff_internal"`) initially; client chat uses the same component with limited features (no slash menu, no internal-only pin).

---

## 4. Client chat upgrade (shared inbox)

Same `EnhancedChat` component reused with `channelType="staff_client"`:
- Sender name + role chip rendered on every message (already partial).
- Typing indicators (already wired via broadcast — keep).
- Unread badge: based on `chat_read_receipts`; on mount, update `last_read_at`. Sidebar nav can read aggregate unread later.
- File sharing: same attachment flow.
- Voice notes: scaffold a record button that uploads `audio/webm` to bucket and posts as attachment (UI present, recording stub OK).
- Search: same component-level search.
- All authorized staff (via `can_view_client`) can reply — RLS already permits.

---

## 5. Tasks + Callbacks panel

New file `src/components/clients/ClientTasksCard.tsx` — rendered on client detail page next to chat:
- List grouped by `Open / Today / Upcoming / Overdue / Done`.
- Create task dialog (`AddTaskDialog`) — title, due_at picker, assignee (telecallers + counselors with access), priority, kind (task/callback/reminder).
- Quick complete checkbox; reschedule action.
- Realtime via `client_tasks` channel.
- Overdue rows highlighted in destructive tone.

Hooks: `src/lib/clientTasks.ts` (list, create, update, complete, subscribe).

---

## 6. Quick Actions sticky panel

New file `src/components/clients/QuickActionsBar.tsx` rendered as a sticky right-rail or top toolbar on `ClientDetail.tsx`:
- Call (reuses `CallClientButton`).
- WhatsApp (`https://wa.me/{phone}` deep link, masked for telecallers).
- Email (`mailto:` deep link, masked for telecallers).
- Add note (opens `AddRemarkDialog`).
- Create task (opens new `AddTaskDialog`).
- Push to counselor / Push to telecaller (opens existing `HandoffDialog` with role preset).
- Upload document (opens existing `SmartUploadZone`).
- Mark hot / warm / cold (updates active `call_queue_items.lead_status` + writes timeline).

---

## 7. Handoff history card

New file `src/components/clients/HandoffHistoryCard.tsx`:
- Lists `lead_handoffs` for the client with from→to (resolved names + role chips), note, task_label, status, timestamp.
- Shows current owner banner at top (latest accepted handoff, else `clients.owner_id`).
- Accept / Reject buttons for the receiving user (updates `status`, writes timeline).

---

## 8. Performance + role-based security

- Timeline + chat use `limit + cursor` pagination (default 50).
- Subscriptions are per-card with cleanup on unmount.
- Telecaller masking: `QuickActionsBar` uses `applyContactMask` from `src/lib/masking.ts` based on `useAuth().role === 'telecaller'`.
- Internal thread already RLS-protected (`channel_type=staff_internal` + `can_view_client`); client cannot ever be granted that view.
- Audit: every action goes through `logActivity()` (already present) or timeline trigger.

---

## 9. Wiring on `ClientDetail.tsx`

Layout becomes:
```text
┌─ PageHeader + QuickActionsBar (sticky) ─┐
├─ left: ClientProfileCard, CasePeople,   │
│        Documents, Forms, Binders        │
├─ right: Tabs                            │
│   ├─ Activity (ClientTimelineCard)      │
│   ├─ Internal thread (EnhancedChat int.)│
│   ├─ Client chat (EnhancedChat client)  │
│   ├─ Tasks (ClientTasksCard)            │
│   └─ Handoffs (HandoffHistoryCard)      │
└──────────────────────────────────────────┘
```
Existing cards remain — only additive imports + a new tab/section grid.

---

## 10. Out of scope (kept as architecture hooks)

- Real WhatsApp / Email API send — link-out only for now.
- AI summaries / sentiment — schema leaves room (`client_timeline.metadata`, `chat_message_meta` extensible).
- Voice note transcription.
- Omnichannel unified inbox page.

---

## Files

**New**
- `supabase/migrations/<ts>_workspace_ops.sql`
- `src/lib/clientTasks.ts`, `src/lib/chatEnhanced.ts`, `src/lib/mentions.ts`
- `src/components/chat/EnhancedChat.tsx`, `MentionInput.tsx`, `MessageActions.tsx`, `ReactionBar.tsx`, `ReplyThreadDrawer.tsx`, `AttachmentChip.tsx`
- `src/components/clients/ClientTasksCard.tsx`, `AddTaskDialog.tsx`, `QuickActionsBar.tsx`, `HandoffHistoryCard.tsx`

**Edited**
- `src/pages/ClientDetail.tsx` (add tabs + sticky bar)
- `src/components/clients/ClientTimelineCard.tsx` (filters, search, pagination)
- `src/components/clients/ClientChatWorkspace.tsx` (swap UnifiedChat → EnhancedChat)
- `src/lib/chat.ts` (mention parse helper, attachment helpers, read-receipt write)
- `src/integrations/supabase/types.ts` (auto-regenerated after migration)

No telephony or telecaller files are modified.