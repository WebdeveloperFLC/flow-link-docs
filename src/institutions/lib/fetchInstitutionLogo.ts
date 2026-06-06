import { supabase } from "@/integrations/supabase/client";

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

function errorMessage(error: unknown, data: unknown): string {
  if (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string") {
    return (data as { error: string }).error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Logo fetch failed";
}

export async function fetchInstitutionLogo(
  institutionId: string,
  options?: { force?: boolean },
): Promise<FetchLogoResult> {
  const { data, error } = await supabase.functions.invoke("upi-fetch-institution-logo", {
    body: { institution_id: institutionId, force: options?.force ?? false },
  });
  if (error) throw new Error(errorMessage(error, data));
  const resp = data as FetchLogoResponse;
  const row = resp.results?.[0];
  if (!row) throw new Error("No result returned");
  return row;
}

export async function fetchInstitutionLogos(
  institutionIds: string[],
  options?: { force?: boolean },
): Promise<FetchLogoResponse> {
  const { data, error } = await supabase.functions.invoke("upi-fetch-institution-logo", {
    body: { institution_ids: institutionIds, force: options?.force ?? false },
  });
  if (error) throw new Error(errorMessage(error, data));
  return data as FetchLogoResponse;
}

export async function fetchMissingInstitutionLogos(): Promise<FetchLogoResponse> {
  const { data, error } = await supabase.functions.invoke("upi-fetch-institution-logo", {
    body: { only_missing: true },
  });
  if (error) throw new Error(errorMessage(error, data));
  return data as FetchLogoResponse;
}

export function describeLogoFetchError(code: string | undefined): string {
  switch (code) {
    case "no_website":
      return "Add a website URL on the institution profile first";
    case "not_found":
      return "Could not find a logo on the website — upload manually";
    default:
      return code ?? "Unknown error";
  }
}
