import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/** Display name for the signed-in user (profile full_name, then auth metadata). */
export function useProfileDisplayName(): string {
  const { user } = useAuth();
  const [name, setName] = useState("");

  useEffect(() => {
    if (!user) {
      setName("");
      return;
    }

    const fromMeta =
      (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
      (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
      "";

    if (fromMeta) {
      setName(fromMeta);
      return;
    }

    let cancelled = false;
    void supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setName(data?.full_name?.trim() ?? "");
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return name;
}
