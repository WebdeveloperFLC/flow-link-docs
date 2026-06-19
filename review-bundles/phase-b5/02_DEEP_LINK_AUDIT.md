# 02 — Client 360 Deep-Link Audit

**Audit date:** 2026-06-18  
**Source:** `src/lib/profile/client360Sections.ts`  
**CRM tab registry:** `src/components/clients/ClientDetailTabNav.tsx` (`CLIENT_DETAIL_TABS`)

## Registry mapping (post-fix)

| Registry `id` | Label | `detailTabId` | CRM tab exists |
|---------------|-------|---------------|----------------|
| profile | Profile | `profile` | ✅ |
| services | Client Services | `client-services` | ✅ (was `services`) |
| documents | Documents | `documents` | ✅ |
| forms | Forms & Letters | `forms` | ✅ |
| payments | Payments | `commercial` | ✅ |
| comms | Comms | `communications` | ✅ (was `comms`) |
| tasks | Tasks | `tasks` | ✅ |
| team | Team & Access | `team` | ✅ |
| activity | Activity Log | `activity-log` | ✅ (was `activity`) |

## Fixes applied

| Before | After | Reason |
|--------|-------|--------|
| `services` | `client-services` | Matches `CLIENT_DETAIL_TABS` id |
| `comms` | `communications` | Matches CRM Comms tab id |
| `activity` | `activity-log` | Matches Activity Log tab id |

## Automated verification

`src/lib/profile/client360Sections.test.ts` — **5/5 pass**

- Every `detailTabId` resolves to a `CLIENT_DETAIL_TABS` id
- `services` → `client-services`
- `comms` → `communications`
- `activity` → `activity-log`
- `payments` → `commercial`

## Manual spot-check

DEV preview screenshot `07_client360_registry.png` shows registry panel with nine CRM module links. Deep-link navigation is exercised in UAT (Phase C bundle `UAT_CHECKLIST.md`).

## Result

**PASS** — all registry deep-link IDs align with production CRM tab ids.
