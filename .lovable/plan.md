Restructure the Service Library Admin sidebar to mirror the counselor flow: Country → Service → Sub-service. No database changes — the canonical model stays as `service_library` rows (Category/Service/Sub-service) plus `service_library_countries` mappings. Category becomes hidden metadata in admin too (still editable inside a record).

Scope: `src/pages/ServiceLibraryAdmin.tsx` only.

What changes
- Replace the current Category → Service → Sub-service `Tree` sidebar with a three-level Country → Service → Sub-service tree.
- Build the tree from `masters` joined with `service_library_countries` (already fetched separately today; I'll fold the country list into the masters query via `service_library_countries(country)`).
- Each master appears once under every country it is mapped to; the leaf is the Sub-service and clicking it selects that master (same `setSelectedId` behaviour as today).
- Countries restricted to `ALLOWED_COUNTRY_SET`; masters with zero country mappings get grouped under an "Unassigned" bucket at the bottom so admins can still find and fix them.
- Sort: countries alphabetical, services alphabetical, sub-services alphabetical.
- Add a small search input above the tree (filters by service / sub-service text, case-insensitive) so admins aren't scrolling through hundreds of leaves. Optional but trivial.
- Keep the New record button, migration banner, and the right-hand `MasterDetail` exactly as-is — Category remains an editable field inside the record form.
- Remove the now-unused `CATEGORY_OPTIONS` label lookup from sidebar rendering (kept in the record editor only).
- Keep the existing `Tree` helper component; just feed it the new data shape.

What does not change
- Database schema, migrations, RLS, GRANTs.
- Counselor `ServiceLibrary.tsx`.
- `MasterDetail`, `NewMasterDialog`, all per-tab queries.
- Cache keys.

Validation
- After edit, open `/service-library-admin`, confirm sidebar shows Country → Service → Sub-service, selecting a leaf still loads the full record editor on the right, and "Unassigned" bucket appears only if a master has no country mappings.