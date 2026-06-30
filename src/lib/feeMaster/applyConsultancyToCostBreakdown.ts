import {
  consultancyAmountsFromPickerVariant,
  formatStoredAmount,
  isConsultancyCostSection,
} from "./crmPricingRules";
import type { ResolvedFullCostBreakdown } from "@/lib/service-library/knowledgeGuide/resolveCostBreakdownFx";

export type PickerVariantFeeRow = {
  picker_label: string;
  fee_inr: number;
  fee_cad: number;
  display_order: number;
};

function matchVariantToItemLabel(itemLabel: string, variants: PickerVariantFeeRow[]): PickerVariantFeeRow | undefined {
  const norm = itemLabel.toLowerCase();
  const byLabel = variants.find((v) => norm.includes(v.picker_label.toLowerCase()));
  if (byLabel) return byLabel;
  const sorted = [...variants].sort((a, b) => a.display_order - b.display_order);
  const personMatch = norm.match(/(\d+)\s*person/);
  if (personMatch) {
    const n = personMatch[1];
    return sorted.find((v) => v.picker_label.includes(n!));
  }
  return undefined;
}

/**
 * Overlay Fee Master consultancy amounts onto Cost Planning FLC section.
 * Consultancy INR/CAD are stored independently — never derived via Currency Master.
 */
export function applyConsultancyToCostBreakdown(
  resolved: ResolvedFullCostBreakdown,
  variants: PickerVariantFeeRow[],
): ResolvedFullCostBreakdown {
  if (!variants.length) return resolved;

  const sections = resolved.sections.map((section) => {
    if (!isConsultancyCostSection(section)) return section;

    const items = section.items.map((item) => {
      const variant = matchVariantToItemLabel(item.label, variants);
      if (!variant) return item;

      const amounts = consultancyAmountsFromPickerVariant(variant);
      let foreignDisplay = item.foreignDisplay;
      let inrDisplay = item.inrDisplay;

      if (amounts.CAD != null) {
        foreignDisplay = formatStoredAmount(amounts.CAD, "CAD");
      }
      if (amounts.INR != null) {
        inrDisplay = formatStoredAmount(amounts.INR, "INR");
      }

      return {
        ...item,
        foreignDisplay,
        inrDisplay,
        inrAmount: amounts.INR ?? item.inrAmount,
        foreignAmount: amounts.CAD ?? item.foreignAmount,
      };
    });

    return { ...section, items };
  });

  return { ...resolved, sections };
}
