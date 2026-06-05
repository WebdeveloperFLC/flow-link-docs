# WhatsApp Phase 1 — Meta setup (technical)

> **Staff guide with diagrams and flows:** open in the app under **Guide → WhatsApp Helpline** (`/guides/whatsapp-helpline`).

This file is the short technical checklist. The full operational guide (Phase 0 + 1, inbox usage, troubleshooting) is **`whatsapp-helpline.md`**.

## Webhook

```text
https://auofttkyosgjhxcbhscw.supabase.co/functions/v1/whatsapp-webhook
```

## Secrets

See §7 in the [WhatsApp Helpline staff guide](/guides/whatsapp-helpline) for the full secrets table and Meta console steps.

## Deploy

- `whatsapp-webhook`
- `whatsapp-send`

Via Lovable or Supabase CLI (requires project deploy permissions).
