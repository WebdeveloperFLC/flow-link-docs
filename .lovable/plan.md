## What's broken

Two related issues, both visible on the client you just uploaded into:

1. **Renames don't flip the checklist.** The merged PDF you split contained a "10th Marksheet" page. You renamed it to "Passport Copy", uploaded it under Academics, and the **Academic Transcripts** checklist row stayed *Pending*. The render-time matcher (`docByType` in `src/pages/ClientDetail.tsx`) requires the document's `document_type` (or `custom_type` when type is "Other") to be **byte-equal** to the checklist item's name. "Passport Copy" / "10th Marksheet" / "PTE Result" never match "Passport" / "Academic Transcripts" / "English Language Proficiency Test", so the row never goes Ready.

2. **Even when names should match, the writeback doesn't help.** `markChecklistItemReady` writes the matched checklist name into `custom_type`, but `docByType` ignores `custom_type` whenever `document_type !== "Other"`. So the alias logic in `src/lib/checklist.ts` is effectively dead for canonical types like "English Language Proficiency Test". (The doc you just uploaded is in the DB with `document_type = "English Language Proficiency Test"` and the checklist has the same name verbatim — it should already match; but if any future rename / type-edit lands here, the writeback is silently useless.)

3. **A separate small bug:** the dropdown on a *done* row (post-upload retype) calls `overrideType` → `uploadOne`, but `uploadOne` early-returns unless status is `needs_owner | name_mismatch | awaiting_review`. So the dropdown silently does nothing after the first successful upload.

## Fix

### 1. Make the render-time matcher alias-aware

`src/pages/ClientDetail.tsx` — replace the strict-equal lookup with one that uses the alias buckets already defined in `src/lib/checklist.ts`.

```ts
import { isChecklistAlias } from "@/lib/checklist";

const docByType = (typeName: string): Doc | undefined => {
  const matches = docs.filter((d) => {
    const t1 = d.document_type === "Other" ? (d.custom_type ?? "") : d.document_type;
    const t2 = d.custom_type ?? "";  // also try custom_type as a "linked checklist name"
    return (
      t1 === typeName ||
      t2 === typeName ||
      isChecklistAlias(t1, typeName) ||
      (t2 && isChecklistAlias(t2, typeName))
    );
  });
  return matches.sort((a, b) => b.version - a.version)[0];
};
```

That alone fixes:
- 10th/12th Marksheet → matches "Academic Transcripts" via the existing transcripts bucket.
- PTE/IELTS/TOEFL/Duolingo Result → matches "English Language Proficiency Test".
- PAL Letter / Allocation of PAL → matches "Provincial Attestation Letter".
- Resume / CV → "Updated Resume". SOP / personal statement → "Statement of Purpose". Bank statement / ITR → "Financial Documents". Etc.

It also makes `markChecklistItemReady`'s writeback (already running on every upload) usable for canonical types, because it now tries `custom_type` regardless of the value of `document_type`.

### 2. Add an explicit "Link to checklist item" action on each uploaded doc card

The auto-matcher won't always be right — your "Passport Copy" example deliberately has a wrong name. Provide a small dropdown on the section/checklist UI for any uploaded doc that lets you:

- Map the doc to a specific checklist item (writes that item's name into `custom_type`, leaves `document_type` alone). The render-time matcher then picks it up immediately.
- Or "Unlink" (clears `custom_type` if it was a checklist alias).

UI placement: on the existing checklist row in `ClientDetail.tsx` next to the Pending badge ("Link existing doc…" popover) and on the section card row (small chain icon with the checklist names that match the bucket). Both call the same Supabase `update({ custom_type })` and then `load()`.

This is the manual escape hatch for any case the alias map misses — e.g. "Passport Copy" should be linkable to "Passport" with one click.

### 3. Fix the post-upload retype dropdown

`src/components/documents/SmartUploadZone.tsx` — `overrideType` currently calls `uploadOne` with status set to `queued`, but `uploadOne` blocks `queued`. Change `overrideType` to update the existing `client_documents` row in place instead of re-uploading: update `document_type` (+ clear/set `custom_type`), then re-run `markChecklistItemReady`, then `onUploaded()`. No new file is needed because the storage object hasn't changed.

### 4. Improve the auto-rename pre-fill

`splitFileIntoPageSegments` already pre-fills the type via `inferTypeFromPageText`. Tighten it so 10th/12th marksheet pages land on `"Academic Transcripts"` (via the transcripts bucket) instead of `"Other"`, and so PAL pages get `"Provincial Attestation Letter"` directly. This makes the "Split into pages" flow do the right thing without manual renames in the common case.

`src/lib/binderSplit.ts` — extend `inferTypeFromPageText`'s rule list:

- "10th" / "12th" / "Secondary School Certificate" / "HSC" / "SSC" / "Marksheet" → first allowed type that is `"Academic Transcripts"` or `"Marksheet"`.
- "Provincial Attestation Letter" / "PAL" → `"Provincial Attestation Letter"`.
- "Pearson Test of English" / "PTE Academic" / "IELTS" / "TOEFL" / "Duolingo English Test" → `"English Language Proficiency Test"`.

### 5. Surface the matched checklist item on the section card

Small UX touch: when a doc is auto-linked to a checklist row (via alias or manual link), show a tiny "→ English Language Proficiency Test" badge on the doc tile in the section so you can see what it satisfies.

## Files

- `src/pages/ClientDetail.tsx` — alias-aware `docByType`; "Link to checklist" action on rows; small badge on section doc tiles.
- `src/lib/checklist.ts` — already exports `isChecklistAlias`; expand alias buckets to cover "Passport Copy" → "Passport", "10th Marksheet" → "Academic Transcripts", and other common renames seen in the wild.
- `src/components/documents/SmartUploadZone.tsx` — fix `overrideType` to update in place via Supabase + re-run `markChecklistItemReady` instead of re-running the upload pipeline.
- `src/lib/binderSplit.ts` — sharper `inferTypeFromPageText` for marksheet / PAL / language-test pages.

## Result

- The merged-PDF split now pre-fills the right canonical type on each page; you click Upload all and the matching checklist rows go Ready immediately.
- If auto-detection still misses, the post-upload "Link to checklist" action is one click to flip Pending → Ready without re-uploading.
- The retype dropdown after upload now actually persists the change and re-evaluates the checklist.
- The English Language Proficiency Test doc you just uploaded should already show Ready after a refresh; with the alias-aware matcher it will also continue to show Ready even if a future rename happens.
