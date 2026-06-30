import { useQuery } from "@tanstack/react-query";
import { fetchFxSnapshot } from "@/lib/currencyMaster";
import type { FlcCurrencyConfig, FlcFullCostBreakdown } from "../knowledgeGuide/types";
import { needsFxResolution } from "../knowledgeGuide/resolveCostBreakdownFx";

type Options = {
  breakdown?: FlcFullCostBreakdown | null;
  currencyConfig?: FlcCurrencyConfig | null;
  enabled?: boolean;
};

/** Fetch Currency Master FX snapshot when a ZIP guide needs live INR resolution. */
export function useKnowledgeCentreFxSnapshot(opts: Options) {
  const shouldFetch =
    opts.enabled !== false &&
    needsFxResolution(opts.breakdown ?? undefined, opts.currencyConfig ?? undefined);

  return useQuery({
    queryKey: ["kc-fx-snapshot"],
    queryFn: () => fetchFxSnapshot(),
    enabled: shouldFetch,
    staleTime: 5 * 60_000,
  });
}
