## Fix bank/card account dropdown in Statement Reconciliation

Only modify `src/accounting/pages/card-reconciliation/AccountingCardReconciliationNewPage.tsx`. `coaStore.ts` does not need changes — accounts already expose `groupCode`, `typeCode`, and `name`.

### Current bug
Line 176 uses `accounts.filter((a) => a.groupCode === "LIABILITY" && a.status === "ACTIVE")` for `liabAccts`, and the Step 1 dropdown (line 471) renders `liabAccts`. This surfaces inter-company "Due to …" liability accounts (2600–2605) and excludes the actual TD bank asset accounts (e.g. 1206 "TD BANK – CAD OPERATING").

### Changes

1. Add a new memoized filter `bankAndCardAccounts` next to `liabAccts`:

   ```ts
   const bankAndCardAccounts = useMemo(() => accounts.filter((account) => {
     if (account.status !== "ACTIVE") return false;
     const group = (account.groupCode || (account as any).group || "").toUpperCase();
     const type  = (account.typeCode  || (account as any).type  || "").toUpperCase();
     const name  = (account.name || "").toUpperCase();
     const tags: string[] = (account as any).automationTags || [];

     const isBank =
       (group === "ASSET" || group === "ASSETS") && (
         type.includes("BANK") || type.includes("CASH") || type.includes("CURRENT") ||
         name.includes("BANK") || name.includes("TD") || name.includes("RBC") ||
         name.includes("HDFC") || name.includes("ICICI") || name.includes("SBI") ||
         name.includes("FCNR") || tags.includes("bank")
       );

     const isCreditCard =
       (group === "LIABILITY" || group === "LIABILITIES") && (
         type.includes("CREDIT_CARD") || type.includes("CREDIT CARD") ||
         name.includes("CARD") || name.includes("AMEX") ||
         name.includes("VISA") || name.includes("MASTERCARD") ||
         tags.includes("credit_card")
       );

     const isIntercompany =
       tags.includes("intercompany") ||
       name.includes("DUE TO") || name.includes("DUE FROM");

     return (isBank || isCreditCard) && !isIntercompany;
   }), [accounts]);
   ```

   Note: project's CoA uses singular `ASSET` / `LIABILITY` group codes, but the filter accepts both singular and plural forms per the spec so it also works if `account.group` is ever populated.

2. Replace dropdown content (line 471) to render `bankAndCardAccounts` instead of `liabAccts`. Update placeholder to "Select bank or card account…".

3. Below the Select, when `bankAndCardAccounts.length === 0`, render an inline empty-state:

   ```tsx
   {bankAndCardAccounts.length === 0 && (
     <div className="mt-2 rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-3 text-[13px] text-muted-foreground">
       No bank or card accounts found in Chart of Accounts.
       Go to Chart of Accounts → New account and add your bank account first.
       <div className="mt-2">
         <Button size="sm" variant="outline" onClick={() => navigate("/accounting/coa")}>
           Add bank account to COA →
         </Button>
       </div>
     </div>
   )}
   ```

4. Leave `liabAccts` in place (still used elsewhere if referenced) — only the Step 1 dropdown switches to `bankAndCardAccounts`. All journal posting logic, downstream steps, and CSV parser untouched.

### Out of scope
CRM, Commission, other accounting pages, `coaStore.ts`, no new packages.

### Acceptance
- Step 1 "Card account" dropdown lists asset bank accounts (incl. 1206 TD BANK – CAD OPERATING) and any credit-card liabilities.
- Inter-company 2600–2605 "Due to …" accounts no longer appear.
- Empty CoA shows the helpful message + "Add bank account to COA →" button linking to `/accounting/coa`.
