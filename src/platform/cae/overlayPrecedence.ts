/**
 * Overlay constitutional stack — client-side mirror of fn_cae_resolve_effective_commercial_position ordering.
 */
import type { CommercialOfferOverlay, OverlayStackLayer } from "./types";
import { DEFAULT_COMMERCIAL_AGREEMENT_CONFIG } from "./defaultCommercialAgreementConfig";

export const OVERLAY_STACK_LAYER_ORDER: OverlayStackLayer[] =
  DEFAULT_COMMERCIAL_AGREEMENT_CONFIG.overlayStackLayers ?? [
    "constitution",
    "customer_ownership",
    "commercial_agreement",
    "overlay",
    "promotion",
    "incentive",
    "settlement_rules",
    "workflow",
    "accounting",
  ];

const layerRank = new Map(OVERLAY_STACK_LAYER_ORDER.map((layer, idx) => [layer, idx]));

export function overlayStackRank(layer: OverlayStackLayer | string | undefined): number {
  if (!layer) return OVERLAY_STACK_LAYER_ORDER.length;
  return layerRank.get(layer as OverlayStackLayer) ?? OVERLAY_STACK_LAYER_ORDER.length;
}

export function compareOverlayPrecedence(a: CommercialOfferOverlay, b: CommercialOfferOverlay): number {
  const layerDiff = overlayStackRank(a.stackLayer) - overlayStackRank(b.stackLayer);
  if (layerDiff !== 0) return layerDiff;

  const rankA = a.precedenceRank ?? DEFAULT_COMMERCIAL_AGREEMENT_CONFIG.overlayPrecedenceDefault ?? 100;
  const rankB = b.precedenceRank ?? DEFAULT_COMMERCIAL_AGREEMENT_CONFIG.overlayPrecedenceDefault ?? 100;
  if (rankA !== rankB) return rankA - rankB;

  return b.validFrom.localeCompare(a.validFrom);
}

export function sortOverlaysByPrecedence(overlays: CommercialOfferOverlay[]): CommercialOfferOverlay[] {
  return [...overlays].sort(compareOverlayPrecedence);
}

/** Higher-precedence overlay wins when both apply to the same scope */
export function winningOverlay(
  overlays: CommercialOfferOverlay[],
  opts?: { offerType?: string },
): CommercialOfferOverlay | null {
  const sorted = sortOverlaysByPrecedence(overlays);
  if (!opts?.offerType) return sorted[0] ?? null;
  return sorted.find((o) => o.offerType === opts.offerType) ?? null;
}
