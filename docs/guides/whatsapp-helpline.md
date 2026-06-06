# WhatsApp Helpline — Staff Guide (Phase 0 & Phase 1)

Use the **search bar** on this page — try *simulate*, *meta*, *assign*, *lead*, *webhook*, or *counselor*.

> **TIP:** Phase 0 (mock) works today without Meta. Phase 1 connects a real WhatsApp number via Meta Cloud API.

---

## 1. Quick search

| I want to… | Search for | Section |
|------------|------------|---------|
| Test without a real phone | `simulate` `mock` | §4, §8 |
| Connect real WhatsApp | `meta` `webhook` | §7 |
| Understand AI intake | `intake` `YES` | §5 |
| Assign a counselor | `assign` `forward` | §6 |
| Find the lead created | `lead` | §5 |
| Who sees which chats | `privacy` `RLS` | §3 |
| Counselor vs client reply box | `as client` | §4 |
| Fix wrong country/name on confirm | `restart` | §8 |
| Set secrets in Supabase | `secrets` | §7 |

### Phases at a glance

```flow
Phase 0 Mock
Simulate + Rules AI
Lead in CRM
Phase 1 Meta Sandbox
Real inbound/outbound
Same inbox UI
Phase 2 Production
Helpline number live
Business verification
```

---

## 2. Where to find it in the app

```navmap
CRM | /whatsapp | WhatsApp Inbox — helpline threads
CRM | /leads | Leads — whatsapp_helpline source
CRM | /clients | Clients — existing numbers match threads
Guide | /guides/whatsapp-helpline | This guide
```

### System architecture

```flow
Client WhatsApp
Meta Cloud API (Phase 1)
whatsapp-webhook
CRM Inbox + AI intake
Lead created
Counselor assigned
whatsapp-send
Reply to client
```

### Inbound routing decision

```decision
Message arrives (real or Simulate)
  → Phone matches existing Client?
    → Yes: Thread → assigned counselor (existing_client)
    → No: Phone matches existing Lead?
      → Yes: Thread → lead counselor or queue
      → No: Start AI intake (unmatched_ai_intake)
        → Client replies YES?
          → Yes: Create Lead → awaiting_assignment
          → No: Continue intake questions
```

---

## 3. Who sees which conversations (privacy)

```tier
Counselor / assigned staff | Admin / Telecaller
Only threads assigned to them | All threads + unassigned queue
Their leads & clients only | Can assign / forward any thread
Reply in counselor box | Simulate inbound for training
```

| Role | Inbox visibility |
|------|------------------|
| **Counselor** | Assigned threads only |
| **Telecaller / Admin** | Unassigned queue + assign/forward |
| **Super Admin** | Everything |

> **NOTE:** Clients always message the **one helpline number**. Forwarding in CRM = reassign counselor, not a new phone number for the client.

---

## 4. Using the inbox (Phase 0 mock — live now)

### Two reply boxes (important)

```flow
As client / Simulate inbound
Inbound message + AI bot
Counselor reply box
Staff message stored in CRM
```

| Control | Who it simulates | AI bot responds? |
|---------|------------------|------------------|
| **Simulate inbound** (top) | New or same phone | Yes (during intake) |
| **As client** (in thread) | Client | Yes (during intake) |
| **Counselor reply** (bottom) | Your staff user | No |

> **WARNING:** Typing in the **counselor** box does **not** trigger the AI. Use **As client** for `Postgraduate`, name, `YES`.

### Recommended test script

```flow
study in Canada
Postgraduate
Full Name
YES
Check Leads list
Assign counselor
```

Send **RESTART** as client to clear a bad intake and start over.

---

## 5. AI intake → Lead

### Conversation status pipeline

```status
unmatched_ai_intake
awaiting_assignment_confirm
assigned_active
existing_client
closed
```

| Status | Meaning |
|--------|---------|
| `unmatched_ai_intake` | Unknown number; rules bot asking country → level → name |
| `awaiting_assignment_confirm` | Client said YES; lead created; needs counselor |
| `assigned_active` | Counselor owns thread |
| `existing_client` | Phone matched a client record |
| `closed` | Archived |

### Lead fields set on YES

- **Source:** `whatsapp_helpline`
- **Temperature:** warm
- **Interested countries:** from intake (e.g. Canada)
- **Notes:** intake level
- **Phone:** thread number

Open **Lead** link on the thread or search **Leads** (not Clients — lead is created first).

---

## 6. Assign and forward

```flow
Open thread
Assign / forward dropdown
Pick counselor
Assign
Lead.assigned_counselor updated
Counselor sees thread only
```

Telecaller or admin: use this for the unassigned queue. Counselors then reply from the bottom box.

---

## 7. Phase 1 — Meta Cloud API (real WhatsApp)

> **Team setup (step-by-step):** [Helpline on Meta — Team setup](/guides/whatsapp-meta-team-setup) — sandbox, webhook, secrets, real number, sign-off checklist.

### Prerequisites

