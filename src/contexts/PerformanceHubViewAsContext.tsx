import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/lib/appRoles";
import { isPerformanceHubPath } from "@/lib/performanceHubTokens";
import {
  canUsePerformanceHubViewAs,
  isPerformanceHubViewAsActive,
  performanceHubViewAsRoleOptions,
  readPerformanceHubViewAs,
  writePerformanceHubViewAs,
  type PerformanceHubViewAsState,
} from "@/lib/performanceHubViewAs";
import { viewAsRoleLabel } from "@/lib/roleViewAs";
import {
  PerformancePeriodContext,
  usePerformancePeriod,
} from "@/contexts/PerformancePeriodContext";

export type PerformanceHubPreviewUser = {
  id: string;
  full_name: string | null;
  branch_id: string | null;
};

type PerformanceHubViewAsContextValue = {
  canUse: boolean;
  isActive: boolean;
  previewRole: AppRole | null;
  previewBranchId: string | null;
  previewUserId: string | null;
  roleOptions: AppRole[];
  branchOptions: { id: string; name: string }[];
  userOptions: PerformanceHubPreviewUser[];
  usersLoading: boolean;
  setPreviewRole: (role: AppRole | null) => void;
  setPreviewBranchId: (branchId: string | null) => void;
  setPreviewUserId: (userId: string | null) => void;
  reset: () => void;
  /** Effective user for hub data hooks — preview user or signed-in user */
  effectiveUserId: string | undefined;
  previewRoleLabel: string | null;
};

const PerformanceHubViewAsContext = createContext<PerformanceHubViewAsContextValue | null>(null);

const EMPTY: PerformanceHubViewAsState = { role: null, branchId: null, userId: null };

