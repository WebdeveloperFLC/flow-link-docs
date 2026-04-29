# Fix: "No applicant on file" blocking uploads

## What's actually wrong

For client **jayesh yogi** (and any client created after the `case_people` migration), there is no non-archived `applicant` row. The Add-person dialog only offers **Co-applicant** and **Dependant**, so there's no way to fix it from the UI, and `SmartUploadZone` blocks all uploads with *"This case has no applicant on file."*

Two distinct gaps:

1. **`NewClientDialog`** creates a row in `clients` but never inserts the matching `case_people` applicant row. Every brand-new client is born broken.
2. **`AddPersonDialog`** hides the "Applicant" role, so once a case is missing one (archived, deleted, or never created) there's no recovery path.

The current jayesh yogi case ended up with the original applicant archived and one archived co-applicant, leaving zero people.

## The fix

### 1. Database self-healing (migration)

- One-time backfill: re-insert an `applicant` row for any client where no non-archived applicant exists, using `clients.full_name`. This immediately unblocks jayesh yogi and any similar legacy/broken cases.
- Add a database trigger on `clients` (AFTER INSERT) that creates the matching applicant row in `case_people` automatically. This guarantees every future client starts with an applicant — `NewClientDialog` doesn't need to know about it.

### 2. UI: allow adding/promoting an applicant when missing

In `AddPersonDialog`:
- Accept the current roster as a prop (or fetch inside).
- If the case currently has **no** applicant, show "Applicant" as a role option (and default to it). When an applicant already exists, hide the option as today (the unique index enforces one applicant per case anyway).
- Hide the Relationship field when role = applicant (it's the principal).

In `CasePeopleCard`:
- When `roster.length === 0` (or no applicant), show a clear amber callout: *"This case has no applicant. Add one to enable uploads."* with the "Add person" button styled as primary.
- Pass the current roster down to `AddPersonDialog`.

### 3. SmartUploadZone copy

Change the blocking toast from a dead-end error to actionable guidance: *"Add the applicant on the People card before uploading documents."* (Functionality unchanged — still blocks until applicant exists, which is correct.)

### 4. Fix two pre-existing console warnings (cheap wins while in the file)

- `AddPersonDialog`: wrap `DialogFooter` properly (the React ref warning shown in console).
- Add a `DialogDescription` to silence the `aria-describedby` warning.

## Files touched

- `supabase/migrations/<new>.sql` — backfill + trigger
- `src/components/clients/AddPersonDialog.tsx` — applicant role when missing, ref/aria fixes, accept roster
- `src/components/clients/CasePeopleCard.tsx` — empty-state callout, pass roster
- `src/components/documents/SmartUploadZone.tsx` — friendlier toast wording

## Out of scope

- Un-archiving previously archived people (the existing archived rows for jayesh yogi stay archived; the trigger/backfill creates a fresh applicant row from `clients.full_name`).
- Bulk re-assignment of documents already linked to archived `person_id`s — none exist for this client.