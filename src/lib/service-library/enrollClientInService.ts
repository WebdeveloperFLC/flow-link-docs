import { completeClientServiceEnrollment, type ClientServiceEnrollmentResult } from "./completeClientServiceEnrollment";

export type { ClientServiceEnrollmentResult };

export async function enrollClientInServiceLibraryApplication(params: {
  clientId: string;
  libraryId: string;
  country: string | null;
  serviceTitle: string;
  subService: string;
  serviceCategory: string;
}): Promise<{ serviceCode: string; pipelineAssigned: boolean; templateAssigned: boolean; gaps: string[] }> {
  const result = await completeClientServiceEnrollment({
    clientId: params.clientId,
    libraryId: params.libraryId,
    country: params.country,
    serviceTitle: params.serviceTitle,
    subService: params.subService,
    serviceCategory: params.serviceCategory,
    counselorNote: `Service Library application: ${params.serviceTitle}`,
  });

  if (!result.serviceCode) {
    throw new Error("Could not resolve service code for this application");
  }

  return {
    serviceCode: result.serviceCode,
    pipelineAssigned: result.pipelineAssigned,
    templateAssigned: result.templateAssigned,
    gaps: result.gaps,
  };
}
