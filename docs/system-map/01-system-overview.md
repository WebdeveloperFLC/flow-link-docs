# System Overview

## Stack

- **Frontend**: React 18 + Vite 5 + TypeScript + Tailwind v3, shadcn/ui, react-router, TanStack Query (in places), Zustand (accounting stores), framer-motion.
- **Backend**: Lovable Cloud (Supabase) — Postgres + Auth + Storage + Edge Functions (Deno).
- **Realtime**: Supabase channels (chat, notifications, timeline, queue).
- **AI**: Lovable AI Gateway (no user keys) via edge functions (`ai-*`, `dsh-ai-*`, `upi-*`, `assessment-*`).
- **Email**: Two separate pipelines:
  - _Notification emails_ — `notifications-dispatch` → customer SMTP via `smtp-send`. Delivery path controlled by `QUEUE_EMAILS` env flag: direct (sync) or `notification_emails` pgmq queue → `process-notification-email-queue` worker → `smtp-send` (async, retry ×3, DLQ).
  - _Transactional/assessment emails_ — `send-transactional-email` → `process-email-queue` → Lovable managed email API (`sendLovableEmail`). Entirely separate pipeline — different queues, different sender, different logs.
- **Telephony**: SBC + `telephony-*` edge functions, browser phone client.

## Top-level domains

```
┌─────────────────────────────────────────────────────────────┐
│  CRM (Leads, Clients, Documents, Chat, Telecaller, Portal)  │
├─────────────────────────────────────────────────────────────┤
│  Accounting (Entities, COA, AR/AP, Bank, Petty, Reports)    │
├─────────────────────────────────────────────────────────────┤
│  Institutions / Commissions (UPI)                           │
├─────────────────────────────────────────────────────────────┤
│  Digital Success Hub (Media, AI Studio, Google Reviews)     │
├─────────────────────────────────────────────────────────────┤
│  Assessment (Public + Authenticated)                        │
├─────────────────────────────────────────────────────────────┤
│  Settings (Users, Roles, SMTP, Telephony, Firm, Branding)   │
└─────────────────────────────────────────────────────────────┘
```

Each domain has independent role gating (see `05-roles-and-permissions.md`). Cross-domain coupling is mediated by:

- `clients` ↔ `accounting_clients` via `fn_sync_accounting_client` trigger.
- `client_invoices` writes → `client_timeline` via triggers.
- `notifications-dispatch` edge function reads from CRM + invoice tables, calls `smtp-send` (direct) or enqueues into `notification_emails` pgmq queue (when `QUEUE_EMAILS=true`).
- `src/lib/appNotifications.ts` → `notifyUsers()` → `app_notifications` table → Supabase Realtime → `NotificationCenter` bell. Producers span CRM (handoffs, tasks, chat, invoices, access) and Accounting (payment verification).
- `accounting_users` table read by `resolveAccountingVerifierUserIds()` to fan out `urgent_review_required` in-app notifications to the accounting team.

See `diagrams/erd.mmd` for visual ERD.
