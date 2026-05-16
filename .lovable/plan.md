# Institutions Intelligence — Build Plan

A new self-contained "Institutions Intelligence" section added to Future Link Flow. Zero changes to existing tables, pages, nav, Odoo sync, Clients, Dashboard cards, or Course Finder logic. Only additions; all new FKs on existing tables are nullable.

## 1. Database (single migration, all `upi_*` tables)

Create every table from the spec exactly as written:

- Lookups: `upi_countries`, `upi_program_levels` (seeded), `upi_study_areas`, `upi_discipline_areas`, `upi_taxonomy_categories`, `upi_tags`
- Institutions: `upi_institutions`, `upi_institution_tags`, `upi_campuses`
- Sources & sync: `upi_institution_sources`, `upi_sync_jobs`, `upi_sync_logs`
- Documents & AI: `upi_uploaded_documents`, `upi_document_categories`, `upi_extraction_results`, `upi_ai_suggestions`
- Agreements: `upi_agreements`, `upi_agreement_versions`
- Commissions: `upi_commissions`, `upi_commission_rules`
- Courses staging: `upi_courses_staging`, `upi_course_intakes`, `upi_language_requirements`, `upi_scholarship_rules`, `upi_eligibility_rules`
- Promotions & campaigns: `upi_promotions`, `upi_marketing_campaigns`
- Audit: `upi_audit_logs`

Plus all indexes from Section 2.

**Existing `courses` table extension** (Section 3): only run the `ADD COLUMN IF NOT EXISTS` statements if a `courses` table exists in `public`. Wrapped in a `DO $$ ... $$` block that checks `information_schema.tables` first to stay safe. All columns nullable, no defaults that touch existing rows except `is_imported boolean DEFAULT false`.

**RLS (Section 9):** enable on every `upi_*` table. Authenticated users get full SELECT/INSERT/UPDATE/DELETE on all `upi_*` tables. `upi_audit_logs` is INSERT-only for authenticated users (no UPDATE/DELETE policy).

**Realtime (Section 10):** `ALTER PUBLICATION supabase_realtime ADD TABLE` for `upi_sync_jobs`, `upi_sync_logs`, `upi_ai_suggestions`, `upi_uploaded_documents`.

**Storage:** new public-read, auth-write bucket `institution-documents` with path convention `{institution_id}/{filename}`.

## 2. Navigation (additive only)

Add a new section in `src/components/layout/AppLayout.tsx` between "Settle Abroad" and "Masters":

```
INSTITUTIONS
  Institutions       → /institutions
  Course Review      → /institutions/review
  AI Suggestions     → /institutions/suggestions
```

Done by adding a new `institutionsNav` group, rendered exactly like the existing accounting group. No existing nav item is touched.

## 3. Pages (all new under `src/institutions/`)

Mirror the `src/accounting/` module layout to stay consistent:

```
src/institutions/
  pages/
    InstitutionsListPage.tsx          → /institutions
    InstitutionDetailPage.tsx         → /institutions/:id (tabs)
    CourseReviewPage.tsx              → /institutions/review
    AiSuggestionsPage.tsx             → /institutions/suggestions
  components/
    InstitutionCard.tsx, StatsBar.tsx, AddInstitutionDialog.tsx
    tabs/OverviewTab.tsx, SourcesTab.tsx, DocumentsTab.tsx,
        AgreementsTab.tsx, CommissionsTab.tsx, PromotionsTab.tsx,
        CampaignsTab.tsx, SuggestionsTab.tsx
    AddSourceDialog.tsx, SyncLogViewer.tsx, ExtractionReviewPanel.tsx
    MetadataEditor.tsx (key-value editor for jsonb metadata, with "Promote to field")
    CourseEditDrawer.tsx, GenerateContentDialog.tsx
  hooks/useInstitution.ts, useSyncJob.ts, useRealtimeLogs.ts
  lib/dedup.ts, format.ts
  types/upi.ts
```

