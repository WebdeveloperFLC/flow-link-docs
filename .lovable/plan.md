# Security Fixes — Round 2

Apply the 6 fixes from the deep scan via a single migration, then patch any frontend reads that depend on now-revoked columns.

## 1. Database migration

Create one migration that runs all changes in a single transaction.

### A. Column-level REVOKEs (secrets stay edge-function-only)

- `telephony_agents`: REVOKE SELECT on `sbc_password`, `sbc_user_id` from `authenticated`. Edge function `telephony-sbc-credentials` (service role) keeps working.
- `smtp_settings`: REVOKE SELECT on `password` from `authenticated`. Admin UI must use `smtp_settings_safe` view.
- `telephony_provider_settings`: REVOKE SELECT on `secret`, `webhook_secret` from `authenticated`. Edge function `telephony-admin-config` (service role) keeps working.
- `accounting_vendors`: REVOKE SELECT on `bank_account`, `bank_swift`, `bank_ifsc`, `tax_id` from `authenticated`.

### B. Entity-scoped RLS

- `accounting_bank_accounts`: drop existing SELECT/UPDATE policies and recreate them so a non-admin accounting user only sees/updates rows whose `entity` is in their `accounting_users.entity_scope` (wildcard `*` = all). CRM admins keep full access.

### C. Safe view for vendor banking fields

- Create/replace `accounting_vendors_safe` exposing all non-sensitive columns plus masked banking fields (real values only for `SUPER_ADMIN`/`FINANCE_ADMIN`).

### D. Scoped email logs

- `app_email_logs`: drop existing staff read policies and replace with one that allows admin to see all and other staff to see only rows where `triggered_by = auth.uid()`.

### E. Confirm RLS enabled

- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on `accounting_bank_accounts`, `accounting_vendors`, `app_email_logs` (idempotent guard).

Before writing the migration I will run quick `read_query` checks to:
- confirm exact existing policy names on `accounting_bank_accounts` and `app_email_logs`
- confirm column names on `accounting_vendors` and `accounting_bank_accounts.entity`
…and adjust the DROP/CREATE statements accordingly so nothing fails silently.

## 2. Frontend follow-ups

Audit and patch any client-side reads of the now-revoked columns so they don't crash on `null`:

- `src/pages/TelephonySettings.tsx` / `TelephonyIntegrationSettings.tsx` — never select `secret`/`webhook_secret`; show `••••••••` placeholders; saves still work.
- `src/pages/EmailSmtpSettings.tsx` — read from `smtp_settings_safe`; never request `password`.
- Telephony agent UI — never select `sbc_password`/`sbc_user_id`; rely on `telephony-sbc-credentials` edge function.
- Vendor list/detail pages under `src/accounting/pages/` — switch display reads to `accounting_vendors_safe`; keep writes on the base table.
- Bank accounts page — no code change needed; the new RLS just filters rows.

Each touched page gets a minimal edit: remove the sensitive column from the `.select(...)` list and read from the safe view where applicable. No UI redesign.

## 3. Verification

After migration + frontend edits:
1. Run `supabase--linter` and re-run the security scan.
2. Mark the 6 findings as fixed via `security--manage_security_finding` with a short explanation each.
3. Update `security--update_memory` to record: secrets are edge-function-only; bank-account RLS is entity-scoped; vendor banking fields go through `accounting_vendors_safe`; email logs scoped to `triggered_by` + admin.

## Technical notes

- `service_role` bypasses both RLS and column GRANTs, so all edge functions continue to work without changes.
- Column REVOKE on a base table does **not** propagate to views — `smtp_settings_safe` and `accounting_vendors_safe` continue to expose their (masked) projections.
- The plan deliberately keeps vendor scoping at column-level (no `entity` column exists on `accounting_vendors`); entity-level scoping is only applied where the schema supports it (`accounting_bank_accounts`).
- `app_email_logs` is scoped via `triggered_by` rather than client linkage because system emails (OTP, invites, password resets) have no client.
