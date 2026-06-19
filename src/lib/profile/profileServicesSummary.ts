import type { ClientRow } from "@/lib/clientRegistration";
import {
  buildClientServiceEntries,
  collectClientServices,
} from "@/lib/clientActiveService";
import type { ServiceCatalogueItem } from "@/lib/leads";
import type { ProfileServiceCategory, ProfileServicesSummary } from "@/lib/profile/types";

export interface ProfilePipelineSnapshot {
  stage_label: string | null;
  progress_percent: number | null;
}

export interface BuildProfileServicesSummaryInput {
  client: Partial<ClientRow>;
  catalogue?: ServiceCatalogueItem[];
  serviceLabels?: ReadonlyMap<string, string>;
  pipeline?: ProfilePipelineSnapshot | null;
}

/**
 * Pure read-only services snapshot for ProfileViewModel.
 * Not written by profileSave.
 */
export function buildProfileServicesSummary(input: BuildProfileServicesSummaryInput): ProfileServicesSummary {
  const codes = collectClientServices({
    visa_services: input.client.visa_services,
    coaching_services: input.client.coaching_services,
    admission_services: input.client.admission_services,
    allied_services: input.client.allied_services,
    travel_financial_services: input.client.travel_financial_services,
  });

  const catalogue = input.catalogue ?? [];
  const entries = buildClientServiceEntries(codes, catalogue, input.serviceLabels);

  const items = entries.map((e) => ({
    service_code: e.code,
    label: input.serviceLabels?.get(e.code) ?? e.label,
    category: e.category as ProfileServiceCategory,
  }));

  const primaryCode = codes[0] ?? null;
  const primaryItem = primaryCode ? items.find((i) => i.service_code === primaryCode) : null;
  const pipeline = input.pipeline ?? null;

  return {
    total_count: items.length,
    primary_label: primaryItem?.label ?? null,
    primary_service_code: primaryCode,
    items,
    pipeline: pipeline
      ? {
          stage_label: pipeline.stage_label,
          progress_percent: pipeline.progress_percent,
        }
      : null,
  };
}

/** Test helper — build services summary with explicit label map (no catalogue fetch). */
export function buildProfileServicesSummaryFromCodes(
  codes: {
    visa?: string[];
    coaching?: string[];
    admission?: string[];
    allied?: string[];
    travel?: string[];
  },
  labels?: Record<string, string>,
  pipeline?: ProfilePipelineSnapshot | null,
): ProfileServicesSummary {
  const allCodes = [
    ...(codes.visa ?? []),
    ...(codes.coaching ?? []),
    ...(codes.admission ?? []),
    ...(codes.allied ?? []),
    ...(codes.travel ?? []),
  ];
  const fakeCatalogue = allCodes.map(
    (code) =>
      ({
        id: code,
        code,
        label: labels?.[code] ?? code,
        master_key: code.includes("coaching") || code.includes("ielts") ? "coaching_services" : "visa_services",
        country_tag: code.includes("::") ? code.split("::")[0] : null,
        active: true,
      }) as ServiceCatalogueItem,
  );

  return buildProfileServicesSummary({
    client: {
      visa_services: codes.visa,
      coaching_services: codes.coaching,
      admission_services: codes.admission,
      allied_services: codes.allied,
      travel_financial_services: codes.travel,
    },
    catalogue: fakeCatalogue,
    serviceLabels: labels ? new Map(Object.entries(labels)) : undefined,
    pipeline,
  });
}