Each tab implements every feature listed in Section 5 of the spec (sources with live sync progress, document upload + extraction review with Approve/Reject + metadata promotion, agreement upload triggering commission proposal, etc.). All UI uses existing shadcn components and semantic tokens from `index.css`. Mobile cards + desktop tables, skeleton loaders, search/filter chips, bulk actions on the review queue.

Routes wired in `src/App.tsx` (new routes only, no existing routes touched).

## 4. Dashboard additions

In `src/pages/Dashboard.tsx`, append a second row of stat cards below the existing four. Queries:

- Total Institutions, Partner Institutions, Courses Pending Review, AI Suggestions Pending, Active Campaigns, Courses Published

All via `supabase.from('upi_*').select('*', { count: 'exact', head: true })`. Existing first row is untouched.

## 5. Course Finder integration

In `src/pages/CourseFinder.tsx`, only add a display chip: if a course row has `is_imported = true`, render a small "🌐 Imported" badge + relative `last_synced_at` text under the title. No changes to filters, search, sorting, or fetching.

## 6. Edge Functions (Deno, in `supabase/functions/`)

Four new functions, each with CORS, JWT verification, input validation, and structured errors:

- **`upi-process-document`** — loads doc from Storage, extracts text (PDF via pdf-parse, Excel/CSV via SheetJS-equivalent), calls AI with the extraction system prompt from Section 6, inserts into `upi_extraction_results`, creates `new_field` suggestions for `entity_type='custom'`, updates document confidence + `is_processed`.
- **`upi-analyze-agreement`** — extracts agreement text, asks AI for commission model + rules + validity, creates a proposed `upi_commissions` row (`is_proposed=true`, `source='ai_extracted'`) with child `upi_commission_rules`, stores full structure in `upi_agreements.extracted_data`, creates a `commission_structure` AI suggestion.
- **`upi-upsert-courses`** — accepts course array, computes `dedup_hash = md5(institution_id||lower(title)||source_url)`, splits known vs unknown fields (unknown merge into `metadata`), upserts on `dedup_hash`, transitions published rows to `needs_update` instead of `pending_review`, updates `upi_sync_jobs` counters, writes `upi_sync_logs` on errors.
- **`upi-generate-content`** — loads institution context, builds channel-specific prompt (email/whatsapp/social/brochure/counselor_note) with tone, returns generated text for preview only (no auto-save).

## 7. AI provider note

The spec hard-codes `claude-sonnet-4-20250514` via Anthropic. The project already uses **Lovable AI Gateway** (`LOVABLE_API_KEY`, pre-configured, no key entry, supports `google/gemini-2.5-pro` and `openai/gpt-5` for high-reasoning extraction). The plan will use Lovable AI Gateway with `google/gemini-2.5-pro` for extraction tasks (best for long-context structured extraction) and `google/gemini-3-flash-preview` for content generation (fast, cheap). All four edge functions use tool-calling for guaranteed JSON output instead of asking the model to "return only JSON".

If you specifically want Anthropic Claude, say so and I'll request an `ANTHROPIC_API_KEY` secret instead — but Lovable AI is the recommended path (no key to manage, billed via your existing workspace).

## 8. Scope guardrails (enforced)

- No edits to: Odoo sync code, existing `courses` table behavior, existing Course Finder filters, existing Dashboard cards, existing nav items, Clients, Auth, any non-`upi_*` table.
- All new tables prefixed `upi_`. All new files under `src/institutions/` or `supabase/functions/upi-*`.
- Every typed table has `metadata jsonb DEFAULT '{}'` so AI can store fields without schema changes.

## Deliverables order

1. Migration (all tables + indexes + RLS + realtime + storage bucket + safe `courses` extension)
2. Types + shared lib (`src/institutions/types`, `lib`)
3. Edge functions (4)
4. Pages + components + routes + nav
5. Dashboard second row
6. Course Finder display chip

Approve to proceed, or tell me to switch the AI provider to Anthropic.
