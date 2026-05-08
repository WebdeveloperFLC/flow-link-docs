# Add TELECMI_WEBHOOK_SECRET

You have the secret now. One small action, no code changes.

## What happens

1. I'll prompt you to add `TELECMI_WEBHOOK_SECRET` via the secure secrets form.
2. The webhook handler (`telephony-webhook`) already checks for this env var on every request:
   - **Before**: logs a warning, accepts all webhooks.
   - **After**: verifies HMAC-SHA256 signature on every request; rejects unsigned or bad-signature calls with `401`.
3. No redeploy needed — edge functions read env vars at runtime.

## What you need to do in TeleCMI dashboard

Make sure TeleCMI is configured to **send the signature header** on outgoing webhooks. The handler accepts either header name:
- `X-TeleCMI-Signature`, or
- `X-Signature`

Both should contain the HMAC-SHA256 hex digest of the raw request body, computed with this same secret.

## Risk

If TeleCMI sends webhooks without that header (or with a different signing scheme), all webhooks will start failing with `401` after you add the secret. If that happens:
- Tell me what header name TeleCMI uses and what the signing format is, and I'll adjust `telecmi.ts` `verifyWebhook()`.
- Or temporarily delete the secret to fall back to unsigned mode.

## Next step

After you approve I'll trigger the secret-input form. That's it for this stage.
