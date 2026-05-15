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
      const { data: rows } = await supabase
        .from("accounting_users" as any)
        .select("role,status")
        .eq("auth_user_id", user.id)
        .limit(1);
      if (cancelled) return;
      const row: any = rows?.[0];
      const isActiveAccountingUser = row?.status === "ACTIVE";
      setState({
        loading: false,
        hasAccess: isAdmin || isActiveAccountingUser,
        isBootstrap: false,
        accountingRole: row?.role ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, authLoading]);

  return state;
}