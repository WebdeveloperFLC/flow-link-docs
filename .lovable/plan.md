# Passport-First Precedence for Identity Fields

## Problem

Looking at the screenshot, the client profile shows core identity fields (DOB, Passport number, Issue date, Expiry date, Nationality, Place of birth, Gender) all sourced from `2026-05-01_MedicalReport_…`. A medical report is not authoritative for passport data, and the value `w2624950` is clearly a stray OCR string mistakenly captured as a passport number.

Root cause is in `src/lib/extractedFields.ts` → `mergeExtractedFields`. The merge logic is **first-write-wins**: whichever document is uploaded first writes the field, and any later upload (even a real Passport) only logs a conflict and never overwrites. So if a Medical Report is processed first, its noisy values stick forever.

## Fix: Authoritative-Source Override

Introduce a precedence rule: for a defined set of "core identity" fields, a document classified as a **Passport** always overrides whatever non-passport source previously wrote that field. Passport-vs-passport stays first-write-wins (with conflict logging) so two passports don't silently overwrite each other.

### Core identity fields (passport authoritative)
- `date_of_birth`
- `passport_number`
- `passport_issue_date`
- `passport_expiry`
- `passport_country`
- `nationality`
- `place_of_birth`
- `gender`

All other fields (address, education, finance, IELTS, contacts) keep current first-write-wins behaviour.

## Changes

### 1. `src/lib/extractedFields.ts`
- Add constant `PASSPORT_AUTHORITATIVE_FIELDS` listing the 8 fields above.
- Add `isPassportDoc(documentType, customType)` helper that returns true when the document type label normalises to "passport" (case-insensitive, also matches `"Passport"` master entry).
- Extend `mergeExtractedFields` signature with `documentType?: string | null` and `customType?: string | null`.
- New merge rule inside the field loop:
  - If field is in `PASSPORT_AUTHORITATIVE_FIELDS` AND the incoming doc is a passport AND the existing source for that field (read from `source_documents[field]`) was **not** a passport → **overwrite** the value, update `source_documents[field]`, push to `written`, and log an `profile.fields_overridden` activity entry (so the change is auditable).
  - If field is in `PASSPORT_AUTHORITATIVE_FIELDS`, incoming is passport, and existing source was already a passport → keep current conflict-logging behaviour (don't silently clobber another passport).
  - Non-passport documents trying to write a core identity field that already has a value coming from a passport → skip (do not even log conflict; passport wins).
  - All other cases keep today's behaviour.
- To know the existing field's source we already have `existing.source_documents` (filename → field map). We extend it to also store the `document_type` per field. New shape: `source_documents[field] = { file_name, document_type }`. Reading code stays backwards-compatible: if value is a string we treat it as `{ file_name: value, document_type: null }`.

### 2. `src/components/clients/ClientProfileCard.tsx`
- Update the `sourceMap` reader (`sourceMap[f.key]`) to handle both the legacy string shape and the new `{ file_name, document_type }` shape so the existing "✨ filename" hint keeps rendering.

### 3. Call sites pass document type
Three places already know the doc type at merge time — pass it through:
- `src/components/clients/SectionBuilderCard.tsx` (around line 330) → pass `effectiveType` and `customType`.
- `src/components/documents/SmartUploadZone.tsx` (around line 372) → pass `effectiveType` and `customType`.
- `src/pages/ClientDetail.tsx` re-extract loop (around line 176) → pass `effectiveType` and `d.custom_type`.

### 4. Backfill / re-extract guidance
For the user's current record where the Medical Report wrote bad passport data, re-running "Re-extract" after this fix will detect the real Passport document, see the existing source is non-passport, and override the bad fields. No migration needed.

## Technical Detail

```ts
// src/lib/extractedFields.ts
export const PASSPORT_AUTHORITATIVE_FIELDS: ProfileField[] = [
  "date_of_birth", "passport_number", "passport_issue_date",
  "passport_expiry", "passport_country", "nationality",
  "place_of_birth", "gender",
];

const isPassportDoc = (t?: string | null, c?: string | null) => {
  const s = `${t ?? ""} ${c ?? ""}`.toLowerCase();
  return /\bpassport\b/.test(s);
};

// Inside merge loop, when current value exists and differs:
const incomingIsPassport = isPassportDoc(documentType, customType);
const existingSrc = sourceMap[field]; // {file_name, document_type} | string | undefined
const existingType = typeof existingSrc === "string" ? null : existingSrc?.document_type ?? null;
const existingIsPassport = isPassportDoc(existingType, null);

if (PASSPORT_AUTHORITATIVE_FIELDS.includes(field)) {
  if (incomingIsPassport && !existingIsPassport) {
    // OVERRIDE
    toWrite[field] = incoming;
    sourceMap[field] = { file_name: fileName, document_type: documentType ?? null };
    written.push(field);
    overrides.push({ field, previous: current, previous_source: existingSrc, new_source: fileName });
    continue;
  }
  if (!incomingIsPassport && existingIsPassport) {
    // Passport already won, ignore non-passport
    continue;
  }
}
// else fall through to today's conflict path
```

A new activity event `profile.fields_overridden` is logged whenever the override path fires so the audit trail is preserved.

## Files Edited
- `src/lib/extractedFields.ts`
- `src/components/clients/ClientProfileCard.tsx`
- `src/components/clients/SectionBuilderCard.tsx`
- `src/components/documents/SmartUploadZone.tsx`
- `src/pages/ClientDetail.tsx`

## Out of Scope
- Existing preview / share-link / verification / PDF-optimisation flows are untouched.
- Section-scoped extraction logic from the previous refactor is untouched.
- No DB migration: `source_documents` is already a `jsonb` column and accepts the richer shape.
