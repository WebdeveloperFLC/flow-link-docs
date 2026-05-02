I confirmed the issue is still present in the current database for this client: the profile is still storing passport-sourced but wrong values such as DOB `1982-01-29`, passport number `Z6678112`, issue date `2015-05-28`, expiry `2026-05-01`, and place of birth `BHATPUR`. The previous fix made passport fields override other document types, but it still trusted the AI’s extracted passport values. Because the AI is still misreading the passport itself, the merge layer is faithfully saving incorrect passport-tagged data.

## Plan

### 1. Replace prompt-only passport extraction with deterministic passport validation
Update `supabase/functions/extract-document-data/index.ts` so passport handling does not rely on the AI’s final interpreted values alone.

For passport documents, the function will:
- Ask the AI to return raw, evidence-level values separately, including:
  - MRZ line 1
  - MRZ line 2
  - current passport number label/value
  - current date of issue label/value
  - current place of birth label/value
  - visible name fields
  - old/previous passport block values separately, if present
  - file number separately, if present
- Add deterministic server-side parsing for TD3 passport MRZ lines:
  - validate passport number check digit
  - validate DOB check digit
  - validate expiry check digit
  - parse nationality and sex
  - expand years correctly (`02 -> 2002`, `32 -> 2032`)
- Only accept MRZ-derived DOB, expiry, passport number, nationality, gender, and name when MRZ check digits pass.
- If MRZ cannot be validated, mark the relevant fields as `needs_review` instead of saving guessed values.

Important correction: MRZ does not contain passport issue date. The issue date will be accepted only from the labelled current passport field such as `Date of Issue`, never from `Old Passport No.`, `Previous Passport`, `File No.`, or validity calculations.

### 2. Add hard validators before profile merge
Update `src/lib/extractedFields.ts` with passport-specific guards so bad passport fields cannot be saved even if the AI returns them.

Rules to enforce:
- Passport number must match a current passport format and must not equal:
  - File No.
  - Old Passport No.
  - Previous Passport No.
  - any long application/file reference
- DOB, issue date, and expiry must be full valid dates.
- Reject obvious inferred dates and impossible passport combinations.
- Reject issue/expiry dates that are detected as old/previous passport fields.
- Reject place of birth if it appears to come from the address block rather than the labelled `Place of Birth` field.
- Passport documents must never write `spouse_name` or `marital_status`.
- Parent fields (`Mother`, `Father`, `Legal Guardian`) must never be mapped to spouse fields.

### 3. Enforce passport-first authority across the whole identity section
Extend `PASSPORT_AUTHORITATIVE_FIELDS` and merge behavior so the Identity section treats passport data as authoritative for:
- Full name
- Date of birth
- Passport number
- Issue date
- Expiry date
- Nationality / country
- Gender
- Place of birth

Implementation detail:
- `client_profile` does not currently contain `full_name`; full name lives on the `clients` row and applicant record. I will update passport-derived full name handling so validated passport name can correct the client/applicant name only when it is confidently extracted from a validated MRZ/visible passport name, otherwise it will be marked for review.

### 4. Add confidence/source state display for passport-derived fields
Currently the UI only shows the source document chip. I will add per-field confidence/source state using the existing `source_documents` JSON structure, without needing a broad schema redesign.

Each extracted field source entry will support:
- source document name
- document type
- source authority, e.g. `passport_mrz`, `passport_label`, `ai_extracted`, `manual`
- confidence state:
  - `Extracted`
  - `Needs Review`
  - `Confirmed`

Update `ClientProfileCard.tsx` so every passport-derived field displays:
- source document
- confidence state
- authority/source type where useful

Manual edits/saves will mark edited fields as `Confirmed`.

### 5. Prioritize the Identity-section passport during re-extraction
Update `ClientDetail.tsx` re-extraction flow so it processes passport documents in the Identity section first, then other documents.

Behavior:
- If any Passport exists in the Identity section, process it first.
- Passport authoritative identity fields overwrite stale values from all other documents and previous bad passport extracts.
- Non-passport documents cannot overwrite passport-locked identity values after that.
- Relationship fields remain strict: spouse/marital status only from explicit spouse keywords or a Marriage Certificate.

### 6. Repair the currently affected client data after the code fix
After implementation, I will run the fixed extraction against the existing passport document for this client and clear/replace stale values.

Expected outcome for the current passport case:
- wrong DOB is replaced only if validated from MRZ/current passport field
- wrong passport number is replaced only if validated as current passport number, not file number or old passport number
- wrong issue/expiry dates are replaced only from current passport evidence
- place of birth is not taken from the address block
- spouse name and marital status remain empty unless a valid marriage/spouse document provides them

If the uploaded passport image/text is too ambiguous for a field, the app will leave the field unset or mark it `Needs Review` rather than saving a wrong value.

### 7. Preserve existing functionality
This fix will not remove or break:
- document preview
- document sharing links
- binder sharing links
- document verification
- file size optimization with quality retention
- custom/unlimited binder support
- section-specific auto-fill behavior

No destructive database migration is planned. If a small metadata migration becomes necessary for confidence state, it will be additive and backward-compatible.