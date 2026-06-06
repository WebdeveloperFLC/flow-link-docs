# WhatsApp Phase 1 — Meta setup (technical)

> **Team step-by-step (recommended):** [Helpline on Meta — Team setup](/guides/whatsapp-meta-team-setup) in the app under **Guide → WhatsApp Meta setup**.

> **Operations & flows:** [WhatsApp Helpline — Staff Guide](/guides/whatsapp-helpline).

## Webhook

```text
https://auofttkyosgjhxcbhscw.supabase.co/functions/v1/whatsapp-webhook
```

## Secrets

See the [Meta team setup guide](/guides/whatsapp-meta-team-setup) for the full table. Set in **Supabase Dashboard → Edge Functions → Secrets**.

## Deploy (from GitHub repo)

```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."   # https://supabase.com/dashboard/account/tokens
./scripts/deploy-whatsapp.sh
```

Deploys:

- `whatsapp-webhook`
- `whatsapp-send`
- `whatsapp-media-url`

**Frontend:** push to `main` → production host deploys with `VITE_WHATSAPP_PROVIDER=meta`.

**Lovable:** only when creating **new** Supabase edge function files — not for routine deploys.
