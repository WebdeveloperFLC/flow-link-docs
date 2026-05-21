# Users, Roles & Access

`/users` (admin) — invite users, assign roles, manage module permissions.

Roles: `admin`, `counselor`, `telecaller`, `documentation`, `viewer`. Stored in a separate `user_roles` table.

Module permissions (per user) control visibility of Institutions, Commissions, Digital Success Hub, Accounting sections. Edit via user row → Permissions dialog.

**Team Access** (`/team-access`) — share specific client records with another staff member (per-client, distinct from module permissions).

**Accounting access** separate: `/accounting/access` (accounting admin only).
