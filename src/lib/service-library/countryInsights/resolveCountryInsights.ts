import type { ServiceAcademyMetadata } from "../academyTypes";
import { factsTitleFor, resolveCountryProfile } from "./profiles";
import type { CountryInsightsView } from "./types";

export function resolveCountryInsights(
  country: string | null | undefined,
  meta: ServiceAcademyMetadata,
): CountryInsightsView | null {
  if (!country) return null;
  const profile = resolveCountryProfile(country);
  const workingRights = meta.workingRights ?? null;
  const fullCostBreakdown = meta.fullCostBreakdown ?? null;
  if (!profile && !workingRights && !fullCostBreakdown) return null;

  return {
    country,
    factsTitle: factsTitleFor(country),
    countryProfile: profile,
    workingRights,
    fullCostBreakdown,
  };
}

export function hasCountryInsightsContent(view: CountryInsightsView | null): boolean {
  if (!view) return false;
  return !!(
    view.countryProfile?.facts?.length ||
    view.countryProfile?.costOfLiving?.items?.length ||
    view.workingRights?.applicant?.summary ||
    view.workingRights?.spouse?.summary ||
    view.fullCostBreakdown?.sections?.length
  );
}
