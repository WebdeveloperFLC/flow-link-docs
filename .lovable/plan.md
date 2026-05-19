## Stage 3 — Client Registration Form

Out of scope (untouched): existing /clients list page, accounting UI, commission, institution, personal wealth modules, BRIDGE_ENABLED.

### 1. Database migration (single file)

**Extend `public.clients`** with registration columns (nullable, defaults; existing rows untouched):
- `first_name`, `middle_name`, `last_name`, `date_of_birth`, `gender`, `marital_status`
- `phone_country_code`, `phone_alternate`, `email_alternate`, `whatsapp`
- `country_of_citizenship`, `country_of_residence`
- `passport_number`, `passport_expiry`, `national_id_last4`, `pan_number`, `tax_id`
- `last_education`, `last_education_other`, `institution_name`, `year_of_passing`, `percentage_cgpa`
- `english_test` (text), `english_overall`, `english_test_date`, `english_test_expiry`
- `other_tests` jsonb (`[{type,score,date}]`)
- `branch`, `department`, `assigned_counselor_id`, `intake`, `interested_countries text[]`
- `client_type` (Student/Corporate/Partner/Referral/B2B)
- `billing_entity` (FK-ish text to accounting_entities.code), `payment_terms`
- `workflow_template_id`, `counselor_notes`, `counselor_notes_locked`, `counselor_notes_locked_at`, `counselor_notes_unlock_reason`
- `source_lead_id uuid REFERENCES leads(id)`, `converted_at timestamptz`
- `coaching_services text[]`, `visa_services text[]`, `admission_services text[]`, `allied_services text[]`, `travel_financial_services text[]`, `service_fees jsonb` (`{service_code: {amount, complimentary, currency}}`)
- New sequence `client_registration_seq` + generated `registration_number text` like `FL-YYYY-XXXX` (assigned by trigger only when source_lead_id IS NOT NULL OR a new flag is set — to avoid stamping legacy rows). Stored on the row alongside existing `application_id` so legacy code keeps working.

**New table `public.client_family_members`** — exactly the spec, plus `primary_client_id uuid REFERENCES clients(id) ON DELETE CASCADE`. RLS:
- SELECT: `can_view_client(auth.uid(), primary_client_id)` OR creator of primary_lead_id.
- INSERT/UPDATE: counselor or admin role (`has_role`).
- DELETE: admin.

**New table `public.ar_invoice_line_items`** with the exact schema the user supplied. RLS: accounting users full access; counselors/admins INSERT only when parent invoice status = 'DRAFT'; SELECT for counselors/admins on invoices for clients they can view.

**Relax `accounting_ar_invoices` RLS**: add policy allowing counselor/admin INSERT when `status = 'DRAFT'` and SELECT/UPDATE-while-draft for the row's creator. Existing accounting_users_all policy preserved.

**`service_catalogue`**: add `base_price_inr numeric`, `currency text default 'INR'`. Editable from /masters (existing ServiceCatalogueSection — minimal field addition only).

**Sequence** `client_registration_seq` + helper `generate_client_registration_number()` (`FL-YYYY-NNNN`).

**Lead conversion trigger**: when `clients.source_lead_id` set, update `leads.status='converted'`, `leads.converted_to_client_id`, `leads.converted_at`.

### 2. Route & page

- New route `/clients/new` → `src/pages/clients/ClientNew.tsx` (registered in `App.tsx`).
- Read `?lead_id=` query param. If present, fetch lead + prefill all matching fields; show `Converting lead: FL-L-…` banner.
- Sidebar: add "+ New Client" under Clients group.
- LeadDetail: add "Convert to Client" button → navigates to `/clients/new?lead_id=:id` (only if `leads.status !== 'converted'`).

### 3. Sections (10) — component layout

`ClientNew.tsx` orchestrates sections, autosave on blur via debounced upsert to `clients`, using a draft `id` created on first blur.

