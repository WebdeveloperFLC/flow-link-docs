
## Issues to fix

1. **Download hijacks the screen and wipes results.** `<a href={signedUrl} download>` doesn't actually force a download for cross-origin signed URLs — the browser navigates to the image instead, which (a) replaces the page, and (b) on back, React state (`images`) is gone so posters 1 and 2 vanish.
2. **No way to recover generations.** Anything not explicitly "Saved to Hub" is lost on refresh, even though the backend already stores rows in `dsh_ai_generations` with `image_paths`.
3. **Need a higher-quality mode** beyond the current default.

## Changes

### 1. Robust download (frontend only)

Replace the anchor-based download with a programmatic blob download helper in `usePromoStudio.ts`:

```ts
async function downloadAsset(url: string, filename: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const obj = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = obj; a.download = filename; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(obj), 1000);
}
```

Use it for every Download button (poster grid, edit tab, recent generations, library). Buttons stay as `<Button onClick={...}>` — no `<a>` navigation, no screen takeover, results panel stays mounted.

### 2. Persist results across reloads + Recent Generations panel

- On mount of `AiStudioPage`, hydrate `images` from `sessionStorage` (`dsh-ai-last-images`) so a stray navigation/refresh doesn't lose the last batch.
- Write to `sessionStorage` whenever `images` updates.
- Add a new **"Recent generations"** collapsible section at the bottom of the Poster tab, fed by a new helper `listRecentGenerations(limit=20)` that selects from `dsh_ai_generations` (kind='poster', current user, newest first). Each row renders thumbnails of all `image_paths` with **Download** and **Save to Hub** buttons. This is the "temp library" — anything generated is recoverable even if never explicitly saved.
- No schema changes; `dsh_ai_generations` already records every successful generation.

### 3. Premium quality tier

Add a **Quality** selector next to Format/Variations: `Standard` (default) / `Premium`.

- `Standard` → `google/gemini-3.1-flash-image-preview` (fast, current quality).
- `Premium` → `google/gemini-3-pro-image-preview` (slower, higher fidelity; already supported by Lovable AI Gateway).
- Wire `quality` through `PosterBrief` → edge function `dsh-ai-generate-poster`, which maps it to `model` (overriding the current hardcoded default). Premium also appends a short fidelity directive to the prompt: *"Render at maximum detail, sharp typography, photoreal subject, no compression artifacts, print-ready."* and forces `variations` ≤ 2 to keep latency reasonable (with a toast notice if user picked more).
- Same `quality` option exposed on the **Edit image** tab and forwarded to `dsh-ai-edit-image` (which already accepts arbitrary instructions; add an optional `model` field there too).

### 4. Optional one-click "Enhance" on each poster card

Add an **Enhance ✨** button next to Download/Save on each generated poster. It calls `dsh-ai-edit-image` with the poster as the base image and a fixed instruction: *"Upscale and sharpen this poster. Preserve every text glyph, logo, layout, colors exactly. Improve photo realism of subjects, refine typography edges, remove compression artifacts."* The enhanced result replaces that card's image (old path stays in Recent Generations).

## Files touched

- `src/digital-success/ai/usePromoStudio.ts` — add `downloadAsset`, `listRecentGenerations`, `quality` field on `PosterBrief`, optional `model` on `editImage`.
- `src/digital-success/ai/AiStudioPage.tsx` — Quality select, swap download anchors for `onClick` handler, sessionStorage hydration, Recent Generations panel, Enhance button.
- `supabase/functions/dsh-ai-generate-poster/index.ts` — accept `quality`, map to model, append premium directive, soft cap variations.
- `supabase/functions/dsh-ai-edit-image/index.ts` — accept optional `model` (default `google/gemini-3-pro-image-preview` for the Enhance flow).

## Out of scope

- A permanent gallery for non-saved generations beyond the current user's own history.
- Server-side upscaling via a separate vendor (Real-ESRGAN, etc.) — Enhance reuses the existing image model.
- Watermark removal / OCR text re-rendering.
