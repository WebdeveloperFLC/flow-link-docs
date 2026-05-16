Tighten the AI auto-fill flow in `AccountingCardReconciliationNewPage.tsx` so the four meta fields the extractor returns (`statementFrom`, `statementTo`, `openingBalance`, `closingBalance`) reliably populate the Step 1 form, and make it obvious to the user which values came from AI vs. were typed manually. **Only this single page file is modified.** No edge function, store, or type changes.

## Problems with the current behavior

1. `statementFrom` / `statementTo` are only written when the field is empty (`if (... && !fromDate) setFromDate(...)`). But Step 0 validation already requires both dates before the user can reach Step 1's PDF uploader, so the dates are *always* non-empty and the AI value is *always* discarded.
2. Opening / closing balances overwrite silently with no signal — the user can't tell which numbers came from AI.
3. The user is on Step 1 (Import) when extraction runs, so they don't see the Step 0 fields change. They need a clear "AI filled these for you" cue plus a way to jump back and review.
4. No undo / no per-field highlight — risky for an accounting workflow where wrong opening balances cascade into a wrong journal.

## Changes (single file)

`src/accounting/pages/card-reconciliation/AccountingCardReconciliationNewPage.tsx`

### 1. Track which fields are AI-populated

Add one state:
```ts
type AiMetaField = "fromDate" | "toDate" | "opening" | "closing" | "currency";
const [aiMetaFields, setAiMetaFields] = useState<Set<AiMetaField>>(new Set());
```

Also keep the pre-AI values so the user can revert:
```ts
const [aiMetaPrev, setAiMetaPrev] = useState<Partial<Record<AiMetaField, string>>>({});
```

### 2. Rewrite the meta merge in `handlePdfFile`

Replace the current "only if empty" block with an always-overwrite-when-AI-has-it block, recording prev values and marking the field:

- For each of `statementFrom`, `statementTo`, `openingBalance`, `closingBalance`, `currency`: if AI returned a value AND it differs from current → snapshot prev value, set the new value, add field to `aiMetaFields`.
- Reset `aiMetaFields` / `aiMetaPrev` at the start of each extraction so re-uploading a different PDF starts fresh.

### 3. Clear the AI marker on manual edit

Each of the four `onChange` handlers in Step 0 wraps a small helper:
```ts
const clearAiFlag = (f: AiMetaField) => {
  if (!aiMetaFields.has(f)) return;
  setAiMetaFields(prev => { const n = new Set(prev); n.delete(f); return n; });
};
```
Call it inside the `onChange` for From date, To date, Opening, Closing, Currency.

### 4. Visual highlight in Step 0

Add a small reusable wrapper (inline JSX, no new file):
```tsx
function AiFieldWrap({ active, onRevert, prev, children }) { ... }
```
When `active`:
- `Label` shows a small inline `Sparkles` icon + amber-tinted badge `AI` (use existing `Badge variant="secondary"` with `className="bg-amber-100 text-amber-800 border-amber-200"` — already-used token style in this codebase).
- The wrapped `Input` gets `className="ring-2 ring-amber-300 focus-visible:ring-amber-400"` via `cn(...)`.
- Below the input: tiny muted line "AI-filled from PDF · was: {prev} · [Revert]" where Revert calls `setX(prev)` then `clearAiFlag(f)`.

Apply wrapper to From date, To date, Opening balance, Closing balance, Currency.

### 5. Banner in Step 1 (after extraction) and Step 2

After a successful extraction, show a callout card above the existing AI summary:

```
✨ AI also filled in your card details
   Statement period · Opening · Closing · Currency
   [Review card details] ← jumps back to Step 0
```

The `[Review card details]` button calls `setStep(0)`. After review the user clicks Continue to return — existing step flow already supports that.

Also add the same compact summary at the top of Step 2 (Categorise) so it's visible during review.

### 6. Step 3 (Generate journal) confirmation

In the existing review summary, render the four meta values with the same amber `AI` badge if `aiMetaFields` still contains that field at post time, so the auditor can see which numbers came from extraction.

### 7. Safety guardrails

- If AI opening/closing differ from manually-entered values by more than a trivial amount, show a small "Was {prev} — replaced by AI" hint (already covered by the Revert affordance).
- Validate that opening/closing are finite numbers before assigning (`Number.isFinite(meta.openingBalance)`).
- Currency: only overwrite if AI returns a non-empty 3-letter code; never wipe to empty.

## Technical notes

- Pure React state additions; no new dependencies.
- No changes to `extractCardStatement.ts`, edge function, store, or types.
- Tailwind classes use existing semantic + neutral palette (amber for "AI" affordance is consistent with the existing `aiSummary` blue banner pattern; we keep blue for the "extracted N transactions" banner and use amber strictly for the meta-fields callout so the two are distinct).
- Aborted / failed extractions don't touch any meta field or marker set.
- Re-uploading a PDF resets the marker set before applying new values.

## Out of scope

- No changes to line-level AI highlighting (already implemented via `aiLineIds`).
- No CRM, Commission, or other accounting pages touched.
- No store or schema changes.
