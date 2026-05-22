## Problem

1. **"No access to Hub"** — The `dsh_media` insert RLS policy requires `admin` role OR `dsh_can(uid, 'edit')` (i.e. explicit `digital_success_hub` edit permission). Most users who can generate AI images don't have that module flag, so clicking **Hub** in Stock Images / Video / Poster panels throws an RLS error.

2. **"Page refreshes when clicking other buttons while image is rendering"** — The action buttons in `StockImagesPanel`, `VideoClipPanel`, and the result-card grid in `AiStudioPage` are `<Button>` (shadcn) without an explicit `type="button"`. When async generation triggers a re-render of a parent that wraps anything in a `<form>` (or when the browser treats the implicit submit), clicking Download/Save/Hub mid-render can cause a form submit → full page reload. Same for the file input change handlers re-mounting the canvas.

## Fix Plan

### A. Hub access (backend, migration)
- Add a new RLS policy on `public.dsh_media` allowing **authenticated users to insert rows they uploaded themselves** (`uploaded_by = auth.uid()`), specifically for AI-generated marketing assets. Keep the existing admin/edit policy untouched.
  - Policy: `dsh_media insert self` — `WITH CHECK (auth.uid() = uploaded_by)`.
- Equivalent fallback for `update`/`delete` on rows the user uploaded, so they can remove their own mistakes.
- Verify the `dsh_media_validate` trigger still passes for `content_scope='common'` (which is what `saveToHub` defaults to).

### B. Prevent accidental form-submit refresh (frontend)
- Add `type="button"` to every action `<Button>` in:
  - `src/digital-success/ai/StockImagesPanel.tsx` (Generate, Use, Save, Hub)
  - `src/digital-success/ai/VideoClipPanel.tsx` (Render clip, Download, Save to Hub)
  - `src/digital-success/ai/AiStudioPage.tsx` result-card buttons (Download / Enhance / Save / Delete) and Generate button
- Wrap async handlers' callers in arrow functions that don't return the promise to the event system, and add `e.preventDefault()` where a button is inside any implicit form context.

### C. Stabilize "render in progress" state
- In `StockImagesPanel`, after generating, the `results` state and signed URLs are already kept; ensure no parent state reset by memo-keying result cards on `img.path` (already done) and avoiding `studio.loading` causing the whole panel to unmount (it doesn't — confirmed). The button-type fix above addresses the refresh.

### D. Surface clearer error
- In `onSaveToHub` (StockImagesPanel + AiStudioPage), if Supabase returns a `42501` / RLS error, show "You don't have Digital Success Hub edit permission yet — ask an admin to enable it" instead of the raw RLS message. (After migration A this should only fire for users who try to write into someone else's row.)

## Files Touched

- **New migration** under `supabase/migrations/` — RLS additions for `dsh_media` self-insert/update/delete.
- `src/digital-success/ai/StockImagesPanel.tsx` — button types, error message.
- `src/digital-success/ai/VideoClipPanel.tsx` — button types.
- `src/digital-success/ai/AiStudioPage.tsx` — button types on result cards, friendlier Save error.

## Out of scope

- No changes to AI generation logic, no new edge functions, no design changes.
