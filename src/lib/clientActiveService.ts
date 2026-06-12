import type { ServiceCatalogueItem } from "@/lib/leads";
import { resolvePipelineForServiceLibrary } from "@/lib/stagePipelines";
import { supabase } from "@/integrations/supabase/client";
import { fetchWorkflowTemplatesForService } from "@/lib/service-library/matchWorkflowTemplate";
import { parseLibraryIdFromServiceCode } from "@/lib/service-library/serviceCodes";
import { parseStoredServiceCode } from "@/lib/service-library/resolveServiceLabel";
import {
  findCatalogueItemForStoredCode,
  resolveServiceLabelSync,
} from "@/lib/service-library/resolveServiceLabel";
import { serviceKeywordsForPipelineMatch } from "@/lib/service-library/formsCategory";

export type ClientServiceEntry = {
  code: string;
  label: string;
  category: "visa" | "coaching" | "admission" | "allied" | "travel";
};

export function collectClientServices(codes: {
  visa_services?: string[] | null;
  coaching_services?: string[] | null;
  admission_services?: string[] | null;
  allied_services?: string[] | null;
  travel_financial_services?: string[] | null;
}): string[] {
  return [
    ...(codes.visa_services ?? []),
    ...(codes.coaching_services ?? []),
    ...(codes.admission_services ?? []),
    ...(codes.allied_services ?? []),
    ...(codes.travel_financial_services ?? []),
  ];
}

export function buildClientServiceEntries(
  codes: string[],
  catalogue: ServiceCatalogueItem[],
  libraryLabels?: ReadonlyMap<string, string>,
): ClientServiceEntry[] {
  return codes.map((code) => {
    const item = findCatalogueItemForStoredCode(code, catalogue);
    const master = item?.master_key ?? "";
    let category: ClientServiceEntry["category"] = "visa";
    if (master === "coaching_services") category = "coaching";
    else if (master === "admission_services") category = "admission";
    else if (master === "allied_services") category = "allied";
    else if (master === "travel_financial") category = "travel";

    return {
      code,
      label: resolveServiceLabelSync(code, catalogue, libraryLabels),
      category,
    };
  });
}

function catalogueItemForCode(code: string, catalogue: ServiceCatalogueItem[]) {
  return findCatalogueItemForStoredCode(code, catalogue);
}

function countryFromServiceCode(code: string, item: ServiceCatalogueItem | null, clientCountry?: string | null) {
  if (code.includes("::")) return code.split("::")[1] ?? clientCountry ?? null;
  return item?.country_tag ?? clientCountry ?? null;
}

function resolveCountryForServiceCode(
  serviceCode: string,
  item: ServiceCatalogueItem | null,
  clientCountry?: string | null,
): string | null {
  const parsed = parseStoredServiceCode(serviceCode);
  return (
    parsed.country ??
    countryFromServiceCode(serviceCode, item, clientCountry) ??
    clientCountry ??
    null
  );
}

export async function resolvePipelineForServiceCode(
  serviceCode: string,
  catalogue: ServiceCatalogueItem[],
  clientCountry?: string | null,
): Promise<{ pipelineId: string; stageId: string } | null> {
  const parsed = parseStoredServiceCode(serviceCode);
  const item = catalogueItemForCode(serviceCode, catalogue);
  const country = resolveCountryForServiceCode(serviceCode, item, clientCountry);
  if (!country) return null;

  const distinctiveTokens = [parsed.variantKey].filter((t): t is string => !!t);
  const title = item?.service_name?.trim() ?? "";
  const fromLibrary = await resolvePipelineForServiceLibrary({
    country,
    serviceTitle: title,
    subService: title,
    libraryId: parsed.libraryId,
    distinctiveTokens,
  });
  if (fromLibrary) return fromLibrary;

  if (!item) return null;
  const { serviceTitle, subService } = serviceKeywordsForPipelineMatch(item, null, country);
  return resolvePipelineForServiceLibrary({
    country,
    serviceTitle,
    subService,
    libraryId: parsed.libraryId,
    distinctiveTokens,
  });
}

/** Latest stage the client reached on a pipeline (from history), or first stage. */
export async function resolveStageForPipeline(
  clientId: string,
  pipelineId: string,
): Promise<string | null> {
  const { data: hist } = await supabase
    .from("client_stage_history")
    .select("stage_id")
    .eq("client_id", clientId)
    .eq("pipeline_id", pipelineId)
    .order("entered_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (hist?.stage_id) return hist.stage_id;

  const { data: first } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("pipeline_id", pipelineId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  return first?.id ?? null;
}

export async function switchClientActiveService(params: {
  clientId: string;
  serviceCode: string;
  catalogue: ServiceCatalogueItem[];
  clientCountry?: string | null;
}): Promise<boolean> {
  const item = catalogueItemForCode(params.serviceCode, params.catalogue);
  const match = await resolvePipelineForServiceCode(
    params.serviceCode,
    params.catalogue,
    params.clientCountry,
  );
  if (!match) return false;

  const stageId = await resolveStageForPipeline(params.clientId, match.pipelineId);
  if (!stageId) return false;

  const patch: Record<string, unknown> = {
    pipeline_id: match.pipelineId,
    current_stage_id: stageId,
  };

  if (item) {
    const label = item.sub_category ?? item.service_name;
    if (label) patch.application_type = label;
  }

  const libraryId = parseLibraryIdFromServiceCode(params.serviceCode);
  const dest = countryFromServiceCode(params.serviceCode, item, params.clientCountry);
  if (libraryId) {
    const templates = await fetchWorkflowTemplatesForService(libraryId, dest);
    if (templates[0]?.id) patch.template_id = templates[0].id;
  }

  const { error } = await supabase.from("clients").update(patch).eq("id", params.clientId);
  if (error) throw error;
  return true;
}

/** Guess which service code matches the client's current pipeline. */
export async function guessServiceCodeForPipeline(
  pipelineId: string | null | undefined,
  serviceCodes: string[],
  catalogue: ServiceCatalogueItem[],
  clientCountry?: string | null,
): Promise<string | null> {
  if (!pipelineId || !serviceCodes.length) return serviceCodes[0] ?? null;

  for (const code of serviceCodes) {
    const match = await resolvePipelineForServiceCode(code, catalogue, clientCountry);
    if (match?.pipelineId === pipelineId) return code;
  }
  return serviceCodes[0] ?? null;
}
