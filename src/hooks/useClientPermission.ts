import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ClientPermission = "view" | "edit" | "upload" | "full" | null;

export function useClientPermission(clientId: string | null | undefined) {
  const { user, isAdmin } = useAuth();
  const [perm, setPerm] = useState<ClientPermission>(isAdmin ? "full" : null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !clientId) { setLoading(false); return; }
    if (isAdmin) { setPerm("full"); setLoading(false); return; }
    let cancelled = false;
    supabase.rpc("user_client_permission", { _uid: user.id, _cid: clientId }).then(({ data }) => {
      if (!cancelled) { setPerm((data as ClientPermission) ?? null); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [user, clientId, isAdmin]);

  return {
    perm,
    loading,
    canView: perm !== null,
    canEdit: perm === "edit" || perm === "upload" || perm === "full",
    canUpload: perm === "upload" || perm === "full",
    isFull: perm === "full",
  };
}