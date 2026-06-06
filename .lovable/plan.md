# WhatsApp module: test + fix

## Issues found

1. **Duplicate inbound + duplicate AI replies** (screenshot). The webhook dedups on `provider_message_id` (lines 273-284 of `whatsapp-webhook/index.ts`), but the CRM "Simulate inbound" / "As client" path doesn't send one. Two quick clicks (or a double-fired client) produce two identical inbound rows and two parallel AI reply pairs.
2. **No automated tests** for any WhatsApp shared module (rulesIntake, counselingHandoff, geminiClient mode detection, phone normalization, business-line resolution).
3. **No end-to-end check** that the new flow (intake → `ai_counseling` → COUNSELOR → assigned + bell) actually works against the deployed function.

## Fixes

### 1. Short-window dedup for mock / non-provider inbound
In `supabase/functions/whatsapp-webhook/index.ts`, after the existing `provider_message_id` dedup block, add a fallback:

- If no `providerMessageId`, look up the most recent inbound message on the same `conversation_id` within the last 4 seconds with identical `body`. If one exists, return `{ ok: true, deduped: true }` before insert.
- Applies to both `mock` and any provider that doesn't supply a message id.

This is the smallest safe change — it doesn't touch Meta dedup, and it prevents accidental double-click / double-fire from doubling AI cost.

### 2. Deno unit tests
Create the following test files (run via `supabase--test_edge_functions`):

- `supabase/functions/_shared/whatsapp/rulesIntake_test.ts`
  - welcome → country extraction (`"Canada"`, `"I want to study in UK"`)
  - level parsing (`"PG"`, `"undergraduate"`, `"work"`)
  - branch capture
  - name validation (rejects greetings, accepts `"Santosh Ramrakhiani"`)
  - YES at confirm → `confirmed=true`, step=`done`
  - `shouldForceIntakeConfirm` true when all fields present + YES
  - `splitName` edge cases
  - `RESTART` resets to country
- `supabase/functions/_shared/whatsapp/counselingHandoff_test.ts`
  - `clientRequestsCounselor`: matches `"COUNSELOR"`, `"talk to a human"`, `"counsellor se baat"`; rejects `"What documents?"`
  - `counselingBeforeAssignEnabled`: env=`true`/`false`/empty under each AI mode
- `supabase/functions/_shared/whatsapp/phone_test.ts`
  - `normalizePhoneE164` and `phonesMatch` (India 10-digit, +91 prefix, spaces, dashes)
- `supabase/functions/_shared/whatsapp/geminiClient_test.ts`
  - `isGeminiAiMode` for `gemini` / `gemini_dev` / `production` / `rules` / `off`
  - `geminiKeysAvailable` reads `GEMINI_API_KEY` / `LOVABLE_API_KEY`

All tests use `Deno.test` + `assert` from `https://deno.land/std@0.224.0/assert/mod.ts`. No DB calls — pure functions only.

### 3. End-to-end simulation against the deployed webhook
Using `supabase--curl_edge_functions` with the `WHATSAPP_WEBHOOK_SECRET` (or mock+staff auth), POST a scripted intake from a fresh test phone:

```
Canada → Postgraduate → Mumbai → Test User → YES
→ expect status `ai_counseling`, no counselor assigned, welcome message
"What documents do I need?" → expect Gemini reply, still `ai_counseling`
"COUNSELOR" → expect status `assigned_active`, `assigned_user_id` set, bell notification row
```

After each step, read `whatsapp_conversations` and `whatsapp_messages` via `supabase--read_query` to assert state. Tail `supabase--edge_function_logs` for `whatsapp-webhook` to catch any thrown errors.

Any bug surfaced (e.g. Gemini parse error, missing grant, assignment race) gets a follow-up fix in the same build pass.

## Deploy
Redeploy `whatsapp-webhook` once after the dedup fix. Tests run in the sandbox; no deploy needed for them.

## Out of scope
- Rewriting Gemini prompts to better handle repeated intake text (the dedup fix removes the user-visible symptom).
- Refactoring `index.ts` (655 lines) into smaller modules.
- UI changes to the CRM simulate panel.
