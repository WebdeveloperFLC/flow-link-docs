# WhatsApp Phase 1 — Meta Cloud API (sandbox)

Connect your **helpline** WhatsApp number to the CRM inbox. Phase 0 mock/simulate still works when Meta is not configured.

## Prerequisites

- Meta Business account
- [developers.facebook.com](https://developers.facebook.com) → create an app → add **WhatsApp** product
- Supabase project: `auofttkyosgjhxcbhscw` (your existing CRM project)

## 1. Meta Developer Console

1. **WhatsApp → API Setup**
2. Copy **Phone number ID** and generate a **temporary access token** (sandbox) or system user token (production).
3. Add a test recipient phone (sandbox) under **API Setup → send messages**.

## 2. Webhook URL (Supabase)

Callback URL:

```text
https://auofttkyosgjhxcbhscw.supabase.co/functions/v1/whatsapp-webhook
```

**Verify token:** choose any secret string (e.g. `flc-helpline-verify-2026`) — same value as edge secret below.

Subscribe to webhook field: **messages**.

Deploy functions:

```bash
supabase functions deploy whatsapp-webhook
supabase functions deploy whatsapp-send
```

## 3. Edge secrets (Supabase → Project Settings → Edge Functions → Secrets)

| Secret | Example | Required |
|--------|---------|----------|
| `WHATSAPP_PROVIDER` | `meta` | Yes for live send (`auto` also works if tokens set) |
| `WHATSAPP_ACCESS_TOKEN` | From Meta API Setup | Yes |
| `WHATSAPP_PHONE_NUMBER_ID` | From API Setup | Yes |
| `WHATSAPP_VERIFY_TOKEN` | Same as Meta webhook verify token | Yes for webhook subscribe |
| `WHATSAPP_APP_SECRET` | App → Settings → Basic → App secret | Recommended (signature check) |
| `WHATSAPP_AI_MODE` | `rules` | Optional (default rules) |
| `WHATSAPP_WEBHOOK_SECRET` | Any string | Optional (mock simulate only) |

Keep `WHATSAPP_PROVIDER=mock` to stay CRM-only (no Meta charges).

## 4. Frontend env (Lovable / `.env`)

```env
VITE_WHATSAPP_ENABLED=true
VITE_WHATSAPP_PROVIDER=meta
```

Publish the app after changing env.

## 5. Test

1. From your **personal phone** (added as test recipient in Meta), message the **sandbox business number**.
2. CRM → **WhatsApp** — thread should appear; AI intake runs if unknown number.
3. Counselor reply from inbox should deliver to WhatsApp when `WHATSAPP_PROVIDER=meta`.

**Simulate inbound** still works for training (does not use Meta).

## 6. Phase 2 (later)

- Permanent access token / System user
- Real helpline number (not sandbox)
- Business verification
- Optional: Gemini for intake (`WHATSAPP_AI_MODE=gemini_dev`)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Webhook verify fails | `WHATSAPP_VERIFY_TOKEN` must match Meta form exactly |
| No inbound in CRM | Check Meta webhook subscriptions + function logs |
| Reply not on phone | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, 24h session rules |
| 401 invalid signature | Set `WHATSAPP_APP_SECRET` or disable by leaving secret unset |
