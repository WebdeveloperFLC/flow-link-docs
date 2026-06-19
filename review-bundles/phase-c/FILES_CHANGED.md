# Phase C — Files Changed

## Phase C cutover (production-facing)

| Path | Change |
|------|--------|
| `src/pages/ClientDetail.tsx` | Profile tab: `UnifiedProfileCard` replaces `ClientProfileCard` + `ClientBackgroundProfileSection`; `CasePeopleCard` retained |

## Phase B.5 dependencies (included in same ship)

| Path | Change |
|------|--------|
| `src/App.tsx` | DEV route `/dev/profile-preview` |
| `src/components/clients/UnifiedProfileCard.tsx` | Full unified card with Client 360 tab |
| `src/components/clients/UnifiedProfileCard.client360.test.tsx` | C360 isolation tests |
| `src/components/profile/Client360ExecutivePanel.tsx` | Read-only Client 360 panel |
| `src/components/profile/ProfileTabNav.tsx` | Six-pill nav |
| `src/components/profile/ProfileTabNav.test.tsx` | Nav tests |
| `src/components/profile/index.ts` | Exports |
| `src/hooks/profile/useProfileEditor.ts` | Tab id support |
| `src/lib/profile/client360Sections.ts` | Deep-link fixes |
| `src/lib/profile/client360Sections.test.ts` | Deep-link tests |
| `src/lib/profile/mockProfileViewModel.ts` | DEV mock data |
| `src/lib/profile/toEditState.ts` | Tab id in edit state |
| `src/lib/profile/types.ts` | `ProfileTabId` |
| `src/pages/dev/ProfilePreviewDevPage.tsx` | DEV preview page |
| `scripts/capture-phase-b5-screenshots.mjs` | Screenshot harness |

## Not modified (per scope)

- Documents tab components
- Payments / commercial tab
- Forms tab
- Communications tab
- Tasks tab
- Team & Access tab
- Activity Log tab
- Client Services tab
- Lead / registration modules
- SQL migrations (no new migrations in this phase)

## Legacy files (repo retained, removed from Profile tab render)

- `src/components/clients/ClientProfileCard.tsx`
- `src/components/clients/ClientBackgroundProfileSection.tsx`
