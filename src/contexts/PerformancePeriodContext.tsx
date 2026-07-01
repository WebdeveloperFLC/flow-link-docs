import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { currentPeriodKey } from "@/lib/performanceHubTheme";

const STORAGE_KEY = "flc-performance-period-v1";

type BranchRow = { id: string; name: string };

interface PerformancePeriodContextValue {
  period: string;
  setPeriod: (p: string) => void;
  branchId: string;
  setBranchId: (id: string) => void;
  branchLabel: string;
  branches: BranchRow[];
  branchesLoading: boolean;
}

const PerformancePeriodContext = createContext<PerformancePeriodContextValue | null>(null);

export { PerformancePeriodContext };

function readStored(): { period: string; branchId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { period: currentPeriodKey(), branchId: "" };
    const j = JSON.parse(raw) as { period?: string; branchId?: string };
    return {
      period: j.period?.trim() || currentPeriodKey(),
      branchId: j.branchId ?? "",
    };
  } catch {
    return { period: currentPeriodKey(), branchId: "" };
  }
}

export function PerformancePeriodProvider({ children }: { children: ReactNode }) {
  const stored = readStored();
  const [period, setPeriodState] = useState(stored.period);
  const [branchId, setBranchIdState] = useState(stored.branchId);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);

  const persist = useCallback((p: string, b: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ period: p, branchId: b }));
  }, []);

  const setPeriod = useCallback(
    (p: string) => {
      setPeriodState(p);
      persist(p, branchId);
    },
    [branchId, persist],
  );

  const setBranchId = useCallback(
    (id: string) => {
      setBranchIdState(id);
      persist(period, id);
    },
    [period, persist],
  );

  useEffect(() => {
    supabase
      .from("branches")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        setBranches((data ?? []) as BranchRow[]);
        setBranchesLoading(false);
      });
  }, []);

  const branchLabel = useMemo(() => {
    if (!branchId) return "All branches";
    return branches.find((b) => b.id === branchId)?.name ?? branchId.slice(0, 8);
  }, [branchId, branches]);

  const value = useMemo(
    () => ({
      period,
      setPeriod,
      branchId,
      setBranchId,
      branchLabel,
      branches,
      branchesLoading,
    }),
    [period, setPeriod, branchId, setBranchId, branchLabel, branches, branchesLoading],
  );

  return (
    <PerformancePeriodContext.Provider value={value}>{children}</PerformancePeriodContext.Provider>
  );
}

export function usePerformancePeriod(): PerformancePeriodContextValue {
  const ctx = useContext(PerformancePeriodContext);
  if (!ctx) {
    throw new Error("usePerformancePeriod must be used within PerformancePeriodProvider");
  }
  return ctx;
}

/** Safe fallback when provider is not mounted (legacy pages). */
export function usePerformancePeriodOptional(): PerformancePeriodContextValue | null {
  return useContext(PerformancePeriodContext);
}
