import type { Master } from "@/lib/serviceLibrary";
import { normalizeAcademyMetadata } from "../academyTypes";
import type { MbbsInstitutionOption } from "./types";

export const MBBS_SERVICE_CATEGORY = "mbbs_services";

type MasterRow = Master & { academy_metadata?: unknown };

export function isMbbsServiceRow(m: MasterRow): boolean {
  return m.service_category === MBBS_SERVICE_CATEGORY;
}

export function mbbsInstitutionLabel(m: MasterRow): string {
  const meta = normalizeAcademyMetadata(m.academy_metadata);
  return meta.displayName ?? meta.mbbs?.institutionName ?? m.sub_service;
}

export function resolveMbbsInstitutionOptions(masters: MasterRow[]): MbbsInstitutionOption[] {
  return masters
    .filter((m) => m.is_active && isMbbsServiceRow(m))
    .sort((a, b) => a.display_order - b.display_order || mbbsInstitutionLabel(a).localeCompare(mbbsInstitutionLabel(b)))
    .map((m) => {
      const meta = normalizeAcademyMetadata(m.academy_metadata);
      return {
        id: m.id,
        label: mbbsInstitutionLabel(m),
        isDefault: !!meta.mbbs?.isDefaultLanding,
      };
    });
}

export function resolveDefaultMbbsInstitutionId(masters: MasterRow[]): string | null {
  const options = resolveMbbsInstitutionOptions(masters);
  if (!options.length) return null;
  return options.find((o) => o.isDefault)?.id ?? options[0].id;
}
