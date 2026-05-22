
# Text-to-Video clips (Replicate)

Today, the **Video Clips** tab only animates an existing image (Ken Burns on canvas). It cannot generate a video purely from a text concept like *"Indian family laughing together and celebrating Christmas in Canada — parents, children and grandchildren altogether."*

This plan adds true **text-to-video** generation via Replicate, keeps the existing Ken Burns mode, and lets the user pick which one to use.

## What changes for the user

In **Digital Success → AI Studio → Video clips**:

- New **Mode** toggle at the top:
  - **Generate from concept (AI video)** — new, default when no reference image is set.
  - **Animate a reference image (Ken Burns)** — current behavior.
- A **Concept / description** box (multi-line). The Christmas family example is used as the placeholder.
- Optional **Style** chips: *Cinematic*, *Documentary*, *Warm & festive*, *Editorial*.
- Aspect ratio: *Landscape 16:9*, *Portrait 9:16*, *Square 1:1*.
- Duration is fixed at **5 seconds** (per your choice).
- **Generate clip** button → progress state → preview player → **Download** + **Save to Hub** (uses the same RLS-safe save path we just added).
- Saved clips show up in **Recent Generations** with a `<video>` player (already supported).

No reference image is required. If the user *does* drop an image in the Reference Tray, the panel will offer to use it as the **starting frame** for the video (optional).

## What changes under the hood

### 1. Secret

Add a new runtime secret **`REPLICATE_API_TOKEN`** (requested via `add_secret`). The user creates it at https://replicate.com/account/api-tokens.

### 2. New edge function: `dsh-ai-generate-video`

- Input: `{ concept, style?, aspect?: "16:9"|"9:16"|"1:1", duration?: 5, starting_frame_data_url? }`
- Validates input with Zod, checks auth, reads `REPLICATE_API_TOKEN`.
- Calls Replicate's `predictions` API with a Kling text-to-video model (e.g. `kwaivgi/kling-v1.6-standard`, 5s). If `starting_frame_data_url` is provided, passes it as `start_image`.
- Polls the prediction until `succeeded` / `failed` (with a hard timeout ~110s — Replicate supports waiting headers so we use `Prefer: wait` first then poll).
- Downloads the resulting MP4 server-side, uploads it to `dsh-media` storage at `ai/video/{userId}/{uuid}.mp4`, inserts a row in `dsh_ai_generations` with `kind: 'video'`, `model: 'replicate/kling-v1.6-standard'`, `prompt: concept`, and returns `{ generation_id, path }`.
- Surfaces 402/429/credit errors with friendly messages (mirrors `dsh-ai-generate-poster-openai` pattern).

### 3. `usePromoStudio.ts`

- New `generateVideoFromConcept({ concept, style, aspect, starting_frame_data_url? })` hook that calls the edge function and returns the storage path.
- Keep existing `uploadVideoClip` (Ken Burns) untouched.

### 4. `VideoClipPanel.tsx`

- Add the **Mode** toggle, concept textarea, style chips, aspect selector.
- Branch on mode: generate-from-concept calls the new hook; reference-image keeps current canvas flow.
- Render the returned MP4 with a `<video controls>` element. Reuse existing Save-to-Hub button + RLS-safe error handler.
- Default the panel to "Generate from concept" when there's no reference image; default to "Ken Burns" when there is one.
- All action buttons get `type="button"` (consistent with the recent refresh fix).

### 5. AI Studio recent generations

No changes needed — videos with `.mp4` paths already render in the `<video>` player.

## Files

**New**
- `supabase/functions/dsh-ai-generate-video/index.ts`

**Edited**
- `src/digital-success/ai/usePromoStudio.ts` — add `generateVideoFromConcept`.
- `src/digital-success/ai/VideoClipPanel.tsx` — mode toggle + concept UI + result player.

**Secret**
- `REPLICATE_API_TOKEN` (requested via add_secret).

## Notes / trade-offs

- Replicate's Kling 5s clip typically renders in **30–90 seconds** and costs roughly **~$0.30 per clip**. The edge function streams progress back to the UI via a "generating…" state.
- If you'd rather avoid a Replicate account entirely, the alternative is **fal.ai** or **Runway** — same architecture, just a different secret + endpoint. Easy swap later.
- Ken Burns mode stays available for when you want to animate an existing poster/photo without spending Replicate credits.
