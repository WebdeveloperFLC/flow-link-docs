# Flow: Tasks, Timeline & Activity Logs

## Tasks
- Table `client_tasks` (kind, title, priority, due_at, assigned_to, status).
- Trigger `fn_log_task_to_timeline` writes `client_timeline` rows on INSERT and on status→done UPDATE.
- UI: `ClientTasksPanel` in client detail, plus dashboard widget.
- RLS: `can_view_client` / `can_edit_client`.

## Timeline
- Single table `client_timeline(event_type, actor_id, summary, metadata, created_at)`.
- Writers: trigger functions listed in `04-database-map.md` + manual writes via `src/lib/timeline.ts` (`appendTimeline`).
- Subscribe via `subscribeTimeline(clientId, onEvent)` (Realtime channel `timeline:<clientId>`).
- **Event type strings are a public API** for the UI — renaming breaks filters. Known values: `call`, `remark`, `handoff`, `chat`, `note`, `task`, `file`, `recording`, `status_change`, `payment_received`, `refund_processed`, `receipt_generated`, `reminder_sent`, `reminder_scheduled`, `ai_summary`, `notification.receipt_generated`, `notification.payment_received`.

## Activity logs
- Table `activity_logs(user_id, action, entity_type, details)`.
- Higher-level than timeline — used for admin actions (`leads.distributed`, etc.).
- Surfaced in `/activity`.