import { supabase } from "@/integrations/supabase/client";

/**
 * Defer a hydrate call until the Supabase auth session has been restored
 * from localStorage. Without this, top-level `hydrateFromSupabase()` calls
 * race the session restore: the request goes out with only the anon apikey,
 * RLS evaluates `auth.uid()` as null, and the store gets overwritten with [].
 *
 * Also re-runs on SIGNED_IN / TOKEN_REFRESHED so a logout→login in the same
 * tab repopulates the stores.
 */
export function runWhenAuthReady(fn: () => void | Promise<void>) {
  if (typeof window === "undefined") return;

  void supabase.auth.getSession().then(({ data }) => {
    if (data.session) void fn();
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
      void fn();
    }
  });
}