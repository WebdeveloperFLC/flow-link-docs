import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  agreementsRepo,
  commissionsRepo,
  claimCyclesRepo,
  invoicesRepo,
  promotionsRepo,
  renewalAlertsRepo,
  studentsRepo,
  campaignsRepo,
  suggestionsRepo,
  paymentsRepo,
} from "../repositories";
import { RENEWAL_THRESHOLDS_DAYS } from "../config";

function useResource<T>(loader: () => Promise<T[]>, deps: any[]) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loader());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load data";
      setError(msg);
      setData([]);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, loading, error, reload };
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

export const useStudents = (institutionId?: string) =>
  useResource(() => studentsRepo.list(institutionId), [institutionId]);

export const useCampaigns = (institutionId?: string) =>
  useResource(() => campaignsRepo.list(institutionId), [institutionId]);

export const useSuggestions = (institutionId?: string) =>
  useResource(() => suggestionsRepo.list(institutionId), [institutionId]);

export const usePayments = () => useResource(() => paymentsRepo.list(), []);