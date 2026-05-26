# System Architecture & Flow Map — Documentation Plan

This plan produces **documentation only**. No UI, business logic, RLS, or schema will be modified. The deliverable is a developer-readable reference that must be consulted before any future change.

## Deliverable

A single source-of-truth folder committed to the repo:

```
docs/system-map/
├── 00-README.md                 # Index + how to use this map
├── 01-system-overview.md        # High-level architecture
├── 02-frontend-map.md           # Pages, routes, layouts, shared components
├── 03-backend-map.md            # Edge functions, triggers, RPCs
├── 04-database-map.md           # Tables, FKs, triggers, RLS, storage buckets
├── 05-roles-and-permissions.md  # App roles, accounting roles, module perms, RLS helpers
├── 06-flows/
│   ├── leads-and-conversion.md
│   ├── clients-crm.md
│   ├── services.md
│   ├── invoices-payments-receipts.md
│   ├── documents-ocr-binders.md
│   ├── notifications-email-smtp.md
│   ├── tasks-timeline-activity.md
│   ├── portal-access.md
│   ├── accounting-and-approvals.md
│   └── automation-triggers.md
├── 07-ui-flow-map.md            # Modals, nested dialogs, autosave, data-loading sequences
├── 08-dependency-analysis.md    # Shared components, coupling hotspots, fragile areas
├── 09-safety-rules.md           # Hard rules for future builds
├── 10-change-impact-checklist.md# Pre-change checklist template
└── diagrams/
    ├── erd.mmd                  # Entity-relationship diagram (Mermaid)
    ├── invoice-lifecycle.mmd    # Invoice → Payment → Receipt → Email
    ├── notifications.mmd        # Event → dispatch → recipients → timeline
    ├── auth-and-roles.mmd       # Role resolution & RLS helpers
    └── upload-and-ocr.mmd       # Document upload → OCR → binder
```

All diagrams are **Mermaid** so they render in-repo and in PRs.

## Method (read-only exploration)

1. **Database** — enumerate via `supabase--read_query` against `information_schema` + `pg_catalog`:
   - tables, columns, FKs, indexes
   - triggers and their functions (already partially visible in context)
   - RLS policies per table
   - storage buckets and their policies
2. **Edge functions** — list `supabase/functions/*`, capture purpose, `verify_jwt`, secrets used, callers.
3. **Frontend** — walk `src/pages`, `src/components`, `src/accounting`, `src/institutions`, `src/digital-success`, `src/ai-help`, `src/components/portal`. For each: route, role gate, data sources, child dialogs.
4. **Cross-references** — for each major flow, trace UI → client lib → Supabase table/function → trigger → downstream side-effects (timeline, notifications, snapshots).
5. **Risk map** — mark every place where multiple modules share a table/component (e.g. `client_invoices`, `client_timeline`, `ClientInvoicesPanel`, `notifications-dispatch`).

## Flows to document (end-to-end)

Each flow file follows the same template:

```
Trigger → UI component → Client function → DB writes →
Triggers fired → Side-effects (timeline, notifications, snapshots) →
Downstream readers → Permissions/RLS gate → Failure modes
```

Covered flows: Leads, Lead→Client conversion, Clients CRM, Services, Invoices, Payments, Receipts, Documents/OCR/Binders, Notifications/SMTP, Tasks, Timeline, Portal, Accounting modules, Approvals, Upload, Automation triggers.

## Safety rules (file `09-safety-rules.md`)

Hard rules that future plans must cite:

- Never modify `client_invoices`, `client_invoice_payments`, `client_invoice_receipts`, or their triggers without re-reading `04-database-map.md` and `06-flows/invoices-payments-receipts.md`.
- Never change an RLS policy without listing every helper function (`has_role`, `user_client_permission`, `is_accounting_*`, `user_has_module`) that depends on it.
- Never change payment math without verifying `fn_recompute_invoice_totals` assumptions.
- Never restructure a modal in `ClientInvoicesPanel.tsx` without auditing nested `Dialog`/`AlertDialog` portals and z-index.
- Never alter autosave without re-checking role/permission gates for counselor, telecaller, documentation.
- Never rename a `client_timeline.event_type` value — downstream filters and the Notifications panel key off them.
- Never change `notifications-dispatch` recipient resolution without re-reading `06-flows/notifications-email-smtp.md`.
- Preserve backward compatibility for `accounting_clients.linked_crm_client_id` sync trigger.
- Add `console.info` breadcrumbs before refactoring any sensitive flow; remove only after verification.

## Change-impact checklist (file `10-change-impact-checklist.md`)

Template to fill in **before** any future edit:

```
- Tables touched:
- Triggers possibly fired:
- RLS policies in scope:
- Edge functions invoked:
- UI components rendered (incl. shared):
- Roles affected (app_role + accounting_role + module perms):
- Email/notification events emitted:
- Timeline events written:
- Backward-compat risks:
- Rollback plan:
```

## Scope guardrails

- No UI redesign.
- No refactors.
- No schema migrations.
- No logic removed.
- Only `docs/system-map/**` and `docs/system-map/diagrams/**` files are created.

## After approval

On switch to build mode I will:
1. Run read-only DB introspection queries.
2. Read the relevant source files in batches.
3. Write the docs above in parallel.
4. Render Mermaid diagrams and verify they parse.
5. Post the index path so you can review.
