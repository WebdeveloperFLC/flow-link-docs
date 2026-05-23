## Plan: Country filter from master, with priority countries on top

**File:** `src/accounting/pages/clients/AccountingClientsPage.tsx`

1. Import `useMasterLabels` from `@/lib/masters`.
2. Replace the locally-derived `countryOptions` (built from clients rows) with the master list `useMasterLabels("countries")`.
3. Sort the options so the following appear at the top in this order:
   `Canada, UK, USA, Australia, Germany, NZ, UAE, France, Ireland`
   Then the remaining master countries alphabetically.
   - Use case-insensitive match plus common aliases (UK↔United Kingdom, USA↔United States, NZ↔New Zealand, UAE↔United Arab Emirates) so whichever label exists in master is detected.
4. Keep `country` state and filter logic as-is (`c.country === country`).
5. UI: keep the existing `<Select>` trigger; render `All countries` first, then a small visual separator after the priority group, then the rest.

No other filters, columns, store, or DB changes.
