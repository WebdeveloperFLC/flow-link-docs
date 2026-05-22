# Integrate OpenAI GPT-Image-1 for poster generation

Add OpenAI as an alternative image renderer alongside the existing Gemini path. User brings their own `OPENAI_API_KEY`; we call OpenAI's Images API directly from a new edge function (Lovable AI Gateway does not expose GPT image models).

## What changes

### 1. Secret
- Request `OPENAI_API_KEY` via the secrets tool. User pastes their key from https://platform.openai.com/api-keys.

### 2. New edge function: `dsh-ai-generate-poster-openai`
Mirror of the current `dsh-ai-generate-poster`, but calls OpenAI directly.

- Endpoint: `POST https://api.openai.com/v1/images/generations` (text-only) or `POST https://api.openai.com/v1/images/edits` (when references are attached, using multipart with up to 16 reference PNGs).
- Model: `gpt-image-1`. Size: `1024x1536` (portrait), `1024x1024` (square), `1024x1536` for story (closest supported). Quality: `high` for premium, `medium` for standard.
- Same prompt builder as current function: brand block, strict logo rules, blueprint/institution-logo handling, verbatim contact footer, reference hint lines.
- Returns base64 PNG → upload to `dsh-media` storage → insert into `dsh_ai_generations` with `model: "openai/gpt-image-1"` so the existing Recent Generations panel and delete buttons keep working.
- Auth, CORS, rate-limit (429) and quota (402/insufficient_quota) handling identical to existing functions.

### 3. Frontend wiring (`usePromoStudio.ts` + `AiStudioPage.tsx`)
- Extend the quality selector to add a new tier: **"Premium (ChatGPT)"** in addition to existing Standard / Premium (Gemini).
- When that tier is selected, `generatePosters()` invokes `dsh-ai-generate-poster-openai` instead of `dsh-ai-generate-poster`. Everything else (brief form, reference tray, brand library, recent generations, delete buttons) is unchanged.
- Cap variations at 2 for the OpenAI path (latency + cost).

### 4. No DB migration needed
`dsh_ai_generations` already stores `model` as text and `image_paths` as an array; OpenAI rows slot in alongside Gemini rows.

## Honest trade-offs to know upfront
- **Cost**: GPT-Image-1 `high` quality ~ $0.17–$0.25 per 1024×1536 image, billed directly to your OpenAI account (not Lovable credits).
- **Reference fidelity**: GPT-Image-1 *does* accept reference images via `/images/edits`, but in practice it tends to *redraw* logos rather than paste them verbatim — the opposite of what Nano Banana Pro does well. The "Future Link logo top-left" / "institution logo top-right" rules will be looser than today. We'll keep the strict prompt instructions, but expect more touch-ups.
- **Blueprint mirroring**: Likely worse than Gemini for preserving an existing poster's exact layout + institution wordmark. GPT excels at fresh compositions, not faithful template replication.
- **Speed**: `high` quality takes ~30–60s per image (similar to Gemini 3 Pro Image).

If logo/IBU/contact fidelity is your #1 pain point, the *prompt-rewrite-then-Gemini* route would likely score higher than swapping renderers. Happy to add both — say the word.

## Files touched
- `supabase/functions/dsh-ai-generate-poster-openai/index.ts` (new)
- `src/digital-success/ai/usePromoStudio.ts`
- `src/digital-success/ai/AiStudioPage.tsx`
- secret: `OPENAI_API_KEY`