export function PerformanceHubViewAsProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const onHub = isPerformanceHubPath(location.pathname);
  const {
    user,
    actualRoles,
    previewRoleCatalog,
    setViewAsRole,
    viewAsRole,
    isPlatformOwner,
  } = useAuth();

  const canUse = canUsePerformanceHubViewAs(actualRoles, isPlatformOwner ? "SUPER_ADMIN" : null);
  const roleOptions = useMemo(
    () =>
      performanceHubViewAsRoleOptions(
        actualRoles,
        isPlatformOwner ? "SUPER_ADMIN" : null,
        previewRoleCatalog,
      ),
    [actualRoles, isPlatformOwner, previewRoleCatalog],
  );

  const [state, setState] = useState<PerformanceHubViewAsState>(EMPTY);
  const [userOptions, setUserOptions] = useState<PerformanceHubPreviewUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [adminBranchIds, setAdminBranchIds] = useState<string[] | "all">("all");
  const restoredViewAsRef = useRef<AppRole | null | undefined>(undefined);
  const hubSyncActiveRef = useRef(false);
  const hydratedRef = useRef(false);

  // Hydrate hub preview from session once per mount (deferred to avoid mount-time portal race)
  useEffect(() => {
    if (!user?.id || !canUse || hydratedRef.current) return;
    if (roleOptions.length === 0) return;
    hydratedRef.current = true;
    const stored = readPerformanceHubViewAs(user.id);
    if (!stored.role || !roleOptions.includes(stored.role)) return;

    const frame = window.requestAnimationFrame(() => setState(stored));
    return () => window.cancelAnimationFrame(frame);
  }, [user?.id, canUse, roleOptions]);

  const persist = useCallback(
    (next: PerformanceHubViewAsState | ((prev: PerformanceHubViewAsState) => PerformanceHubViewAsState)) => {
      setState((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        if (user?.id) writePerformanceHubViewAs(user.id, resolved);
        return resolved;
      });
    },
    [user?.id],
  );

  const setPreviewRole = useCallback(
    (role: AppRole | null) => {
      persist({ role, branchId: null, userId: null });
    },
    [persist],
  );

  const setPreviewBranchId = useCallback(
    (branchId: string | null) => {
      persist((prev) => ({ ...prev, branchId, userId: null }));
    },
    [persist],
  );

  const setPreviewUserId = useCallback(
    (userId: string | null) => {
      persist((prev) => ({ ...prev, userId }));
    },
    [persist],
  );

  const reset = useCallback(() => {
    persist(EMPTY);
  }, [persist]);

  // Branches the administrator may preview
  useEffect(() => {
    if (!canUse || !user?.id) return;
    let cancelled = false;

    async function loadBranches() {
      if (isPlatformOwner) {
        if (!cancelled) setAdminBranchIds("all");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("branch_id")
        .eq("id", user!.id)
        .maybeSingle();

      const ids = profile?.branch_id ? [profile.branch_id] : [];
      if (!cancelled) setAdminBranchIds(ids);
    }

    loadBranches();
    return () => {
      cancelled = true;
    };
  }, [canUse, user?.id, isPlatformOwner]);

  const { branches } = usePerformancePeriod();

  const branchOptions = useMemo(() => {
    if (adminBranchIds === "all") return branches;
    return branches.filter((b) => adminBranchIds.includes(b.id));
  }, [branches, adminBranchIds]);

  // Users filtered by selected role (+ optional branch)
  useEffect(() => {
    if (!canUse || !state.role) {
      setUserOptions([]);
      return;
    }
    let cancelled = false;
    setUsersLoading(true);

    async function loadUsers() {
      const roleFilter =
        state.role === "admin"
          ? (["admin", "administrator"] as const)
          : ([state.role] as const);

      const { data: roleRows, error: roleErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", [...roleFilter]);

      if (roleErr || cancelled) {
        if (!cancelled) {
          setUserOptions([]);
          setUsersLoading(false);
        }
        return;
      }

      const ids = [...new Set((roleRows ?? []).map((r) => r.user_id))];
      if (!ids.length) {
        if (!cancelled) {
          setUserOptions([]);
          setUsersLoading(false);
        }
        return;
      }

      let query = supabase.from("profiles").select("id, full_name, branch_id").in("id", ids).order("full_name");

      const branchFilter = state.branchId;
      if (branchFilter) {
        query = query.eq("branch_id", branchFilter);
      }

      const { data, error } = await query;
      if (cancelled) return;

      if (error) {
        setUserOptions([]);
      } else {
        setUserOptions((data ?? []) as PerformanceHubPreviewUser[]);
      }
      setUsersLoading(false);
    }

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [canUse, state.role, state.branchId]);

  // Sync preview role to AuthContext only while on Performance Hub paths (deferred — avoids FIN-R-001 portal crash)
  useEffect(() => {
    if (!canUse) return;

    if (!onHub) {
      if (hubSyncActiveRef.current) {
        setViewAsRole(restoredViewAsRef.current ?? null);
        hubSyncActiveRef.current = false;
      }
      restoredViewAsRef.current = undefined;
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (restoredViewAsRef.current === undefined) {
        restoredViewAsRef.current = viewAsRole;
      }

      if (!state.role) {
        if (hubSyncActiveRef.current) {
          setViewAsRole(restoredViewAsRef.current ?? null);
          hubSyncActiveRef.current = false;
        }
        return;
      }

      hubSyncActiveRef.current = true;
      setViewAsRole(state.role);
    });

    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- never depend on viewAsRole (prevents sync loop)
  }, [canUse, onHub, state.role, setViewAsRole]);

  // Clear user if no longer in filtered list
  useEffect(() => {
    if (!state.userId) return;
    if (!userOptions.some((u) => u.id === state.userId)) {
      persist((prev) => ({ ...prev, userId: null }));
    }
  }, [state.userId, userOptions, persist]);

  const isActive = canUse && isPerformanceHubViewAsActive(state);

  const value = useMemo(
    (): PerformanceHubViewAsContextValue => ({
      canUse,
      isActive,
      previewRole: state.role,
      previewBranchId: state.branchId,
      previewUserId: state.userId,
      roleOptions,
      branchOptions,
      userOptions,
      usersLoading,
      setPreviewRole,
      setPreviewBranchId,
      setPreviewUserId,
      reset,
      effectiveUserId: state.userId ?? user?.id,
      previewRoleLabel: state.role ? viewAsRoleLabel(state.role) : null,
    }),
    [
      canUse,
      isActive,
      state,
      roleOptions,
      branchOptions,
      userOptions,
      usersLoading,
      setPreviewRole,
      setPreviewBranchId,
      setPreviewUserId,
      reset,
      user?.id,
    ],
  );

  return (
    <PerformanceHubViewAsContext.Provider value={value}>{children}</PerformanceHubViewAsContext.Provider>
  );
}

/** Period branch override when View As branch is selected */
export function PerformanceHubPeriodPreviewBridge({ children }: { children: ReactNode }) {
  const base = usePerformancePeriod();
  const preview = usePerformanceHubViewAsOptional();

  const value = useMemo(() => {
    if (!preview?.previewBranchId) return base;
    const label =
      base.branches.find((b) => b.id === preview.previewBranchId)?.name ??
      preview.previewBranchId.slice(0, 8);
    return {
      ...base,
      branchId: preview.previewBranchId,
      branchLabel: label,
    };
  }, [base, preview?.previewBranchId]);

  return (
    <PerformancePeriodContext.Provider value={value}>{children}</PerformancePeriodContext.Provider>
  );
}

export function usePerformanceHubViewAs(): PerformanceHubViewAsContextValue {
  const ctx = useContext(PerformanceHubViewAsContext);
  if (!ctx) {
    throw new Error("usePerformanceHubViewAs must be used within PerformanceHubViewAsProvider");
  }
  return ctx;
}

export function usePerformanceHubViewAsOptional(): PerformanceHubViewAsContextValue | null {
  return useContext(PerformanceHubViewAsContext);
}

/** Hub data hooks — respects optional user override in View As preview */
export function usePerformanceEffectiveUserId(): string | undefined {
  const { user } = useAuth();
  const preview = usePerformanceHubViewAsOptional();
  if (preview?.isActive && preview.previewUserId) return preview.previewUserId;
  if (preview?.isActive && preview.effectiveUserId) return preview.effectiveUserId;
  return user?.id;
}