- Meta Business account
- [developers.facebook.com](https://developers.facebook.com) → App → **WhatsApp** product
- Supabase project: `auofttkyosgjhxcbhscw`
- Edge functions deployed: `whatsapp-webhook`, `whatsapp-send` (via Lovable or CLI)

### Setup flow

```flow
Meta API Setup
Copy Phone number ID + Token
Supabase Edge secrets
Meta Webhook URL + verify token
Subscribe messages
VITE_WHATSAPP_PROVIDER=meta
Publish app
Test from phone
```

### Webhook URL

```text
https://auofttkyosgjhxcbhscw.supabase.co/functions/v1/whatsapp-webhook
```

**Verify token:** pick a secret string (e.g. `flc-helpline-verify-2026`) — must match Supabase secret `WHATSAPP_VERIFY_TOKEN`.

Subscribe to field: **messages**.

### Edge secrets (Supabase → Edge Functions → Secrets)

| Secret | Example | Required for Meta |
|--------|---------|-------------------|
| `WHATSAPP_PROVIDER` | `meta` | Yes |
| `WHATSAPP_ACCESS_TOKEN` | From Meta API Setup | Yes |
| `WHATSAPP_PHONE_NUMBER_ID` | From API Setup | Yes |
| `WHATSAPP_VERIFY_TOKEN` | Same as Meta webhook form | Yes |
| `WHATSAPP_APP_SECRET` | App → Basic → App secret | Recommended |
| `WHATSAPP_AI_MODE` | `rules` | Optional (default) |
| `WHATSAPP_WEBHOOK_SECRET` | any | Mock simulate only |

Keep `WHATSAPP_PROVIDER=mock` (or unset tokens) to stay **CRM-only** — no Meta charges.

### Frontend env (Lovable Publish)

```env
VITE_WHATSAPP_ENABLED=true
VITE_WHATSAPP_PROVIDER=meta
```

### Meta sandbox test

1. Add your personal phone as **test recipient** in Meta API Setup.
2. Message the **sandbox business number** from that phone.
3. CRM → **WhatsApp** — thread appears.
4. Counselor reply → delivers to WhatsApp when secrets are set.

**Simulate inbound** still works for training (does not use Meta).

---

## 8. Troubleshooting

| Problem | Fix |
|---------|-----|
| Bot wrong country/level/name | Short answers; use **As client**; send `RESTART` |
| No AI after first message | Thread may be **Assigned** — use new phone or RESTART |
| Lead not in Clients | Check **Leads** — YES creates a lead, not a client |
| Simulate fails | Lovable: redeploy `whatsapp-webhook`; stay logged in as staff |
| Webhook verify fails | `WHATSAPP_VERIFY_TOKEN` must match Meta exactly |
| No inbound from real phone | Webhook subscribed to `messages`; check function logs |
| Reply not on phone | Tokens + `WHATSAPP_PROVIDER=meta`; 24h WhatsApp session rules |
| Counselor can't see thread | Assign them; counselors don't see others' assigned chats |

### Deploy path (team)

```decision
Need to deploy functions?
  → Lovable connected to Supabase?
    → Yes: Ask Lovable to deploy whatsapp-webhook + whatsapp-send
    → No: Supabase CLI (needs org Owner) or dashboard
```

---

## 9. Phase 2+ (live features)

```flow
Helpline + legacy counselor lines
Assignment history
24h session warning
Staff name on replies
Counselor attachments (image/PDF)
Optional Gemini intake
```

| Phase | What | Status |
|-------|------|--------|
| **0** | Mock simulate + rules AI ($0) | Done |
| **1** | Meta send/receive + media | Done |
| **2** | Production helpline + business lines + assignment log + 24h UX | **Live** |
| **2b** | Meta message templates (after 24h) | **Live** |
| **3** | Gemini intake (`WHATSAPP_AI_MODE=gemini_dev`) | Optional — set secret + redeploy webhook |

### Phase 2 admin setup (one-time)

1. **CRM → WhatsApp → Lines** — set helpline **Meta Phone number ID** (must match `WHATSAPP_PHONE_NUMBER_ID` secret).
2. **Legacy counselors** — add a **counselor line** per Meta number; assign the counselor. Inbound on that number auto-assigns and skips AI intake.
3. Run migration `20260606120000_whatsapp_phase2.sql` via Lovable if not applied.

### 24-hour session rule

WhatsApp allows free text/files only within **24 hours** of the client’s last message. When the window is closed, the inbox shows a warning and offers **approved templates**.

### Phase 2b — Message templates (Meta)

1. In **Meta Business Manager → WhatsApp Manager → Message templates**, create a template named exactly **`fl_helpline_followup`** (or update the CRM row to match your Meta name).
2. Category: **Utility** or **Marketing** (per Meta policy).
3. Body example (2 variables):  
   `Hello {{1}}, this is {{2}} from Future Link. We are here to help with your study abroad query. Please reply when convenient.`
4. Run migration `20260606140000_whatsapp_message_templates.sql` (or insert row manually).
5. Redeploy `whatsapp-send` after code update.

In CRM, when session is closed: choose template → fill client name + counselor name → **Send template**.

---

## 10. Old vs new counselors (rollout)

```tier
During pilot | After sign-off
Helpline + personal WhatsApp OK | CRM helpline only
Super admin sees all new traffic | Same
Migrate chats to helpline number | Personal WA not official
```

New counselors: **CRM inbox only** from day one.
