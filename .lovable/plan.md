## Fix narration column in AccountingJournalsPage

**File:** `src/accounting/pages/journals/AccountingJournalsPage.tsx` (only)

**Change:** Replace the narration `<td>` (currently using CSS `max-w-0 truncate`) with explicit character-count truncation.

```tsx
<td className="px-3" title={j.narration}>
  {j.narration.length > 45 ? `${j.narration.slice(0, 45)}…` : j.narration}
</td>
```

- Uses `j.narration` from mock data (already correct field).
- Truncates at 45 chars with ellipsis (`…`).
- Full text shown via native `title` tooltip on hover.
- Status column untouched — remains in its own `<td>` with `<AccountingStatusBadge>`.
- No other columns or files modified.