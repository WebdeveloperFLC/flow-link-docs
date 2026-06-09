# Helpline WhatsApp on Meta — Team setup guide

Use the **search bar** on this page — try *webhook*, *sandbox*, *secrets*, *helpline*, or *verify*.

> **TIP:** Complete **sandbox test (Part C–F)** before adding the public helpline number (Part G).  
> **Related:** [WhatsApp Helpline — Staff Guide](/guides/whatsapp-helpline) (inbox usage, counselor privacy, troubleshooting).

**Purpose:** Connect the company **helpline WhatsApp number** to the CRM inbox.  
**CRM Supabase project:** `auofttkyosgjhxcbhscw`  
**Who should do this:** Meta Business access + Supabase Dashboard (secrets, SQL). Deploy code from **GitHub**; use Lovable only when **creating new** Supabase resources.

---

## 1. Quick search

| I want to… | Search for | Section |
|------------|------------|---------|
| Start from zero | `developer` `register` | Part A |
| Test without real helpline | `sandbox` | Part C |
| Connect CRM to Meta | `webhook` `verify` | Part D |
| Set backend secrets | `secrets` `supabase` | Part E |
| Add real office number | `helpline` `production` | Part G |
| Daily staff workflow | `counselor` `assign` | Part H |

### Setup phases

```flow
Meta Developer account
Create Business app + WhatsApp
Sandbox test + webhook
GitHub push + edge deploy
End-to-end test
Add real helpline number
Permanent token + go-live
```

---

## 2. What you are setting up

| Item | What it is |
|------|------------|
| **Helpline number** | The one number clients message on WhatsApp |
| **Meta WhatsApp Business** | Hosts that number; API send/receive |
| **CRM WhatsApp Inbox** | Staff read/reply in the app |

> **IMPORTANT:** Counselors do **not** add personal WhatsApp numbers to CRM. They use **CRM → WhatsApp** after assign/forward. Clients always see the **helpline** number.

---

## 3. Before you start

