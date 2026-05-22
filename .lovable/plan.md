## Goal
Replace Replicate in `dsh-ai-generate-video` with **Google AI Studio (Veo 3 Fast)** as the primary provider and **Pollinations.ai** as automatic fallback when Google fails (quota exhausted, 429, 5xx, or timeout).

## How it will work

1. User clicks "Generate clip" in the AI tab of Video Clips panel (no UI change).
2. Edge function tries **Google Veo 3 Fast** first:
   - `POST https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-fast-generate-preview:predictLongRunning`
   - Polls the operation every 5s until `done: true` (max 110s).
   - Downloads the returned MP4 (requires appending `?key=$GOOGLE_AI_API_KEY` to the file URI).
3. If Google fails with quota (429), credit (402), timeout, or 5xx → automatically retry with **Pollinations.ai**:
   - `GET https://image.pollinations.ai/prompt/{encoded_prompt}?model=veo&...` (their free video endpoint, no key needed).
   - Note: Pollinations video quality is noticeably weaker — surface a toast like "Used backup provider (lower quality)".
4. Either way, uploads the MP4 to `dsh-media` storage and inserts a `dsh_ai_generations` row. The frontend gets back `{ path, provider }` and shows the video as today.

## Provider choice surfaced to user
The response includes which provider was used. Frontend shows a small badge under the video:
- `Generated with Google Veo 3 Fast`
- `Generated with Pollinations (backup)` + warning that quality is lower

## Secret required
**`GOOGLE_AI_API_KEY`** — get it free at https://aistudio.google.com/apikey (sign in with Google → "Create API key"). No billing setup needed for the free tier.

**I'll request this secret once you approve the plan.** Pollinations needs no key.

## Free tier reality check
- Veo 3 Fast free tier on AI Studio is **rate-limited** (typically 2–5 generations per day per key). When it's used up, the function will silently fall back to Pollinations until tomorrow.
- To raise the limit, enable billing on the Google Cloud project tied to the key (~$0.40 per 8s clip — still cheaper than Replicate Kling).

## Files

**Edited** — `supabase/functions/dsh-ai-generate-video/index.ts`:
- Remove all Replicate code.
- Add `generateWithGoogle(prompt, aspect, duration)` → returns `Uint8Array | null` (null on recoverable failure).
- Add `generateWithPollinations(prompt, aspect)` → returns `Uint8Array | null`.
- Orchestrator tries Google → falls back to Pollinations → returns 502 only if both fail.
- Response shape: `{ ok: true, path, generation_id, provider: "google-veo-3-fast" | "pollinations" }`.

**Edited** — `src/digital-success/ai/VideoClipPanel.tsx`:
- Store `provider` from response, show small caption under the `<video>` element.
- Toast variant: success for Google, warning for Pollinations.

**Edited** — `src/digital-success/ai/usePromoStudio.ts`:
- `generateVideoFromConcept` returns `{ generation_id, path, provider }`.

## Trade-offs
- Pollinations is best-effort and may return a low-res clip or fail entirely on a given day. It's a safety net, not a replacement.
- Veo 3 Fast free quota resets daily — users may hit limits during heavy use.
- If you want guaranteed throughput, enable billing on the Google Cloud project or keep Replicate credits as a third fallback (let me know).

## Approval
Approve this plan and I'll:
1. Request the `GOOGLE_AI_API_KEY` secret (you paste it from aistudio.google.com/apikey).
2. Rewrite the edge function and update the frontend.