import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AccessState {
  loading: boolean;
  hasAccess: boolean;
  isBootstrap: boolean;
  accountingRole: string | null;
}

export function useAccountingAccess(): AccessState {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [state, setState] = useState<AccessState>({
    loading: true,
    hasAccess: false,
    isBootstrap: false,
    accountingRole: null,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState({ loading: false, hasAccess: false, isBootstrap: false, accountingRole: null });
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: rows }, { count }] = await Promise.all([
        supabase
          .from("accounting_users" as any)
          .select("role,status")
          .eq("auth_user_id", user.id)
          .limit(1),
        supabase
          .from("accounting_users" as any)
          .select("id", { count: "exact", head: true }),
      ]);
      if (cancelled) return;
      const row: any = rows?.[0];
      const isBootstrap = (count ?? 0) === 0;
      const isActiveAccountingUser = row?.status === "ACTIVE";
      setState({
        loading: false,
        hasAccess: isAdmin || isActiveAccountingUser || isBootstrap,
        isBootstrap,
        accountingRole: row?.role ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, authLoading]);

  return state;
}