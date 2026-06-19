# Phase C Production Impact Audit

## User-visible changes

| Area | Impact |
|------|--------|
| Profile tab layout | Two legacy cards → single `UnifiedProfileCard` with section pills |
| Profile editing | Section-level Edit/Save (identity, contact, tests, education, experience) |
| Client 360 | New read-only tab within Profile |
| Case people | Unchanged below profile card |
| All other CRM tabs | Unchanged |

## Removed from Profile tab

| Feature | Previous location | Status |
|---------|-------------------|--------|
| Passport re-extract | `ClientProfileCard` | **Removed from UI** — handlers exist but unwired |
| Odoo sync | `ClientProfileCard` | **Removed from UI** — handlers exist but unwired |

## Save path consolidation

**Before:** Dual paths — `ClientProfileCard` saves + `ClientBackgroundProfileSection` saves  
**After:** Single path — `profileSave()` via `useProfileEditor` only

Risk reduced: no conflicting parallel saves on Profile tab.

## Database

No new SQL in Phase C ship. Prior `client_document_refs` migrations must be published for document linking.

## DEV route

`/dev/profile-preview` — stripped from production build via `import.meta.env.DEV`.

## Deployment steps

1. Ship to GitHub `main` + `feature/service-library-nav`
2. Lovable → Publish (approve pending migrations if any)
3. Hard refresh (Cmd+Shift+R)
4. Team UAT per `UAT_CHECKLIST.md`

## Rollback

Revert `ClientDetail.tsx` Profile tab to render `ClientProfileCard` + `ClientBackgroundProfileSection`; remove `UnifiedProfileCard` import. No DB rollback required.

## Verdict

**Medium user-facing impact** on Profile tab UX only. Other modules unaffected. Re-extract/Odoo gap requires product sign-off.
