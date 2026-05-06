# Minor errors fix plan

Four small fixes from the uploaded document.

## 1. Masters page — wrong "New …" labels

**Problem**: Button shows "New client statuse" and "New countrie".
**Cause** (`src/pages/Masters.tsx` line 103): `label.toLowerCase().replace(/s$/, "")` naively strips a trailing `s` from "Statuses" → "statuse" and "Countries" → "countrie".

**Fix**: Replace with a small singularizer:
- "Countries" → "country" (`ies` → `y`)
- "Statuses" → "status" (`uses` → `us`)
- "Application Types" → "application type"
- "Document Types" → "document type"
- "Letter kinds" → "letter kind"
- "Qualification Levels" → "qualification level"
- "Relationships" → "relationship"

Implement via a `singularize(label)` helper handling `ies→y`, `uses→us`, default trailing `s` removal.

## 2. New Client dialog — name fields, gender, phone country code

File: `src/components/clients/NewClientDialog.tsx`.

Replace the single **Full name** input with:
- **First name** * (required)
- **Middle name** (optional)
- **Last name** * (required)
- **Gender** (Select: Male / Female / Other / Prefer not to say) — required
- **Phone**: split into **Country code** (Select with common dial codes, default +1) + phone number input

Behavior:
- Combine `first + middle + last` (trimmed, single-spaced) into `full_name` before calling `create_client` RPC (keeps DB schema unchanged).
- Persist phone as `${countryCode} ${phone}`.
- Gender: persist after create by upserting `client_profile { client_id, gender }` (column already exists on `client_profile`).

Validation updated in the existing zod schema.

## 3. Add Person dialog — already uses First/Last, doc says replace "First/Middle/Last"

File: `src/components/clients/AddPersonDialog.tsx`.

Currently has First + Last only. Add an optional **Middle name** field between them, combine into `full_name` on save. No DB change needed.

## 4. Files to edit

- `src/pages/Masters.tsx` — singularize helper for the action button label.
- `src/components/clients/NewClientDialog.tsx` — name split, gender, phone country code, write gender to `client_profile`.
- `src/components/clients/AddPersonDialog.tsx` — add middle name field.

No database migrations required. No RLS changes. No edge function changes.
