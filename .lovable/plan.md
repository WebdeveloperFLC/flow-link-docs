# AI Promo Studio — Digital Success Hub

Add an in-app "AI Promo Studio" inside `/digital-success` that lets the team generate marketing posters, captions, reels scripts, and email/WhatsApp blurbs — like the four reference flyers you attached — and save them straight into the Hub library.

We'll use **Lovable AI** (no separate ChatGPT API key needed — it's already wired in via `LOVABLE_API_KEY`). It supports both OpenAI GPT-5 models for copy and Google's Nano Banana / Nano Banana Pro for images, so you get the "ChatGPT-style" experience without managing a separate billing account. If you specifically want OpenAI's image model, we can route image generation to `openai/gpt-5` via the gateway too — say the word.

## What the team will be able to generate

1. **Promotional poster image** (like the UWTSD / Lambton / Durham / ICP / IBU flyers you sent) — 1024x1536 portrait, 1080x1080 square, or 1080x1920 story.
2. **Caption pack** — Instagram, WhatsApp broadcast, Facebook, LinkedIn, email subject + body.
3. **Reel / short-video script** — hook, 3 beats, CTA.
4. **Counselor talking points** — internal bullet brief for telecallers / counselors.
5. **Edit an existing image** — upload a base poster (or pick one already in the Hub) → ask AI to swap intake date, change campus photo, restyle, translate text, add a logo, etc.

## Flow (UI)

New **"AI Studio"** button on the Digital Success Hub header, plus a new tab `AI Studio`.

```text
┌─ AI Studio ──────────────────────────────────────────┐
│  [ Generate poster ] [ Generate copy ] [ Edit image ]│
│                                                       │
│  Brief                                                │
│   Institution: [ University of Wales Trinity Saint…] │
│   Country:     [ UK ▾ ]                              │
│   Service:     [ Study Abroad ▾ ]                    │
│   Intake:      [ September 2026 ]                    │
│   Highlights:  [ MOI accepted, IELTS waiver, …    ]  │
│   Tone:        [ Energetic ▾ ]   Language: [ EN ▾ ]  │
│   Format:      ( ) Poster portrait                   │
│                ( ) Square 1:1   ( ) Story 9:16       │
│   Brand:       [x] Use Future Link branding          │
│                [x] Include logo + tagline             │
│                                                       │
│  [ Generate ]                                         │
├───────────────────────────────────────────────────────┤
│  Preview (4 variations)                               │
│   [img1] [img2] [img3] [img4]                         │
│   [ Regenerate ] [ Edit prompt ] [ Use this ]         │
│                                                       │
│  Caption pack (tabs: IG / WA / FB / Email)            │
│   ...editable text...                                 │
│                                                       │
│  [ Save to Hub ] [ Copy ] [ Download ]                │
└───────────────────────────────────────────────────────┘
```

"Save to Hub" inserts a `dsh_media` row (content_scope picked from brief, content_type = `poster` / `reel_script` / `caption_pack`), uploads the image to the `dsh-media` storage bucket, and tags it with institution / country / service so it shows up in the existing list and filters.

## Suggested extra options

- **Brand kit lock** — store Future Link logo, brand colors (navy + yellow), and tagline once in a `dsh_brand_kit` table; every generation auto-applies it so all posters look on-brand like your samples.
- **Templates / presets** — "September intake flyer", "Scholarship announcement", "Trade programs", "PGWP-eligible programs", "Bursary update" — one click loads brief + style.
- **Institution-aware fill** — when an institution is picked, auto-pull its programs, intakes, scholarships, and active promotions from the existing `upi_*` tables and feed them into the prompt (we already do this for `upi-generate-content`).
- **Reference-image upload** — drop last year's flyer; AI re-skins it with new dates / new campus.
- **Multi-language** — generate same poster in Hindi, Punjabi, Gujarati, Tamil, Telugu, Arabic.
- **A/B variants** — generate 4 different layouts at once; pick the best.
- **Translate & localize** existing Hub item.
- **Auto-tagging** — AI fills `title`, `campaign`, `tags`, `country_name`, `service_master_key` for the saved item so it surfaces correctly in branch searches.
- **Approval flow (optional)** — generated items land as `status='draft'`; an admin clicks "Publish" before they go out to branches.
- **History** — `dsh_ai_generations` table stores every brief + output so the team can re-open and tweak.
- **Cost / quota guardrails** — show a small "AI credits this month" badge; rate-limit per user.
- **Reel script → video stub** — optional later: pass the script to a video generation tool.

## Technical changes

**Database (new migration):**
- `dsh_brand_kit` — singleton-style table (logo_url, primary_color, secondary_color, accent_color, tagline, default_footer).
- `dsh_ai_generations` — `id, user_id, brief jsonb, kind ('poster'|'copy'|'edit'), prompt, image_paths text[], output_text, model, created_at`. RLS: users see their own + admins see all.
- `dsh_media`: no schema change; we re-use existing columns. Add `source = 'ai_generated'` to `meta` jsonb.

**Storage:** re-use existing `dsh-media` bucket; new prefix `ai/{user_id}/{generation_id}.png`.

**Edge functions:**
- `dsh-ai-generate-poster` — POST `{ brief, format, variations }` → calls Lovable AI Gateway with `google/gemini-3-pro-image-preview` (high-quality, slower) or `google/gemini-3.1-flash-image-preview` (faster) using the `modalities: ["image", "text"]` pattern. Uploads each base64 result to storage, returns signed URLs.
- `dsh-ai-generate-copy` — POST `{ brief, channels[] }` → `google/gemini-3-flash-preview` returns structured JSON (subject, body, ig, wa, fb, linkedin, email) via tool-calling.
- `dsh-ai-edit-image` — POST `{ image_url, instruction }` → Nano Banana edit endpoint.
- `dsh-ai-save` — POST `{ generation_id, target: { content_scope, country, service, institution_id, branch_ids[] } }` → creates `dsh_media` row + optionally calls existing notify-branches logic.

All three image/copy functions stream progress (SSE) so the UI shows "Drafting…", "Rendering image 2 of 4…".

**Frontend (`src/digital-success/ai/`):**
- `AiStudioPage.tsx` — main page mounted at `/digital-success/ai`.
- `PosterBriefForm.tsx`, `CopyBriefForm.tsx`, `EditImagePanel.tsx`.
- `PreviewGrid.tsx` — 4-up image preview with select / regenerate / download.
- `SaveToHubDialog.tsx` — picks scope, branches, notifies.
- `BrandKitSettings.tsx` — admin-only, edits `dsh_brand_kit`.
- `usePromoStudio.ts` — hook for streaming + state.
- Add "AI Studio" entry to the Hub tab bar and a primary CTA button in the header next to "Add media".

**Reused infrastructure:**
- `useTeamMembers`, `useBranches`, `useServiceCatalogueOptions` — already present.
- Same upload + signed-URL pattern as `MediaUploadDialog`.

## Out of scope (for v1)

- Generating actual MP4 reels (only the script for now).
- Auto-posting to Instagram / Facebook / WhatsApp Business (we save & download; the team posts manually).
- Per-branch personalized variants in one click (can add later).
- PDF brochure layout engine (poster image is fine for v1).

## Question for you before I build

1. **Image model**: default to **Nano Banana Pro** (best quality, what your samples look like) — OK?
2. **Brand kit**: should I seed it now with the Future Link logo + navy/yellow palette I see in your flyers?
3. **Approval flow**: do you want generated items to require admin approval before branches see them, or auto-publish?
