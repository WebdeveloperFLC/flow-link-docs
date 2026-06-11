import type { ServiceAcademyMetadata } from "../academyTypes";
import type { FullCostBreakdown } from "../countryInsights/types";
import saba from "../../../../content/service-library/mbbs-saba-university.json";
import synergy from "../../../../content/service-library/mbbs-synergy-university.json";
import mua from "../../../../content/service-library/mbbs-medical-university-americas.json";
import stMatthews from "../../../../content/service-library/mbbs-st-matthews-university.json";
import seu from "../../../../content/service-library/mbbs-georgian-national-university-seu.json";
import ibsu from "../../../../content/service-library/mbbs-international-black-sea-university.json";
import avicenna from "../../../../content/service-library/mbbs-avicenna-batumi.json";

const MBBS_PROGRAM_COSTS = new Map<string, FullCostBreakdown>([
  ["b2000001-0001-4000-8000-0000000000d1", saba.fullCostBreakdown as FullCostBreakdown],
  ["b2000001-0001-4000-8000-0000000000d2", synergy.fullCostBreakdown as FullCostBreakdown],
  ["b2000001-0001-4000-8000-0000000000d3", mua.fullCostBreakdown as FullCostBreakdown],
  ["b2000001-0001-4000-8000-0000000000d4", stMatthews.fullCostBreakdown as FullCostBreakdown],
  ["b2000001-0001-4000-8000-0000000000d5", seu.fullCostBreakdown as FullCostBreakdown],
  ["b2000001-0001-4000-8000-0000000000d6", ibsu.fullCostBreakdown as FullCostBreakdown],
  ["b2000001-0001-4000-8000-0000000000d7", avicenna.fullCostBreakdown as FullCostBreakdown],
]);

/** Program tuition / living breakdown — prefer repo JSON over stale DB placeholders. */
export function resolveMbbsFullCostBreakdown(
  libraryId: string,
  meta?: ServiceAcademyMetadata | null,
): FullCostBreakdown | null {
  const builtIn = MBBS_PROGRAM_COSTS.get(libraryId);
  if (builtIn?.sections?.length) return builtIn;
  const fromMeta = meta?.fullCostBreakdown;
  if (fromMeta?.sections?.length) return fromMeta as FullCostBreakdown;
  return null;
}

export function hasMbbsProgramCostBreakdown(libraryId: string): boolean {
  return MBBS_PROGRAM_COSTS.has(libraryId);
}
