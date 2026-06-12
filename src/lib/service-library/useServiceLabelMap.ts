import { useEffect, useMemo, useRef, useState } from "react";
import type { ServiceCatalogueItem } from "@/lib/leads";
import {
  buildServiceLabelMap,
  collectUnresolvedLibraryIds,
  fetchServiceLibraryLabels,
} from "./resolveServiceLabel";

function codesKey(codes: string[]): string {
  return [...new Set(codes.map((c) => c.trim()).filter(Boolean))].sort().join("\0");
}

/** Resolve human-readable labels for stored service codes (incl. variant-parent codes). */
export function useServiceLabelMap(codes: string[], catalogue: ServiceCatalogueItem[]) {
  const [libraryLabels, setLibraryLabels] = useState<Record<string, string>>({});
  const libraryLabelsRef = useRef(libraryLabels);
  libraryLabelsRef.current = libraryLabels;

  const normalizedKey = useMemo(() => codesKey(codes), [codes]);
  const normalizedCodes = useMemo(
    () => (normalizedKey ? normalizedKey.split("\0") : []),
    [normalizedKey],
  );

  const catalogueKey = useMemo(
    () => catalogue.map((s) => s.service_code || s.id).join("\0"),
    [catalogue],
  );

  const labelMap = useMemo(
    () => buildServiceLabelMap(normalizedCodes, catalogue, new Map(Object.entries(libraryLabels))),
    [normalizedCodes, catalogue, libraryLabels],
  );

  useEffect(() => {
    const missing = collectUnresolvedLibraryIds(
      normalizedCodes,
      catalogue,
      new Map(Object.entries(libraryLabelsRef.current)),
    );
    if (missing.length === 0) return;

    let cancelled = false;
    void fetchServiceLibraryLabels(missing)
      .then((fetched) => {
        if (cancelled || fetched.size === 0) return;
        setLibraryLabels((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const [id, label] of fetched) {
            if (next[id] !== label) {
              next[id] = label;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      })
      .catch(() => {
        /* keep sync fallbacks */
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedKey, catalogueKey, normalizedCodes, catalogue]);

  return labelMap;
}
