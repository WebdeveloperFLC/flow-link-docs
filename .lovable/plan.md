## Plan

1. **Disable paid/uncertain AI video attempts by default**
   - Add a server-side safety switch so `dsh-ai-generate-video` immediately returns a clear message when AI video generation is unavailable, instead of calling Google/Replicate/Pollinations and burning credits.
   - Keep the existing code available behind an explicit environment flag, so it can be re-enabled later only when you confirm the Google AI Studio key has quota/billing.

2. **Reset the UI to the stable old workflow**
   - Make **Animate an image (Ken Burns)** the default selected tab.
   - Add clear copy near the AI tab explaining that text-to-video is paused to protect credits while quota is exhausted.
   - Keep the Ken Burns render flow working because it runs in-browser and does not use AI video credits.

3. **Improve the failure behavior**
   - If AI video is paused or quota is exhausted, show a clean toast/message instead of a scary runtime-looking error.
   - Do not call backup providers that are known to fail or timeout unless explicitly enabled.

4. **No credit-burning validation**
   - Validate by inspecting code paths only.
   - Do not trigger real video generation, do not run edge-function tests that call providers, and do not deploy until you approve implementation.

## Technical details

- Update `supabase/functions/dsh-ai-generate-video/index.ts` with an early guard such as `ENABLE_AI_VIDEO_GENERATION === "true"` before any provider calls.
- Update `src/digital-success/ai/VideoClipPanel.tsx` so Ken Burns is default and the AI flow communicates paused/unavailable state gracefully.
- Update `src/digital-success/ai/usePromoStudio.ts` only if needed to map the paused response into a friendly user-facing error.

## Result

The app returns to the old safe behavior for video creation, avoids spending Google AI Studio or Replicate credits, and preserves the AI video code for later reactivation when you add a key with quota or enable higher limits.