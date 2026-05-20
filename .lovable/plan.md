## Problem

On `/accounting/ap/new`, the **Linked bank account** dropdown ignores the selected Entity. It also reads from the static `SEED_BANK_ACCOUNTS` seed instead of the live bank accounts store, and only filters by currency. So switching Entity does nothing, and newly added bank accounts never appear.

(Same dropdown in the screenshot — when entity = "India Foreign Currency" company, it should only show that company's bank accounts; today it lists every seed account that happens to match the currency.)

## Fix

In `src/accounting/pages/ap/AccountingNewBillPage.tsx`:

1. Replace `SEED_BANK_ACCOUNTS` import with the live store:
   ```ts
   import { useBankAccounts } from "../../stores/bankAccountsStore";
   ```
   and `const bankAccounts = useBankAccounts();`

2. Compute the filtered list reactively from `entityId` + `currency`:
   ```ts
   const eligibleBanks = bankAccounts.filter(
     (b) => b.status === "ACTIVE"
         && b.entityId === entityId
         && b.currency === currency
   );
   ```

3. Render `eligibleBanks` in the `<Select>` instead of the seed filter.

4. When `entityId` or `currency` changes and the current `bankId` is no longer in `eligibleBanks`, clear it (`useEffect` resetting `bankId`).

5. Empty state inside the dropdown when `entityId` is set but `eligibleBanks` is empty: a disabled `<SelectItem>` reading "No bank accounts for this entity / currency — add one in Bank accounts." Before any entity is picked, show "Select an entity first."

## Out of scope

- No DB/schema changes.
- Detail page, journals page, and bank store untouched.
- Currency matching is preserved (a CAD bill should not post to an INR bank). If you want to drop the currency filter too, say so and I'll remove it.
