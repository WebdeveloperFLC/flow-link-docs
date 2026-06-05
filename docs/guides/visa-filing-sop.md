# Visa Filing SOP

> **Status:** Draft — expand with Future Link visa filing steps by country.

Process for **visa filing** after application submission — documentation, tracking, and outcome in CRM.

---

## 1. Prerequisites

- Student Application SOP complete through internal submission readiness
- Client status and documents current in CRM

---

## 2. Filing workflow (outline)

```flow
Document package complete
  → Filing appointment / portal submission (country-specific)
  → Track biometrics / interview if applicable
  → Record outcome in CRM (approved / refused / further info)
  → Notify client (portal / email / WhatsApp per policy)
```

---

## 3. CRM actions

| Step | CRM |
|---|---|
| Document binder | Client → Documents / binder tools |
| Status | Update client status (confirm slug in Settings → Masters → Client Statuses) |
| Timeline | Status changes appear on client timeline (`status_change` events) |
| Notifications | Use standard client notification paths where configured |

---

## 4. Visa approval tracking

Monthly ops audit counts visa approvals via `client_timeline` — see [MONTHLY_AUDIT.md](../MONTHLY_AUDIT.md) § 12.12.

Confirm your approval status slug (`visa_approved`, `approved`, etc.) matches masters.

---

## 5. Related documentation

- [Student Application SOP](./student-application-sop.md)
- [Counselor SOP](./counselor-sop.md)
