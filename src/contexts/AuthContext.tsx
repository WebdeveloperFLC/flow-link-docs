import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "counselor" | "documentation" | "viewer" | "telecaller" | "client" | "commission_admin";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (r: AppRole | AppRole[]) => boolean;
  canEdit: boolean;
  canUpload: boolean;
  canCreateClient: boolean;
  isAdmin: boolean;
  isClient: boolean;
  isCommissionAdmin: boolean;
  isAccountingMember: boolean;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAccountingMember, setIsAccountingMember] = useState(false);

  const loadRoles = async (uid: string) => {
    const [{ data: roleRows }, { data: acctRows }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("accounting_users" as any).select("id,status").eq("auth_user_id", uid).eq("status", "ACTIVE").limit(1),
    ]);
    setRoles((roleRows ?? []).map((r: any) => r.role as AppRole));
    setIsAccountingMember(!!acctRows && acctRows.length > 0);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadRoles(s.user.id), 0);
      } else {
        setRoles([]);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadRoles(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const hasRole = (r: AppRole | AppRole[]) => {
    const arr = Array.isArray(r) ? r : [r];
    return arr.some((x) => roles.includes(x));
  };

  const value: AuthCtx = {
    user,
    session,
    roles,
    loading,
    signOut: async () => { await supabase.auth.signOut(); },
    hasRole,
    isAdmin: roles.includes("admin"),
    isClient: roles.includes("client") && !roles.some((r) => ["admin","counselor","documentation","telecaller","viewer"].includes(r)),
    canEdit: hasRole(["admin", "counselor", "documentation"]),
    canUpload: hasRole(["admin", "counselor", "documentation"]),
    canCreateClient: !!user,
    isCommissionAdmin: roles.includes("commission_admin") || isAccountingMember,
    isAccountingMember,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) {
    // Fallback during HMR or before provider mounts — avoid hard crash.
    return {
      user: null,
      session: null,
      roles: [],
      loading: true,
      signOut: async () => {},
      hasRole: () => false,
      canEdit: false,
      canUpload: false,
      canCreateClient: false,
      isAdmin: false,
      isClient: false,
      isCommissionAdmin: false,
      isAccountingMember: false,
    } as AuthCtx;
  }
  return c;
};