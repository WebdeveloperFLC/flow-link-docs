import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEntities } from "../stores/accountingEntitiesStore";
import type { SettingsEntity } from "../types/settings";

export interface EntityScopeRow {
  id: string;
  accounting_user_id: string;
  scope_type: "country" | "entity";
  country_code: string | null;
  entity_id: string | null;
  can_view: boolean;
  can_edit: boolean;
}

interface ScopeResult {
  loading: boolean;
  isUnrestricted: boolean;
  allowedEntityIds: string[] | null; // null = unrestricted
  canViewEntity: (entityId: string | null | undefined) => boolean;
  canEditEntity: (entityId: string | null | undefined) => boolean;
  canViewCountry: (country: string) => boolean;
  filterEntities: <T extends { id: string }>(items: T[]) => T[];
}

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "FINANCE_ADMIN"]);

export function useEntityScope(): ScopeResult {
  const { user, loading: authLoading } = useAuth();
  const entities = useEntities();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [rows, setRows] = useState<EntityScopeRow[]>([]);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setRole(null);
      setRows([]);
      setFetchFailed(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setFetchFailed(false);
      try {
        const { data: u, error: userErr } = await supabase
          .from("accounting_users" as any)
          .select("id, role, status")
          .eq("auth_user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (userErr) throw userErr;
        if (cancelled) return;
        const acctRow: any = u;
        const r = acctRow?.role ?? null;
        setRole(r);
        if (!acctRow?.id) {
          setRows([]);
          setLoading(false);
          return;
        }
        if (ADMIN_ROLES.has(r)) {
          setRows([]);
          setLoading(false);
          return;
        }
        const { data, error: scopeErr } = await supabase
          .from("accounting_user_entity_scope" as any)
          .select("*")
          .eq("accounting_user_id", acctRow.id);
        if (scopeErr) throw scopeErr;
        if (cancelled) return;
        setRows((data ?? []) as any);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        console.warn("[useEntityScope] failed to load scope", e);
        setFetchFailed(true);
        setRows([]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return useMemo<ScopeResult>(() => {
    const isAdmin = role ? ADMIN_ROLES.has(role) : false;
    if (isAdmin) {
      return {
        loading,
        isUnrestricted: true,
        allowedEntityIds: null,
        canViewEntity: () => true,
        canEditEntity: () => true,
        canViewCountry: () => true,
        filterEntities: (items) => items,
      };
    }

    // Fail closed when scope could not be loaded.
    if (fetchFailed) {
      return {
        loading,
        isUnrestricted: false,
        allowedEntityIds: [],
        canViewEntity: () => false,
        canEditEntity: () => false,
        canViewCountry: () => false,
        filterEntities: () => [],
      };
    }

    const noRows = rows.length === 0;
    if (noRows) {
      return {
        loading,
        isUnrestricted: false,
        allowedEntityIds: [],
        canViewEntity: () => false,
        canEditEntity: () => false,
        canViewCountry: () => false,
        filterEntities: () => [],
      };
    }

    // Build per-entity resolved view/edit
    const countryView = new Map<string, boolean>();
    const countryEdit = new Map<string, boolean>();
    const entityView = new Map<string, boolean>();
    const entityEdit = new Map<string, boolean>();

    for (const r of rows) {
      if (r.scope_type === "country" && r.country_code) {
        countryView.set(r.country_code, r.can_view);
        countryEdit.set(r.country_code, r.can_edit);
      } else if (r.scope_type === "entity" && r.entity_id) {
        entityView.set(r.entity_id, r.can_view);
        entityEdit.set(r.entity_id, r.can_edit);
      }
    }

    const resolveView = (e: SettingsEntity): boolean => {
      if (entityView.has(e.id)) return entityView.get(e.id)!;
      if (e.country && countryView.has(e.country)) return countryView.get(e.country)!;
      return false;
    };
    const resolveEdit = (e: SettingsEntity): boolean => {
      if (!resolveView(e)) return false;
      if (entityEdit.has(e.id)) return entityEdit.get(e.id)!;
      if (e.country && countryEdit.has(e.country)) return countryEdit.get(e.country)!;
      return false;
    };

    const allowed = new Set<string>();
    const editable = new Set<string>();
    for (const e of entities) {
      if (resolveView(e)) allowed.add(e.id);
      if (resolveEdit(e)) editable.add(e.id);
    }

    return {
      loading,
      isUnrestricted: false,
      allowedEntityIds: Array.from(allowed),
      canViewEntity: (id) => !!id && allowed.has(id),
      canEditEntity: (id) => !!id && editable.has(id),
      canViewCountry: (c) => countryView.get(c) === true,
      filterEntities: (items) => items.filter((x) => allowed.has(x.id)),
    };
  }, [loading, role, rows, entities, fetchFailed]);
}

/** Convenience: returns entities filtered by current user's scope. */
export function useScopedEntities(): SettingsEntity[] {
  const entities = useEntities();
  const scope = useEntityScope();
  return useMemo(
    () => (scope.isUnrestricted ? entities : scope.filterEntities(entities)),
    [entities, scope.isUnrestricted, scope.allowedEntityIds],
  );
}