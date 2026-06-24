# Backlog: Portal Access Vault

**Status:** Backlog — **not in current Institution Master scope**  
**Priority:** **Phase 2 — high** (operational enhancement)  
**Owner:** Product + Institution Team + Security / Engineering

---

## Summary

Create a **separate Portal Access Vault** module for encrypted storage of institution and aggregator portal credentials. **Do not** store usernames, passwords, MFA secrets, or recovery details on `upi_institutions`, `upi_aggregators`, or `upi_partnership_routes`.

Institution Master and Aggregator Master may only show **whether** vault access is configured (linked record exists + status), never expose credential fields.

---

## Problem

Counselors and operations staff need shared access to:

- **Direct institution application portals** (e.g. college agent login)
- **Aggregator portals** (ApplyBoard, Navitas, Study Group, IDP, etc.)

Today the system stores **portal URLs only** (`upi_institutions.application_portal_url`, `upi_aggregators.default_portal_url`, route-level overrides). Credentials live in spreadsheets, password managers, or chat — no RBAC, no audit trail, no expiry tracking.

A single “Application method” or “Recruitment model” field cannot represent multi-channel access; partnership routes define pathways, but **login credentials must remain out of master records**.

---

## Design principles (locked)

| # | Rule |
|---|------|
| 1 | **No credentials in Institution Master or Aggregator Master** — URL fields remain; usernames/passwords live only in the vault |
| 2 | **Encrypted at rest** — passwords never stored in plaintext; use Supabase Vault / pgsodium / application-layer envelope encryption (implementation TBD in spike) |
| 3 | **RBAC at read time** — RLS + role checks determine which columns are returned |
| 4 | **Link, don’t embed** — vault records FK to institution and/or aggregator (and optionally partnership route) |
| 5 | **Audit access** — log reveal/copy/decrypt events for compliance (Phase 2.1 if not in MVP) |
| 6 | **Master UI indicator only** — badge or row: “Portal access configured” / “Not configured” / “Expired” |

---

## Scope — portal types

| Type | Link target | Example |
|------|-------------|---------|
| **Direct institution portal** | `upi_institutions.id` (+ optional `upi_partnership_routes.id` when route override URL differs) | Seneca agent portal |
| **Aggregator portal** | `upi_aggregators.id` (+ optional institution context for per-uni sub-account) | ApplyBoard, Navitas, IDP |

One institution may have **multiple vault entries** (direct + several aggregators).

---

## Proposed data model (Phase 2)

### Table: `portal_access_vault` (name TBD)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `portal_type` | `text` | `institution_direct` \| `aggregator` |
| `institution_id` | `uuid` FK nullable | Required for direct; optional context for aggregator |
| `aggregator_id` | `uuid` FK nullable | Required for aggregator type |
| `partnership_route_id` | `uuid` FK nullable | Optional — when credentials are route-specific |
| `portal_url` | `text` NOT NULL | May duplicate master URL; vault is SSOT for **login** URL if different |
| `username` | `text` | Visible to counselors (read RLS) |
| `password_ciphertext` | `text` / `bytea` | Encrypted; decrypt only for elevated roles |
| `mfa_enabled` | `boolean` DEFAULT false | |
| `mfa_notes` | `text` | Shared authenticator location, backup codes location — **not** the secret itself |
| `recovery_email` | `text` | Elevated roles only |
| `last_password_change` | `date` | |
| `expiry_date` | `date` | Alert when approaching / past |
| `internal_notes` | `text` | Ops-only |
| `status` | `text` | `active` \| `expired` \| `revoked` \| `pending_setup` |
| `created_at` / `updated_at` | `timestamptz` | |
| `created_by` / `updated_by` | `uuid` | |

**Constraints:**

- At least one of `institution_id`, `aggregator_id` must be set
- `portal_type = institution_direct` → `institution_id` required
- `portal_type = aggregator` → `aggregator_id` required

**Indexes:** `(institution_id, status)`, `(aggregator_id, status)`, partial unique on active direct per institution if business rule is one credential set per direct portal (TBD)

### Optional: `portal_access_audit_log`

| Column | Purpose |
|--------|---------|
| `vault_id`, `user_id`, `action` | `view_password`, `copy_password`, `update`, `revoke` |
| `ip`, `created_at` | Compliance |

---

## RBAC matrix (locked)

