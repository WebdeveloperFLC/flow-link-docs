# Use your own free Google Gemini API key

Wire the Accounting AI assistant (and optionally other AI features later) to call Google's Gemini API directly using a free API key you generate at [aistudio.google.com](https://aistudio.google.com/apikey). This bypasses the Lovable AI Gateway entirely, so it doesn't consume Lovable AI credits.

## What you do (one-time, ~2 minutes)

1. Go to https://aistudio.google.com/apikey
2. Click **Create API key** → pick any Google Cloud project (or "Create new")
3. Copy the key (starts with `AIza...`)
4. When I prompt you, paste it into the secret form — it's stored securely as `GEMINI_API_KEY`

Google's free tier on `gemini-2.5-pro` and `gemini-2.5-flash` is generous (millions of tokens/day) and resets daily.

## What I'll change in code

**`supabase/functions/ai-financial-assistant/index.ts`** — the only edge function the assistant calls:

- Read `GEMINI_API_KEY` instead of `LOVABLE_API_KEY`.
- Replace the call to `https://ai.gateway.lovable.dev/v1/chat/completions` with a direct call to Google's Generative Language API: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`.
- Convert the OpenAI-style `messages` array into Gemini's `contents` format (Gemini uses `role: "user" | "model"` and a single `systemInstruction` field instead of a system message in the array).
- Parse Gemini's response shape (`candidates[0].content.parts[0].text`) and return it in the same `{ text }` JSON the frontend already expects — so **no frontend changes needed**.
- Keep the existing CORS handling and 429 / quota error messages, mapped to Gemini's error codes.

## Scope

- Only the Accounting AI assistant (`/accounting/ai-assistant`) is rewired in this change.
- Image generation, poster generation, and AI image-edit features continue to use Lovable AI (they use Gemini's image-preview models which aren't on the free generativelanguage tier in the same way). I can migrate those separately if you also want them off Lovable credits.

## After it's deployed

You'll be able to use the assistant immediately with zero Lovable AI credit consumption. If you ever hit Google's free quota, the toast will say so clearly.

Click **Approve plan** and I'll request the `GEMINI_API_KEY` secret, then apply the change.
