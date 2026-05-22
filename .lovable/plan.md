## Changes to `src/components/templates/TemplateEditorDialog.tsx`

**1. Rename label** — `Application Category *` → `Visa & Immigration *` (and update the helper hint line from `Country → Category → Section…` to `Country → Visa & Immigration → Section…`) so the field name permanently matches the Lead form's tab and removes any confusion about what list this dropdown represents.

**2. Auto-fill Template name from the selection** — when the user picks a service in the Visa & Immigration dropdown:
   - If `name` is empty, set it to the selected service's `service_name`.
   - If `name` still equals the previously auto-filled service name (i.e. the user hasn't typed their own), update it to the new selection.
   - If the user has typed a custom name, leave it untouched.

Implementation: track the last auto-filled label in a ref (`autoNameRef`). In the Select's `onValueChange`, look up the chosen option's label and, when the rule above allows, call `setName(label)` and update the ref.

No DB, no other files, no schema changes.
