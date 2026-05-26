# System Map — DMS/CRM Portal

Single source of truth for architecture, flows, and safety rules. Consult **before every change**.

## Index

| File | Purpose |
|---|---|
| [01-system-overview.md](./01-system-overview.md) | High-level architecture |
| [02-frontend-map.md](./02-frontend-map.md) | Pages, routes, layouts, shared components |
| [03-backend-map.md](./03-backend-map.md) | Edge functions, RPCs, triggers |
| [04-database-map.md](./04-database-map.md) | Tables, FKs, triggers, RLS, storage |
| [05-roles-and-permissions.md](./05-roles-and-permissions.md) | Roles, module perms, RLS helpers |
| [06-flows/](./flows/) | End-to-end business flows |
| [07-ui-flow-map.md](./07-ui-flow-map.md) | Modals, nested dialogs, autosave |
| [08-dependency-analysis.md](./08-dependency-analysis.md) | Shared components, fragile areas |
| [09-safety-rules.md](./09-safety-rules.md) | Hard rules for future builds |
| [10-change-impact-checklist.md](./10-change-impact-checklist.md) | Pre-change checklist |
| [diagrams/](./diagrams/) | Mermaid diagrams |

## How to use

1. Read **09-safety-rules.md** before any non-trivial change.
2. Fill **10-change-impact-checklist.md** in your PR description.
3. If the change touches an area not yet documented, update this map in the same PR.

Last generated: 2026-05-26 (read-only snapshot of live DB + repo).