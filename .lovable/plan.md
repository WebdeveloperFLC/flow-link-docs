## Plan: Re-enter WhatsApp Meta secrets

Update these 6 backend secrets with fresh values from Meta:

1. `WHATSAPP_PROVIDER` = `meta`
2. `WHATSAPP_ACCESS_TOKEN` = fresh token from Meta → WhatsApp → API Setup (or permanent System User token)
3. `WHATSAPP_PHONE_NUMBER_ID` = from Meta API Setup
4. `WHATSAPP_APP_SECRET` = from Meta App → Settings → Basic
5. `WHATSAPP_VERIFY_TOKEN` = same value used in Meta webhook configuration
6. `WHATSAPP_AI_MODE` = `rules`

### Steps on approval

1. Open the secrets dialog for all 6 names so you can paste values in one secure form.
2. After you save, redeploy `whatsapp-webhook`, `whatsapp-send`, and `whatsapp-media-url` so they pick up the new env vars.
3. Test: send an inbound message + image from your test phone (+14162942739 must be listed under Meta API Setup → To) and confirm:
   - Outbound reply lands on the phone
   - Inbound image renders in CRM (not `[Image]` fallback)

### Notes

- Temporary tokens expire in 24h — for a permanent fix use a System User token (guide Part G3).
- No code changes in this plan, just secret refresh + redeploy.
