# Phase B — Files Changed

## New files

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/profile/useProfileViewModel.ts` | Load vm + completion |
| `src/hooks/profile/useProfileEditor.ts` | Edit state + profileSave |
| `src/hooks/profile/useProfileDocuments.ts` | Document list + upload/link |
| `src/hooks/profile/index.ts` | Barrel export |

### Presentational components
| File | Purpose |
|------|---------|
| `src/components/profile/ProfileTabNav.tsx` | Section pill navigation |
| `src/components/profile/ProfileCompletionBadge.tsx` | Completion badge |
| `src/components/profile/ProfileMetaBar.tsx` | CRM meta read-only bar |
| `src/components/profile/ProfileViewSummaries.tsx` | View-mode summaries |
| `src/components/profile/ProfileServicesBlock.tsx` | Services read-only block |
| `src/components/profile/ProfileIdentityContactPanels.tsx` | Identity + Contact panels |
| `src/components/profile/ProfileTestsPanel.tsx` | Tests tab composition |
| `src/components/profile/TestScoreBlock.tsx` | Per-test score display |
| `src/components/profile/ProfileEducationPanel.tsx` | Education records |
| `src/components/profile/ProfileExperiencePanel.tsx` | Experience records |
| `src/components/profile/LinkedDocumentsPanel.tsx` | Document slot linking UI |
| `src/components/profile/Client360RegistryPanel.tsx` | Client 360 registry scaffold |
| `src/components/profile/index.ts` | Barrel export |

### Container
| File | Purpose |
|------|---------|
| `src/components/clients/UnifiedProfileCard.tsx` | Profile container (hooks + components) |

### Client 360 registry
| File | Purpose |
|------|---------|
| `src/lib/profile/client360Sections.ts` | Section registry definitions |

### Tests
| File | Tests |
|------|-------|
| `src/components/profile/ProfileTabNav.test.tsx` | 3 |
| `src/components/profile/TestScoreBlock.test.tsx` | 3 |
| `src/components/profile/profileComponents.test.tsx` | 6 |

## Modified files

| File | Change |
|------|--------|
| `src/lib/profile/index.ts` | Export `client360Sections` helpers |

## Unchanged (explicitly out of scope)

| Area | Status |
|------|--------|
| `src/pages/ClientDetail.tsx` | Legacy profile cards remain |
| `src/components/clients/ClientProfileCard.tsx` | Unchanged |
| `src/components/clients/ClientBackgroundProfileSection.tsx` | Unchanged |
| Database migrations | None in Phase B |
