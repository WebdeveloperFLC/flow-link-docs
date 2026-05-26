# Dependency Analysis

## High-blast-radius components (changes here can affect many flows)

| Component | Why it's risky |
|---|---|
| `src/components/clients/ClientInvoicesPanel.tsx` | Used by both CRM and accounting views; orchestrates invoice/payment/receipt/email; multiple nested dialogs. |
| `src/contexts/AuthContext.tsx` | Resolves all role flags; consumed by every protected route. |
| `src/integrations/supabase/client.ts` | Auto-generated — **never edit**. |
| `src/components/ui/dialog.tsx`, `alert-dialog.tsx` | shadcn primitives — z-index and portal behaviour ripple everywhere. |
| `src/components/layout/AppLayout.tsx` | Sidebar nav + role gating. |
| `src/lib/timeline.ts` | Event-type strings are an implicit contract with renderers. |
| `supabase/functions/notifications-dispatch` | Bypasses caller permission to send emails — change recipient logic carefully. |
| `supabase/functions/smtp-send` | Sole outbound mail path. |

## Shared tables (changes ripple)
- `clients` — 40+ FKs.
- `client_timeline` — UI in many places filters by `event_type`.
- `client_invoices` — locked-edit flag enforced in multiple panels.
- `accounting_users` — drives `is_accounting_*` everywhere.
- `user_roles` — drives `has_role`.
- `profiles.email` — used by dispatcher for counselor CC; missing email = silent skip.

## Tight couplings
1. **CRM ↔ Accounting clients** via `fn_sync_accounting_client`. Trigger failure rolls back client write.
2. **Invoice totals ↔ payment rows** via `fn_recompute_invoice_totals`. Changing payment schema requires updating the recompute logic.
3. **Receipt snapshot ↔ entity/branch/firm** via `fn_take_receipt_snapshot`. Renaming `firm_profile` columns breaks snapshots.
4. **Lead score ↔ call outcomes & remarks** via `fn_recalc_lead_score`. Adding new call statuses must update the SQL.
5. **Portal access ↔ `client_portal_links`** — without a link row, `getMyPortalClientId` returns null and the portal is empty.
6. **Notifications ↔ `notification_settings` singleton** — deleting the row disables BCC/CC routing.

## Fragile / known-brittle areas
- **Modal stacking** in `ClientInvoicesPanel` (history of bugs).
- **Realtime subscriptions** that don't clean up on route change (memory + stale state).
- **Storage policies** — RLS-equivalent policies on buckets must mirror table RLS; drift causes 403s.
- **Email queue** — pgmq DLQ requires manual triage.
- **Dormant trigger stubs** (`on_visa_approved` etc.) — must remain in place even though their bodies are inert.

## Reusable utilities (safe to extend, avoid forking)
- `src/lib/timeline.ts`, `src/lib/email.ts`, `src/lib/portal.ts`, `src/lib/activity.ts`.
- `src/lib/supabaseSafeInsert.ts`.
- `src/components/ui/*` (shadcn).
- `src/accounting/lib/format.ts`, `fx.ts`.