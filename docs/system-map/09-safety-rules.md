# Safety Rules for Future Builds

**Every PR must comply.** Cite the rule number in the PR description when it applies.

## R1 — Financial integrity
- Never modify `client_invoices`, `client_invoice_payments`, `client_invoice_receipts`, or their triggers without re-reading `flows/invoices-payments-receipts.md` **and** running the existing flow end-to-end in preview.
- Never bypass `fn_recompute_invoice_totals` by hand-setting `amount_paid` or `status` on `client_invoices`.
- Never delete a payment row in production — set `archived_at` instead so the recompute trigger can run.

## R2 — Snapshots are immutable
- Do not edit `client_invoice_snapshots` or the `receipt_snapshot_jsonb` field. Replay history depends on them.
- Do not change column names referenced inside `fn_take_invoice_snapshot` / `fn_take_receipt_snapshot` (`firm_profile.*`, `accounting_entities.*`, `branches.*`) without updating the function in the same migration.

## R3 — RLS changes
- Never change an RLS policy without listing every helper function it depends on (`has_role`, `user_client_permission`, `is_accounting_*`, `user_has_module`, `dsh_can`).
- Never inline a `SELECT FROM user_roles` inside a policy on `user_roles` — use the SECURITY DEFINER helper. (Infinite recursion.)
- Never grant `ALL` to `public` on a CRM table.

## R4 — Modal architecture
- Never nest an `AlertDialog` inside a `Dialog`. Render as siblings with z-[70] on the AlertDialog content.
- Always add `onPointerDownOutside` + `onEscapeKeyDown` handlers to confirm dialogs that live above another dialog.
- Always include `e.preventDefault()` on the confirm-button click handler.

## R5 — Autosave & permissions
- Never change autosave without verifying that the field is covered by `can_edit_client` (or accounting equivalent).
- Never silently swallow `update().eq(...)` errors — surface via toast.

## R6 — Timeline event-type strings
- Never rename an existing `client_timeline.event_type` value. Add a new one and migrate readers first.
- Keep dispatcher events namespaced (`notification.*`).

## R7 — Notifications dispatcher
- Never change recipient resolution in `notifications-dispatch` without re-reading `flows/notifications-email-smtp.md`.
- Never remove the `bcc_accounting_inbox` / `cc_assigned_counselor` toggles silently.
- Always route outbound mail through `smtp-send`. Do not call SMTP from other edge functions directly.

## R8 — CRM ↔ Accounting sync
- Never write to `accounting_clients` from CRM code. Use the `fn_sync_accounting_client` trigger.
- Preserve `linked_crm_client_id` — it's the join key.

## R9 — Telemetry before refactor
- Add `console.info` breadcrumbs in any sensitive flow (invoice, payment, dispatcher) **before** refactoring. Remove only after verification.

## R10 — Auto-generated files
- Never edit `src/integrations/supabase/client.ts`, `types.ts`, or `.env`.
- Never edit existing files under `supabase/migrations/` — add a new timestamped migration.

## R11 — Dormant stubs
- Do not remove `on_visa_approved`, `on_application_submitted`, `on_consent_form_submitted`. They're activation points for UPI commissions.

## R12 — Storage
- Never change a bucket from private to public without a written security review.
- Always issue signed URLs for client-facing reads.

## R13 — Backward compatibility
- Do not remove a column referenced by any trigger, RPC, edge function, or UI. Deprecate via a follow-up migration after readers are updated.