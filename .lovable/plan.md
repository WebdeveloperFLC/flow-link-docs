## Add Video Clips + Image Search/Generate to AI Studio

Extend the Digital Success AI Studio (`/digital-success/ai`) with two new capabilities alongside the existing poster generator:

### 1. Concept → Video Clip
A new tab "Video Clip" in `AiStudioPage.tsx` that takes a short concept brief (institution, country, intake, vibe, duration 5s/10s, aspect ratio 9:16/16:9/1:1) and generates a short promo video.

- **Backend**: new edge function `dsh-ai-generate-video` that calls the Lovable AI video model (Veo via gateway) — or, if unavailable in-app, we use the platform's video generation through a server-side fetch. Optional starting frame: user can pick a reference image from the Brand Library or a previously generated poster as the first frame.
- **Storage**: upload returned MP4 to `dsh-media` bucket, insert a row into `dsh_ai_generations` with `kind: 'video'` and `image_paths: [storage_path]` (reusing the same column to keep Recent Generations working). Add a `video/*` mime branch to the Recent Generations panel so it renders a `<video controls>` instead of `<img>`.
- **Save to Hub**: same flow as posters, with `content_type: 'reel'`.

Honest note: video generation takes 30–90s and costs significantly more than image gen. Cap to 1 clip per request, max 10s.

### 2. Concept → Image Search / Generate (Stock Library)
A new tab "Stock Images" that lets the user describe what they need ("Toronto skyline at dusk", "smiling Indian student with backpack") and returns 4 candidate images they can drag into the Reference Tray or save to Brand Library.

Two sources, user picks per request:
- **Generate**: edge function `dsh-ai-generate-stock` → Lovable AI Gateway, `google/gemini-3.1-flash-image-preview` (fast, pro-quality). Returns 4 variations.
- **Search (web)**: edge function `dsh-ai-search-images` → calls Unsplash API (free, requires `UNSPLASH_ACCESS_KEY` secret) and returns 4 thumbnails with attribution. Falls back to Pexels if Unsplash key missing (`PEXELS_API_KEY`).

Each result has buttons: **Use as reference** (adds to current poster's Reference Tray with role `subject` or `style`), **Save to Brand Library** (uploads to `dsh-media` and inserts `dsh_brand_assets` row with kind `reference`), **Download**.

### Files touched
- `supabase/functions/dsh-ai-generate-video/index.ts` (new)
- `supabase/functions/dsh-ai-generate-stock/index.ts` (new)
- `supabase/functions/dsh-ai-search-images/index.ts` (new)
- `src/digital-success/ai/AiStudioPage.tsx` — add two tabs
- `src/digital-success/ai/VideoClipPanel.tsx` (new)
- `src/digital-success/ai/StockImagesPanel.tsx` (new)
- `src/digital-success/ai/usePromoStudio.ts` — add `generateVideo`, `generateStockImages`, `searchStockImages`
- Recent Generations panel: detect video paths and render `<video>`
- Secrets: optional `UNSPLASH_ACCESS_KEY` (for web search). Generation needs no extra key — uses existing `LOVABLE_API_KEY`. No `OPENAI_API_KEY` required.

### Open questions before I build
1. **Video provider** — Lovable AI Gateway currently exposes image gen but not video. For video, the cleanest path is the agent-side `videogen` tool, which isn't callable from the user's app at runtime. Two options:
   - **A.** Server-side call to a 3rd-party video API (Replicate / fal.ai / Runway). Needs a new secret + has per-clip cost (~$0.50–$2 per 5s clip).
   - **B.** Skip live video gen; instead let users assemble a "motion poster" — pan/zoom (Ken Burns) over a generated poster, exported as MP4 via FFmpeg in the edge function. Free, fast, but not true generative video.
2. **Stock search provider** — Unsplash (free, 50 req/hr without app approval) vs Pexels (free, higher limits) vs paid (Shutterstock). Default to Unsplash unless you prefer Pexels.

Tell me which video route (A or B) and which stock source, and I'll build it.
