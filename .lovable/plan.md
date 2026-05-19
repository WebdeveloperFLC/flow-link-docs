## Fix: clickable rows on /accounting/bank-accounts

The detail page (`AccountingBankAccountDetailPage`) and route `/accounting/bank-accounts/:id` already exist — only the nickname cell is a link today, so clicking elsewhere on the row does nothing.

### Change (single file)
`src/accounting/pages/bank-accounts/AccountingBankAccountsPage.tsx`

- Add `useNavigate()` from react-router-dom.
- Pass `onRowClicked={(e) => { if (e.event?.target.closest('a,button,[role="menuitem"]')) return; navigate(\`/accounting/bank-accounts/${e.data.id}\`); }}` to `<AccountingAGGrid>`.
- Add `rowClass="cursor-pointer"` so rows visually indicate they're clickable.

That's it — no changes to grid wrapper, detail page, store, or any other module. The existing detail page already shows all fields (nickname, bank, full account number, holder, entity, currency, linked COA ledger, IFSC, SWIFT, routing, branch code, transit, sub-entity, signatories, status, defaults) and has Edit / Deactivate actions.

### Verify
- Click any row on `/accounting/bank-accounts` → navigates to detail page.
- Clicking the row's action menu (`⋯`) or nickname link still works without double-navigating.
