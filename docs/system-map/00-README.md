# System Map — DMS/CRM Portal

Single source of truth for architecture, flows, and safety rules. Consult **before every change**.

## Index

| File                                                             | Purpose                                                          |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| [01-system-overview.md](./01-system-overview.md)                 | High-level architecture, stack, cross-domain couplings           |
| [02-frontend-map.md](./02-frontend-map.md)                       | Pages, routes, layouts, shared components                        |
| [03-backend-map.md](./03-backend-map.md)                         | Edge functions, RPCs, pg_cron jobs, verify_jwt overrides         |
| [04-database-map.md](./04-database-map.md)                       | Tables, pgmq queues, FKs, triggers, RLS, storage, key migrations |
| [05-roles-and-permissions.md](./05-roles-and-permissions.md)     | Roles, module perms, RLS helpers                                 |
| [06-flows/](./flows/)                                            | End-to-end business flows                                        |
| [07-ui-flow-map.md](./07-ui-flow-map.md)                         | Modals, nested dialogs, autosave                                 |
| [08-dependency-analysis.md](./08-dependency-analysis.md)         | Shared components, tight couplings, fragile areas                |
| [09-safety-rules.md](./09-safety-rules.md)                       | Hard rules for future builds (R1–R15)                            |
| [10-change-impact-checklist.md](./10-change-impact-checklist.md) | Pre-change checklist                                             |
| [diagrams/](./diagrams/)                                         | Mermaid diagrams                                                 |

### Key flow docs

| Flow file                                                                    | Covers                                                                                        |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [flows/notifications-email-smtp.md](./flows/notifications-email-smtp.md)     | Notification email dispatch, `QUEUE_EMAILS` flag, queue architecture, worker, DLQ, debug tags |
| [flows/notification-center.md](./flows/notification-center.md)               | In-app bell, all wired producers, HandoffBell retirement, RLS                                 |
| [flows/invoices-payments-receipts.md](./flows/invoices-payments-receipts.md) | Invoice lifecycle, payments, receipts, snapshots                                              |
| [flows/leads-and-conversion.md](./flows/leads-and-conversion.md)             | Lead intake, scoring, handoffs, conversion                                                    |
| [flows/portal-access.md](./flows/portal-access.md)                           | Client portal invite, authentication, chat                                                    |
| [diagrams/notifications.mmd](./diagrams/notifications.mmd)                   | Full notification flow diagram (in-app bell + email dispatch dual-path)                       |

## How to use

1. Read **09-safety-rules.md** before any non-trivial change.
2. Fill **10-change-impact-checklist.md** in your PR description.
3. If the change touches an area not yet documented, update this map in the same PR.

## Recent updates

| Date       | Files updated                                                                                                                   | Summary                                                                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-05-29 | `01`, `03`, `04`, `08`, `09`, `flows/notifications-email-smtp.md`, `flows/notification-center.md`, `diagrams/notifications.mmd` | Item 1: handoff/portal-chat/urgent-review notification producers wired. Item 4: `notification_emails` pgmq queue, `process-notification-email-queue` worker, `QUEUE_EMAILS` feature flag, dual-path dispatch architecture. Added R14, R15. |

Last updated: 2026-05-29.
