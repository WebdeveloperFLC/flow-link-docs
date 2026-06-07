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

### Recommended test script (FL menu intake — default)

```flow
Hi
1 (Student Visa)
Jane Doe
Canada
Qualification: Bachelors / Intake: Sep 2026 / Branch: Ahmedabad
1 (YES)
Check Leads list
Optional: ask documents → COUNSELOR → counselor assigned
```

Legacy rules/Gemini free-form test (set `WHATSAPP_INTAKE_FLOW=gemini` or `rules`):

```flow
study in Canada
Postgraduate
Ahmedabad
Full Name
YES
Check Leads list
Counselor auto-assigned (Phase 3)
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
| `unmatched_ai_intake` | Unknown number; FL menu bot (default) or legacy country → level → branch → name |
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
- Edge functions deployed from repo: `whatsapp-webhook`, `whatsapp-send` (`./scripts/deploy-whatsapp.sh`)

### Setup flow

```flow
Meta API Setup
Copy Phone number ID + Token
Supabase Edge secrets
Meta Webhook URL + verify token
Subscribe messages
VITE_WHATSAPP_PROVIDER=meta
Push to GitHub → frontend deploy
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

### Frontend env (hosting / CI)

Set on your production host (build-time `VITE_*` vars from the GitHub repo):

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
| Simulate fails | Redeploy `whatsapp-webhook` via `./scripts/deploy-whatsapp.sh`; stay logged in as staff |
| Webhook verify fails | `WHATSAPP_VERIFY_TOKEN` must match Meta exactly |
| No inbound from real phone | Webhook subscribed to `messages`; check function logs |
| Reply not on phone | Tokens + `WHATSAPP_PROVIDER=meta`; 24h WhatsApp session rules |
| Counselor can't see thread | Assign them; counselors don't see others' assigned chats |

### Deploy path (team)

**Default:** GitHub is source of truth. Lovable is only for **initial** Supabase scaffolding (new edge function files, first-time project wiring).

```flow
Code change in GitHub
Push to main
Frontend deploys from repo (CI / host)
Edge functions: ./scripts/deploy-whatsapp.sh
SQL: Supabase SQL editor or npx supabase db push
Secrets: Supabase Dashboard → Edge Functions → Secrets
```

