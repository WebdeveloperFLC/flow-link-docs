import type { ServiceAcademyMetadata } from "@/lib/service-library/academyTypes";
import type { FeeItem } from "@/lib/serviceLibrary";
import { CANADA_FEE_BREAKDOWNS } from "./canada";
import { UK_FEE_BREAKDOWNS } from "./uk";
import { USA_FEE_BREAKDOWNS } from "./usa";
import { AUSTRALIA_FEE_BREAKDOWNS } from "./australia";
import { GERMANY_FEE_BREAKDOWNS } from "./germany";
import { NZ_FEE_BREAKDOWNS } from "./nz";
import { SCHENGEN_FEE_BREAKDOWNS } from "./schengen";
import { IRELAND_FEE_BREAKDOWNS } from "./ireland";
import { CONSULTANCY_BY_LIBRARY_ID } from "./consultancyFees";
import { buildFeeBreakdownView } from "./formatFeeBreakdown";
import type {
  ConsultancyFeeBreakdownView,
  GovtFeeBreakdownSource,
  GovtFeeBreakdownView,
  ServiceFeeBreakdownView,
} from "./types";

const ALL_GOVT_BREAKDOWNS: GovtFeeBreakdownSource[] = [
  ...CANADA_FEE_BREAKDOWNS,
  ...UK_FEE_BREAKDOWNS,
  ...USA_FEE_BREAKDOWNS,
  ...AUSTRALIA_FEE_BREAKDOWNS,
  ...GERMANY_FEE_BREAKDOWNS,
  ...NZ_FEE_BREAKDOWNS,
  ...SCHENGEN_FEE_BREAKDOWNS,
  ...IRELAND_FEE_BREAKDOWNS,
];

const GOVT_BY_LIBRARY_ID = new Map(ALL_GOVT_BREAKDOWNS.map((b) => [b.libraryId, b]));

function resolveGovtView(libraryId: string, meta?: ServiceAcademyMetadata | null): GovtFeeBreakdownView | null {
  const fromMeta = meta?.feeBreakdown;
  if (fromMeta?.items?.length) {
    return buildFeeBreakdownView({
      libraryId,
      title: fromMeta.title ?? "Government & official fees",
      nativeCurrency: fromMeta.nativeCurrency ?? "—",
      lastVerified: fromMeta.lastVerified ?? "",
      sourceUrl: fromMeta.sourceUrl ?? "",
      disclaimer: fromMeta.disclaimer ?? "",
      items: fromMeta.items,
    });
  }
  const builtIn = GOVT_BY_LIBRARY_ID.get(libraryId);
  if (!builtIn) return null;
  return buildFeeBreakdownView(builtIn);
}

function parseConsultancyFromFeeItems(feeItems: FeeItem[]): ConsultancyFeeBreakdownView | null {
  const rows = feeItems.filter((f) => /consultancy fee \(inr\)/i.test(f.fee_label) && f.amount);
  if (rows.length === 0) return null;
  return {
    lastVerified: "From fee items",
    disclaimer: "Synced from Service Library fee items.",
    packages: rows.map((r, i) => ({
      id: `fee-item-${i}`,
      label: r.notes?.trim() || "Consultancy fee",
      amountInr: Number(String(r.amount).replace(/,/g, "")),
      unit: "per applicant" as const,
      notes: r.notes ?? undefined,
    })),
  };
}

function resolveConsultancyView(
  libraryId: string,
  meta?: ServiceAcademyMetadata | null,
  feeItems?: FeeItem[],
): ConsultancyFeeBreakdownView | null {
  const fromMeta = meta?.consultancyBreakdown;
  if (fromMeta?.packages?.length) {
    return {
      lastVerified: fromMeta.lastVerified ?? "Custom",
      disclaimer: fromMeta.disclaimer ?? "",
      packages: fromMeta.packages,
    };
  }

  const builtIn = CONSULTANCY_BY_LIBRARY_ID.get(libraryId);
  if (builtIn) {
    return {
      lastVerified: builtIn.lastVerified,
      disclaimer: builtIn.disclaimer,
      packages: builtIn.packages,
    };
  }

  const fromDb = feeItems?.length ? parseConsultancyFromFeeItems(feeItems) : null;
  return fromDb;
}

export function resolveServiceFeeBreakdown(
  libraryId: string,
  meta?: ServiceAcademyMetadata | null,
  feeItems?: FeeItem[],
): ServiceFeeBreakdownView | null {
  const govt = resolveGovtView(libraryId, meta);
  const consultancy = resolveConsultancyView(libraryId, meta, feeItems);
  if (!govt && !consultancy) return null;
  return { govt, consultancy };
}

export function hasServiceFeeBreakdown(libraryId: string): boolean {
  return GOVT_BY_LIBRARY_ID.has(libraryId) || CONSULTANCY_BY_LIBRARY_ID.has(libraryId);
}

/** @deprecated Use resolveServiceFeeBreakdown */
export function resolveGovtFeeBreakdown(
  libraryId: string,
  meta?: ServiceAcademyMetadata | null,
): GovtFeeBreakdownView | null {
  return resolveServiceFeeBreakdown(libraryId, meta)?.govt ?? null;
}

/** @deprecated Use hasServiceFeeBreakdown */
export function hasGovtFeeBreakdown(libraryId: string): boolean {
  return hasServiceFeeBreakdown(libraryId);
}
