## Root causes

**1. "Agreement uploaded but Agreements/Commissions tab stays empty"**

`upi-document-orchestrator` routes `doc_kind = "agreement"` to `upi-analyze-agreement` and passes `{ document_id, institution_id, doc_kind }`. But `upi-analyze-agreement` reads `{ agreement_id, institution_id }` and immediately throws *"agreement_id and institution_id required"*. So:

- No row is ever inserted into `upi_agreements` from the upload flow.
- No `upi_commissions` row is created.
- The document just sits in the Documents tab with `pipeline_status: uploaded` (which matches what the screenshot shows).

This is what's happening for the Lethbridge upload too — the file is there, but no agreement/commission record is produced, so both tabs are blank.

The "wrong institution" appearance on the Conestoga page is a separate symptom: `uploadDoc` correctly uses the institution from the URL (`useParams().id`), so the file you see in Conestoga's Documents tab is one that was uploaded while the Conestoga detail page was open. Data scoping is correct; the bug is only that the pipeline never advances, so neither institution gets the derived agreement/commission rows.

**2. Confidence capped at 70%**

- `upi-extract-programs-from-doc` line 107: every course is forced to `confidence_score ?? 70` even when the model returned higher.
- Same file line 118: the uploaded document's `confidence_score` is hardcoded to `70`.
- `upi-analyze-agreement` and the orchestrator never write a confidence to the document at all — so when an agreement upload succeeds in some other path, it stays at the row default.

Course Review reads `confidence_score` per course, which is why no row ever exceeds 70.

---

## Plan

### A. Fix the agreement pipeline (server)

`supabase/functions/upi-document-orchestrator/index.ts`:

- For `doc_kind === "agreement"`, before invoking the route:
  1. Read the `upi_uploaded_documents` row (`file_name`, `file_path`, `mime_type`).
  2. Insert an `upi_agreements` row scoped to `institution_id` with `title = file_name`, `file_path`, `agreement_type = "partner"` (default), `status = "active"`.
  3. Invoke `upi-analyze-agreement` with `{ agreement_id, institution_id }` (the shape the function actually expects), not `{ document_id, ... }`.
  4. After success, update the uploaded document with `linked_agreement_id` (in `metadata`), `confidence_score` from the analyzer result (default 95), and `pipeline_status = "extracted"`.

`supabase/functions/upi-analyze-agreement/index.ts`:

- Return `{ ok, commission_id, agreement_id, confidence }` (confidence = 95 on success, 60 on partial/empty extraction).
- Also write `extracted_data.confidence = <n>` so the agreement card and AI suggestions reflect a real value instead of the hardcoded `80`.

### B. Fix confidence scoring (server)

`supabase/functions/upi-extract-programs-from-doc/index.ts`:

- Change line 107: keep AI-provided `confidence_score` when present; only fall back when missing, and use 95 (not 70). Clamp to [0, 100].
- Change line 118: compute the document's `confidence_score` as the rounded average of the extracted courses' confidences (default 95 when no courses are returned). Stop hardcoding 70.

`supabase/functions/upi-document-orchestrator/index.ts`:

- After a successful sub-route call, also update `upi_uploaded_documents.confidence_score` to the value returned by the sub-route (fallback 95) so non-program docs also reflect a real confidence rather than the table default.

### C. Verification

- Re-upload an Agreement on a known institution. Expect:
  - Documents tab: confidence shown as 95% (or the AI-computed value), pipeline `extracted`.
  - Agreements tab: one new agreement card with title = file name.
  - Commissions tab: one new "Proposed from ..." commission row.
  - AI Suggestions tab: one new `commission_structure` suggestion.
- Re-upload a Program sheet. Expect Course Review rows to show confidences as returned by the model (commonly 90–100), no longer pinned at 70.
- No CRM pages outside the Institution module are touched; no DB migrations; mock-data architecture untouched.

### Out of scope

- Frontend redesign of the tabs.
- Backfilling old `confidence_score = 70` rows (only future uploads will reflect the fix; we can add a backfill later if you want).
- Auto-routing an uploaded file to a different institution than the page you're on — uploads remain scoped to the active institution URL.
