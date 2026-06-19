# 03 — Profile Tab Navigation Audit

**Source:** `src/components/profile/ProfileTabNav.tsx`

## Pill order and labels

| # | `id` | Label | Editable | Completion badge |
|---|------|-------|----------|------------------|
| 1 | identity | Identity | Yes | Yes |
| 2 | contact | Contact | Yes | Yes |
| 3 | tests | Tests | Yes | Yes |
| 4 | education | Education | Yes | Yes |
| 5 | experience | Experience | Yes | Yes |
| 6 | client360 | **Client 360** | **No** | No |

## Client 360 isolation (nav layer)

- `ProfileTabId` type: `ProfileSectionId | "client360"` (`src/lib/profile/types.ts`)
- `editingSection` type remains `ProfileSectionId | null` — **excludes** `client360`
- `renderSectionActions()` in `UnifiedProfileCard` returns `null` when `section === "client360"`
- Tab change calls `setActiveSection` only — **no** `profileSave()` on navigation

## Test IDs (screenshot / E2E harness)

| Element | `data-testid` |
|---------|---------------|
| Nav container | `profile-tab-nav` |
| Per-tab button | `profile-tab-{id}` |
| Client 360 panel | `profile-section-client360` |

## Screenshot evidence

- `06_six_pills_client360.png` — six pills visible, Client 360 selected
- `07_client360_registry.png` — Client 360 executive panel content

## Automated tests

- `ProfileTabNav.test.tsx` — 4/4 pass (six tabs, Client 360 label)
- `UnifiedProfileCard.client360.test.tsx` C360-1 — sixth pill exactly "Client 360"

## Result

**PASS** — six-pill nav with read-only Client 360 tab per spec.
