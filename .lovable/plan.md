# Fix: wrong-applicant uploads slip through + filename uses wrong name

## What actually happened with Manav's IELTS on jayesh's case

Roster on jayesh yogi's case = `[jayesh (applicant), Anjali Sharma (co-applicant)]`. Manav is not on the roster.

In `SmartUploadZone.classifyAndAssign` for a multi-person case (>=2 people), the AI returned `owner_name = "Manav ..."`. `matchPersonRoster` finds no roster member ≥0.6 → `match.best = undefined`. Code then falls through to:

```ts
if (match.noNameDetected || !match.best || match.ambiguous) {
  const suggested = match.best?.id ?? applicant?.id ?? null;  // → applicant
  patch(idx, { ...baseUpdate, status: "needs_owner", ownerId: suggested });
}
```

So the UI shows a friendly "needs_owner" picker pre-selected to the **applicant**. The user clicks Confirm → it uploads as `IELTS/LanguageTest_Applicant_jayeshyogi.pdf`. There is no warning that the detected name (Manav) is **not on this case at all**. That's the bug.

The single-person path already has a `name_mismatch` block screen — multi-person silently degrades to a picker.

The filename is also "correct given what was confirmed" (Applicant + jayesh) but wrong in spirit, because the document is actually Manav's. Renaming follows ownership, and ownership was wrong — so fixing the block fixes the rename too.

## Fix

### 1. Hard-block when detected name has no plausible match on the roster (multi-person)

In `src/components/documents/SmartUploadZone.tsx → classifyAndAssign`, before the existing `needs_owner` branch, add:

```ts
// AI clearly read a person name, decent confidence, but nobody on the
// roster is a credible match → this document doesn't belong to this case.
const detected = c.ownerName?.trim();
const ownerConf = c.ownerConfidence ?? 0;
const NO_ROSTER_MATCH = !!detected && ownerConf >= 0.5 && match.score < 0.6;

if (NO_ROSTER_MATCH) {
  patch(idx, { ...baseUpdate, status: "name_mismatch", ownerId: null });
  await logActivity("document.owner_not_on_case", "client", client.id, {
    file_name: item.file.name,
    detected_owner: detected,
    case_people: people.map(p => p.full_name),
    score: match.score,
  });
  return null;
}
```

This reuses the existing amber `name_mismatch` row. No upload happens until the user picks one of:
- **Re-assign to another case** (existing search dialog)
- **Skip**
- **Upload anyway** (explicit override, already logged as `document.uploaded_with_override`)

Also tighten the single-person branch identically so the same rule applies regardless of roster size — remove the `applicant && c.ownerName && ownerConfidence >= 0.5` guard around it; the single condition above handles both.

### 2. Filename always uses the confirmed owner's name

`buildPersonDocumentName(type, role, personName, version, ext)` already produces e.g. `IELTSLanguageTest_Applicant_jayeshyogi.pdf`. That is correct **once ownership is right**. With fix #1 in place, the file can only be saved when:
- The owner is a real roster member → filename = `{Type}_{Role}_{PersonName}_v{n}.pdf`
- The owner is `Shared` → filename = `{Type}_Shared_v{n}.pdf`
- The user clicked "Upload anyway" → still uses whatever owner they finally selected

So no rename code change is needed; correctness comes from blocking the wrong-owner path.

While in the file, two small UX nits:
- The amber row currently reads "Detected owner doesn't match this client." Make the copy explicit when `match.noNameDetected === false && match.score < 0.6`: 
  > **"{detected}" isn't on this case.** People on file: jayesh yogi, Anjali Sharma. Reassign to another case, skip, or upload anyway.
- Disable the "Confirm" button on `needs_owner` rows when the picker is still `null` (currently it would no-op silently).

### 3. Lower the AI false-negative on names (defensive)

`extract-document-data` is invoked **after** upload and could be cross-checked, but the cheaper fix is on the classifier path:

In `supabase/functions/classify-document/index.ts`, add the case roster to the prompt so the model is more conservative:

```ts
const roster: string[] = Array.isArray(body?.case_people) ? body.case_people.slice(0, 10) : [];
// ...append to user message:
//   "People expected on this case: jayesh yogi, Anjali Sharma.
//    If the document's owner is clearly NOT one of these people,
//    still return their actual name; do not guess one of the listed names."
```

And pass it from `classifyDocument(file, candidateTypes, peopleNames)` → `SmartUploadZone` calls with `people.map(p => p.full_name)`. Pure additive; existing callers keep working.

## Files touched

- `src/components/documents/SmartUploadZone.tsx` — hard-block branch in `classifyAndAssign`, sharper amber-row copy, disable Confirm when `ownerId == null`, pass roster names to `classifyDocument`.
- `src/lib/classifyDocument.ts` — accept optional `peopleNames` arg, forward in edge-function body.
- `supabase/functions/classify-document/index.ts` — accept `case_people` in body, include in prompt.

## Out of scope

- Re-running classification on already-uploaded documents (Manav's IELTS already saved on jayesh's case stays where it is unless the user deletes/reassigns it).
- Server-side enforcement (RLS / trigger). The edge function and DB don't know "expected names per case" — keeping this client-side is correct given the AI lives on the client path. Power users with Upload Anyway can still override, which is by design.
