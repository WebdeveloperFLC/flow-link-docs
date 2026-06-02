import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AccessState {
  loading: boolean;
  hasAccess: boolean;
  isBootstrap: boolean;
  accountingRole: string | null;
}

type AccountingUserRow = {
  role: string | null;
  status: string | null;
};

export function useAccountingAccess(): AccessState {
  const { user, loading: authLoading } = useAuth();
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
      try {
        const { data: rows, error } = await supabase
          .from("accounting_users" as never)
          .select("role,status")
          .eq("auth_user_id", user.id)
          .limit(1);
        if (error) throw error;
        if (cancelled) return;
        const row = (rows?.[0] ?? null) as AccountingUserRow | null;
        const isActiveAccountingUser = row?.status === "ACTIVE";
        setState({
          loading: false,
          // CRM admin no longer auto-grants accounting access.
          // Only a row in accounting_users (status ACTIVE) grants access.
          hasAccess: isActiveAccountingUser,
          isBootstrap: false,
          accountingRole: row?.role ?? null,
        });
      } catch (e) {
        if (cancelled) return;
        console.warn("[useAccountingAccess] failed to load access", e);
        setState({
          loading: false,
          hasAccess: false,
          isBootstrap: false,
          accountingRole: null,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return state;
}