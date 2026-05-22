
# CRM Blueprint Export

## Goal

Produce a single, self-contained markdown file at `/mnt/documents/CRM_Blueprint.md` that fully describes the current CRM (in-scope modules only), so you can paste it into Claude for a clean restructure.

## Scope

**Included modules**
- Auth & Roles (admin, counselor, telecaller, documentation, viewer, client)
- Dashboard
- Leads (list, cold pool, new, detail, handoffs, remarks, distribution rules, import)
- Clients (list, new, detail with all tabs: overview, timeline, documents/binder, forms, chat, assessment, letters, offers, tasks, people, access, invites)
- Documents subsystem (case_sections, client_documents, client_files, binders, splits, classify, verify, fingerprints, share_links)
- Messages / Unified Chat (channels, members, messages, attachments, reactions, mentions, read receipts)
- Telecaller (queues, campaigns, call sessions/events, telephony provider, browser phone)
- Course Finder (cf_countries, cf_universities, cf_courses, shortlists, saved searches)
- Workflows / Templates (case templates, section_settings, checklist)
- Forms Library + Questionnaires (schemas, instances, filled forms, email templates)
- Letter Templates + Generate Letter
- Activity log
- Team Access (per-client sharing) and Team & Roles (Users)
- Offers & Discounts (offers, groups, audience targets, client_offers)
- Settle Abroad / Assessment (programs, questions, sessions, invitations, leads, verifications, PDF, Germany rules, NOC admin, Canada CRS)
- Masters (branches, departments, service catalogue, master_lists/items, remark presets)
- Settings (firm profile, SMTP, telephony, integrations, theme)
- Client Portal (auth, dashboard, application, files, chat, offers, refer, payments, appointments, notifications, settings, invite redeem)
- Email subsystem (templates, threads, send log/state, events, attachments, suppression, unsubscribe)
- AI Help and AI Summaries
- Shared notes infrastructure: profiles, user_roles, credit_wallet, referrals, points, notifications

**Excluded** (per request)
- Accounting (all `/accounting/*`, `accounting_*` tables, edge functions prefixed `accounting-`)
- Institutions (`/institutions/*`, `upi_*` tables, edge functions `upi-*`)
- Commissions (`/commissions`, `upi_commission*`)
- Digital Success Hub (`/digital-success/*`, `dsh_*` tables, edge functions `dsh-*`)

## Deliverable structure

The generated markdown will contain these sections:

1. **High-level architecture** — Vite + React + TS, Tailwind, shadcn/ui, React Router, TanStack Query, Supabase (Lovable Cloud) with auth/storage/edge functions, realtime channels.
2. **Roles & access model** — `user_roles` table + `has_role()` + `is_commission_admin()`; module permissions; per-client `client_access`; portal role.
3. **Route map** — full table of every in-scope route, page component path, guard, primary purpose.
4. **Sidebar IA** — exact nav structure rendered for each role, lifted from `AppLayout.tsx`.
5. **Module deep-dives** — for each in-scope module:
   - Pages & key components
   - Database tables used (with column-level summary from live schema)
   - Edge functions invoked
   - External integrations (Lovable AI, SMTP, telephony providers)
   - Known workflows / state machines
6. **Client detail page anatomy** — the most complex screen; documents the tabs, the unified Documents/Binder section (recently restructured), section_settings, default checklist behavior, backfill logic, and binder/combine flow.
7. **Data model reference** — alphabetized list of all in-scope tables with: purpose, key columns, key RLS pattern, relationships.
8. **Edge functions reference** — list of in-scope edge functions with input/output summary.
9. **Storage buckets** — buckets used, path conventions, signed-URL pattern.
10. **Auth flows** — staff sign-in, password reset, client portal invite redemption, assessment email verification.
11. **Known issues / debt** — short list of open structural problems (document section mapping, duplicated UI sections, legacy aliases in `sections.ts`, mixed Zustand vs Supabase stores, etc.) so the restructure can target them.
12. **Glossary** — domain terms (binder, case section, default doc, checklist item, handoff, cold pool, etc.).

## How it will be produced

- Read the live database via `psql` to extract column definitions for in-scope tables only (filter out `accounting_*`, `upi_*`, `dsh_*`).
- Read `src/App.tsx`, `src/components/layout/AppLayout.tsx`, `src/pages/**`, `src/components/clients/**`, `src/lib/**` (excluding accounting/institutions/digital-success folders) to enumerate routes and components.
- List `supabase/functions/` and filter out excluded prefixes.
- Aggregate into one structured markdown file written to `/mnt/documents/CRM_Blueprint.md` and emit a `presentation-artifact` so you can download/copy it.

No source code changes. Output is documentation only.

## Out of scope

- No refactor in this step.
- No schema migrations.
- No UI changes.
