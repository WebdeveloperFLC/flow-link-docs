# Fix passport extraction errors (Manav Yogesh Patel case)

## What's wrong (verified against the uploaded PDF)

Ground truth from the passport PDF vs. what's in the profile card:

| Field | In passport | UI shows | Source of error |
|---|---|---|---|
| DOB | 28/02/2002 | 1983-01-01 | Defaulted to `YYYY-01-01` from a partial read |
| Passport number | W2624950 | Z3076602 | AI grabbed the **File No.** `AH3076602281022` instead of the passport number |
| Issue date | 11/07/2022 | 2015-05-29 | AI grabbed the **OLD passport's** issue date (M9667811 28/05/2015) |
| Expiry | 10/07/2032 | 2025-05-28 | Inferred / wrong field — old passport's old date |
| Place of birth | SANKHEDA VADODARA | BHATPUR | Picked address fragment instead |
| Spouse name | (empty) | NEHAL YOGESH PATEL | Mapped **Mother's name** to spouse_name |
| Marital status | (unknown) | married | Inferred from presence of mother field |

So the AI is misreading the passport itself. The new "passport-first override" logic doesn't help because the bad values are *also* tagged as coming from a passport — both writes have `document_type = passport`, so the override branch never fires.

## Fix in 3 layers

### 1. Sharpen the extraction prompt (`supabase/functions/extract-document-data/index.ts`)

Add passport-specific rules to the system prompt:

- **Use the MRZ line as the authoritative source** when the document is a passport. The two MRZ lines on Indian passports encode: passport number (chars 1–9 of line 2), nationality, DOB (`YYMMDD`), sex, expiry (`YYMMDD`). Two-digit years: if `YY <= currentYear%2 + 20` treat as `2000+YY`, else `1900+YY` (so `02 → 2002`, `32 → 2032`).
- **Never use the "File No." as the passport number.** File No. is labelled and starts with letters like `AH`, `BG` etc.
- **Never use "Old Passport No." / "Previous Passport" as the current passport number, issue date, place, or expiry.** Those belong to a previous booklet and must be ignored for identity fields.
- **Never map "Mother's name" or "Father's name" to `spouse_name`.** Spouse is only the field explicitly labelled `Name of Spouse` / `पति या पत्नी का नाम`. If that field is blank, return `spouse_name: null` and `marital_status: null`.
- **Place of birth** must come from the labelled "Place of Birth / जन्म स्थान" field, not from the address block.
- **Dates must be fully readable.** If only a partial date is visible, return null. **Never default missing parts to `01-01`.**
- For non-passport documents, do **not** populate `passport_number`, `passport_issue_date`, `passport_expiry`, or `passport_country` at all (return null) — these belong to the passport only.

This prevents the wrong values from being produced in the first place.

### 2. Make passport-typed extractions override previous passport-typed values too (`src/lib/extractedFields.ts`)

Current rule: passport overrides only when existing source was non-passport. Problem: the wrong values were already written by a (mis-read) passport, so a corrected re-extract is blocked as a "conflict".

New rule for `PASSPORT_AUTHORITATIVE_FIELDS`:

- If incoming doc is a passport AND incoming `file_name` differs from the existing source's file name (i.e. it's a fresh extraction or a different passport file), **always overwrite** and log a `profile.fields_overridden` entry with reason `passport_reextract`.
- If incoming doc is a passport AND same file name, treat as idempotent re-extract: still overwrite (so users can fix bad reads via "Re-extract").
- Non-passport docs continue to be silently ignored for these fields (existing behavior).
- If incoming `spouse_name` is identical to a known parent name on the same client (we already have `client_education` / family tables; for passport we'll just refuse to set `spouse_name` from a passport extraction — passports don't reliably carry spouse info on page 2 because that field is often blank). **Drop `spouse_name` and `marital_status` from passport extractions entirely** in `mergeExtractedFields` when documentType is passport, unless extracted from a Marriage Certificate.

### 3. Tighten the post-extraction sanitizer (`src/lib/extractedFields.ts`)

Before merging, run a small `sanitizePassportExtraction(extracted, documentType)`:

- If documentType is passport: drop `spouse_name`, `marital_status`, `phone_primary`, `phone_alt`, `email_alt`, `employer_name`, `job_title`, `annual_income`, `bank_name`, `account_balance`, `gic_amount`, `tuition_paid`, `ielts_*` — passports do not contain these.
- Reject any date that ends in `-01-01` *and* whose original snippet didn't actually contain `01/01` or `January 1` (heuristic: just drop `YYYY-01-01` placeholders unconditionally for passport docs — Indian passports never legitimately issue/expire on Jan 1).
- If documentType is **not** passport: drop all `passport_*` fields.

## Re-extraction UX

After the fix, the user clicks **Re-extract** on the client profile. Because the new merge logic always overwrites authoritative fields from a passport-typed re-extract, the wrong stored values (DOB 1983-01-01, expiry 2025-05-28, passport Z3076602, spouse NEHAL...) will be replaced with the correct ones from the MRZ. An audit entry `profile.fields_overridden` is logged.

For the spouse field specifically, we'll also clear it server-side during the merge when documentType is passport, so the stale "NEHAL YOGESH PATEL" entry will be wiped on the next re-extract.

## Files to edit

- `supabase/functions/extract-document-data/index.ts` — strengthen system prompt with MRZ rules, file-no exclusion, old-passport exclusion, parent-vs-spouse rule, no-default-dates rule.
- `src/lib/extractedFields.ts` — add `sanitizePassportExtraction`, broaden override rule for authoritative fields on passport-typed re-extracts, clear `spouse_name` / `marital_status` when source is passport.

No DB migrations needed. Existing `source_documents` JSONB structure is reused.

## Acceptance check (this exact PDF)

After fix + Re-extract, the profile must show:
- DOB `2002-02-28`
- Passport number `W2624950`
- Passport country `IND`
- Issue date `2022-07-11`
- Expiry `2032-07-10`
- Place of birth `SANKHEDA VADODARA` (or `SANKHEDA VADODARA, GUJARAT`)
- Spouse name **empty**
- Marital status **empty** (until a Marriage Certificate is uploaded)
- Each field's source chip = the passport file name.
