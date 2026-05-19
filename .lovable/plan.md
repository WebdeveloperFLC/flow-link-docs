## Problem

On `/accounting/journals/new`, after selecting an Entity (e.g. "Future Link Consultants Inc" — Canada), the line-level dropdowns are not filtered:

- **Account** combobox shows every COA row across all entities (Canadian + Indian + shared), so a CAD entity can still pick `CA-1100 TD Bank — CAD` *and* `1210 GST Input Tax Credit` (India).
- **Branch** dropdown is hard-coded to 4 generic labels (`Canada HQ`, `USA Corp`, `India Mumbai`, `India Delhi`) — none of which are real branches in our entities table.
- **Tax code** dropdown shows the global tax_codes master (HST 13%, GST 5%, GST 18% IN, IGST 18% IN, VAT 5% AE, …) regardless of entity country.

Result: a user posting a journal for a Canadian entity can pick Indian tax codes and Indian branches. Wrong.

## Fix — scope all three pickers to the selected Entity

File: `src/accounting/pages/journals/AccountingNewJournalPage.tsx`

1. **Resolve the selected entity object** (we currently store only the entity name). Use `useAllEntities()` to look up id / country, and `useEntities()` for the Entity dropdown itself (companies only — unchanged).

2. **Account picker** — pass `entityId` (and currency) into `AccountCombobox`. Filter:
   - `a.entityId === selectedEntity.id` **or** `a.entityId == null` (shared/global accounts)
   - keep existing `status !== INACTIVE` and `isPostable !== false` filters
   - keep current group/type grouping
   - When no entity is selected, disable the combobox with placeholder "Select entity first".

3. **Branch picker** — replace the hard-coded `BRANCHES` constant with branches derived from `useAllEntities()`:
   - rows where `parentId === selectedEntity.id` **and** `type === "BRANCH" || "SUB_BRANCH"`
   - sorted by name; value = branch id; label = branch name
   - If the entity has no branches, show only `—` (none).

4. **Tax code picker** — scope `tax_codes` master by entity country. Add a small per-country allow-list inside the page (no master-store changes):
   ```
   CA → NONE, HST_13, GST_5, ZERO_RATED, EXEMPT
   IN → NONE, GST_5, GST_18, IGST_18, ZERO_RATED, EXEMPT, plus CGST_9/SGST_9/IGST_18 if present
   AE → NONE, VAT_5, ZERO_RATED, EXEMPT
   US → NONE, ZERO_RATED, EXEMPT
   default → full list
   ```
   Build the filtered list from `useMaster("tax_codes")` and render with a plain `Select` (drop the `DynamicSelect` for this cell so we can filter options without touching the master store).

5. **Reset line values on entity change** — when the entity changes, clear `accountId`, `branch`, `taxCode` on every line (and reset `currency` to the entity's base currency, matching what the Bank Account form already does). Prevents stale Indian selections sticking around after switching to a Canadian entity.

## Out of scope

- Master store schema (no `country` column added to `tax_codes`).
- Other pages (AR invoice, AP bill, intercompany) — same pattern can be applied later if you want; this plan covers only the journals page the screenshot is from.
- DB / RLS / migration changes — none needed.

## Verification

1. Open `/accounting/journals/new`, select **Future Link Consultants Inc** (CA).
   - Account combobox: only CA-prefixed + shared accounts; no India `1210 GST Input Tax Credit`.
   - Branch: only `Toronto — Ontario` (+ Finksburg if you keep US branch under CA parent).
   - Tax code: only `No tax / HST 13% / GST 5% / Zero-rated / Exempt`.
2. Switch entity to **Future Link Consultants Pvt Ltd** (IN). Line values clear; pickers now show India branches + India tax codes.
3. With no entity selected, account combobox is disabled.
