import { useEffect, useMemo, useState } from "react";
import type { ServiceCatalogueItem } from "@/lib/leads";
import {
  buildServiceLabelMap,
  collectUnresolvedLibraryIds,
  fetchServiceLibraryLabels,
} from "./resolveServiceLabel";

/** Resolve human-readable labels for stored service codes (incl. variant-parent codes). */
export function useServiceLabelMap(codes: string[], catalogue: ServiceCatalogueItem[]) {
  const [libraryLabels, setLibraryLabels] = useState<Map<string, string>>(() => new Map());

  const normalizedCodes = useMemo(
    () => [...new Set(codes.map((c) => c.trim()).filter(Boolean))],
    [codes],
  );

  const unresolvedIds = useMemo(
    () => collectUnresolvedLibraryIds(normalizedCodes, catalogue, libraryLabels),
    [normalizedCodes, catalogue, libraryLabels],
  );

  useEffect(() => {
    if (unresolvedIds.length === 0) return;
    let cancelled = false;
    void fetchServiceLibraryLabels(unresolvedIds)
      .then((next) => {
        if (cancelled) return;
        setLibraryLabels((prev) => {
          const merged = new Map(prev);
          for (const [id, label] of next) merged.set(id, label);
          return merged;
        });
      })
      .catch(() => {
        /* keep sync fallbacks */
      });
    return () => {
      cancelled = true;
    };
  }, [unresolvedIds.join("|")]);

  return useMemo(
    () => buildServiceLabelMap(normalizedCodes, catalogue, libraryLabels),
    [normalizedCodes, catalogue, libraryLabels],
  );
}
