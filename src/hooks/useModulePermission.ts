import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUserPermissions, PermissionMap } from "@/lib/modulePermissions";

const cache = new Map<string, PermissionMap>();

export interface ModulePermission {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  loading: boolean;
}

export function useModulePermission(module: string): ModulePermission {
  const { user, isAdmin } = useAuth();
  const [perms, setPerms] = useState<PermissionMap | null>(
    user ? cache.get(user.id) ?? null : null
  );
  const [loading, setLoading] = useState(!isAdmin && !!user && !cache.has(user?.id ?? ""));

  useEffect(() => {
    let cancelled = false;
    if (!user || isAdmin) {
      setLoading(false);
      return;
    }
    if (cache.has(user.id)) {
      setPerms(cache.get(user.id)!);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchUserPermissions(user.id)
      .then((map) => {
        if (cancelled) return;
        cache.set(user.id, map);
        setPerms(map);
      })
      .catch(() => {
        if (!cancelled) setPerms(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, isAdmin]);

  if (isAdmin) return { canView: true, canEdit: true, canDelete: true, loading: false };
  const row = perms?.[module];
  return {
    canView: !!row?.view,
    canEdit: !!row?.edit,
    canDelete: !!row?.delete,
    loading,
  };
}