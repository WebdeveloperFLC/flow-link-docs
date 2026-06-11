import { useEffect, useMemo, useState } from "react";
import { fetchAllServiceCatalogue, type ServiceCatalogueItem } from "@/lib/leads";
import {
  buildClientServiceEntries,
  collectClientServices,
  guessServiceCodeForPipeline,
} from "@/lib/clientActiveService";
import { parseLibraryIdFromServiceCode } from "@/lib/service-library/serviceCodes";

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
  urlServiceCode?: string | null;
  urlLibraryId?: string | null;
  urlCountry?: string | null;
}): Omit<ActiveServiceContext, "loading"> {
  const codes = collectClientServices(params.client);
  const entries = buildClientServiceEntries(codes, params.catalogue);

  let activeCode: string | null = null;
  if (params.urlServiceCode && codes.includes(params.urlServiceCode)) {
    activeCode = params.urlServiceCode;
  } else if (codes.length === 1) {
    activeCode = codes[0] ?? null;
  } else if (params.client.pipeline_id && codes.length > 1) {
    for (const code of codes) {
      const item = params.catalogue.find((s) => (s.service_code || s.id) === code);
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

  const item = activeCode
    ? params.catalogue.find((s) => (s.service_code || s.id) === activeCode) ?? null
    : null;

  const destinationCountry =
    params.urlCountry?.trim() ||
    (activeCode ? countryFromServiceCode(activeCode, item, null) : null) ||
    params.client.interested_countries?.[0]?.trim() ||
    null;

  const formsCategory =
    item?.sub_category?.trim() ||
    item?.service_name?.trim() ||
    params.client.application_type?.trim() ||
    null;

  const serviceLabel =
    item?.service_name?.trim() ||
    entries.find((e) => e.code === activeCode)?.label ||
    params.client.application_type?.trim() ||
    null;

  const residenceCountry = params.client.country?.trim() || null;
  const isCanadaDestination = (destinationCountry ?? "").trim().toLowerCase() === "canada";

  return {
    activeServiceCode: activeCode,
    libraryId,
    destinationCountry,
    formsCategory,
    serviceLabel,
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

    const urlCode = urlService && collectClientServices(client).includes(urlService) ? urlService : null;
    const activeServiceCode = urlCode ?? resolvedCode ?? collectClientServices(client)[0] ?? null;

    const base = resolveActiveServiceContextSync({
      client,
      catalogue,
      urlServiceCode: activeServiceCode,
      urlLibraryId,
      urlCountry,
    });

    return { ...base, activeServiceCode, loading };
  }, [client, catalogue, loading, resolvedCode, urlService, urlLibraryId, urlCountry]);
}
