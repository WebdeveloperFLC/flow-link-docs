
# Plan — Add Person UX polish + Odoo two-way sync

Two things, in order:

---

## Part 1 — Add Person dialog UX polish

Small change to `src/components/clients/AddPersonDialog.tsx`. No DB migration needed (we keep storing one `full_name` so nothing else has to change).

### Changes

1. **Split name into First name + Last name**
   - Two `Input`s side by side, both required.
   - On save we combine: `full_name = "${first} ${last}".trim()`.
   - Keeps DB schema (`case_people.full_name`) untouched, so document matching, file naming, letters, binders all keep working.

2. **Smart Relationship dropdown** (replaces the free-text input)
   - Uses our existing `Select` component with these presets:
     - Spouse
     - Son
     - Daughter
     - Father
     - Mother
     - Brother
     - Sister
     - Partner
     - Guardian
     - Other…
   - Selecting **Other…** reveals a small free-text input below so users can type any custom relation (e.g. "Father-in-law"). Custom value is saved to `case_people.relationship` as-is.
   - Default selection auto-fills based on Role:
     - Role = Co-applicant → defaults to **Spouse**
     - Role = Dependant → defaults to **Son**
   - Users can override.

3. **Layout**
   ```text
   [ First name * ] [ Last name * ]
   [ Role         ] [ Relationship ▼ ]
                    [ Other (if selected) ]
   [ DOB          ] [ Passport #     ]
   ```

4. **Validation**
   - First and last name both required.
   - If Relationship = "Other…", custom text is required.

No other files change for Part 1.

---

## Part 2 — Odoo two-way configurable sync (CRM Pipeline → clients/case_people)

### Settings page (`/settings/integrations/odoo`)

New table `integration_settings` (single row, key = "odoo"):

| field | purpose |
|---|---|
| `enabled` (bool) | master on/off |
| `mode` (text) | `off` \| `pull` \| `push` \| `two_way` |
| `auto_on_open` (bool) | trigger sync when a client is opened |
| `interval_minutes` (int) | background pull cadence (0 = disabled) |
| `last_sync_at` (timestamptz) | display only |
| `last_sync_status` (text) | `ok` \| `error` + message |

UI on the page:
- Toggle: Enable Odoo
- Radio: Off / Pull only / Push only / Two-way
- Toggle: Auto-sync when opening a client
- Number: Background interval (minutes)
- Buttons: **Test connection**, **Sync now**
- Status block: last sync time + result

Admin-only (RLS via `has_role(...,'admin')`). Settings persist until the admin changes them — exactly what you asked for ("automated until we change the settings").

### Secrets

Already provided, will be saved as Lovable Cloud secrets:
- `ODOO_URL`, `ODOO_DB`, `ODOO_LOGIN`, `ODOO_API_KEY`

### Edge functions

1. `odoo-test` — authenticate via XML-RPC (`/xmlrpc/2/common`) and return user id + version.
2. `odoo-sync` — main worker. Reads `integration_settings`, then based on `mode`:
   - **pull / two_way**: pulls `crm.lead` records (and linked `res.partner` for family) modified since `last_sync_at`. Upserts into `clients` (matched by `application_id` ⇄ Odoo `x_application_id` if present, else by email). Family members map into `case_people` (spouse/children → co_applicant/dependant).
   - **push / two_way**: pushes recently-updated `clients` + `case_people` back to Odoo (`crm.lead.write` / `res.partner.create|write`).
   - **two_way**: runs both, last-write-wins by `updated_at`.
3. `odoo-cron` — invoked by `pg_cron` every N minutes; calls `odoo-sync` if enabled and `interval_minutes > 0`.

### Field mapping (initial)

| App | Odoo `crm.lead` |
|---|---|
| `clients.full_name` | `partner_name` / `contact_name` |
| `clients.email` | `email_from` |
| `clients.phone` | `phone` |
| `clients.country` | `country_id.name` |
| `clients.application_type` | `x_application_type` (custom field, fallback `tag_ids`) |
| `clients.status` | `stage_id.name` |
| `clients.application_id` | `x_application_id` (custom, optional) |
| `case_people.*` | linked `res.partner` children with relationship tag |

Unknown custom fields are skipped gracefully so it works even if `x_application_id` isn't on the Odoo side yet.

### Auto-on-open trigger

`ClientDetail.tsx` calls `odoo-sync` (single client mode) on mount when `integration_settings.auto_on_open` is true and `enabled` is true. Non-blocking — page renders immediately, sync result toasts in.

### Activity logging

Every sync (manual, on-open, cron) writes to `activity_logs` with `entity_type='integration'`, `action='odoo.sync'`, and a details JSON containing direction, counts, errors.

---

## Files

**Part 1 (UX polish)**
- edit `src/components/clients/AddPersonDialog.tsx`

**Part 2 (Odoo)**
- migration: create `integration_settings` table + admin RLS + seed row `{key:'odoo', mode:'two_way', enabled:false}`
- new `src/pages/settings/OdooIntegration.tsx`
- new `src/lib/odoo.ts` (client-side helpers: load/save settings, trigger sync)
- new `supabase/functions/odoo-test/index.ts`
- new `supabase/functions/odoo-sync/index.ts`
- new `supabase/functions/odoo-cron/index.ts` (+ pg_cron schedule in same migration)
- edit `src/pages/ClientDetail.tsx` (auto-on-open hook)
- edit sidebar/nav to expose Settings → Integrations → Odoo
- secrets: `ODOO_URL`, `ODOO_DB`, `ODOO_LOGIN`, `ODOO_API_KEY` (already supplied)

---

## Order of execution

1. Ship Part 1 (5-min change, you'll see it immediately on the Add Person dialog).
2. Run the Odoo migration + create settings page.
3. Deploy `odoo-test`, wire **Test connection** so you can verify creds before any sync runs.
4. Deploy `odoo-sync`, wire **Sync now** + auto-on-open.
5. Deploy `odoo-cron` and enable the schedule.

Reply **approve** and I'll build it in this order.
