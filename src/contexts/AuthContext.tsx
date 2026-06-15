import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  canShowViewAsSwitcher,
  canUseFullPreviewCatalog,
  effectiveRolesForView,
  isPlatformOwner,
  isViewAsRoleAllowed,
  readPreviewCatalog,
  readViewAsRole,
  roleIncludesAdmin,
  viewAsOptionsForUser,
  writePreviewCatalog,
  writeViewAsRole,
} from "@/lib/roleViewAs";
import type { AppRole } from "@/lib/appRoles";

export type { AppRole } from "@/lib/appRoles";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  /** Effective roles for navigation and UI gates (respects View-as preview) */
  roles: AppRole[];
  /** Roles assigned in the database */
  actualRoles: AppRole[];
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
  /** View-as preview (HR Payroll pattern) */
  viewAsRole: AppRole | null;
  setViewAsRole: (role: AppRole | null) => void;
  isViewAsActive: boolean;
  canUseViewAs: boolean;
  /** Company owner — full View-as catalog (overrides team Administrator) */
  isPlatformOwner: boolean;
  canUseFullPreviewCatalog: boolean;
  /** @deprecated use canUseFullPreviewCatalog */
  canPreviewAllRoles: boolean;
  /** @deprecated use canUseFullPreviewCatalog */
  isSuperRoleViewer: boolean;
  viewAsOptions: AppRole[];
  previewRoleCatalog: AppRole[];
  setPreviewRoleCatalog: (roles: AppRole[]) => void;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

function buildHasRole(roles: AppRole[]) {
  return (r: AppRole | AppRole[]) => {
    const arr = Array.isArray(r) ? r : [r];
    return arr.some(
      (x) =>
        roles.includes(x) ||
        (x === "admin" && roles.includes("administrator")) ||
        (x === "administrator" && roles.includes("admin")),
    );
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [actualRoles, setActualRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAccountingMember, setIsAccountingMember] = useState(false);
  const [isAccountingAdmin, setIsAccountingAdmin] = useState(false);
  const [accountingRole, setAccountingRole] = useState<string | null>(null);
  const [viewAsRole, setViewAsRoleState] = useState<AppRole | null>(null);
  const [previewRoleCatalog, setPreviewRoleCatalogState] = useState<AppRole[]>([]);

  const loadRoles = async (uid: string) => {
    const [{ data: roleRows }, { data: acctRows }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("accounting_users" as any).select("id,status,role").eq("auth_user_id", uid).eq("status", "ACTIVE").limit(1),
    ]);
    setActualRoles((roleRows ?? []).map((r: any) => r.role as AppRole));
    const acctRow: any = acctRows?.[0];
    const acctMember = !!acctRow;
    const acctAdmin = !!acctRow && (acctRow.role === "SUPER_ADMIN" || acctRow.role === "FINANCE_ADMIN");
    setIsAccountingMember(acctMember);
    setIsAccountingAdmin(acctAdmin);
    setAccountingRole(acctRow?.role ?? null);

    const loadedRoles = (roleRows ?? []).map((r: any) => r.role as AppRole);
    const catalog = readPreviewCatalog(uid);
    setPreviewRoleCatalogState(catalog);

    const storedViewAs = readViewAsRole(uid);
    const fullCatalog = canUseFullPreviewCatalog(loadedRoles, acctRow?.role ?? null);
    if (storedViewAs && isViewAsRoleAllowed(storedViewAs, loadedRoles, fullCatalog)) {
      setViewAsRoleState(storedViewAs);
    } else {
      setViewAsRoleState(null);
      writeViewAsRole(uid, null);
    }
  };

  const setViewAsRole = useCallback(
    (role: AppRole | null) => {
      setViewAsRoleState(role);
      if (user?.id) writeViewAsRole(user.id, role);
    },
    [user?.id],
  );

  const setPreviewRoleCatalog = useCallback(
    (roles: AppRole[]) => {
      setPreviewRoleCatalogState(roles);
      if (user?.id) writePreviewCatalog(user.id, roles);
      if (viewAsRole && !roles.includes(viewAsRole)) {
        setViewAsRole(null);
      }
    },
    [user?.id, viewAsRole, setViewAsRole],
  );

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadRoles(s.user.id), 0);
      } else {
        setActualRoles([]);
        setIsAccountingMember(false);
        setIsAccountingAdmin(false);
        setAccountingRole(null);
        setViewAsRoleState(null);
        setPreviewRoleCatalogState([]);
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

  const isOwner = isPlatformOwner(actualRoles, accountingRole);
  const useFullCatalog = canUseFullPreviewCatalog(actualRoles, accountingRole);
  const roles = useMemo(
    () => effectiveRolesForView(actualRoles, viewAsRole),
    [actualRoles, viewAsRole],
  );
  const viewAsOptions = useMemo(
    () => viewAsOptionsForUser(actualRoles, useFullCatalog, previewRoleCatalog),
    [actualRoles, useFullCatalog, previewRoleCatalog],
  );
  const canUseViewAs = canShowViewAsSwitcher(actualRoles, useFullCatalog);
  const isViewAsActive = viewAsRole != null;

  const hasRole = buildHasRole(roles);

  const effectiveIsAccountingAdmin = isViewAsActive
    ? roleIncludesAdmin(roles)
    : isAccountingAdmin;
  const effectiveIsAccountingMember = isViewAsActive
    ? roleIncludesAdmin(roles) || roles.includes("commission_admin")
    : isAccountingMember;

  const value: AuthCtx = {
    user,
    session,
    roles,
    actualRoles,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    hasRole,
    isAdmin: roleIncludesAdmin(roles),
    canDeleteDocs: hasRole(["admin", "administrator", "counselor", "documentation"]),
    isClient:
      roles.includes("client") &&
      !roles.some((r) =>
        [
          "admin",
          "administrator",
          "counselor",
          "documentation",
          "telecaller",
          "viewer",
          "director",
          "commission_admin",
          "manager",
        ].includes(r),
      ),
    canEdit: hasRole(["admin", "administrator", "counselor", "documentation", "telecaller", "commission_admin", "manager"]),
    canUpload: hasRole(["admin", "administrator", "counselor", "documentation", "telecaller", "commission_admin", "manager"]),
    canCreateClient: !!user,
    isCommissionAdmin:
      roles.includes("commission_admin") || roles.includes("manager") || effectiveIsAccountingAdmin,
    isAccountingAdmin: effectiveIsAccountingAdmin,
    isAccountingMember: effectiveIsAccountingMember,
    viewAsRole,
    setViewAsRole,
    isViewAsActive,
    canUseViewAs,
    isPlatformOwner: isOwner,
    canUseFullPreviewCatalog: useFullCatalog,
    canPreviewAllRoles: useFullCatalog,
    isSuperRoleViewer: useFullCatalog,
    viewAsOptions,
    previewRoleCatalog,
    setPreviewRoleCatalog,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) {
    return {
      user: null,
      session: null,
      roles: [],
      actualRoles: [],
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
      viewAsRole: null,
      setViewAsRole: () => {},
      isViewAsActive: false,
      canUseViewAs: false,
      isPlatformOwner: false,
      canUseFullPreviewCatalog: false,
      canPreviewAllRoles: false,
      isSuperRoleViewer: false,
      viewAsOptions: [],
      previewRoleCatalog: [],
      setPreviewRoleCatalog: () => {},
    } as AuthCtx;
  }
  return c;
};
