import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { runWhenAuthReady } from "./_hydrationGate";

export interface OwnerDirectorLink {
  id: string;
  companyProfileId: string;
  individualProfileId: string;
  role: string;
  ownershipPercent: number | null;
  createdAt: string;
}

let rows: OwnerDirectorLink[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function fromDb(r: any): OwnerDirectorLink {
  return {
    id: r.id,
    companyProfileId: r.company_profile_id,
    individualProfileId: r.individual_profile_id,
    role: r.role,
    ownershipPercent: r.ownership_percent != null ? Number(r.ownership_percent) : null,
    createdAt: r.created_at,
  };
}

async function hydrate() {
  try {
    const { data, error } = await supabase
      .from("owner_profile_directors" as any)
      .select("*");
    if (error) throw error;
    rows = (data ?? []).map(fromDb);
    emit();
  } catch (e) {
    console.warn("[ownerDirectorsStore] hydrate failed", e);
  }
}
runWhenAuthReady(hydrate);

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export function useDirectorsForCompany(companyId: string): OwnerDirectorLink[] {
  const get = () => rows.filter((r) => r.companyProfileId === companyId);
  return useSyncExternalStore(subscribe, get, get);
}

export async function addDirector(input: {
  companyProfileId: string;
  individualProfileId: string;
  role: string;
  ownershipPercent?: number | null;
}): Promise<OwnerDirectorLink | null> {
  try {
    const { data, error } = await supabase
      .from("owner_profile_directors" as any)
      .insert({
        company_profile_id: input.companyProfileId,
        individual_profile_id: input.individualProfileId,
        role: input.role,
        ownership_percent: input.ownershipPercent ?? null,
      } as any)
      .select("*")
      .single();
    if (error) throw error;
    const created = fromDb(data);
    rows = [created, ...rows];
    emit();
    return created;
  } catch (e: any) {
    console.warn("[ownerDirectorsStore] addDirector failed", e);
    toast.error(`Failed to add director: ${e?.message ?? "unknown"}`);
    return null;
  }
}

export async function updateDirector(
  id: string,
  patch: Partial<Pick<OwnerDirectorLink, "role" | "ownershipPercent">>,
): Promise<void> {
  const prev = rows.find((r) => r.id === id);
  if (!prev) return;
  const next = { ...prev, ...patch };
  rows = rows.map((r) => (r.id === id ? next : r));
  emit();
  try {
    const { error } = await supabase
      .from("owner_profile_directors" as any)
      .update({
        role: next.role,
        ownership_percent: next.ownershipPercent ?? null,
      } as any)
      .eq("id", id);
    if (error) throw error;
  } catch (e: any) {
    rows = rows.map((r) => (r.id === id ? prev : r));
    emit();
    toast.error(`Failed to update director: ${e?.message ?? "unknown"}`);
  }
}

export async function removeDirector(id: string): Promise<void> {
  const prev = rows;
  rows = rows.filter((r) => r.id !== id);
  emit();
  try {
    const { error } = await supabase.from("owner_profile_directors" as any).delete().eq("id", id);
    if (error) throw error;
  } catch (e: any) {
    rows = prev;
    emit();
    toast.error(`Failed to remove director: ${e?.message ?? "unknown"}`);
  }
}