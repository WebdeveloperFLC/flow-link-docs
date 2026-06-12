import { useEffect, useMemo, useRef, useState } from "react";
import { fetchAllServiceCatalogue, type ServiceCatalogueItem } from "@/lib/leads";
import {
  buildClientServiceEntries,
  collectClientServices,
  guessServiceCodeForPipeline,
} from "@/lib/clientActiveService";
import { parseLibraryIdFromServiceCode } from "@/lib/service-library/serviceCodes";
import {
  findCatalogueItemForStoredCode,
  resolveServiceLabelSync,
  fetchServiceLibraryLabels,
  collectUnresolvedLibraryIds,
} from "@/lib/service-library/resolveServiceLabel";
import { deriveFormsCategory } from "@/lib/service-library/formsCategory";

export type ClientLite = {
  id: string;
  country?: string | null;
  application_type?: string | null;
  interested_countries?: string[] | null;
  pipeline_id?: string | null;
  template_id?: string | null;
  visa_services?: string[] | null;
  coaching_services?: string[] | null;
  admission_services?: string[] | null;
  allied_services?: string[] | null;
  travel_financial_services?: string[] | null;
};

export type ActiveServiceContext = {
  loading: boolean;
  activeServiceCode: string | null;
  libraryId: string | null;
  destinationCountry: string | null;
  formsCategory: string | null;
  serviceLabel: string | null;
  residenceCountry: string | null;
  isCanadaDestination: boolean;
};

function countryFromServiceCode(code: string, item: ServiceCatalogueItem | null, fallback?: string | null) {
  if (code.includes("::")) return code.split("::")[1] ?? fallback ?? null;
  return item?.country_tag ?? fallback ?? null;
}

export function resolveActiveServiceContextSync(params: {
  client: ClientLite;
  catalogue: ServiceCatalogueItem[];
  libraryLabels?: ReadonlyMap<string, string>;
  urlServiceCode?: string | null;
  urlLibraryId?: string | null;
  urlCountry?: string | null;
}): Omit<ActiveServiceContext, "loading"> {
  const codes = collectClientServices(params.client);
  const entries = buildClientServiceEntries(codes, params.catalogue, params.libraryLabels);

  let activeCode: string | null = null;
  if (params.urlServiceCode && codes.includes(params.urlServiceCode)) {
    activeCode = params.urlServiceCode;
  } else if (codes.length === 1) {
    activeCode = codes[0] ?? null;
  } else if (params.client.pipeline_id && codes.length > 1) {
    for (const code of codes) {
      const item = findCatalogueItemForStoredCode(code, params.catalogue);
      if (!item) continue;
      // best-effort: first code wins when sync without async pipeline guess
    }
    activeCode = codes[0] ?? null;
  } else {
    activeCode = codes[0] ?? null;
  }

  const libraryId =
    params.urlLibraryId?.trim() ||
    parseLibraryIdFromServiceCode(activeCode) ||
    parseLibraryIdFromServiceCode(params.urlServiceCode) ||
    null;

  const item = activeCode ? findCatalogueItemForStoredCode(activeCode, params.catalogue) : null;

  const destinationCountry =
    params.urlCountry?.trim() ||
    (activeCode ? countryFromServiceCode(activeCode, item, null) : null) ||
    params.client.interested_countries?.[0]?.trim() ||
    null;

  const formsCategory =
    deriveFormsCategory(item, activeCode, params.client.application_type) ||
    item?.sub_category?.trim() ||
    params.client.application_type?.trim() ||
    null;

  const serviceLabel =
    (activeCode ? resolveServiceLabelSync(activeCode, params.catalogue, params.libraryLabels) : null) ||
    item?.service_name?.trim() ||
    entries.find((e) => e.code === activeCode)?.label ||
    params.client.application_type?.trim() ||
    null;
  const normalizedServiceLabel =
    serviceLabel && activeCode && serviceLabel === activeCode ? null : serviceLabel;

  const residenceCountry = params.client.country?.trim() || null;
  const isCanadaDestination = (destinationCountry ?? "").trim().toLowerCase() === "canada";

  return {
    activeServiceCode: activeCode,
    libraryId,
    destinationCountry,
    formsCategory,
    serviceLabel: normalizedServiceLabel,
    residenceCountry,
    isCanadaDestination,
  };
}

export function useActiveServiceContext(
  client: ClientLite | null,
  searchParams: URLSearchParams,
): ActiveServiceContext {
  const [catalogue, setCatalogue] = useState<ServiceCatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedCode, setResolvedCode] = useState<string | null>(null);

  const urlService = searchParams.get("service");
  const urlLibraryId = searchParams.get("library_id");
  const urlCountry = searchParams.get("sl_country") ?? searchParams.get("country");

  useEffect(() => {
    setLoading(true);
    fetchAllServiceCatalogue()
      .then(setCatalogue)
      .catch(() => setCatalogue([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!client?.id || !client.pipeline_id) {
      setResolvedCode(null);
      return;
    }
    const codes = collectClientServices(client);
    if (codes.length <= 1) {
      setResolvedCode(codes[0] ?? null);
      return;
    }
    let cancelled = false;
    void guessServiceCodeForPipeline(client.pipeline_id, codes, catalogue, client.country).then((code) => {
      if (!cancelled) setResolvedCode(code);
    });
    return () => {
      cancelled = true;
    };
  }, [client, catalogue]);

  const clientCodes = useMemo(
    () => (client ? collectClientServices(client) : []),
    [client],
  );

  const [libraryLabels, setLibraryLabels] = useState<Record<string, string>>({});
  const libraryLabelsRef = useRef(libraryLabels);
  libraryLabelsRef.current = libraryLabels;

  const clientCodesKey = useMemo(
    () => clientCodes.slice().sort().join("\0"),
    [clientCodes],
  );

  const catalogueKey = useMemo(
    () => catalogue.map((s) => s.service_code || s.id).join("\0"),
    [catalogue],
  );

  useEffect(() => {
    if (clientCodes.length === 0) return;
    const missing = collectUnresolvedLibraryIds(
      clientCodes,
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
  }, [clientCodesKey, catalogueKey, clientCodes, catalogue]);

  const labelMap = useMemo(
    () => new Map(Object.entries(libraryLabels)),
    [libraryLabels],
  );

  return useMemo(() => {
    if (!client) {
      return {
        loading,
        activeServiceCode: null,
        libraryId: null,
        destinationCountry: null,
        formsCategory: null,
        serviceLabel: null,
        residenceCountry: null,
        isCanadaDestination: false,
      };
    }

    const urlCode = urlService && clientCodes.includes(urlService) ? urlService : null;
    const activeServiceCode = urlCode ?? resolvedCode ?? clientCodes[0] ?? null;

    const base = resolveActiveServiceContextSync({
      client,
      catalogue,
      libraryLabels: labelMap,
      urlServiceCode: activeServiceCode,
      urlLibraryId,
      urlCountry,
    });

    return { ...base, activeServiceCode, loading };
  }, [client, clientCodes, catalogue, labelMap, loading, resolvedCode, urlService, urlLibraryId, urlCountry]);
}