- [ ] Meta Business account ([business.facebook.com](https://business.facebook.com))
- [ ] Work Facebook / Meta login for Future Link
- [ ] Helpline phone ready for SMS/voice OTP (real number, Part G)
- [ ] CRM: `whatsapp-webhook` and `whatsapp-send` deployed from repo (`./scripts/deploy-whatsapp.sh`)
- [ ] Staff trained on **Guide → WhatsApp Helpline**

---

## 4. Part A — Meta Developer account (one-time)

1. Open [developers.facebook.com](https://developers.facebook.com).
2. **Create a Meta for Developers account** → **Continue** through Register, Verify, Contact info, About you.
3. If macOS Keychain asks for password → **Allow** (Mac login password).

---

## 5. Part B — Create app and add WhatsApp

1. **My Apps** → **Create App**.
2. Type: **Business** (not Consumer).
3. Name example: `Future Link CRM WhatsApp`.
4. Link your **Meta Business** account.
5. **Add product** → **WhatsApp** → **Set up** → open **API Setup**.

---

## 6. Part C — Sandbox test first

Use Meta’s **test number** before the public helpline.

### C1 — Copy API credentials

On **API Setup**, save securely:

| Field | Supabase secret |
|--------|-----------------|
| **Phone number ID** | `WHATSAPP_PHONE_NUMBER_ID` |
| **Temporary access token** | `WHATSAPP_ACCESS_TOKEN` (test only; expires) |
| **WABA ID** | Reference only |

### C2 — Add test recipient

1. **Send messages** / **To** on API Setup.
2. Add **your personal mobile** with country code (e.g. `91XXXXXXXXXX`).
3. Confirm WhatsApp verification code.

Only listed numbers can message the **sandbox** business number during testing.

---

## 7. Part D — Webhook (Meta → CRM)

1. **WhatsApp → Configuration** → **Edit** webhook.

| Field | Value |
|--------|--------|
| **Callback URL** | `https://auofttkyosgjhxcbhscw.supabase.co/functions/v1/whatsapp-webhook` |
| **Verify token** | Team secret, e.g. `flc-helpline-verify-2026` |

2. **Verify and save**.
3. Subscribe webhook field: **messages**.

```decision
Webhook verify failed?
  → Token matches WHATSAPP_VERIFY_TOKEN in Supabase exactly?
  → whatsapp-webhook deployed on auofttkyosgjhxcbhscw?
```

---

## 8. Part E — Supabase edge secrets

Set in **Supabase Dashboard → Edge Functions → Secrets** (project `auofttkyosgjhxcbhscw`):

| Secret | Value |
|--------|--------|
| `WHATSAPP_PROVIDER` | `meta` |
| `WHATSAPP_ACCESS_TOKEN` | From API Setup |
| `WHATSAPP_PHONE_NUMBER_ID` | From API Setup |
| `WHATSAPP_VERIFY_TOKEN` | Same as Part D verify token |
| `WHATSAPP_APP_SECRET` | App → Settings → Basic → App secret |
| `WHATSAPP_APP_SECRETS` | Optional — comma-separated app secrets when multiple Meta Developer apps send webhooks to CRM |
| `WHATSAPP_AI_MODE` | `rules` (default) or `gemini_dev` for smarter intake |
| `WHATSAPP_AUTO_ASSIGN` | `true` (default) — auto-assign counselor after intake YES |
| `GEMINI_API_KEY` | Optional — direct Gemini for `gemini_dev` (else uses `LOVABLE_API_KEY`) |

**After secrets change**, redeploy edge functions from the GitHub repo:

```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."   # https://supabase.com/dashboard/account/tokens
./scripts/deploy-whatsapp.sh
```

**Frontend:** merge to `main` and deploy via your normal CI/host. Set build-time env:

```env
VITE_WHATSAPP_ENABLED=true
VITE_WHATSAPP_PROVIDER=meta
```

> **Lovable:** use only when **creating new** Supabase edge function files or first-time project wiring — not for routine deploys or frontend publish.

> **WARNING:** Never paste tokens in email, Slack, or chat. Revoke if leaked.

---

## 9. Part F — End-to-end sandbox test

```flow
Deploy from GitHub
Message sandbox number from test phone
Thread in CRM WhatsApp
Assign counselor
Counselor replies in CRM
Reply on phone from business number
```

1. **Push** latest code to GitHub; confirm production frontend is deployed (`VITE_WHATSAPP_PROVIDER=meta`).
2. From **test recipient phone**, WhatsApp the **sandbox business number** (on API Setup).
3. **CRM → WhatsApp** — conversation appears.
4. Admin/telecaller **assigns** counselor.
5. Counselor replies in **counselor** box (bottom) — not personal WhatsApp.
6. Client phone receives reply **from sandbox business number**.

---

## 10. Part G — Real helpline number (go-live)

### G1 — WhatsApp Manager

1. [business.facebook.com](https://business.facebook.com) → **WhatsApp Manager**.
2. **Phone numbers** → **Add phone number** → enter **helpline**.
3. Complete SMS/voice verification.

### G2 — Business verification

Start early if Meta prompts — can take several days.

### G3 — Permanent access token

Replace 24h temp token with **System User** token:

1. Business Settings → **System users** → create user.
2. Assign WhatsApp Business Account + app.
3. Token permissions: `whatsapp_business_messaging` (and related).
4. Update `WHATSAPP_ACCESS_TOKEN` in Supabase.

### G4 — Phone number ID

When the **real** line is live, API Setup may show a **new Phone number ID**. Update `WHATSAPP_PHONE_NUMBER_ID` to the helpline line’s ID (not sandbox).

### G5 — Client communication

Clients message **only the helpline**. Staff replies always come from that same number.

### G6 — Second shared helpline (different WABA or Meta app)

Use this when you have **another helpline number** (e.g. India office) on a **different WhatsApp Business Account** or Meta Developer app, but still want the same CRM inbox and AI intake flow.

#### G6.1 — System user token (both WABAs)

1. **Business Settings → System users** → open the user that owns `WHATSAPP_ACCESS_TOKEN`.
2. **Add assets** → assign the **second WABA** with `whatsapp_business_messaging`.
3. Confirm the same token can read the second Phone number ID (Graph API Explorer: `GET /{second_phone_number_id}`).

Do **not** add a second token in Supabase — CRM uses one `WHATSAPP_ACCESS_TOKEN`.

#### G6.2 — Webhook on the second Meta app

On the **second** Developer app → **WhatsApp → Configuration**:

| Field | Value |
|--------|--------|
| Callback URL | `https://auofttkyosgjhxcbhscw.supabase.co/functions/v1/whatsapp-webhook` |
| Verify token | Same as `WHATSAPP_VERIFY_TOKEN` |
| Subscribe | **messages** |

#### G6.3 — App secret (different Meta apps only)

If both numbers share **one** Meta Developer app → keep single `WHATSAPP_APP_SECRET`.

If they use **different** Meta Developer apps → set comma-separated secrets in Supabase:

```text
WHATSAPP_APP_SECRETS=first_app_secret,second_app_secret
```

(You can remove `WHATSAPP_APP_SECRET` when using `WHATSAPP_APP_SECRETS`.)

#### G6.4 — Register line in CRM

**CRM → WhatsApp → Manage lines → Add line → Shared helpline**

- Label (e.g. `India office helpline`)
- Meta Phone number ID (from second number’s API Setup)
- Optional display number

Keep **Primary helpline Meta Phone number ID** as your main line (matches `WHATSAPP_PHONE_NUMBER_ID` secret).

#### G6.5 — Templates on second WABA

Templates are per WABA. Create and approve **`fl_helpline_followup`** on the **second** WhatsApp Manager account too (see G7 below).

#### G6.6 — Test

1. Redeploy: `./scripts/deploy-whatsapp.sh`
2. Message the **second** number from a test phone.
3. **CRM → WhatsApp** — thread appears with the second line’s label badge.
4. Staff reply — client receives from the **second** number.

---

### G7 — Message templates (Phase 2b, outside 24h)

When the client has not messaged in 24 hours, counselors must use **Meta-approved templates** (not free text).

1. **WhatsApp Manager → Message templates** → Create template.
2. **Name (exact):** `fl_helpline_followup`
3. **Language:** English (`en`)
4. **Body:** `Hello {{1}}, this is {{2}} from Future Link. We are here to help with your study abroad query. Please reply when convenient.`
5. Submit for Meta review; wait for **Approved** status.
6. CRM DB row must match (migration `20260606140000_whatsapp_message_templates.sql`).

If Meta rejects, adjust wording per their policy and keep the **same template name** in CRM.

---

## 11. Part H — Daily CRM workflow

```navmap
CRM | /whatsapp | Helpline inbox
CRM | /leads | Leads from whatsapp_helpline
Guide | /guides/whatsapp-helpline | Operations guide
Guide | /guides/whatsapp-meta-team-setup | This guide
```

| Role | Action |
|------|--------|
| Client | Messages **helpline** on WhatsApp |
| AI rules bot | Intake → YES → lead (unknown numbers) |
| Telecaller / Admin | Assign or forward in inbox |
| Counselor | **CRM → WhatsApp** only (assigned threads) |
| Super admin | All threads |

---

## 12. Troubleshooting

| Problem | Check |
|---------|--------|
| Webhook verify fails | Verify token match; function deployed |
| No CRM thread | `messages` subscribed; function logs |
| Signature 401 | `WHATSAPP_APP_SECRET` or `WHATSAPP_APP_SECRETS` (comma-separated for multiple Meta apps) |
| No reply on phone | `WHATSAPP_PROVIDER=meta`; token; correct Phone number ID |
| Counselor sees nothing | Thread **assigned**; use CRM not personal WA |

---

## 13. Sign-off checklist (team lead)

- [ ] Sandbox inbound in CRM
- [ ] Sandbox counselor reply on test phone
- [ ] Real helpline in WhatsApp Manager
- [ ] Permanent token + correct Phone number ID
- [ ] Staff briefed: CRM inbox for helpline
- [ ] (If second helpline) Second WABA on system user token; webhook on second app; line added in **Manage lines**
- [ ] (If second WABA) `fl_helpline_followup` approved on second WABA
- [ ] [WhatsApp Helpline guide](/guides/whatsapp-helpline) published in app
