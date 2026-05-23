## What I found

### 1. "InviteClientCard / RPC references non-existent `leads.client_id`"
Verified against the live DB schema — this is a **misdiagnosis**. There is no `leads.client_id` column anywhere in our code; the references are:
- `client_portal_invites.client_id` → FK to `clients(id)` ✓ exists
- `client_portal_links.client_id` → FK to `clients(id)` ✓ exists
- `leads.converted_to_client_id` → FK to `clients(id)` ✓ exists

`InviteClientCard.tsx` correctly queries `client_portal_invites` / `client_portal_links` by `client_id` (the clients PK), not anything on leads. **No schema or migration change is needed.**

What **is** broken: in `src/pages/clients/ClientNew.tsx` line 244, the call to the `client-portal-invite-create` edge function sends `{ client_id, email, access_level }`, but the function reads `{ clientId, email }`. That's why the "Create client login" path silently fails with "Missing fields". This is the real bug to fix.

### 2. "Workflow button still visible in the lead form"
The current source (`src/pages/clients/ClientNew.tsx`) has only sections 1–9 — there is **no Section 10 Workflow** in the codebase. The screenshot is from `dms.futurelinkconsultants.com` (the published custom domain), which is running an older build. The Workflow section was already removed in the current code; the published site just needs a republish.

### 3. "I don't see the Save Client button"
The `Save Client` / `Save Changes` button exists in the `PageHeader`, but `PageHeader` is **not sticky**. As soon as the user scrolls down into sections 5–9, the header (and the only Save button) scrolls off-screen — which matches the screenshot. Same root cause as #2 also explains why the live site doesn't show it: stale published build.

## Fix plan

**Edit `src/pages/clients/ClientNew.tsx` only.** No backend, RLS, schema, or edge-function changes.

1. **Fix the portal invite payload** (line ~244): change
   `body: { client_id: clientId, email: f.email, access_level: portalAccessLevel }`
   →
   `body: { clientId, email: f.email, access_level: portalAccessLevel }`
   so the edge function receives the field it expects.

2. **Make the Save button always reachable.** Add a sticky bottom action bar that mirrors the header's Save/Cancel:
   - Fixed to the bottom of the form column on scroll (`sticky bottom-0` inside the left column, with a translucent backdrop and top border).
   - Same disabled/labels logic as the header button (`Save Client` / `Save Changes` / `Saving…`, disabled until first+last name are filled).
   - Keep the existing header button too, so users see Save whether they're at the top or scrolled deep.

3. **No change to the Workflow section** — it's already absent from the source. After this change is applied and the user republishes from Lovable, the live site will match (no Section 10, Save button visible at top and bottom).

## Out of scope
- `InviteClientCard.tsx`, `client-portal-invite-create/index.ts`, RLS, migrations, `LeadNew.tsx`.
- Security-scan findings shown in the side panel — separate task.
