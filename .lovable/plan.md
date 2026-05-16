# Fix: Agreement Extraction Validation + Test-mode Deletion

## 1. Field-level validation on extracted agreement details

**Where:** `supabase/functions/upi-analyze-agreement/index.ts` (server side, post-AI parse) and `src/institutions/components/AgreementsPanel.tsx` (UI surfacing).

### Server: build a validation pass before persisting

After Gemini returns the tool call, run `validateExtraction(parsed, ag.title)` that produces:
- `missing_fields: string[]` — fields that are null/empty out of a required set
- `low_confidence_fields: string[]` — values that look bogus (e.g., dates not ISO, currency not 3 chars, % > 100)
- `needs_review: boolean` — true if any missing/low-confidence
- `validation_notes: string[]` — human reasons

Required field set (per the spec the user gave):
- agency block — always overlaid with fixed values, never missing
- institution: legal_name, address, agent_email or phone, signing_authority
- agreement: agreement_type, valid_from, valid_to, governing_law, claim_deadline_days, invoice_deadline_days, termination_notice_days, payment_method, signed_on, institution_signed_on, institution_signed_by, sub_agent_allowed, consent_form_required, countries_allowed (non-empty), ai_summary
- commission: model_type, currency, and at least one rule

Sanity checks:
- `valid_to > valid_from`
- ISO date format `YYYY-MM-DD` for all date fields
- `currency` matches `/^[A-Z]{3}$/`
- numeric day fields in `[0, 3650]`
- each commission rule has `rule_type` and `payout_type`; `payout_amount >= 0`
- if `payout_type === "percentage"` then `payout_amount <= 100`

Persist into `extracted_data`:
```json
{
  ...,
  "validation": {
    "missing_fields": [...],
    "low_confidence_fields": [...],
    "notes": [...],
    "needs_review": true
  }
}
```

Confidence becomes: `95 - 5 * missing_fields.length - 3 * low_confidence_fields.length`, clamped to `[30, 95]`.

Also set `upi_agreements.status = 'needs_review'` (instead of whatever the model returned) when `needs_review` is true, so the badge on the card shows it immediately.

### UI: surface missing/needs-review state on the Agreement card

In `AgreementsPanel.tsx`:
- If `ext.validation?.needs_review`, render an amber "Needs review" banner inside the card listing `missing_fields` and `notes` as chips.
- The existing `Item` grid already hides null values — that already gives a visible signal of missing data, but the explicit list makes it actionable.
- "Edit dynamic fields" stays the path to fill them in manually.

No DB migration needed — `extracted_data` is already JSON.

## 2. Test-mode deletion across data/documents

Goal: while running on seed/mock data, allow deleting any uploaded document, agreement, commission, claim, suggestion, etc. — gated by a single flag so it can be turned off later.

### Flag

Reuse the existing `USE_MOCK_DATA` flag in `src/institutions/config.ts`. Add a derived export:
```ts
export const ALLOW_TEST_DELETIONS = USE_MOCK_DATA; // remove gating later by flipping to false
```

(Single source of truth — when QA goes live the team flips `VITE_USE_MOCK_DATA=false`.)

### Delete actions to add

| Where | What | How |
|---|---|---|
| Documents tab (`InstitutionDetailPage.tsx`, doc card) | Trash icon button next to "Review" | Deletes storage object in `institution-documents` bucket + row in `upi_uploaded_documents` + cascade rows in `upi_document_pipeline_events` |
| Agreements card (`AgreementsPanel.tsx`, dropdown menu) | New "Delete agreement" item, red text | Deletes `upi_agreements` row; cascade already handles related rows |
| Commissions / Claims / Promotions / AI suggestions panels | "Delete" entry in each row's overflow menu | Soft = `DELETE` directly |

Each click shows a `confirm()` dialog ("This is irreversible — delete?") and a toast on success/failure. All delete buttons are wrapped in `{ALLOW_TEST_DELETIONS && ... }` so they vanish when the flag is off.

### RLS

CRM admins already have write/delete via the existing RLS on these tables (the recent migration only tightened **commissions** to commission_admin). For `upi_uploaded_documents` and `upi_agreements` the current admin policies still cover delete, so no migration is needed. If a test deletion fails with a 403, we'll add a permissive policy in a follow-up migration scoped to admin only — but I expect existing policies to suffice.

## Files to change

- `supabase/functions/upi-analyze-agreement/index.ts` — add `validateExtraction()` + persist validation block + adjust confidence + status.
- `src/institutions/components/AgreementsPanel.tsx` — render needs-review banner; add "Delete agreement" menu item (gated).
- `src/institutions/pages/InstitutionDetailPage.tsx` — add delete button on document cards (gated), with storage + DB cleanup.
- `src/institutions/components/CommissionsPanel.tsx`, `ClaimsPanel.tsx`, `PromotionsPanel.tsx`, `AiSuggestionsPanel.tsx` — add gated delete row actions.
- `src/institutions/config.ts` — export `ALLOW_TEST_DELETIONS`.

## Out of scope

- No DB migration (unless a delete returns 403 after the UI is wired — we'll handle in a follow-up).
- No changes to the AI prompt itself; the validation is independent of the model.
- No mass "delete all" / reset button — only per-row deletes.
