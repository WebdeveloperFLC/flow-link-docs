## Problem

On the Document Verification page, when a reviewer clicks **Reject** (or Mark verified / Request reissue) after running an authenticity check, the decision is only saved to the `document_verifications` row. It is never propagated to the underlying `client_documents` record, so:

- The document checklist on the client page still shows the document as **Ready** (green).
- There is no visible "Rejected" / "Verified" indicator anywhere outside the Verification page itself.
- The auto-backfill effect on ClientDetail can even re-link a rejected document to a checklist row.

## Fix

### 1. Persist reviewer decision on the document itself

In `src/pages/Verification.tsx` → `setReviewerStatus(...)`:

After updating `document_verifications`, also update `client_documents.status` for `active.document_id`:

| Reviewer action     | `client_documents.status` |
|---------------------|---------------------------|
| Mark verified       | `"verified"`              |
| Request reissue     | `"needs_reissue"`         |
| Reject              | `"rejected"`              |

(`"ready"` remains the default after a successful upload + extraction; the reviewer decision overrides it.)

### 2. Render the new statuses in the checklist

In `src/pages/ClientDetail.tsx` (around line 695, where the green "Ready" badge is rendered):

Replace the single `Ready` branch with a status-aware badge:

- `verified` → green "Verified"
- `ready` → green "Ready" (unchanged default)
- `needs_reissue` → amber "Reissue"
- `rejected` → red "Rejected"

Also: when a document is `rejected` or `needs_reissue`, it should **not** count toward `secReady` in the section progress, and should **not** suppress the "Pending" state. Treat such a document as "attached but not satisfying the requirement" — show the rejected badge plus the file name, and keep the "Link doc" / re-upload affordances available. The simplest implementation is to make `docByType` only return docs whose status is `ready` or `verified`, and add a separate lookup for "any attached doc (including rejected)" used purely for displaying the rejected badge + filename.

### 3. Don't re-link rejected docs automatically

In the retroactive-repair `useEffect` in `ClientDetail.tsx` (the alias/filename backfill that writes `custom_type`), skip documents whose `status` is `rejected` or `needs_reissue` so a rejected scan isn't auto-attached back to the checklist row.

### 4. Optional but consistent: auto-set on Run verification

When `verify-document` returns `risk_level === "high_risk"`, we currently leave `client_documents.status` untouched. Leave this behavior as-is — only the explicit reviewer click should change document status, matching the existing UX where humans make the final call.

## Files to edit

- `src/pages/Verification.tsx` — extend `setReviewerStatus` to also update `client_documents.status`.
- `src/pages/ClientDetail.tsx` — status-aware badge, `docByType` filtering, backfill skip for rejected docs.

No DB migration is required (`client_documents.status` already exists as a free-form text column).

## Verification

1. Run verification on the 12th Marksheet → it shows "Needs review".
2. Click **Reject** → on the client page, the 12th Marksheet checklist row now shows a red **Rejected** badge instead of green Ready, and the section progress decrements.
3. Click **Mark verified** on a different doc → checklist shows green **Verified**.
4. Reload the client page — the rejected doc is not silently re-linked by the backfill effect.
