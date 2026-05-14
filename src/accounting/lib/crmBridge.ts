import { supabase } from "@/integrations/supabase/client";

export type CRMClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
};

export async function getCRMClients(): Promise<CRMClient[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id,full_name,email,phone,country")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((c: any) => ({
    id: c.id,
    name: c.full_name,
    email: c.email ?? null,
    phone: c.phone ?? null,
    country: c.country ?? null,
  }));
}

export type CRMVendor = { id: string; name: string; category: string };
export async function getCRMVendors(): Promise<CRMVendor[]> {
  // Wire when CRM vendor module exists
  return [];
}

export type CRMDeal = { id: string; title: string; value: number; clientId: string };
export async function getCRMDeals(): Promise<CRMDeal[]> {
  // Wire when CRM deals module exists
  return [];
}