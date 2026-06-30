import type { ServiceAcademyMetadata } from "../academyTypes";
import type { FullCostBreakdown } from "../countryInsights/types";
import {
  avicenna_batumi as avicenna,
  georgian_national_university_seu as seu,
  international_black_sea_university as ibsu,
  medical_university_americas as mua,
  saba_university as saba,
  st_matthews_university as stMatthews,
  synergy_university as synergy,
} from "./data/mbbsData.generated";

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
