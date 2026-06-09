import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DshMedia, HubTab } from "../lib/dshTypes";

export interface DshFilters {
  tab: HubTab;
  search: string;
  contentType?: string;
  country?: string;
  branchId?: string;
  serviceMasterKey?: string;
  status?: "active" | "archived" | "all";
}

export function useDshMedia(filters: DshFilters) {
  return useQuery({
    queryKey: ["dsh_media", filters],
    queryFn: async () => {
      let q = supabase
        .from("dsh_media" as any)
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(500);

      // Tab filters
      switch (filters.tab) {
        case "common":
          q = q.eq("content_scope", "common"); break;
        case "country":
          q = q.eq("content_scope", "country"); break;
        case "institution":
          q = q.eq("content_scope", "institution"); break;
        case "service":
          q = q.eq("content_scope", "service_category"); break;
        case "google_reviews":
          q = q.eq("is_google_review", true); break;
        case "front_desk":
          q = q.eq("is_front_desk", true); break;
      }

      const status = filters.status ?? "active";
      if (status !== "all") q = q.eq("status", status);

      if (filters.contentType) q = q.eq("content_type", filters.contentType);
      if (filters.country) q = q.eq("country_name", filters.country);
      if (filters.branchId) q = q.eq("branch_id", filters.branchId);
      if (filters.serviceMasterKey) q = q.eq("service_master_key", filters.serviceMasterKey);

      if (filters.search?.trim()) {
        const tokens = filters.search.trim().split(/\s+/).map((t) => t.replace(/[^\w]/g, "")).filter(Boolean);
        if (tokens.length) {
          const tsq = tokens.map((t) => `${t}:*`).join(" & ");
          q = q.textSearch("search_doc", tsq, { config: "simple" });
        }
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as DshMedia[];
    },
  });
}

export function useServiceCatalogueOptions() {
  return useQuery({
    queryKey: ["dsh_service_catalogue_options"],
    queryFn: async () => {
      const { fetchAllServiceCatalogue } = await import("@/lib/leads");
      const items = await fetchAllServiceCatalogue();
      return items.map((s) => ({
        master_key: s.master_key,
        sub_category: s.sub_category ?? null,
        service_name: s.service_name,
      }));
    },
  });
}

export function useBranches() {
  return useQuery({
    queryKey: ["dsh_branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name, city, country")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["dsh_team_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string | null; email: string | null }[];
    },
  });
}