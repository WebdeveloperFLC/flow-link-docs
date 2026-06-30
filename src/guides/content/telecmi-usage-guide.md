# TeleCMI Usage Guide

> **Status:** Draft — expand with Future Link telephony procedures and agent setup.

Using **TeleCMI** click-to-call and the CRM **browser phone** / telecaller queue.

---

## 1. Overview

- Provider: TeleCMI (PIOPIY)
- CRM edge functions: `telephony-click-to-call`, `telephony-webhook`, `telephony-queue-next`, etc.
- Secrets: `TELECMI_APP_ID`, `TELECMI_SECRET`, `TELECMI_FROM_NUMBER`, `TELECMI_WEBHOOK_SECRET`

---

## 2. Who uses what

| Role | Feature |
|---|---|
| Counselor / telecaller | Click-to-call from client/lead |
| Telecaller | Queue / campaign dialer |
| Admin | Settings → Telephony — agent mapping, SBC credentials |

---

## 3. Daily usage

1. Confirm telephony agent is mapped to your CRM user
2. Use click-to-call from client record (or queue tab for campaigns)
3. Call outcomes logged to `call_sessions` / timeline where configured

---

## 4. Troubleshooting

| Symptom | Fix |
|---|---|
| Click-to-call 503 | `TELECMI_FROM_NUMBER` and secrets configured |
| Webhook not updating | `TELECMI_WEBHOOK_SECRET`; `telephony-webhook` deployed |
| No audio | Browser permissions; SBC credentials — Settings → Telephony |

---

## 5. Escalation

| Issue | Contact |
|---|---|
| Click-to-call / webhook errors | TECH (operations team) |
| Agent mapping / numbers | Telephony admin (TEL role) |
