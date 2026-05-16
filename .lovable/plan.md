## Root cause

`upi-analyze-agreement` reads the uploaded PDF with `await file.text()`. For a real PDF (Centennial College agreement), this returns binary garbage, not text — so the AI receives essentially nothing and produces no extraction.

Secondary issue: even when text is available, the extraction schema only asks for **commission fields**. It never extracts agency details, institution details, signing authorities, addresses, governing law, claim deadlines, payment method, sub-agent rules, termination notice, signed dates, etc. So the Agreement card stays empty even on a clean run.

## Fix

### 1. Send the PDF directly to Gemini (no text parsing)

Rewrite the AI call to use Gemini's multimodal input via Lovable AI Gateway. Download the file from storage, base64-encode it, and pass it as `inline_data` with `mime_type: application/pdf`. Gemini 2.5 Pro reads scanned and native PDFs natively — no `pdf-parse`/OCR plumbing needed.

Fallback chain:
- If `file_path` exists → download → base64 → send as inline PDF.
- If download fails or file is missing → fall back to current title-only prompt so it never hard-crashes.

### 2. Expand the extraction schema

Replace the commission-only tool schema with a full agreement schema that captures everything visible on the Agreement card and the dynamic field group. Tool name stays `submit_agreement_extraction`. Fields:

- **agency** (object): company, address, phone, email, website, signing_authority, signing_title, signing_email
- **institution** (object): legal_name, address, agent_email, website, phone, signing_authority, signing_title, contact_office
- **agreement** (object): title, agreement_type, valid_from, valid_to, status, signed_on, institution_signed_on, institution_signed_by, governing_law, claim_deadline_days, invoice_deadline_days, termination_notice_days, sub_agent_allowed, b2b_allowed, consent_form_required, payment_method, countries_allowed, ai_summary
- **commission** (object): model_type, currency, description, rules[] (same shape as today)

System prompt instructs the model to extract every detail it sees, leave unknown fields null, and always populate the agency block (fixed) and ai_summary.

### 3. Persist the extracted fields

After the AI call:
- Merge `agency`, `institution`, `agreement`, `commission` into `extracted_data` JSON on `upi_agreements`.
- Update `upi_agreements` row with `valid_from`, `valid_to`, `agreement_type`, `status` when present (so the card chips and countdown work).
- Insert `upi_commissions` + `upi_commission_rules` only when `commission.rules` is non-empty (today's behavior).
- Keep the `upi_ai_suggestions` row but use a richer description.

### 4. Confidence

Set confidence = 95 when at least the institution legal_name **and** one commission rule are extracted; 75 if only one is present; 60 otherwise.

## Files touched

- `supabase/functions/upi-analyze-agreement/index.ts` — rewrite as above.

No DB migration. No frontend changes — `AgreementsPanel` and `DynamicFieldGroup` already read from `extracted_data`, so once the function writes the full object the UI lights up automatically.

## Out of scope

- No mock seed of "6 ready-made agreements" for the 6 institutions. The user can upload one PDF per institution and extraction will now populate every field from this list. If you'd like seeded mock agreements as well, say so and I'll add them in a follow-up.
- No changes to commission engine or claims.

## Verification

1. Re-upload the Centennial agreement under that institution → Documents.
2. Pipeline routes `agreement` → orchestrator → `upi-analyze-agreement` (already wired).
3. Open Agreements tab → card should show valid_from/valid_to, governing law, claim deadline, termination notice, sub-agent, AI summary, and a commission proposal in AI Suggestions.
4. Check `edge-function-logs-upi-analyze-agreement` for any errors.