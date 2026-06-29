# Archived: Knowledge Centre phase 1 (`kc_*` parallel implementation)

**Archived:** 2026-06-27  
**Reason:** Product decision to evolve the existing Service Library module (now branded **Knowledge Centre** in UI) rather than maintain a separate `kc_*` database and UI stack.

## Contents

| Path | Description |
|------|-------------|
| `src/` | Former `src/knowledge-centre/` — KC routes, admin, importer, guide reader, `kcRepo` |
| `scripts/` | CLI import/diagnose scripts (`kc-import-guide.mjs`, etc.) |
| `content/` | Gold Standard guide import JSON (`canada-student-visa-outside-canada.json`) |

## Active CRM module

- Routes: `/service-library`, `/service-library-admin`
- Data: `service_library.academy_metadata` + related SL tables
- Content repo: `content/service-library/*.json` (academy metadata)
- Editor: `AcademyContentEditor` in Service Library Admin

## Database note

`kc_*` migrations may still exist in Supabase from phase 1. They are unused by the app after this archive. Do not delete DB tables without an explicit data migration plan.

## Restoring

To experiment with phase 1 code, move `src/` back to `src/knowledge-centre/` and re-wire routes in `App.tsx` (not recommended for production).
