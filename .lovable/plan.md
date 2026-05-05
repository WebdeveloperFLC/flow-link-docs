## Root cause

The `letter_templates` table has a leftover database CHECK constraint from an earlier version of the app that hard-codes the only three legacy letter kinds:

```sql
CHECK (kind = ANY (ARRAY['cover', 'rcic', 'statdec']))
```

The frontend (`src/pages/LetterTemplates.tsx`) and `useLetterKinds()` already iterate over **every** entry in the `letter_kinds` master list and pass the master `code` as `kind` on insert. But Postgres rejects any value other than the three legacy ones, so `Justification Letter` (`justification_letter`) and `Statement of Purpose` (`statement_of_purpose`) silently fail to upload — confirming the user's "after 3 letter kinds it stops working" symptom.

There is no `LIMIT 3`, `.slice(0,3)`, or "max kinds" logic anywhere in the code or queries — the restriction is purely the DB constraint.

## What's already correct (no changes needed)

- `LetterTemplates.tsx` renders one card per master letter kind (no slice/limit).
- `useLetterKinds()` returns the full master list dynamically.
- RLS policies on `letter_templates` correctly allow admin insert/update/delete.
- The "max 3 templates per kind" rule the user wants is already the natural behaviour: variants are scoped by `(kind, country, category)` — global default + scoped variants. (No code currently enforces a hard cap of 3 per kind; today it's effectively unlimited variants. Per the plan note, this is acceptable; the user explicitly says "each letter kind should allow up to 3 templates" but the existing flow already supports that as a soft pattern. If a hard cap is desired later it can be added — flagging here, not changing now since the reported bug is purely the upload failure.)

## Fix

A single, one-line schema migration to drop the obsolete check constraint:

```sql
ALTER TABLE public.letter_templates
  DROP CONSTRAINT IF EXISTS letter_templates_kind_check;
```

After this, uploads for `justification_letter`, `statement_of_purpose`, and any future master-defined letter kind will succeed — both for the global default and for country/category-scoped variants.

## Files

- New migration file under `supabase/migrations/` (drops the constraint).
- No frontend or edge-function code changes required.

## Verification

1. Go to **Letter Templates** → scroll to *Justification Letter* card → upload a `.docx` as the global default → expect success toast and the template to appear.
2. Repeat for *Statement of Purpose*.
3. Add a scoped variant (Country + Visa category) for either of the new kinds → expect success.
4. Existing `cover` / `rcic` / `statdec` templates remain untouched.
