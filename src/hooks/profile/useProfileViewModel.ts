import { useCallback, useEffect, useMemo, useState } from "react";
import { computeCompletion } from "@/lib/profile/profileCompletion";
import { getProfileViewModel } from "@/lib/profile/getProfileViewModel";
import type { ProfileCompletionResult, ProfileViewModel } from "@/lib/profile/types";

export interface UseProfileViewModelResult {
  viewModel: ProfileViewModel | null;
  completion: ProfileCompletionResult | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  applyViewModel: (vm: ProfileViewModel) => void;
}

export function useProfileViewModel(
  clientId: string | null | undefined,
  refreshKey = 0,
): UseProfileViewModelResult {
  const [viewModel, setViewModel] = useState<ProfileViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyViewModel = useCallback((vm: ProfileViewModel) => {
    setViewModel(vm);
    setError(null);
    setLoading(false);
  }, []);

  const reload = useCallback(async () => {
    if (!clientId) {
      setViewModel(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const vm = await getProfileViewModel(clientId);
      setViewModel(vm);
    } catch (e) {
      console.error("[useProfileViewModel] load failed", e);
      setError(e instanceof Error ? e.message : "Failed to load profile");
      setViewModel(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const completion = useMemo(
    () => (viewModel ? computeCompletion(viewModel) : null),
    [viewModel],
  );

  return { viewModel, completion, loading, error, reload, applyViewModel };
}