- `PersonalDetailsSection` — reuses `PhoneCodeSelect`, `CountrySelect`.
- `EducationTestsSection` — `qualification_levels` from master_items (same hook as lead form); English test single-select reveals fields; other tests multi-select with score+date.
- `FamilyMembersSection` — local list bound to `client_family_members` rows. Cards with relationship badge, fields, applying-together radio, visa services multi-select from `service_catalogue` (`master_key='visa_immigration'`), notes, remove. For `separate_later` rows after save, show "Convert to New Lead" → calls new RPC `create_lead_from_family_member(family_member_id)` (inserts a lead via existing `fn_assign_lead_number` trigger, sets `family_member.separate_lead_id`).
- `ServicesConfirmedSection` — wraps existing `ServiceTabs`, fetched prices visible, allied services show amount input, settlement auto-complimentary, info icon already supported.
- `InvoicePreviewSection` — live computation from selected services × selected family members applying-together. Subtotal, optional offers panel (counselor-only, gated by `has_role('counselor'|'admin')`) listing `service_offers WHERE is_active`, Apply discount → recompute, GST 18%, total. Payment terms + billing entity selects (entity from `accounting_entities`). `Create Draft Invoice` button calls handler.
- `BranchAssignmentSection`, `NotesSection` (lead notes read-only + counselor notes with lock-on-save), `ClientPortalSection` (checkbox → invoke existing portal invite edge function path or new edge function `create-client-portal-user` if missing — only for primary), `AccountingDetailsSection`, `WorkflowSection`.

### 4. Create Draft Invoice flow

Client-side handler in `ClientNew.tsx`:
1. Final upsert of client row (`registration_number` assigned by trigger).
2. Upsert family members (`primary_client_id` set).
3. Insert into `accounting_ar_invoices` (status='DRAFT', counselor RLS allows).
4. Insert one `ar_invoice_line_items` row per selected service per included person (primary + together family).
5. If `source_lead_id`: trigger updates lead.status='converted'.
6. If portal toggle: invoke edge function `create-client-portal-user` (new, service-role) → returns temp password to show once.
7. Toast and redirect to `/clients/:id`.

No accounting UI is touched; invoice appears in accounting via existing queries.

### 5. New / modified files

Created:
- `supabase/migrations/<ts>_stage3_client_registration.sql`
- `src/pages/clients/ClientNew.tsx`
- `src/components/clients/registration/PersonalDetailsSection.tsx`
- `src/components/clients/registration/EducationTestsSection.tsx`
- `src/components/clients/registration/FamilyMembersSection.tsx`
- `src/components/clients/registration/ServicesConfirmedSection.tsx`
- `src/components/clients/registration/InvoicePreviewSection.tsx`
- `src/components/clients/registration/BranchAssignmentSection.tsx`
- `src/components/clients/registration/NotesSection.tsx`
- `src/components/clients/registration/ClientPortalSection.tsx`
- `src/components/clients/registration/AccountingDetailsSection.tsx`
- `src/components/clients/registration/WorkflowSection.tsx`
- `src/lib/clientRegistration.ts` (zod schemas, upsert, invoice creation)
- `src/lib/familyMembers.ts`
- `supabase/functions/create-client-portal-user/index.ts` (only if a comparable function doesn't already exist — will confirm before adding)

Modified:
- `src/App.tsx` (route)
- `src/components/layout/AppLayout.tsx` sidebar (+ New Client)
- `src/pages/leads/LeadDetail.tsx` (Convert to Client button)
- `src/components/masters/ServiceCatalogueSection.tsx` (price field input)
- `src/lib/leads.ts` (helper to fetch lead for prefill, if not already present)

Not modified: any file under `src/accounting/`, `src/institutions/`, commission pages, `src/pages/Clients.tsx` (legacy list), `src/components/clients/NewClientDialog.tsx`.

### 6. Reuse

`CountrySelect`, `PhoneCodeSelect`, `ServiceTabs` (with info popovers), `InterestedCountriesPicker`, `useMasterItems('qualification_levels')`, master_items for branches/departments.

### 7. Deliverables to verify after build

1. Migration filename printed; `client_family_members` + `ar_invoice_line_items` exist; `clients` extended; `service_offers` untouched structurally.
2. `/clients/new?lead_id=<real id>` prefills Section 1.
3. Family member with `separate_later` → "Convert to New Lead" creates `FL-L-YYYY-XXXX` and links `separate_lead_id`.
4. Invoice preview recomputes live as services toggle and family timing changes.
5. `Create Draft Invoice` writes a row to `accounting_ar_invoices` (status DRAFT) + N rows in `ar_invoice_line_items`.
6. `/clients` list page and `NewClientDialog` are byte-identical; legacy `clients` rows render unchanged.
7. Out-of-scope observations (e.g., portal user creation requires service-role) flagged at the end.

Awaiting approval to implement.
