
# Stage 1 + 2 — Masters extension and Lead form

## ⚠ Blocker to resolve before I run the migration

Your two answers conflict. Answer 1 said *"create all three + define service_catalogue schema"*. Answer 2 said *"service_catalogue already exists in the database fully seeded — do NOT recreate or reseed it"*.

I just verified: **`service_catalogue`, `branches`, and `departments` do not exist** in this database. The only service-ish/lead-ish tables present are `assessment_leads`, `lead_handoffs`, `lead_remarks`, `vw_lead_funnel`. So I have to create `service_catalogue` and define its schema and seed it for the lead form's service tabs to work.

Two ways forward — pick one before I implement:
- **A.** I create `service_catalogue` with the columns implied by your pre-task spec (see below) and seed it with a minimal scaffold of master_keys + a handful of placeholder services per group, so the lead form can render. You then paste / import the real catalogue rows.
- **B.** You paste the actual `service_catalogue` rows (or a CSV) and I seed from that in the same migration.

Everything else below is unblocked.

## Scope of this plan

- Stage 1: DB migration + Masters page extension.
- Stage 2: `/leads`, `/leads/cold`, `/leads/new`, lead detail (read-only), sidebar wiring.
- **Out of scope** (Stage 3, later): full client registration form, live invoice preview, portal access creation, "Convert to Client" behaviour beyond setting `leads.status='converted'` + storing `converted_to_client_id` placeholder.

## Database migration

Single timestamped migration file under `supabase/migrations/`.

**Creates:**
- `branches` — your schema, seed all 10 rows.
- `departments` — your schema, seed all 8 rows.
- `service_catalogue` — columns: `id, master_key, service_name, sub_category, country_tag, pricing_type, fee_inr, fee_cad, fee_gbp, max_fee_inr, notes, is_active, display_order, created_at, updated_at`. Constraint `master_key IN ('coaching_services','visa_immigration','admission_services','allied_services','settlement_services','travel_financial')`. Seed per choice A above (or your CSV per B).
- `leads` — your full schema verbatim.
- `lead_number_sequences` — your schema.
- `generate_lead_number(p_type text)` — your function verbatim, `SECURITY DEFINER`, `search_path=public`.
- Trigger `before insert on leads` to call `generate_lead_number('L'|'C'|'B')` based on `lead_type` / `is_cold_pool` if `lead_number` is null. Plus `touch_updated_at` triggers on all four new tables.

**Master items inserts (data-only, no schema change):**
Two new rows in `master_lists` (`lead_sources`, `work_modes`) plus 16 + 4 rows in `master_items` with sort_order. No edits to existing master rows.

**RLS:**
- `branches`, `departments`, `service_catalogue`: SELECT authenticated; INSERT/UPDATE/DELETE admin only.
- `leads`: exactly the policies you specified (using existing `has_role` and `is_accounting_admin` helpers).
- `lead_number_sequences`: no client-side access; only the SECURITY DEFINER function touches it.

## Masters page extension (`src/pages/Masters.tsx`)

Existing 6 sections untouched. Sidebar grouped into three headers:
- **Application & Workflow** — the 6 existing lists, unchanged.
- **Operational** — Branches, Departments, Lead Sources, Work Modes.
- **Services (read + edit, no add/delete)** — Coaching, Visa & Immigration, Admission, Allied, Settlement, Travel & Financial.

Lead Sources and Work Modes use the existing `MasterItem` editor untouched. Branches and Departments share one new generic component `MasterTableSection` (same look as existing rows: order arrows, label, active switch, edit/delete) wired to their own tables. Service sections reuse the same component in read+edit mode: hides the "+ New" button and delete action, only allows editing `service_name`, `fee_inr/cad/gbp`, `notes`, `is_active`, plus the per-list extra columns from your spec. Visa group has a country sub-grouping header.

## Lead UI (Stage 2)

New files:
- `src/pages/leads/LeadsList.tsx` (`/leads`, `/leads?temp=hot,warm`)
- `src/pages/leads/ColdPool.tsx` (`/leads/cold`, with [Import CSV] button)
- `src/pages/leads/LeadNew.tsx` (`/leads/new`, also mountable as slide-over)
- `src/pages/leads/LeadDetail.tsx` (`/leads/:id`, read-only + [Edit] + [Convert to Client])
- `src/components/leads/LeadFormWarmHot.tsx` (sections 1–6)
- `src/components/leads/LeadFormCold.tsx` (minimal)
- `src/components/leads/LeadModeSwitch.tsx`
- `src/components/leads/ServiceTabs.tsx` (5 tabs reading from `service_catalogue`)
- `src/components/leads/VisaLockToggle.tsx` (handles clear+scroll+focus+note template)
- `src/components/leads/InterestedCountriesPicker.tsx`
- `src/components/leads/BulkImportColdDialog.tsx` (CSV mapping → batched insert)
- `src/lib/leads.ts` (queries, auto-save mutation, country code lookup helper)
- `src/components/leads/LeadSlideOver.tsx` (used from `/leads` and `/clients` "+ New Lead" buttons — adds button to existing pages without changing other behaviour)

Auto-save: each field `onBlur` calls an upsert on `leads` (insert on first blur → returns `lead_number`, then updates). Toast on first save shows the generated number. Field-level dirty tracking to avoid no-op writes.

Visa lock behaviour: checkbox clears `visa_services`, sets `visa_locked=true`, scrolls to notes (`scrollIntoView({behavior:'smooth'})`), focuses textarea, prepends the template if textarea is empty, sets 🔒 on the Visa tab trigger.

Cold mode validation: `react-hook-form` + `zod` with two schemas — warm/hot (strict) and cold (relaxed: requires first_name, last_name, and one of email/phone). Mode switch resets validation.

CSV import: `papaparse` (already common in Vite/React projects — confirm or add as dep), column mapper UI, server-side dedupe on email/phone before insert, summary modal.

## Sidebar wiring

Edit `src/components/layout/AppLayout.tsx` (or the existing sidebar config) to insert a **Leads** section above Clients with the 4 routes listed. Add "+ New Lead" button to the `Clients.tsx` and `LeadsList.tsx` page headers that opens `LeadSlideOver`.

## Verification checklist (will report after build)

1. Migration filename.
2. Files created/modified.
3. Insert one warm + one cold lead from the form → confirm `FL-L-2026-0001` and `FL-C-2026-0001`.
4. Toggle visa-lock in dev preview → confirm tab greys, scroll happens, notes get template + focus.
5. Submit cold form with only `first_name + last_name + email` → confirm 201.
6. Open `/masters` and confirm all 6 original lists render with the same item counts as before the migration; confirm Branches=10, Departments=8, Lead Sources=16, Work Modes=4, and 6 service sections render rows from `service_catalogue`.
7. `select count(*) from clients` before vs after migration is unchanged. No edits to `/clients` page or `clients` table.
8. Anything noticed outside scope.

## Out of scope (flagged for your Stage 3 prompt)

- Full client registration form (`/clients/new` rewrite) and Convert-to-Client field pre-fill behaviour beyond stub.
- Live invoice preview + hidden offers reveal.
- Portal access creation flow.
- Department-filtered counselor dropdown will use any user with `counselor` role for now; per-department user mapping isn't in your schema yet — flagging for Stage 3.
- "Auto-fill phone country code from country of residence" needs a country→dial-code map; will use the existing `src/lib/countryCodes.ts`.

---

**Reply with `A` or `B` for the service_catalogue question**, then I'll implement.
