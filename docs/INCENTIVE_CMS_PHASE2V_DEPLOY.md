# CMS Phase 2V — Deploy (Roles & Permissions CMS UI)

## Shipped (agent)

| Item | Change |
|------|--------|
| `/performance/roles` | Roles & permissions governance workspace |
| Prototype ref | `04_Screenshots/19_Roles_Permissions.png` |
| Matrix | 8 CMS roles × 11 modules (FLC spec §3) |
| Legend | Full / Edit / Create / Approve / Read / None |
| Perspective | Maps logged-in app roles → highlighted matrix row |
| Links | `/users`, `/team-access` for live role assignment |

**No migration** — read-only governance reference; RLS + `user_roles` remain source of truth.

## Guardrail (PH-R-020)

Runs automatically when shipping Performance Hub pages/components.

---

## YOUR ACTION

### Lovable → Sync from GitHub → Publish

UI-only — **no SQL**.

### Verify (optional)

| Login | Route | Expect |
|-------|-------|--------|
| Admin / director | `/performance/roles` | Capability matrix + legend |
| Manager | Same | Branch manager row highlighted |
| Admin link | Manage users | `/users` |
| Nav | Performance Hub | Roles & permissions |

---

*Next: Configuration CMS (`21_Configuration.png`) or Architecture reference (`22`).*
