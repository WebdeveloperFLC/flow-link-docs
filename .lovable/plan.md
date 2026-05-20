## Problem

The uploaded brochure shows a broken-image icon in the AI Review preview. The file was uploaded fine and the AI pipeline ran (status `extracted`, 95% confidence) — the issue is only the inline PDF preview.

Looking at the DB row, the stored file name and storage key both contain literal `%20` characters:

```
file_name: ULeth%20InternationalViewbook%202026%20Screen.pdf
file_path: 4d564a37-.../1779309163025-ULeth%20InternationalViewbook%202026%20Screen.pdf
```

The user's source file already had `%20` in its name (likely saved from a URL). When `supabase.storage.createSignedUrl(path)` runs, it percent-encodes that path, turning each `%` into `%25` → the resulting URL points to `…%2520…` which does not match the stored object key, so storage returns 400 and the iframe renders the broken icon. New uploads with spaces or other special characters will hit the same class of bug.

## Fix

### 1. Sanitize file names on upload (`src/institutions/pages/InstitutionDetailPage.tsx`)

In `uploadDoc`, build the storage path from a sanitized version of `file.name`:

- Lowercase the extension, keep alnum, dash, dot, underscore.
- Replace any other character (spaces, `%`, parentheses, accents, etc.) with `-`.
- Collapse repeated `-`.
- Keep the original `file.name` as `file_name` in the DB row so the UI still shows the user's name; only the `file_path` (storage key) is sanitized.

```text
path = `${id}/${Date.now()}-${safeName(file.name)}`
```

Apply the same `safeName` helper in any other upload entry points if present (sources / agreements re-upload). Scope here: just the institutions upload path the user hit.

### 2. Repair the existing broken row (one-off, in the same change)

Add a tiny "Fix preview" action only when the current `file_path` contains `%`:
- Copy the storage object from the broken key to a sanitized key (`storage.copy(old, new)`), then `remove([old])`, then update `file_path` on the row.
- This avoids re-uploading the 50 MB viewbook.

Alternatively, do this as a one-shot script via the orchestrator UI — but inline repair button is faster for the user.

### 3. Preview fallback (`src/institutions/components/AiReviewPanel.tsx`)

Even after the path fix, browsers sometimes refuse to inline-render very large PDFs. Add a small fallback under the iframe:

- If iframe `onError` fires, or after a 4s timeout with no load event, show a "Open PDF in new tab" link using the same signed URL plus a "Download" button.
- No behavior change when the iframe loads normally.

## Out of scope

- The brochure extraction quality (`upi-detect-promotions` reads a binary PDF as text and lets the AI hallucinate "promotions") is a separate, deeper issue. Not touching it in this change — if you want, I can follow up with a proper PDF→text step for brochures.
- No DB migration, no edge function changes, no auth/roles changes.

## Verification

- Upload the same `ULeth …%20… .pdf` again → new row's `file_path` has no `%` and preview renders inline.
- Click "Fix preview" on the existing row → storage object is renamed, iframe loads.
- Upload a PDF with spaces, parentheses, accents → preview renders.
- Existing already-working previews keep working (no regression on normal filenames).
