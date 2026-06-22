# Service Management and Deletion Rules (LOCKED)

> **Status:** Locked implementation decision (2026-06-21).
> **Scope:** Client service lifecycle, safe removal, document disposition, payment/application guards, audit trail.
> **Related:** [`DOCUMENT_MANAGEMENT_ARCHITECTURE.md`](./DOCUMENT_MANAGEMENT_ARCHITECTURE.md)

---

## Objective

Services attached to a client must be manageable without causing data loss.

**Deleting a service must never automatically delete:** documents, payments, forms, tasks, notes, applications, commissions, or audit history.

---

## 1. Service configuration management (per profile)

Authorized users may customize **document sections for a single service profile** without affecting other services:

| Action | Example |
|--------|---------|
| Add section | Sponsor Financial Documents |
| Rename section | Relationship Documents → Relationship Evidence |
| Reorder sections | Financial before Employment |
| Delete unused section | Remove Travel Documents |
| Add document to section | marriage_certificate → Relationship |
| Remove document from section | travel_itinerary removed from Visitor |
| Move document between sections | financial_documents → Sponsor Documents |

**Scope:** Changes apply only to the selected `profile_type` (+ optional country override). Runtime source: `visaDocumentProfiles.ts` + future `service_document_profile_overrides` table.

**Deferred UI:** Masters → Service Document Profiles editor (Phase 2).

---

## 2. Service removal from client file

A service may be removed from a client when the client changes plans or switches destination.

Examples:

- Canada Visitor Visa → replaced with Australia Visitor Visa
- Canada Student Visa → removed (client changed plans)

Removal removes the service from the **active client view** and archives the linked service case. **No hard deletes.**

---

## 3. Removal confirmation (required)

Before removal, show:

```
WARNING

This service contains linked records.

Removing the service will NOT delete:
• Documents
• Payments
• Forms
• Notes
• Tasks
• Communication history
• Audit history
• Application history
• Commissions

Do you want to continue?

[Cancel]  [Continue]
```

Implementation: `RemoveServiceDialog.tsx`

---

## 4. Document handling during removal

Documents are **never** auto-deleted.

### Case A — other active services exist

Counselor chooses:

- **A.** Move documents to another active service (reassign `case_id`)
- **B.** Keep documents unassigned (`case_id = null`, `assignment_status = unassigned`)

### Case B — no other active service

Documents remain on the client profile as **Unassigned Documents**. Counselor may attach later when a new service is added.

---

## 5. Payment protection

If **collected payment** exists for the service being removed → **block removal**.

```
Payment records exist for this service.
Please transfer, refund, reverse, or reassign the payment before removing the service.
```

Draft-only invoices do not block. Admin may **reassign payment** to another service (audit logged).

> Note: This rule applies to **service removal** only. Outstanding invoices do not block stages, enrollment, or other CRM process (`clientProcessPolicy.ts`).

---

## 6. Application protection

If a **visa/application has been submitted** for the service (e.g. `visa_lodged` stage complete or `application_submitted_date` set):

- Service **cannot be removed** from the client file.
- Only lifecycle transition allowed: Cancelled · Withdrawn · Rejected · Closed.
- Submitted applications remain in history permanently.

---

## 7. Audit log (required)

Every service action is logged to `client_service_audit_log` and `client_activity_log`:

| Field | Stored |
|-------|--------|
| Action | added · modified · reassigned · cancelled · removed |
| User | actor_id |
| Date/time | created_at |
| Old value | JSON / text |
| New value | JSON / text |
| Reason | removal_reason (when applicable) |

---

## 8. Soft delete only

Services are **never physically deleted**.

| Lifecycle | Meaning |
|-----------|---------|
| **active** | Open case on client file |
| **cancelled** | Client cancelled before submission |
| **withdrawn** | Client withdrew |
| **closed** | Normal closure (outcome recorded) |
| **archived** | Removed from active client view |

Historical records remain for reporting and audits.

---

## 9. Service Library link

When a service is removed from the client file:

- Stage tracker and Service Library **active association** are cleared from the client row when that service was the active pipeline.
- All historical records remain in audit logs and archived service cases.
- **No hard deletion** anywhere in the system.

---

## Implementation map

| Concern | Module |
|---------|--------|
| Assess removal guards | `src/lib/clientServiceRemoval.ts` |
| Execute removal | `src/lib/clientServiceRemoval.ts` |
| Confirmation UI | `src/components/clients/RemoveServiceDialog.tsx` |
| Edit services entry | `ClientServicesCard.tsx` |
| Case lifecycle | `client_service_cases.lifecycle_status` |
| Document unassign | `client_documents.assignment_status` |
| Audit | `client_service_audit_log` |
| Profile defaults | `visaDocumentProfiles.ts` (separate from removal) |

---

## UAT checklist

1. Remove service with no payments → confirmation → documents disposition → service archived, documents preserved.
2. Remove service with collected payment → blocked with payment message.
3. Remove service with visa lodged → blocked; can only cancel/withdraw/close case.
4. Remove last service → documents show as Unassigned.
5. Remove one of two services → option to move docs to remaining service.
6. Verify audit log entry with user, timestamp, old/new values.
7. Verify no rows deleted from `client_documents`, `client_invoices`, `client_activity_log`.
