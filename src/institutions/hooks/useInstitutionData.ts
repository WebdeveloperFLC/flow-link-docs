import { useEffect, useState, useCallback } from "react";
import {
  agreementsRepo,
  commissionsRepo,
  claimCyclesRepo,
  invoicesRepo,
  promotionsRepo,
  renewalAlertsRepo,
} from "../repositories";
import { RENEWAL_THRESHOLDS_DAYS } from "../config";

function useResource<T>(loader: () => Promise<T[]>, deps: any[]) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loader());
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, loading, reload };
}

export const useAgreements = (institutionId?: string) =>
  useResource(() => agreementsRepo.list(institutionId), [institutionId]);

export const useCommissions = (institutionId?: string) =>
  useResource(() => commissionsRepo.list(institutionId), [institutionId]);

export function useCommissionRules(commissionIds: string[]) {
  const key = commissionIds.join(",");
  return useResource(() => commissionsRepo.rules(commissionIds), [key]);
}

export const useClaimCycles = (institutionId?: string) =>
  useResource(() => claimCyclesRepo.list(institutionId), [institutionId]);

export const useInvoices = (institutionId?: string) =>
  useResource(() => invoicesRepo.list(institutionId), [institutionId]);

export const usePromotions = (institutionId?: string) =>
  useResource(() => promotionsRepo.list(institutionId), [institutionId]);

export function useRenewalCountdown(validTo?: string | null): number | null {
  if (!validTo) return null;
  const ms = new Date(validTo).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function renewalThreshold(daysLeft: number | null): number | null {
  if (daysLeft == null) return null;
  return RENEWAL_THRESHOLDS_DAYS.find((t) => daysLeft <= t) ?? null;
}

export function useRenewalAlerts(agreementIds: string[]) {
  const key = agreementIds.join(",");
  return useResource(() => renewalAlertsRepo.list(agreementIds), [key]);
}