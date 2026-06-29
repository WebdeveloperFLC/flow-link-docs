/**
 * Agreement priority stack — constitutional layers cannot be bypassed.
 */
import type { CommercialAgreementConfig, PriorityLayer } from "./types";
import { CONSTITUTIONAL_LAYERS, DEFAULT_COMMERCIAL_AGREEMENT_CONFIG } from "./defaultCommercialAgreementConfig";

export function getPriorityStack(config: CommercialAgreementConfig = DEFAULT_COMMERCIAL_AGREEMENT_CONFIG): PriorityLayer[] {
  const stack = [...config.priorityStack];
  for (const layer of CONSTITUTIONAL_LAYERS) {
    if (!stack.includes(layer)) stack.unshift(layer);
  }
  return stack;
}

/** Returns false if a proposed bypass would skip customer ownership */
export function canBypassLayer(
  fromLayer: PriorityLayer,
  toLayer: PriorityLayer,
  config: CommercialAgreementConfig = DEFAULT_COMMERCIAL_AGREEMENT_CONFIG,
): boolean {
  const stack = getPriorityStack(config);
  const fromIdx = stack.indexOf(fromLayer);
  const toIdx = stack.indexOf(toLayer);
  if (fromIdx < 0 || toIdx < 0) return false;
  if (toLayer === "customer_ownership" || toLayer === "constitution") return false;
  return toIdx > fromIdx;
}

/** Ownership evaluation must complete before agreement resolution */
export function ownershipPrecedesAgreement(config: CommercialAgreementConfig = DEFAULT_COMMERCIAL_AGREEMENT_CONFIG): boolean {
  const stack = getPriorityStack(config);
  return stack.indexOf("customer_ownership") < stack.indexOf("commercial_agreement");
}