| Role | Portal URL | Username | Password | MFA notes | Recovery email | Internal notes | Status / expiry |
|------|:----------:|:--------:|:--------:|:---------:|:--------------:|:--------------:|:---------------:|
| **Counselor** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (read-only) |
| **Branch Manager / Operations** | ✅ | ✅ | ✅ reveal | ✅ | ✅ | ✅ | ✅ edit |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ full |

**Implementation notes:**

- Counselors: RPC or view `portal_access_vault_counselor` — excludes `password_ciphertext`, `recovery_email`, `internal_notes`, `mfa_notes`
- Operations+: separate RPC `fn_reveal_portal_password(vault_id)` with audit log entry
- Map CRM roles: counselor → existing counselor role; branch manager / ops → `operations` or custom module permission; admin → `admin`

---

## UI surfaces (Phase 2)

### 1. Portal Access Vault module (new)

- Route: e.g. `/operations/portal-access` or under Admin → Masters
- List/filter by institution, aggregator, status, expiry
- CRUD for operations/admin; read-only list for counselors (URL + username)
- Password reveal: button with confirmation + audit (ops/admin only)
- Expiry warnings dashboard widget (optional 2.1)

### 2. Institution Master (indicator only)

On **Overview → Catalog & partnerships** or **Recruitment channels** summary:

```
Portal access: ● Direct configured  ● ApplyBoard configured  ○ Navitas not configured
```

- Link: “Manage in Portal Access Vault” (ops/admin) or “Request access” (counselor)
- **No** username/password fields on institution profile or partnership route dialog

### 3. Aggregator Master (indicator only)

On Admin → Masters → Aggregators row/detail:

```
Portal access: Configured (2 active credentials) | Not configured
```

- Link to vault filtered by `aggregator_id`
- Keep existing `default_portal_url` as **public navigation URL** only

---

## Explicit non-goals (current masters)

| Do **not** add to | Reason |
|-------------------|--------|
| `upi_institutions` | Institution profile is public/counselor-facing metadata |
| `upi_aggregators` | Aggregator master is partnership config, not secrets |
| `upi_partnership_routes` | Routes define channel economics/URLs, not login vault |
| Partnership route save payload | Prevents accidental credential leakage via PostgREST |

---

## Dependencies

| Dependency | Status |
|------------|--------|
| Institution Master M3 (governance, routes, recruitment channels) | ✅ / in progress |
| Aggregator master (`upi_aggregators`) | ✅ |
| CRM role model / module permissions | ✅ pattern exists (`useModulePermission`) |
| Supabase encryption strategy | **Spike required** — Vault vs Edge Function envelope |
| Recruitment Channels Summary UI | ✅ — natural place for “access configured” badges |

---

## Suggested implementation phases

| Phase | Deliverable |
|-------|-------------|
| **2A — Schema + RLS + encryption spike** | Migration, encrypted column, counselor vs ops views |
| **2B — Vault admin UI** | CRUD, reveal password, expiry filters |
| **2C — Master indicators** | Institution + Aggregator “configured” badges, deep links |
| **2D — Audit + alerts** | Access log, expiry notifications (email/in-app) |

---

## Acceptance criteria (when implemented)

1. No plaintext password in any institution or aggregator table or API response to counselors
2. Counselor can see portal URL + username for assigned institutions; cannot reveal password
3. Branch Manager / Operations can reveal password with audit entry
4. Institution detail shows multi-channel “portal access configured” state without credentials
5. Aggregator master shows configured count / status without credentials
6. Expired / revoked credentials hidden from counselor list or marked clearly
7. UAT: create direct + ApplyBoard vault entries for one institution; verify RBAC matrix

---

## Related documents

| Document | Relationship |
|----------|--------------|
| [`INSTITUTION_MASTER_COMPLETION_PLAN.md`](../guides/INSTITUTION_MASTER_COMPLETION_PLAN.md) | Phase 2 backlog register |
| [`INSTITUTION_DATABASE_CLEANUP_AUDIT.md`](../guides/INSTITUTION_DATABASE_CLEANUP_AUDIT.md) | Portal URL vs credential separation |
| [`INSTITUTION_MASTER_OVERVIEW_DESIGN.md`](../guides/INSTITUTION_MASTER_OVERVIEW_DESIGN.md) | URLs & portals section — URL only |
| [`INSTITUTION_CLAIM_ELIGIBILITY_RULES.md`](./INSTITUTION_CLAIM_ELIGIBILITY_RULES.md) | Parallel Phase 2 backlog item |

---

*Created 2026-06-24 — Portal Access Management requirement; implement in Phase 2 after Institution Master M3 UI stabilization.*
