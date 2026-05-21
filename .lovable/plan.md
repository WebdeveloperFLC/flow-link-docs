# Fix AI Studio + Add Reference Image Support

## 1. Fix "Failed to send a request to the Edge Function"

**Root cause:** The three AI Studio edge functions (`dsh-ai-generate-poster`, `dsh-ai-generate-copy`, `dsh-ai-edit-image`) were created but never successfully deployed, so calls from `/digital-success/ai` 404'd at the gateway, which the client shows as "Failed to send a request to the Edge Function."

**Fix:** Functions have now been deployed and a live `POST /dsh-ai-generate-poster` test returned `200 OK` with a generated image saved to the `dsh-media` bucket. No code change required for the fix itself — just the redeploy that already ran.

I'll also add small resiliency improvements:
- Surface the real backend error string in the toast (instead of the generic invoke error) by reading `error.context?.body` from `supabase.functions.invoke`.
- Add a "Retry" button next to the error toast in `AiStudioPage`.

## 2. Reference image upload (new feature)

Goal: let a team member upload an existing flyer/screenshot/photo and either
(a) **generate a new poster in the same theme**, or
(b) **edit that exact image** (change date, swap campus, restyle, translate, add logo).

### UI changes — `src/digital-success/ai/AiStudioPage.tsx`

New "Reference image" card above the Brief form, with:
- Drag-and-drop / file picker (PNG/JPG/WebP, ≤ 8 MB, client-side resize to max 1536px long edge).
- Thumbnail preview + "Remove" button.
- Mode toggle (radio):
  - **Match theme** — use the reference only as style guidance for a brand-new poster generated from the Brief.
  - **Edit this image** — modify the uploaded image directly using the instruction in "Extra instructions".
  - **Inspire layout** — keep composition/colors close to the reference but replace text with Brief content.
- Tooltip explaining each mode.

The existing "Generate poster" button stays. When mode = "Edit this image", the button label switches to **"Apply edits"** and the Format/Variations selectors are hidden (edit returns one image at the source aspect ratio).

### Hook changes — `src/digital-success/ai/usePromoStudio.ts`

- Extend `PosterBrief` with `reference_image_data_url?: string` and `reference_mode?: "match" | "inspire" | "edit"`.
- `generatePoster(brief)` keeps the same signature; the hook routes to `dsh-ai-edit-image` when `reference_mode === "edit"` and to `dsh-ai-generate-poster` otherwise (passing the reference along).
- Add `uploadReference(file)` helper that converts the file to a clean base64 data URL (strip prefix, validate) before sending — guards against the common base64-format bug.

### Edge function changes

**`dsh-ai-generate-poster/index.ts`**
- Accept optional `reference_image_data_url` and `reference_mode` in the body.
- When present, send the image as a second `content` part on the user message (multimodal input is already supported by `google/gemini-3-pro-image-preview`):
  - `match` → append: "Use the attached image only as a style/colour/typography reference. Do not copy text or composition."
  - `inspire` → append: "Match the overall layout and colour story of the attached image, but replace all text and product specifics with the Brief above."
- Cap reference at ~4 MB after decode; reject larger with a 400.

**`dsh-ai-edit-image/index.ts`**
- Already accepts `image_data_url` + `instruction`. No schema change, but:
  - Add input validation (data-URL regex, size cap).
  - Return `ok: true` consistently and include `image_path` plus a fresh signed URL in the response so the UI can render the edited result without a second round-trip.

### Save to Hub
No change — both flows already write the generated PNG to `dsh-media` and `saveToHub` picks it up by `storage_path`.

## Out of scope (v1)
- Storing reference uploads permanently (kept only in-memory for the generation call).
- Multi-image references (only one reference per generation).
- Style presets derived from previously generated posters.

## Files touched
- edit `src/digital-success/ai/AiStudioPage.tsx`
- edit `src/digital-success/ai/usePromoStudio.ts`
- edit `supabase/functions/dsh-ai-generate-poster/index.ts`
- edit `supabase/functions/dsh-ai-edit-image/index.ts`
