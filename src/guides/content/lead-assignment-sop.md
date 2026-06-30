# Lead Assignment SOP

> **Status:** Draft — expand with Future Link lead routing rules.

How **leads** are created, assigned, and converted to clients.

---

## 1. Lead sources

| Source | CRM path |
|---|---|
| Manual entry | Leads → New |
| CSV import | Leads → Import (admin/counselor) |
| WhatsApp helpline YES | Auto lead from helpline intake — [WhatsApp Usage Guide](./whatsapp-helpline.md) |
| Distribution rules | Admin-configured round-robin / random |

---

## 2. Assignment

| Method | Who | Notes |
|---|---|---|
| Manual assign | Admin / telecaller / counselor | Set `assigned_counselor_id` on lead |
| Distribution rule | System (`distribute_leads`) | Grants `client_access` on conversion path |
| WhatsApp forward | Admin / telecaller | Reassigns thread counselor in inbox |

---

## 3. Telecaller queue

- Cold/warm campaigns → `call_queue_items` / dialer
- After contact → update lead status (`contacted`, `qualified`, etc.)

---

## 4. Conversion

```flow
Qualified lead
  → Convert to client
  → accounting_clients sync (trigger)
  → Continue Student Application SOP
```

---

## 5. Privacy

- Counselors see leads/clients per RLS and assignment — not the full firm list unless role allows
- WhatsApp: counselors see **assigned threads only**

---

## 6. Related documentation

- [Counselor SOP](./counselor-sop.md)
- System map: `docs/system-map/flows/leads-and-conversion.md`
