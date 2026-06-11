import { supabase } from "@/integrations/supabase/client";
import { fetchAllServiceCatalogue, type ServiceCatalogueItem } from "@/lib/leads";
import { resolvePipelineForServiceLibrary } from "@/lib/stagePipelines";
import { resolvePipelineForServiceCode } from "@/lib/clientActiveService";
import { buildServiceCode, parseLibraryIdFromServiceCode } from "./serviceCodes";
import { fetchWorkflowTemplatesForService } from "./matchWorkflowTemplate";
import { findCatalogueItemForStoredCode } from "./resolveServiceLabel";

type ServiceCategory =
  | "visa_immigration"
  | "coaching_services"
  | "admission_services"
  | "allied_services"
  | "travel_financial";

const SERVICE_FIELD: Record<
  ServiceCategory,
  "visa_services" | "coaching_services" | "admission_services" | "allied_services" | "travel_financial_services"
> = {
  visa_immigration: "visa_services",
  coaching_services: "coaching_services",
  admission_services: "admission_services",
  allied_services: "allied_services",
  travel_financial: "travel_financial",
};

export type ClientServiceEnrollmentResult = {
  serviceCode: string | null;
  pipelineAssigned: boolean;
  templateAssigned: boolean;
  applicationTypeLabel: string | null;
  destinationCountry: string | null;
  gaps: string[];
};

function catalogueItemForCode(code: string, catalogue: ServiceCatalogueItem[]) {
  return findCatalogueItemForStoredCode(code, catalogue);
}

function destinationFromCode(code: string, item: ServiceCatalogueItem | null, fallback?: string | null) {
  if (code.includes("::")) return code.split("::")[1] ?? fallback ?? null;
  return item?.country_tag ?? fallback ?? null;
}

function applicationTypeLabel(
  subService?: string | null,
  serviceTitle?: string | null,
  item?: ServiceCatalogueItem | null,
): string | null {
  const label = item?.sub_category ?? item?.service_name ?? subService ?? serviceTitle ?? null;
  return label?.trim() || null;
}

function mergeInterestedCountries(existing: string[] | null | undefined, destination: string | null): string[] {
  const base = [...(existing ?? [])];
  if (destination && !base.some((c) => c.trim().toLowerCase() === destination.trim().toLowerCase())) {
    return [destination, ...base];
  }
  return base.length ? base : destination ? [destination] : [];
}

/**
 * Wire a client to a Service Library application: services array, pipeline,
 * document binder template, destination country on interested_countries, and
 * human-readable application_type.
 */
export async function completeClientServiceEnrollment(params: {
  clientId: string;
  libraryId?: string | null;
  country?: string | null;
  serviceTitle?: string | null;
  subService?: string | null;
  serviceCategory?: string | null;
  serviceCode?: string | null;
  appendService?: boolean;
  counselorNote?: string | null;
  catalogue?: ServiceCatalogueItem[];
}): Promise<ClientServiceEnrollmentResult> {
  const gaps: string[] = [];
  const catalogue = params.catalogue ?? (await fetchAllServiceCatalogue().catch(() => [] as ServiceCatalogueItem[]));

  const libraryId =
    params.libraryId?.trim() ||
    parseLibraryIdFromServiceCode(params.serviceCode) ||
    null;
  const serviceCode =
    params.serviceCode?.trim() ||
    (libraryId ? buildServiceCode(libraryId, params.country) : null);

  const item = serviceCode ? catalogueItemForCode(serviceCode, catalogue) : null;
  const destination =
    params.country?.trim() ||
    destinationFromCode(serviceCode ?? "", item, null) ||
    null;
  const subService = params.subService?.trim() || item?.sub_category || item?.service_name || null;
  const serviceTitle = params.serviceTitle?.trim() || item?.service_name || subService || null;
  const appType = applicationTypeLabel(subService, serviceTitle, item);

  const { data: client, error: fetchErr } = await supabase
    .from("clients")
    .select(
      "id, visa_services, coaching_services, admission_services, allied_services, travel_financial_services, counselor_notes, country, interested_countries, template_id, application_type",
    )
    .eq("id", params.clientId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!client) throw new Error("Client not found");

  const patch: Record<string, unknown> = {};
  const category = (params.serviceCategory ?? item?.master_key ?? "visa_immigration") as ServiceCategory;
  const field = SERVICE_FIELD[category] ?? "visa_services";

  if (serviceCode && params.appendService !== false) {
    const current = ((client as Record<string, string[] | null>)[field] ?? []) as string[];
    if (!current.includes(serviceCode)) {
      patch[field] = [...current, serviceCode];
    }
  }

  if (destination) {
    patch.interested_countries = mergeInterestedCountries(
      (client as { interested_countries?: string[] | null }).interested_countries,
      destination,
    );
  }

  if (appType) {
    patch.application_type = appType;
  }

  const noteLine = params.counselorNote ?? (serviceTitle ? `Service Library application: ${serviceTitle}` : null);
  if (noteLine) {
    const existingNotes = (client as { counselor_notes?: string | null }).counselor_notes ?? "";
    if (!existingNotes.includes(noteLine)) {
      patch.counselor_notes = existingNotes ? `${existingNotes}\n${noteLine}` : noteLine;
    }
  }

  let pipelineAssigned = false;
  let templateAssigned = false;

  if (serviceTitle && subService) {
    const pipeline = await resolvePipelineForServiceLibrary({
      country: destination ?? (client as { country?: string | null }).country ?? null,
      interestedCountries: (patch.interested_countries as string[] | undefined) ??
        (client as { interested_countries?: string[] | null }).interested_countries ??
        null,
      serviceTitle,
      subService,
    });
    if (pipeline) {
      patch.pipeline_id = pipeline.pipelineId;
      patch.current_stage_id = pipeline.stageId;
      pipelineAssigned = true;
    } else if (serviceCode) {
      const fromCode = await resolvePipelineForServiceCode(
        serviceCode,
        catalogue,
        (client as { country?: string | null }).country,
      );
      if (fromCode) {
        patch.pipeline_id = fromCode.pipelineId;
        patch.current_stage_id = fromCode.stageId;
        pipelineAssigned = true;
      } else {
        gaps.push("pipeline");
      }
    } else {
      gaps.push("pipeline");
    }
  } else if (serviceCode) {
    const fromCode = await resolvePipelineForServiceCode(
      serviceCode,
      catalogue,
      (client as { country?: string | null }).country,
    );
    if (fromCode) {
      patch.pipeline_id = fromCode.pipelineId;
      patch.current_stage_id = fromCode.stageId;
      pipelineAssigned = true;
    } else {
      gaps.push("pipeline");
    }
  }

  if (libraryId && !(client as { template_id?: string | null }).template_id) {
    const templates = await fetchWorkflowTemplatesForService(libraryId, destination);
    if (templates[0]?.id) {
      patch.template_id = templates[0].id;
      templateAssigned = true;
    } else {
      gaps.push("binder_template");
    }
  } else if ((client as { template_id?: string | null }).template_id) {
    templateAssigned = true;
  } else if (libraryId) {
    gaps.push("binder_template");
  }

  if (Object.keys(patch).length > 0) {
    const { error: updateErr } = await supabase.from("clients").update(patch).eq("id", params.clientId);
    if (updateErr) throw updateErr;
  }

  return {
    serviceCode,
    pipelineAssigned,
    templateAssigned,
    applicationTypeLabel: appType,
    destinationCountry: destination,
    gaps,
  };
}
