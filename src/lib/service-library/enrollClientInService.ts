import { supabase } from "@/integrations/supabase/client";
import { resolvePipelineForServiceLibrary } from "@/lib/stagePipelines";
import { buildServiceCode } from "./serviceCodes";

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
  travel_financial: "travel_financial_services",
};

export async function enrollClientInServiceLibraryApplication(params: {
  clientId: string;
  libraryId: string;
  country: string | null;
  serviceTitle: string;
  subService: string;
  serviceCategory: string;
}): Promise<{ serviceCode: string; pipelineAssigned: boolean }> {
  const { clientId, libraryId, country, serviceTitle, subService, serviceCategory } = params;
  const serviceCode = buildServiceCode(libraryId, country);
  const field = SERVICE_FIELD[serviceCategory as ServiceCategory] ?? "visa_services";

  const { data: client, error: fetchErr } = await supabase
    .from("clients")
    .select(
      "id, visa_services, coaching_services, admission_services, allied_services, travel_financial_services, counselor_notes, country, interested_countries",
    )
    .eq("id", clientId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!client) throw new Error("Client not found");

  const current = ((client as Record<string, string[] | null>)[field] ?? []) as string[];
  const nextServices = current.includes(serviceCode) ? current : [...current, serviceCode];

  const noteLine = `Service Library application: ${serviceTitle}`;
  const existingNotes = (client as { counselor_notes?: string | null }).counselor_notes ?? "";
  const counselor_notes = existingNotes.includes(noteLine)
    ? existingNotes
    : existingNotes
      ? `${existingNotes}\n${noteLine}`
      : noteLine;

  const pipeline = await resolvePipelineForServiceLibrary({
    country: country ?? (client as { country?: string | null }).country ?? null,
    interestedCountries: (client as { interested_countries?: string[] | null }).interested_countries ?? null,
    serviceTitle,
    subService,
  });

  const patch: Record<string, unknown> = {
    [field]: nextServices,
    counselor_notes,
  };

  if (pipeline) {
    patch.pipeline_id = pipeline.pipelineId;
    patch.current_stage_id = pipeline.stageId;
  }

  const { error: updateErr } = await supabase.from("clients").update(patch).eq("id", clientId);
  if (updateErr) throw updateErr;

  return { serviceCode, pipelineAssigned: !!pipeline };
}
