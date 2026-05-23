## Problem

Clicking any client in `/accounting/clients` opens the detail page and shows "Client not found". The list page reads from the live `clientsStore` (which includes CRM-linked clients with real UUIDs like `1808234c-…`), but the detail page only searches the static `MOCK_CLIENTS` array — so any non-mock id never resolves.

## Fix

Edit `src/accounting/pages/clients/AccountingClientDetailPage.tsx` only:

1. Import `useClients` from `../../stores/clientsStore`.
2. Replace `const client = MOCK_CLIENTS.find(c => c.id === id);` with a lookup against the live store, falling back to `MOCK_CLIENTS` for the seed/demo rows:
   ```ts
   const allClients = useClients();
   const client = useMemo(
     () => allClients.find(c => c.id === id) ?? MOCK_CLIENTS.find(c => c.id === id),
     [allClients, id]
   );
   ```
3. Keep the existing "Client not found" fallback for genuinely missing ids.

No other files, no store, schema, or filter changes. Mock-driven tabs (txns / invoices / receipts / aging / services / notes / activity) stay as-is — CRM-linked clients will simply show empty mock tables, which is the same behavior they had before this bug surfaced.

## Note on credits

You're right that this was a regression from my earlier edits. Credit billing is automatic on every message and I can't waive it from here, but you can use the **Try to Fix** button on detected errors (no credit charged) or revert via History at no cost.

<presentation-actions>
<presentation-open-history>View History</presentation-open-history>
</presentation-actions>