```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."   # https://supabase.com/dashboard/account/tokens
./scripts/deploy-whatsapp.sh
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
| **3** | Branch intake + auto-assign counselor + Gemini + assign notification | **Live** |
| **4** | Inbound alerts + queue alerts + manual assign notify + SLA badges | **Live** |
| **5** | Gemini AI counseling + Service Library Q&A before assign | **Live** |
| **5.1** | FL scripted lead capture menu (8 services) + YES/EDIT/RESTART | **Live** |
| **5.2** | CRM deep links (Lead/Client → inbox thread) | **Live** |

### Phase 2 admin setup (one-time)

1. **CRM → WhatsApp → Lines** — set helpline **Meta Phone number ID** (must match `WHATSAPP_PHONE_NUMBER_ID` secret).
2. **Legacy counselors** — add a **counselor line** per Meta number; assign the counselor. Inbound on that number auto-assigns and skips AI intake.
3. Run migration `20260606120000_whatsapp_phase2.sql` (SQL editor or `npx supabase db push`) if not applied.

### 24-hour session rule

WhatsApp allows free text/files only within **24 hours** of the client’s last message. When the window is closed, the inbox shows a warning and offers **approved templates**.

### Phase 2b — Message templates (Meta)

1. In **Meta Business Manager → WhatsApp Manager → Message templates**, create a template named exactly **`fl_helpline_followup`** (or update the CRM row to match your Meta name).
2. Category: **Utility** or **Marketing** (per Meta policy).
3. Body example (2 variables):  
   `Hello {{1}}, this is {{2}} from Future Link. We are here to help with your study abroad query. Please reply when convenient.`
4. Run migration `20260606140000_whatsapp_message_templates.sql` (or insert row manually).
5. Push code to GitHub and redeploy `whatsapp-send` (`./scripts/deploy-whatsapp.sh`).

In CRM, when session is closed: choose template → fill client name + counselor name → **Send template**.

### Phase 3 — Smarter intake & auto-assign

**Intake flow (rules or Gemini):** country → level → **branch/city** → name → YES.

| Feature | How |
|---------|-----|
| **Branch question** | Client replies city/branch name or *Any* |
| **Auto-assign** | After YES (rules mode) or when client requests counselor (Gemini mode) |
| **Counselor alert** | Bell notification: *WhatsApp helpline assigned* |
| **Gemini intake** | `WHATSAPP_AI_MODE=gemini` (default when API key set) + `GEMINI_API_KEY` or `LOVABLE_API_KEY` |
| **Disable auto-assign** | Secret `WHATSAPP_AUTO_ASSIGN=false` (telecaller assigns manually) |

**Counselor routing:** matches `profiles.branch_id` to CRM **branches** (Masters → Branches). Ensure counselors have a branch set in **Users → Edit details**.

**Deploy after code update:**

```bash
./scripts/deploy-whatsapp.sh   # redeploy whatsapp-webhook
```

**Test script (Simulate, rules mode):**

```text
study in Canada → Postgraduate → Ahmedabad → Full Name → YES
→ Lead created, counselor auto-assigned
```

### Phase 5 — AI counseling before assign (Gemini)

When Gemini mode is active, intake YES **does not** auto-assign immediately. The client enters **AI counseling** first.

| Step | What happens |
|------|----------------|
| Intake YES | Lead created; status = **AI counseling** |
| Client questions | Gemini answers using **Service Library** (documents, fees, timelines, eligibility) |
| Handoff | Client replies *COUNSELOR* (or similar) → auto-assign counselor (if enabled) |
| Staff | Telecaller/admin can still **Assign** manually from inbox during AI counseling |

| Secret | Value |
|--------|--------|
| `WHATSAPP_AI_MODE` | `gemini` (default when `GEMINI_API_KEY` or `LOVABLE_API_KEY` set) |
| `WHATSAPP_COUNSELING_BEFORE_ASSIGN` | `true` (default in Gemini mode); set `false` to assign on YES like rules |
| `WHATSAPP_AUTO_ASSIGN` | `true` — runs on counselor handoff, not on YES |

**SQL:** run migration `20260606150000_whatsapp_ai_counseling.sql` (adds `ai_counseling` status).

**Redeploy:** `whatsapp-webhook` via Lovable or `./scripts/deploy-whatsapp.sh`.

**Test script (Gemini mode):**

```text
study in Canada → Postgraduate → Ahmedabad → Test Name → YES
→ "What documents do I need?" → Gemini answers from service library
→ COUNSELOR → counselor auto-assigned + notification
```

### Phase 5.1 — FL scripted lead capture menu (default intake)

New helpline numbers use a **fixed menu flow** (8 services, service-specific questions, YES / EDIT / RESTART confirm). Gemini is used **after submit** for Q&A when `WHATSAPP_COUNSELING_BEFORE_ASSIGN=true`, not during menu steps.

| Step | Client sees |
|------|-------------|
| First message | Welcome + service menu (1–8) |
| After service | Full name |
| Service branch | Country / PGWP sub-menu / coaching course / etc. |
| Details | Qualification, branch, purpose — per service |
| Confirm | Summary + 1 YES / 2 EDIT / 3 RESTART |
| YES | Thank-you + lead created; optional AI Q&A until *COUNSELOR* |

| Secret | Value |
|--------|--------|
| `WHATSAPP_INTAKE_FLOW` | `fl_menu` (**default**) — set `gemini` or `rules` for legacy free-form intake |
| `WHATSAPP_AI_MODE` | `gemini` — enables post-submit counseling |
| `WHATSAPP_COUNSELING_BEFORE_ASSIGN` | `true` — AI Q&A after YES; assign on *COUNSELOR* |
| `WHATSAPP_AUTO_ASSIGN` | `true` — assign on handoff |

**Test script (Simulate):**

```text
Hi → 1 → Jane Doe → Canada → Bachelors, Sep 2026, Ahmedabad → 1 (YES)
→ Lead notes include service + branch
→ "What documents for Canada student visa?" → Gemini
→ COUNSELOR → counselor assigned
```

**Redeploy:** `whatsapp-webhook` only (no new SQL).

### Phase 4 — Notifications & queue SLAs

| Feature | Who gets notified |
|---------|-------------------|
| **New inbound message** | Assigned counselor (bell: *New WhatsApp message*) |
| **Intake complete, no counselor** | Telecaller / admin queue (*WhatsApp lead needs assignment*) |
| **Message on unassigned thread** | Telecaller / admin (*Unassigned WhatsApp message*) |
| **Manual assign in inbox** | Selected counselor (*WhatsApp thread assigned*) |
| **SLA badges** | Inbox list: *Unassigned 2h+*, *Waiting 4h+* (unread assigned) |

Disable all WhatsApp notifications: secret `WHATSAPP_NOTIFY=false`.

Redeploy **`whatsapp-webhook`** after code update (Lovable or `./scripts/deploy-whatsapp.sh`).

### Phase 5 — CRM deep links

| Feature | Where |
|---------|--------|
| **WhatsApp inbox** button | Lead detail header, Client quick actions |
| **Deep link** | `/whatsapp?conversation=<uuid>` opens that thread in the inbox |
| **Lookup order** | `lead_id` → `client_id` → phone (E.164, last-10 fallback) |

If no helpline thread exists yet, staff see *No helpline WhatsApp thread yet for this contact*.

Frontend-only — deploy from GitHub `main` (no edge redeploy or SQL).

See **Phase 5 — AI counseling** above for Gemini auto-replies before counselor assign.

---

## 10. Old vs new counselors (rollout)

```tier
During pilot | After sign-off
Helpline + personal WhatsApp OK | CRM helpline only
Super admin sees all new traffic | Same
Migrate chats to helpline number | Personal WA not official
```

New counselors: **CRM inbox only** from day one.

---

## 11. Module sign-off checklist

Use this once after redeploying `whatsapp-webhook` with Phase 5.1 (FL menu intake).

### Prerequisites (one-time)

| Item | Verify |
|------|--------|
| SQL migrations | `20260604150000` through `20260606230000` applied (inbox, media, templates, `ai_counseling`, notifications fix) |
| Edge secrets | `WHATSAPP_PROVIDER=meta`, Meta tokens, `WHATSAPP_AI_MODE=gemini`, `WHATSAPP_COUNSELING_BEFORE_ASSIGN=true`, `WHATSAPP_AUTO_ASSIGN=true` |
| Intake flow | `WHATSAPP_INTAKE_FLOW` unset or `fl_menu` (default) |
| Meta webhook | Subscribed to **messages**; verify token matches |
| CRM lines | Helpline Meta Phone number ID set under **WhatsApp → Lines** |

### Simulate test (CRM → WhatsApp → Simulate inbound)

```text
Hi → 1 → Jane Doe → Canada → Bachelors / Sep 2026 / Ahmedabad → 1 (YES)
→ Lead created (source whatsapp_helpline, notes include service + branch)
→ Status: AI counseling
→ "What documents for Canada student visa?" → Gemini reply
→ COUNSELOR → counselor assigned + bell notification
→ Thread header shows Name, Service, Country, Branch
```

### Production smoke (real phone)

1. Message helpline from a **new** number not in Clients/Leads.
2. Complete menu flow through YES.
3. Confirm lead appears in **Leads** within 30 seconds.
4. Reply *COUNSELOR* — assigned counselor sees thread in inbox.

### Rollback (if needed)

| Issue | Action |
|-------|--------|
| Menu flow problems | Set `WHATSAPP_INTAKE_FLOW=gemini` or `rules`; redeploy webhook |
| AI cost / errors | Set `WHATSAPP_AI_MODE=rules` or `WHATSAPP_COUNSELING_BEFORE_ASSIGN=false` |
| Notifications duplicate | Confirm migration `20260606230000_whatsapp_notifications_dedupe_fix.sql` ran |

### Deploy commands

**Edge (Lovable):** pull GitHub `main`, redeploy `whatsapp-webhook` only.

**Frontend:** push to GitHub `main` — CI deploys CRM.

**No new SQL** required for Phase 5.1.

### Module scope — complete

| Area | Delivered |
|------|-----------|
| Meta inbound/outbound + media | ✓ |
| Business lines (helpline + counselor) | ✓ |
| 24h session + approved templates | ✓ |
| FL menu lead capture (8 services) | ✓ |
| Lead creation + branch preference | ✓ |
| AI counseling (Service Library) | ✓ |
| COUNSELOR handoff + auto-assign | ✓ |
| Staff notifications + SLA badges | ✓ |
| CRM inbox + deep links | ✓ |
| Unit tests (intake, handoff, phone, gemini) | ✓ |

**Out of scope (future):** Meta template on counselor handoff, template admin UI beyond inbox picker, multi-language menus.
