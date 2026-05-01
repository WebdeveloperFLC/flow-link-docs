## Problem

A document belonging to **Manav Yogesh Patel** was uploaded into **Patel Chintan Rajnikant**'s case without any warning. The classifier *did* read the owner name from the document, but the upload pipeline still accepted it.

## Root cause

In `SmartUploadZone.tsx → classifyAndAssign`, the owner-mismatch check has a hole for **single-person cases** (cases with only the applicant, like Chintan's):

```text
ownerVerifiedFromContent? ── no ──► single-person ──► auto-assign to applicant, upload
                          │
                          yes
                          ▼
              noRosterMatch (score < 0.6)?
                          │
                       yes│            single-person ──► auto-assign to applicant, upload  ◄── BUG
                          │
                       no │
                          ▼
                  proceed with best match
```

So when:
1. The document owner (e.g. "Manav Yogesh Patel") IS clearly read from the document, AND
2. That name does NOT match anyone on the case roster (Chintan), AND
3. The case has only 1 person,

the code silently overrides the detected name and assigns the document to the applicant. No prompt, no warning, no block.

The same gap also exists in the "owner unreadable" branch for single-person cases — it auto-assigns without showing the user what was detected.

## Fix

Treat a confidently-detected, non-matching owner name as a **hard mismatch** for every case (single-person OR multi-person), and force the user to make an explicit decision before the file is uploaded.

### Changes in `src/components/documents/SmartUploadZone.tsx`

1. **New status & UX state**: introduce a `name_mismatch` status path that surfaces:
   - The detected owner name + evidence snippet from the document.
   - The current case's people.
   - Three explicit actions:
     - **Reassign to another case** (existing search-by-name flow).
     - **Upload anyway as <applicant>** (records `document.uploaded_with_override`, requires a confirm).
     - **Skip / remove from queue**.
   - A **Preview** button so the user can verify the file's contents before deciding.

2. **classifyAndAssign — replace the single-person shortcut**:
   - When `ownerVerifiedFromContent === true` AND `noRosterMatch === true`:
     - For both single- and multi-person cases, set status `name_mismatch` and STOP. Do not auto-upload.
   - When `ownerVerifiedFromContent === false` (owner unreadable):
     - Single-person: keep auto-assigning to applicant (today's behavior is fine here — there's literally no other choice and we can't read a name).
     - Multi-person: keep current `needs_owner` picker.
   - Use a stricter "no roster match" threshold: treat `match.score < 0.6` AND `match.best === undefined` as a mismatch (today's logic), but ALSO require the detected name's token overlap with the matched person to be ≥ 0.5 before proceeding silently — otherwise force `name_mismatch`.

3. **Activity logging**: log `document.owner_mismatch_blocked` with `{ detected_owner, case_people, score, file_name }` whenever we surface the mismatch card, and `document.uploaded_with_override` when the user proceeds anyway. This gives an audit trail for incidents like this one.

4. **handleFiles auto-process loop**: items in `name_mismatch` must NOT be picked up by the concurrency worker — only `queued` items are processed. Verify the filter at line 448 already covers this (it does), and add a defensive guard inside `uploadOne` to refuse uploading when an item's status is `name_mismatch` unless `overrideOwner === true`.

### Visual outcome (queue card)

```text
┌────────────────────────────────────────────────────────────┐
│  ⚠  Owner mismatch                                         │
│  File: MANAV_YOGESH_PATEL_-_certificate.pdf                │
│  Detected on document: "Manav Yogesh Patel"                │
│  This case: Patel Chintan Rajnikant                        │
│                                                            │
│  [ Preview ]  [ Move to another case ]                     │
│  [ Upload anyway as Patel Chintan Rajnikant ]   [ Skip ]   │
└────────────────────────────────────────────────────────────┘
```

## Why this won't keep coming back

- The decision is centralised: the same `name_mismatch` branch runs for single- and multi-person cases, so future single-person cases can't slip through.
- The hard guard inside `uploadOne` makes it impossible for any other code path (binder split, retry, override type) to bypass the check without going through the explicit "Upload anyway" action.
- We log both the block and the override, so even if a user clicks through, there's a permanent activity record.

## Out of scope (note for user)

- The wrongly-uploaded Manav certificate already in Chintan's case must be **deleted manually** — this fix is preventative only.
- This does not change the General/Section upload path's content-OCR step. If you want the same owner-mismatch block in those upload zones too, say so and I'll extend it there in the same change.
