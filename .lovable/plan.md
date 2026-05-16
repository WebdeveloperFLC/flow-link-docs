## Goal

Turn the existing institution Documents upload into a full AI pipeline: classify → extract → link to Agreements / Commissions / Promotions / Campaigns / AI Suggestions → trigger reminders. Reuse existing tabs/UI; no new top‑level CRM sections, no new npm packages.

## Architecture (mandatory)

```
UI components  →  hooks (useInstitutions, useAgreements, useCommissions, useClaimCycles, useDocuments, usePromotions, useAiSuggestions)
              →  services (institutionsService, agreementsService, …)
              →  repositories (supabaseRepo + mockRepo)  ← selected by config flag
              →  data source (Supabase tables OR src/institutions/mock/*)
```

- Add `src/institutions/config.ts` exporting `USE_MOCK_DATA` (default `true` in dev, overridable via `VITE_USE_MOCK_DATA`).
- Repo selection rule: real Supabase rows take priority; mock repo only fills in when the live query returns empty AND `USE_MOCK_DATA` is true. Never merge duplicates.
- Mock files live in `src/institutions/mock/` (institutions, agreements, commissions, claimCycles, promotions, invoices, disputes, clawbacks) — pages never import them directly.
- All thresholds (renewal reminder days, confidence cutoffs, claim deadlines) live in `src/institutions/config.ts`, not in components.

## Database (additions only — existing `upi_*` tables reused)

New migration adds:

- `upi_document_pipeline_events` — per‑doc state log (`uploaded → processing → extracted → needs_review → approved/rejected`), error msg, edge function name.
- `upi_claim_cycles` — institution_id, period, status, due_date, total_expected, total_received, notes.
- `upi_invoices` — institution_id, claim_cycle_id, invoice_no, amount, currency, status, sent_at, paid_at, file_path.
- `upi_renewal_alerts` — agreement_id, fire_at, threshold_days, status, dismissed_by.
- Add columns: `upi_uploaded_documents.pipeline_status text default 'uploaded'`, `extracted_payload jsonb default '{}'`, `linked_record_refs jsonb default '[]'`.
- RLS: authenticated full CRUD (matches sibling tables).

## Edge functions

Reuse existing `upi-process-document`, `upi-analyze-agreement`, `upi-extract-programs-from-doc`. Add:

- `upi-extract-commission-sheet` — Gemini structured tool call → commission + commission_rules rows (slabs, bonuses, country/intake/program specific, tax, wire deduction, aggregator).
- `upi-detect-promotions` — scans extracted_payload for waivers/bonuses/scholarships → inserts `upi_promotions` with `auto_detected=true` + optional draft `upi_marketing_campaigns`.
- `upi-document-orchestrator` — single entry called after upload. Routes by classification to the right extractor, writes pipeline events, schedules renewal alerts, generates AI suggestions.
- `upi-renewal-scan` (cron‑safe) — computes alerts at 180/120/90/60/30/7 days, plus risk flags (low enrollments, no recent apps, pending disputes) using mock/real metrics behind the service layer.

All structured extraction uses Lovable AI Gateway with tool calling (no JSON‑in‑prompt). Default model `google/gemini-3-flash-preview`, escalate to `gemini-2.5-pro` for agreements.

## Frontend changes (inside existing institution module only)

### Documents tab (enhance existing upload card)
- Type dropdown already exists; wire it to drive the extractor route.
- Per row: pipeline status pill, confidence score badge, "Review extraction" button, reprocess action.
- After upload, call `upi-document-orchestrator`; poll `pipeline_status`.

### AI Review Panel (new component, opened from Documents tab)
- Side‑by‑side: left = signed URL preview of file (PDF/image/iframe fallback); right = editable form of extracted fields grouped by section.
- Actions: Approve (commits to target table), Edit, Reject, Reprocess.

### Agreements tab (replace empty state)
- Table of agreements with: name, status, start/expiry, renewal countdown (computed), countries covered, commission model summary, linked promotions count, AI summary, alert chips.
- Row actions: View extracted rules (drawer), Download, Edit, Renewal review, Version history (uses `upi_agreement_versions`).

### Commissions tab (replace empty state)
- Active commission structures grouped by agreement.
- Show base %, slabs, bonuses, country/intake/program overrides, invoice + tax requirements, aggregator notes.
- Commission Simulator: pick program/country/intake/tuition → returns payout breakdown using rules engine in `src/institutions/lib/commissionEngine.ts` (pure function, fully driven by rule rows).

### AI Suggestions tab (already exists, currently blank)
- Render suggestions from `upi_ai_suggestions` with categories: expiring agreement, ending promo, missing invoice, claim deadline, underperforming institution, commission mismatch, missing rule, duplicate payout.
- Generate on demand via existing `upi-ask-suggestions` + new orchestrator‑emitted suggestions.

### Renewal Alert Engine (UI surface)
- Bell badge on Agreements tab counting active alerts.
- Inline alert strip on Institution Detail header when any agreement < 90 days.

## Hooks / services to add

`src/institutions/hooks/`:
`useInstitutions`, `useInstitution(id)`, `useDocuments(institutionId)`, `useAgreements(institutionId)`, `useCommissions(institutionId)`, `useCommissionRules(commissionId)`, `useClaimCycles(institutionId)`, `useInvoices`, `usePromotions`, `useAiSuggestions`, `useRenewalAlerts`, `useDocumentPipeline(documentId)`.

`src/institutions/services/` — thin orchestration (e.g. `documentsService.uploadAndProcess`, `agreementsService.approveExtraction`).

`src/institutions/repositories/` — `supabase/*.ts` and `mock/*.ts` implementing the same interface; `index.ts` picks per flag.

## Mock data (Future Link Consultants context)

Canadian institutions (Seneca, Conestoga, Centennial, Algoma, Cape Breton, Fanshawe) with realistic agreements, semester/yearly commission models, intake bonuses, claim cycles tied to Jan/May/Sep intakes, sample invoices, one dispute, one clawback. Mock files are pure data — no React imports.

## Out of scope

- Redesigning institution list / detail visual layout.
- New top‑level routes outside `/institutions`.
- New npm packages.
- Real cron scheduling (function is cron‑ready but DB cron job left for follow‑up).

## Files touched (summary)

- New: `src/institutions/{config.ts,repositories/*,services/*,hooks/*,mock/*,lib/commissionEngine.ts,components/AiReviewPanel.tsx,components/AgreementsTable.tsx,components/CommissionsPanel.tsx,components/CommissionSimulator.tsx,components/RenewalAlertsBell.tsx}`
- Edit: `InstitutionDetailPage.tsx` (wire enhanced tabs through hooks), `AiSuggestionsPage.tsx` (render via `useAiSuggestions`).
- New edge functions: `upi-document-orchestrator`, `upi-extract-commission-sheet`, `upi-detect-promotions`, `upi-renewal-scan`.
- One migration for new tables + columns.
