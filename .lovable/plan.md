## Background

The DB already supports multiple WhatsApp lines: `whatsapp_business_lines.meta_phone_number_id` has a global unique constraint (correct — one Meta phone ID lives on exactly one line) and `whatsapp_conversations.business_line_id` already routes each conversation to its line. The webhook (`whatsapp-webhook`) already reads `metadata.phone_number_id` and calls `resolveBusinessLine`, and outbound send uses `getConversationSendLine` per conversation. Backward compatibility is therefore already in place.

The real bugs are in the **UI + save logic + delete logic + inbox UX**:

- `listBusinessLines()` filters `active=true`, so inactive lines (currently `Help Desk Vani 1165957396602007` and `Sonali 1096159896922434`) are invisible — but their Meta IDs still occupy the unique constraint. Re-adding the same ID crashes.
- `deleteBusinessLine` only soft-deletes (sets `active=false`), so the Meta ID stays reserved forever with no way to reclaim it from the UI.
- The "Primary helpline Meta Phone number ID" field forces an `UPDATE` onto the default-helpline row's `meta_phone_number_id`; if that ID already exists on any other row (active or not), Postgres raises `whatsapp_business_lines_meta_phone_unique`.
- Inbox has no line filter, and the conversation list doesn't show which line a conversation arrived on.

## Changes

### 1. Line management dialog (`src/pages/WhatsAppInbox.tsx`)

- Load **all** lines (drop the `active=true` filter — see api change below) and group them in the dialog as: Primary helpline, Additional helplines, Counselor direct lines. Show inactive lines greyed-out with a "Reactivate" action.
- Drop the special "Primary helpline Meta Phone number ID" text field. The default helpline becomes a normal editable row (Edit → change label, display number, Meta ID). This removes the hidden cross-row update that causes most duplicate-key crashes.
- Add a "Reactivate" action for inactive lines, and a "Delete permanently" action (hard delete) — only allowed when the line has zero conversations, otherwise fall back to soft-delete.
- Pre-save guard: if the entered Meta ID already exists on another row, show a clear toast ("This Meta Phone Number ID is already used by '<label>' — edit that line instead") instead of letting the constraint error surface raw.

### 2. Save / delete API (`src/lib/whatsapp/api.ts`)

- `listBusinessLines()`: remove `.eq("active", true)`. Add `listActiveBusinessLines()` for places that need only active rows (inbox filter, line picker).
- `saveBusinessLine`: before insert/update, query by `meta_phone_number_id` and reject if it belongs to a different row id, with a friendly error message.
- `deleteBusinessLine`: keep soft-delete as default, add `hardDeleteBusinessLine(id)` for rows with no conversations (checked via `whatsapp_conversations` count); used by the new "Delete permanently" action.
- Remove `updateDefaultHelplineMetaId` usage from the dialog save flow (function can stay for back-compat but is no longer called from UI).

### 3. Inbox line filter (`src/pages/WhatsAppInbox.tsx`)

- Add a top-of-list selector: "All lines" + one entry per active line (label + display phone). Persist selection in `searchParams` (`?line=<id>`).
- Pass the selected `lineId` into `listConversations` and apply `.eq("business_line_id", lineId)` server-side when set. Realtime subscription continues to listen to all inserts; the client-side filter re-applies on incoming rows.

### 4. Conversation list badges (`src/pages/WhatsAppInbox.tsx`)

- For each conversation row in the list, show a small badge with the line's short label (e.g. `India Helpline`, `Help Desk`, `Santosh Direct`) derived from the already-loaded `businessLines` map. Counselor lines get a distinct variant.
- The detail panel already shows `activeLine`; keep that.

### 5. Permissions

- Allow non-admin staff (existing inbox viewers) to read active lines (already allowed by `whatsapp_business_lines_select` policy). Line CRUD remains admin-only (already enforced).

### 6. Out of scope (per request)

No changes to: message sending, templates, attachments, CRM client linking, assignment history, notifications, webhook routing logic (already correct), or auto-assignment (already correct via `applyWhatsAppAutoAssignment`).

## Technical notes

- No DB migration needed. Unique constraint on `meta_phone_number_id` is **kept** — it's the correct invariant (one Meta phone ID = one line). The fix is to surface and manage the existing rows, not to relax the constraint.
- Hard-delete safety: check `select count(*) from whatsapp_conversations where business_line_id = $id`. If > 0, refuse hard delete and tell the user to soft-delete (deactivate) instead.
- Realtime: existing channel subscription on `whatsapp_conversations` keeps working; just re-filter client-side on `business_line_id` when a line filter is active.

## Acceptance check

After implementation, verify:
1. Admin opens dialog → sees all 4 existing lines (including the two inactive ones).
2. Admin can reactivate `Help Desk Vani` or hard-delete it (no conversations attached) → re-adding `1165957396602007` succeeds.
3. Inbox shows a line filter; selecting "Help Desk" shows only its conversations.
4. Each conversation row in the list has a line badge.
5. Existing helpline `908327672373769` keeps receiving messages exactly as before (no webhook changes).
