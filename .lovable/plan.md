## Goal

Restore the pipeline that was working yesterday end-to-end, and add a date prefix to renamed files. No new features beyond the date prefix — just bring back what regressed and tighten what's still flaky.

## What was working yesterday (and must work again)

1. Drop a document → it's auto-classified and routed to the correct section
2. File is auto-renamed to a structured name on upload
3. PDF is resized / compressed to IRCC-friendly size while keeping readability
4. CRM fields (passport #, DOB, IELTS scores, etc.) are scanned out and saved on the client/person profile
5. Authenticity check runs and produces a verification record (the "synergy gate"-like signals)

## What regressed and why

Over the last several iterations, the upload zone gained a strict **manual-review gate**: any document that classified as "Other" or fell below a confidence threshold was *paused* and required the user to pick the type from a dropdown before anything else (rename, upload, extraction, verification) could run. That gate is the most likely cause of the "everything stopped working" symptom — once a doc gets parked in `needs_type`, none of the downstream pipelines fire.

Combined with:
- Aggressive alias normalization that can drop a valid AI label as "Other" if it doesn't match the alias map
- Confidence thresholds that were tightened in the last patch

## Plan

### 1. Roll back the strict manual-review gate

In `src/components/documents/SmartUploadZone.tsx`:
- Remove the hard `needs_type` block that prevents auto-upload when classification returns "Other" or low confidence.
- Restore yesterday's behavior: **always auto-upload** with the best classification, and surface a small inline "change type" affordance on the card so the user can correct after the fact (without blocking the rest of the pipeline).
- Keep the dropdown UI, but as a *correction* tool, not a gate.

### 2. Soften classification fallbacks

In `src/lib/classifyDocument.ts` and `supabase/functions/classify-document/index.ts`:
- Keep the alias normalization map, but if the AI returns a label that isn't in the alias map AND isn't in the allowed list, log it and fall through to the AI's raw label rather than nuking it to "Other".
- Keep the scanned-PDF vision priority (this part of the recent fix was correct).
- Lower the confidence threshold back to yesterday's level so borderline-but-correct classifications go through.

### 3. Add date prefix to renamed files

In `src/lib/constants.ts`:
- Update `buildDocumentName` and `buildPersonDocumentName` to prepend `YYYY-MM-DD_` to the existing format.

New examples:
```text
2026-05-01_Passport_Applicant_JohnSmith.pdf
2026-05-01_Passport_Applicant_JohnSmith_v2.pdf
2026-05-01_IELTS_Spouse_JaneSmith.pdf
2026-05-01_MarriageCertificate_Shared.pdf
```

The date is the upload date (today), captured once per upload so versions don't drift across midnight during a single session.

### 4. Verify resize / quality pipeline is intact

In `src/lib/processFile.ts`:
- Confirm the existing 4 MB target + multi-step image compression path is still wired into `processToPdf` (it is, per the read).
- No changes planned unless QA shows a regression here.

### 5. Verify CRM extraction call site is intact

In `src/components/documents/SmartUploadZone.tsx` (around line 343–380):
- The `extract-document-data` invocation runs *after* upload completes and is wrapped in try/catch. It depends on the upload completing — which means once the manual-review gate is removed (step 1), this resumes automatically.
- No code change needed here beyond confirming the call still fires after step 1.

### 6. Verify authenticity check is wired

The `verify-document` edge function exists and is called from `src/pages/Verification.tsx`. Confirm whether it was *also* being auto-triggered on upload yesterday (likely yes, given your "synergy gate" description). If a call from `SmartUploadZone` was removed in a recent patch, restore it as a background invoke after `extract-document-data`, mirroring the same try/catch pattern.

### 7. Smoke test (manual, after deploy)

Walk through these five cases and confirm each step happens automatically with no manual intervention:

| Case | Expected |
|---|---|
| Digital PDF named `passport_john.pdf` | Classified Passport → renamed `2026-05-01_Passport_Applicant_John.pdf` → uploaded → CRM passport # extracted → verification record created |
| Scanned PDF (image-only) of a degree | Vision classifies as Academic Transcripts → renamed → uploaded → CRM grad year extracted → verification record |
| IELTS PDF | Classified Language Test → renamed → uploaded → CRM IELTS scores extracted |
| Genuinely unrecognizable scan | Classified Other → still uploaded with user-correctable type chip → no pipeline halt |
| Multi-doc binder PDF | Split → each segment runs the full pipeline above |

## Files to change

- `src/components/documents/SmartUploadZone.tsx` — remove manual-review gate, restore always-auto-upload, ensure verify-document is invoked
- `src/lib/classifyDocument.ts` — soften fallback to "Other"
- `supabase/functions/classify-document/index.ts` — restore lenient confidence handling
- `src/lib/constants.ts` — add date prefix to `buildDocumentName` / `buildPersonDocumentName`

## Out of scope (intentionally)

- No changes to the resize/compression algorithm
- No changes to the verification edge function logic itself
- No changes to the CRM extraction edge function logic
- No new database columns or migrations

If after the smoke test any of cases 1–5 still fails, I'll diagnose with live edge function logs (which I couldn't read this session because no upload had been attempted yet) before adding any further code.
