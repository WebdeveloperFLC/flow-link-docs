
## Scope

Upgrades to `InstitutionDetailPage`, `CourseReviewPage`, and a few edge functions. No DB schema changes unless noted in **Technical** below.

---

## 1. Overview tab — Type as a dropdown

Replace the free-text "Type" input with a `Select` (Public, Private, College, University, Polytechnic, Community College, Language School, Other). Persist the chosen value to `institution_type` exactly as today.

## 2. Documents tab — Program-sheet upload that creates programs

Today, uploads go to `upi-process-document` for generic metadata. Change behaviour:

- Add a **"Document type"** chooser on the upload card: `Program sheet`, `Agreement`, `Commission sheet`, `Brochure / other`.
- When **Program sheet** is chosen, after upload route the file to a new edge function `upi-extract-programs-from-doc` that:
  - Parses PDF/XLSX/CSV via existing parsing libs.
  - Calls Lovable AI (`google/gemini-3-flash-preview`) with a tool-calling schema covering all `KNOWN` course fields in `upi-upsert-courses` plus PGWP/co-op flags.
  - Calls `upi-upsert-courses` directly so rows land in `upi_courses_staging` for review — same review flow as web sync.
- When **Agreement** or **Commission sheet** is chosen, route to a new `upi-extract-structured` function that asks the AI for the right shape and writes rows to `upi_agreements` / `upi_commissions` (see §4).

## 3. Course Review — dynamic/extra fields and free-form search

- **Free-form search bar** at the top of `/institutions/review` that filters across `course_title`, `campus_name`, `city`, intake months, IELTS, PGWP, level, currency, etc. (a single client-side `searchText` that tests `JSON.stringify(row).toLowerCase()`).
- **Add-field button** in the Edit sheet: lets users add ad-hoc fields that are stored in the existing `metadata` JSON. This is already half-built (custom metadata) — surface it as a primary action so users can add more fields when AI extracts something new.
- **PGWP column** is already in place; verify the upsert function maps `is_pgwp_eligible` (it does) — no change needed.

## 4. Auto-detect Agreements & Commissions

Extend `upi-sync-source` and the new doc extractor to also call AI with a second tool schema that returns:

- `agreements[]` → upsert into `upi_agreements` (title, agreement_type, valid_from, valid_to, status='proposed').
- `commissions[]` → upsert into `upi_commissions` (name, model_type, rate, currency, is_proposed=true).

Both surface in their tabs with a "Proposed — accept?" badge so users can approve.

## 5. Promotions — one-click campaign run

In the Promotions tab, add a **"Run campaign"** button per promotion. Clicking it:

1. Opens a dialog to pick recipients from `clients` table (multi-select with search by name/email/phone).
2. Picks a channel (email/whatsapp/sms).
3. Picks **sender identity**: "Send as me" (current user signature) or "Send on behalf of…" (other team member dropdown — uses their signature).
4. Calls `upi-generate-content` for the body, then sends via existing `email-send` / WhatsApp edge functions.
5. Logs into `upi_marketing_campaigns` with recipients in metadata.

## 6. AI Suggestions tab — make it interactive

Currently the tab only lists rows from `upi_ai_suggestions`. Add:

- A **prompt box** at the top: "Ask AI about this institution…" with a Send button.
- On submit, call a new `upi-ask-suggestions` edge function with the institution + sources + programs + agreements context, returning a written answer plus 0..N structured suggestions that get inserted into `upi_ai_suggestions`.
- A **"Generate suggestions"** quick button that auto-prompts for common areas (missing data, pricing anomalies, expiring agreements, new programs to publish).

## 7. Fix 0% confidence for Seneca Polytechnic

Root cause: `upi-sync-source` writes `confidence_score: 0` to `upi_institution_sources` when the AI returns courses without per-source aggregation. Fix:

- After upsert, compute `confidence_score` for the source row as the average `confidence_score` of staged courses for that `source_id`, and update the row.
- Also fallback to 75 if AI returned courses but didn't include a score (most rows already have one — the bug is the source-level aggregation).

---

## Files touched

- `src/institutions/pages/InstitutionDetailPage.tsx` — type Select, doc-type chooser, run-campaign dialog, AI-ask box.
- `src/institutions/pages/CourseReviewPage.tsx` — free-form search bar.
- `src/institutions/components/RunCampaignDialog.tsx` *(new)* — recipient picker + sender identity.
- `src/institutions/components/AskAiPanel.tsx` *(new)* — prompt box for AI Suggestions.
- `supabase/functions/upi-extract-programs-from-doc/index.ts` *(new)*.
- `supabase/functions/upi-extract-structured/index.ts` *(new, agreements/commissions)*.
- `supabase/functions/upi-ask-suggestions/index.ts` *(new)*.
- `supabase/functions/upi-sync-source/index.ts` — also extract agreements/commissions; aggregate source confidence.

No migrations needed — all tables (`upi_agreements`, `upi_commissions`, `upi_ai_suggestions`, `upi_marketing_campaigns`, `clients`) already exist.

---

## Open questions before I build

1. For **Run campaign**, do you want WhatsApp/SMS now, or email-only in v1 with WhatsApp added later?
2. For **sender identity "on behalf of"**, can any team member send as any other, or should it be restricted to admins/managers?
3. Should AI-detected agreements/commissions auto-create as `status='proposed'` (requires manual accept) or auto-active?
