## Problem

The Lead form's **Service Required → Visa & Immigration** tab is populated from `service_catalogue` where `master_key = 'visa_immigration'` (e.g. Canada SDS, UK Student, USA F1, Australia Subclass 500, Visit Visa, PR streams, etc.).

The Workflow Templates editor currently exposes:
- **Country** — already from the countries master ✅
- **Application Category** — wired to `useMasterLabels("application_types")`, a different/legacy list that no longer matches what is selected on the lead. ❌

This break means a lead's selected visa service can never match a workflow template's category, so the document checklist never auto-applies after a lead is created/converted.

The user wants the Workflow Template's "Category" dropdown to be the **same Visa & Immigration list** used in the Lead form, under the label **"Application Category"** (label is already correct in the editor — just the data source is wrong).

## Fix (single, surgical change)

**File: `src/components/templates/TemplateEditorDialog.tsx`**

1. Remove `const APPLICATION_TYPES = useMasterLabels("application_types");`.
2. Add a new state + effect that loads Visa & Immigration services from `service_catalogue`:
   ```ts
   const [visaServices, setVisaServices] = useState<{ code: string; name: string; country?: string | null }[]>([]);
   useEffect(() => {
     if (!open) return;
     fetchServiceCatalogue("visa_immigration").then((rows) =>
       setVisaServices(rows.map((r) => ({
         code: r.service_code || r.id,
         name: r.service_name,
         country: r.country_tag ?? null,
       })))
     ).catch(() => setVisaServices([]));
   }, [open]);
   ```
3. Replace the Application Category `<Select>` options:
   - Use `visaServices` instead of `APPLICATION_TYPES`.
   - Optionally filter by the currently selected `country` (match `country_tag`) so the user only sees services for that country; fall back to all if none match.
   - Value stored in `category` = the service's `service_code` (stable, language-independent) and the display label = `service_name`.
4. Keep the rest of the editor (sections, items, save) untouched. `workflow_templates.category` stays a `text` column — no schema change needed.

**File: `src/pages/Templates.tsx`**

- The card subtitle currently shows raw `t.category`. After the change it will show a service code (e.g. `VI_CA_SDS`). Map it back to the human name using a small lookup built from the same `fetchServiceCatalogue("visa_immigration")` call (or `fetchServiceCodeMap()` already in `src/lib/leads.ts`). One small render change, no other logic affected.

## What this restores

- A lead created with country = **Canada** and visa service = **Canada SDS** will now match the workflow template `country = Canada` + `category = Canada SDS (VI_CA_SDS)`, so the document binder auto-applies as before.
- Admins setting up templates pick from the exact same list the counsellors see on the lead form — no more drift between the two masters.

## Out of scope (not touched)

- No DB migration. `workflow_templates.category` remains `text`.
- No changes to the lead form, ServiceTabs, or `service_catalogue` data.
- No changes to existing templates' rows; admins can edit them to re-pick the matching service if their old `category` value is now an orphan string (we'll show the raw value in that case so nothing disappears).
