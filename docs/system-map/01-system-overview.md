# System Overview

## Stack

- **Frontend**: React 18 + Vite 5 + TypeScript + Tailwind v3, shadcn/ui, react-router, TanStack Query (in places), Zustand (accounting stores), framer-motion.
- **Backend**: Lovable Cloud (Supabase) — Postgres + Auth + Storage + Edge Functions (Deno).
- **Realtime**: Supabase channels (chat, notifications, timeline, queue).
- **AI**: Lovable AI Gateway (no user keys) via edge functions (`ai-*`, `dsh-ai-*`, `upi-*`, `assessment-*`).
- **Email**: Customer SMTP via `smtp-send` edge function; dispatcher `notifications-dispatch`; queue infra `process-email-queue` / `send-transactional-email` available but Phase-1 notifications use direct SMTP.
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
- `notifications-dispatch` edge function reads from CRM + invoice tables, calls `smtp-send`.

See `diagrams/erd.mmd` for visual ERD.