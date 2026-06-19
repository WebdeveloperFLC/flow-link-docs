# 05 — Phase B.5 Files Changed

## New files

| Path | Purpose |
|------|---------|
| `src/components/profile/Client360ExecutivePanel.tsx` | Read-only Client 360 executive summary panel |
| `src/components/clients/UnifiedProfileCard.client360.test.tsx` | C360-1…C360-13 isolation tests |
| `src/lib/profile/client360Sections.test.ts` | Deep-link registry audit tests |
| `src/lib/profile/mockProfileViewModel.ts` | Mock vm + documents for DEV preview |
| `src/pages/dev/ProfilePreviewDevPage.tsx` | DEV-only `/dev/profile-preview` route |
| `scripts/capture-phase-b5-screenshots.mjs` | Playwright screenshot harness |

## Modified files

| Path | Change |
|------|--------|
| `src/App.tsx` | DEV-only lazy route `/dev/profile-preview` |
| `src/components/clients/UnifiedProfileCard.tsx` | Client 360 tab, preview mode, section testids |
| `src/components/profile/ProfileTabNav.tsx` | Six pills including Client 360 |
| `src/components/profile/ProfileTabNav.test.tsx` | Updated for six tabs |
| `src/components/profile/index.ts` | Export `Client360ExecutivePanel`, `sectionTitle` |
| `src/hooks/profile/useProfileEditor.ts` | `setActiveSection(ProfileTabId)` |
| `src/lib/profile/client360Sections.ts` | Fixed `detailTabId` values |
| `src/lib/profile/toEditState.ts` | `activeSection?: ProfileTabId` |
| `src/lib/profile/types.ts` | `ProfileTabId` type |

## Unchanged (legacy, not removed from repo)

| Path | Note |
|------|------|
| `src/components/clients/ClientProfileCard.tsx` | Replaced in Profile tab at Phase C |
| `src/components/clients/ClientBackgroundProfileSection.tsx` | Replaced in Profile tab at Phase C |

## SQL migrations

None in Phase B.5.
