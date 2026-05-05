I found why you still see `pulled=0 pushed=0`: the sync only pushes clients whose `updated_at` is newer than the last sync timestamp. After the last successful sync, unchanged clients are skipped, including records that need the new Odoo contact/partner linking fix. Example: only the newest client is newer than the last sync; existing synced leads like FL-9 still have `odoo_partner_id = null`, so they remain hard to find in Odoo by email/phone.

Plan:

1. Add contact linking to the Odoo push path
   - In `supabase/functions/odoo-sync/index.ts`, create a reusable `upsertPartner` helper for `res.partner`.
   - Match existing Odoo contacts by application ID (`ref`) first, then by email/phone as a fallback.
   - Create or update the contact with name, email, phone, address/profile fields, and Fovel application notes.
   - Store the returned `partner_id` in `clients.odoo_partner_id`.

2. Link every CRM lead to that contact
   - Update `pushClientToLead` to call `upsertPartner` before creating/updating `crm.lead`.
   - Include `partner_id` on the lead payload, plus `email_from`, `phone`, `contact_name`, and application description.
   - This should make Odoo CRM searches by email/phone work because the lead will be tied to a real Odoo contact.

3. Fix “pulled 0 pushed 0” for records needing backfill
   - Change `sync_all` so push mode includes clients that either:
     - were updated since the last sync, or
     - have no `odoo_lead_id`, or
     - have no `odoo_partner_id`.
   - This allows the next Sync Now to backfill previously skipped clients instead of returning `pushed=0`.

4. Make the UI message clearer
   - Update the Settings sync toast/status messaging to explain when there is nothing changed versus when backfill records were processed.
   - Keep partial error details visible if Odoo rejects any record.

5. Deploy the updated Odoo sync backend function
   - Redeploy `odoo-sync` after the code change so Settings → Sync now uses the fixed logic immediately.

Expected result after approval:
- Clicking Sync now should push/backfill records instead of `pushed=0` when contact links are missing.
- Existing leads should receive `partner_id` links.
- Odoo CRM search by email or phone should find the corresponding lead/contact after sync.