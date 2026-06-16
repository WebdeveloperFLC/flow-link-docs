import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  caseIsClosed,
  fetchCasesForClient,
  resolveActiveServiceCase,
  type ClientServiceCase,
} from "@/lib/clientServiceCase";

export function useActiveServiceCase(
  clientId: string,
  serviceCode: string | null,
  pipelineId: string | null,
  refreshKey = 0,
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [serviceCase, setServiceCase] = useState<ClientServiceCase | null>(null);
  const [allCases, setAllCases] = useState<ClientServiceCase[]>([]);
  const [loading, setLoading] = useState(true);

  const caseIdFromUrl = searchParams.get("case");

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const cases = await fetchCasesForClient(clientId);
      setAllCases(cases);
      const active = await resolveActiveServiceCase({
        clientId,
        serviceCode,
        caseIdFromUrl,
        pipelineId,
      });
      setServiceCase(active);
    } finally {
      setLoading(false);
    }
  }, [clientId, serviceCode, caseIdFromUrl, pipelineId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const setActiveCaseId = useCallback(
    (caseId: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("case", caseId);
        return next;
      });
    },
    [setSearchParams],
  );

  const isClosed = useMemo(() => caseIsClosed(serviceCase), [serviceCase]);

  const lineage = useMemo(() => {
    if (!serviceCase) return [];
    const chain: ClientServiceCase[] = [serviceCase];
    let cursor = serviceCase.reapplicationOf;
    const byId = new Map(allCases.map((c) => [c.id, c]));
    while (cursor) {
      const parent = byId.get(cursor);
      if (!parent) break;
      chain.unshift(parent);
      cursor = parent.reapplicationOf;
    }
    return chain;
  }, [serviceCase, allCases]);

  return {
    serviceCase,
    allCases,
    loading,
    isClosed,
    lineage,
    reload: load,
    setActiveCaseId,
  };
}
