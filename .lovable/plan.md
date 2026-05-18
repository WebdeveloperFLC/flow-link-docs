# Fix: admin sees 0 bills and "No accounts found" in Create Journal

## Root cause

It's not RLS or missing permissions. Confirmed via DB:
- `accounting_ap_bills` has 2 rows (Shree Ram Enterprise, EONS Immigration).
- Admin Santosh (`19a39fcc-…`) exists in `accounting_users` as `SUPER_ADMIN / ACTIVE`, so `is_accounting_user(auth.uid())` would return true.
- Balveer (`417404c4-…`) is `ACCOUNTANT / ACTIVE`.

Network trace from the admin's session shows the problem: the `GET /rest/v1/accounting_ap_bills` request goes out with **only the anon `apikey`** and no user `Authorization` Bearer header, while the `accounting_users` request a few seconds later carries the proper user JWT.

Reason: every accounting store does this at module-import time:

```ts
if (typeof window !== "undefined") void hydrateFromSupabase();
```

Module import happens before `supabase-js` has finished restoring the session from `localStorage` and attaching the user's access token to outgoing requests. PostgREST therefore treats the request as anon, `auth.uid()` is `null`, `is_accounting_user(null)` is `false`, and RLS returns `[]`. The local store overwrites whatever was cached, so the UI shows zero.

This affects 9 stores — all eager-hydrating at import:
`apBillsStore`, `arInvoicesStore`, `journalsStore`, `coaStore`, `vendorsStore`, `clientsStore`, `accountingEntitiesStore`, `bankAccountsStore`, `accountingMastersStore`.

That's why:
- Admin "sees 0 of 0 bills" even though Balveer's 2 bills exist.
- The Create-Journal account picker says "No accounts found" — the same race emptied `coaStore` (the 1 COA row in DB is gone from local state).
- Whether it appears for a given user is a coin flip based on how fast the session is restored from `localStorage` on that machine.

## Fix

Gate every store's first hydrate on the auth session being ready, and re-hydrate when the user signs in.

### 1. New helper `src/accounting/stores/_hydrationGate.ts`

```ts
import { supabase } from "@/integrations/supabase/client";

export function runWhenAuthReady(fn: () => void | Promise<void>) {
  if (typeof window === "undefined") return;

  // First load: wait for session restore from localStorage, then run.
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) void fn();
  });

  // Re-run on sign-in (covers logout→login without page reload).
  supabase.auth.onAuthStateChange((event, session) => {
    if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
      void fn();
    }
  });
}
```

### 2. Update the 9 stores

In each file, replace the eager call:

```ts
if (typeof window !== "undefined") void hydrateFromSupabase();
```

with:

```ts
import { runWhenAuthReady } from "./_hydrationGate";
runWhenAuthReady(hydrateFromSupabase);
```

For `coaStore` (which has a `hydrated` boolean guard), reset that guard before re-hydrate so the post-login re-run actually fetches, or change the guard to "in-flight" rather than "ever-ran".

### Out of scope

- No DB / RLS changes — current policies are correct.
- No change to `useAccountingAccess` — admin already passes.
- No change to mock-data fallback behavior.

## Verification

1. Hard-reload `/accounting/ap` as Santosh: the 2 bills appear; aging shows CA$5,884.25 in Current.
2. Open `003/26-27` → "Create journal": the account search returns the 1 seeded COA row instead of "No accounts found".
3. Log out → log back in as Balveer in the same tab: bills/COA still load (covers the `onAuthStateChange` path).
4. Confirm network trace: `GET /rest/v1/accounting_ap_bills` now carries the user JWT in `Authorization`.
