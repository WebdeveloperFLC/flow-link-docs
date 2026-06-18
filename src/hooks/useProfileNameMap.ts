import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function profileLabel(row: { id: string; full_name?: string | null; email?: string | null }): string {
  return row.full_name?.trim() || row.email?.trim() || row.id.slice(0, 6);
}

/**
 * Resolve profile display names for user ids referenced on a record (tasks, timeline, etc.).
 * Each id is fetched at most once — missing profiles get a stable fallback instead of retry loops.
 */
export function useProfileNameMap(userIds: Array<string | null | undefined>): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  const resolvedRef = useRef(new Set<string>());

  const wantedKey = useMemo(
    () =>
      Array.from(new Set(userIds.filter(Boolean) as string[]))
        .sort()
        .join(","),
    [userIds],
  );

  useEffect(() => {
    const wanted = wantedKey ? wantedKey.split(",") : [];
    const toFetch = wanted.filter((id) => !resolvedRef.current.has(id));
    if (!toFetch.length) return;

    toFetch.forEach((id) => resolvedRef.current.add(id));

    void supabase
      .from("profiles")
      .select("id,full_name,email")
      .in("id", toFetch)
      .then(({ data }) => {
        const rows = data ?? [];
        setNames((prev) => {
          const next = { ...prev };
          let changed = false;
          for (const id of toFetch) {
            const row = rows.find((r) => r.id === id);
            const label = row ? profileLabel(row) : "Unknown user";
            if (next[id] !== label) {
              next[id] = label;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      });
  }, [wantedKey]);

  return names;
}
