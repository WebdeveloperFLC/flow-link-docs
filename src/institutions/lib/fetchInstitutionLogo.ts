import { supabase } from "@/integrations/supabase/client";
import { setInstitutionLogoUrl } from "./institutionLogo";
import { probeLogoFromWebsite } from "./institutionLogoProbe";

export type FetchLogoResult = {
  id: string;
  name: string;
  ok: boolean;
  skipped?: boolean;
  logo_url?: string | null;
  source?: string;
  error?: string;
};

export type FetchLogoResponse = {
  ok: boolean;
  fetched?: number;
  skipped?: number;
  failed?: number;
  results: FetchLogoResult[];
};

type InstTarget = {
  id: string;
  name: string;
  website_url: string | null;
  logo_url?: string | null;
};

async function fetchViaBrowser(inst: InstTarget): Promise<FetchLogoResult> {
  if (!inst.website_url?.trim()) {
    return { id: inst.id, name: inst.name, ok: false, error: "no_website" };
  }

  const url = await probeLogoFromWebsite(inst.website_url);
  if (!url) {
    return { id: inst.id, name: inst.name, ok: false, error: "not_found" };
  }

  try {
    await setInstitutionLogoUrl(inst.id, url);
    return { id: inst.id, name: inst.name, ok: true, logo_url: url, source: url };
  } catch (e) {
    return {
      id: inst.id,
      name: inst.name,
      ok: false,
      error: e instanceof Error ? e.message : "save_failed",
    };
  }
}

async function fetchOne(
  inst: InstTarget,
  options?: { force?: boolean },
): Promise<FetchLogoResult> {
  if (inst.logo_url && !options?.force) {
    return { id: inst.id, name: inst.name, ok: true, skipped: true, logo_url: inst.logo_url };
  }
  return fetchViaBrowser(inst);
}

async function fetchMany(
  targets: InstTarget[],
  options?: { force?: boolean; onProgress?: (done: number, total: number) => void },
): Promise<FetchLogoResponse> {
  const results: FetchLogoResult[] = [];
  let fetched = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    options?.onProgress?.(i + 1, targets.length);
    const row = await fetchOne(targets[i], options);
    results.push(row);
    if (row.skipped) skipped++;
    else if (row.ok) fetched++;
    else failed++;
    if (i < targets.length - 1) {
      await new Promise((r) => window.setTimeout(r, 60));
    }
  }

  return { ok: true, fetched, skipped, failed, results };
}

export async function fetchInstitutionLogo(
  institutionId: string,
  options?: { force?: boolean; websiteUrl?: string | null; name?: string; logoUrl?: string | null },
): Promise<FetchLogoResult> {
  if (options?.websiteUrl !== undefined) {
    return fetchOne(
      {
        id: institutionId,
        name: options.name ?? "",
        website_url: options.websiteUrl,
        logo_url: options.logoUrl,
      },
      options,
    );
  }

  const { data, error } = await supabase
    .from("upi_institutions")
    .select("id,name,website_url,logo_url")
    .eq("id", institutionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Institution not found");
  return fetchOne(data as InstTarget, options);
}

export async function fetchInstitutionLogos(
  institutionIds: string[],
  options?: { force?: boolean; onProgress?: (done: number, total: number) => void },
): Promise<FetchLogoResponse> {
  if (!institutionIds.length) return { ok: true, fetched: 0, skipped: 0, failed: 0, results: [] };

  const { data, error } = await supabase
    .from("upi_institutions")
    .select("id,name,website_url,logo_url")
    .in("id", institutionIds);
  if (error) throw error;

  const byId = new Map((data ?? []).map((r) => [r.id, r as InstTarget]));
  const targets = institutionIds.map((id) => byId.get(id)).filter(Boolean) as InstTarget[];
  return fetchMany(targets, options);
}

export async function fetchMissingInstitutionLogos(
  options?: { onProgress?: (done: number, total: number) => void },
): Promise<FetchLogoResponse> {
  const { data, error } = await supabase
    .from("upi_institutions")
    .select("id,name,website_url,logo_url")
    .is("logo_url", null)
    .not("website_url", "is", null)
    .order("name");
  if (error) throw error;

  const targets = ((data ?? []) as InstTarget[]).filter((r) => r.website_url?.trim());
  return fetchMany(targets, options);
}

export function describeLogoFetchError(code: string | undefined): string {
  switch (code) {
    case "no_website":
      return "Add a website URL on the institution profile first";
    case "not_found":
      return "Could not find a logo for this website — upload manually or paste a logo URL";
    case "save_failed":
      return "Found a logo but could not save it — check your permissions";
    default:
      return code ?? "Unknown error";
  }
}
