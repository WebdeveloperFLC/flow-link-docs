import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AppRole = "admin" | "administrator" | "counselor" | "documentation" | "viewer" | "telecaller" | "client" | "commission_admin" | "manager";

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
  canDeleteDocs: boolean;
  isClient: boolean;
  isCommissionAdmin: boolean;
  isAccountingAdmin: boolean;
  isAccountingMember: boolean;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAccountingMember, setIsAccountingMember] = useState(false);
  const [isAccountingAdmin, setIsAccountingAdmin] = useState(false);

  const loadRoles = async (uid: string) => {
    const [{ data: roleRows }, { data: acctRows }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("accounting_users" as any).select("id,status,role").eq("auth_user_id", uid).eq("status", "ACTIVE").limit(1),
    ]);
    setRoles((roleRows ?? []).map((r: any) => r.role as AppRole));
    const acctRow: any = acctRows?.[0];
    setIsAccountingMember(!!acctRow);
    setIsAccountingAdmin(
      !!acctRow && (acctRow.role === "SUPER_ADMIN" || acctRow.role === "FINANCE_ADMIN"),
    );
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadRoles(s.user.id), 0);
      } else {
        setRoles([]);
        setIsAccountingMember(false);
        setIsAccountingAdmin(false);
        // Auto-recover from silent refresh-token failures: if we lose the
        // session while the user is on a protected page, push them to /auth
        // so they can sign back in instead of hitting a cryptic RLS error.
        if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
          try {
            const path = window.location.pathname + window.location.search;
            const onAuthPage = window.location.pathname.startsWith("/auth");
            const onPortalPage = window.location.pathname.startsWith("/portal");
            if (event === "SIGNED_OUT" && !onAuthPage && !onPortalPage) {
              toast.error("Session expired — please sign in again.");
              window.location.replace(`/auth?redirect=${encodeURIComponent(path)}`);
            }
          } catch {
            /* noop */
          }
        }
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
    return arr.some((x) => roles.includes(x) || (x === "admin" && roles.includes("administrator")) || (x === "administrator" && roles.includes("admin")));
  };

  const value: AuthCtx = {
    user,
    session,
    roles,
    loading,
    signOut: async () => { await supabase.auth.signOut(); },
    hasRole,
    isAdmin: roles.includes("admin") || roles.includes("administrator"),
    // Per-document delete (trash icon) visibility. Mirrors Admin's existing
    // delete flow but also exposes it to Edit-tier roles: Counselor and
    // Documentation. Section management (rename/delete section, permanent
    // delete from trash) intentionally remains Admin-only via isAdmin.
    canDeleteDocs: hasRole(["admin", "administrator", "counselor", "documentation"]),
    isClient: roles.includes("client") && !roles.some((r) => ["admin","administrator","counselor","documentation","telecaller","viewer","commission_admin","manager"].includes(r)),
    canEdit: hasRole(["admin", "administrator", "counselor", "documentation", "telecaller", "commission_admin", "manager"]),
    canUpload: hasRole(["admin", "administrator", "counselor", "documentation", "telecaller", "commission_admin", "manager"]),
    canCreateClient: !!user,
    // Mirrors DB is_commission_admin(): commission_admin role OR an
    // accounting admin (SUPER_ADMIN / FINANCE_ADMIN). Plain ACCOUNTANT/
    // AUDITOR/VIEWER accounting users are intentionally excluded — RLS
    // would deny them anyway. Bootstrap mode (no accounting admins yet)
    // is not mirrored client-side; first admin must self-grant.
    isCommissionAdmin: roles.includes("commission_admin") || roles.includes("manager") || isAccountingAdmin,
    isAccountingAdmin,
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
      canDeleteDocs: false,
      isClient: false,
      isCommissionAdmin: false,
      isAccountingAdmin: false,
      isAccountingMember: false,
    } as AuthCtx;
  }
  return c;
};