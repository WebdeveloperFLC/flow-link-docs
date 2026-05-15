import { createContext, useContext, useEffect, useState, ReactNode, createElement } from "react";

export interface AccountingEntity {
  id: string;
  name: string;
  country: "CA" | "US" | "IN";
  currency: "CAD" | "USD" | "INR";
  type: "COMPANY" | "BRANCH" | "BRAND" | "PERSONAL";
}

const SEED: AccountingEntity[] = [
  { id: "e1", name: "Future Link Canada HQ", country: "CA", currency: "CAD", type: "COMPANY" },
  { id: "e2", name: "Future Link USA Corp", country: "US", currency: "USD", type: "COMPANY" },
  { id: "e3", name: "Future Link India Pvt Ltd", country: "IN", currency: "INR", type: "COMPANY" },
  { id: "e4", name: "India — Delhi Branch", country: "IN", currency: "INR", type: "BRANCH" },
  { id: "e5", name: "Future Link Academy", country: "IN", currency: "INR", type: "BRAND" },
];

interface Ctx {
  activeEntity: AccountingEntity;
  availableEntities: AccountingEntity[];
  fiscalYear: string;
  quarter: string;
  setActiveEntity: (e: AccountingEntity) => void;
}

const AccountingEntityContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "accounting:activeEntityId";

export function AccountingEntityProvider({ children }: { children: ReactNode }) {
  const [activeEntity, setActiveEntityState] = useState<AccountingEntity>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const found = SEED.find((e) => e.id === saved);
      if (found) return found;
    }
    return SEED[0];
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, activeEntity.id);
    } catch {}
  }, [activeEntity]);

  const value: Ctx = {
    activeEntity,
    availableEntities: SEED,
    fiscalYear: "FY 2024–25",
    quarter: "Q3",
    setActiveEntity: setActiveEntityState,
  };

  return createElement(AccountingEntityContext.Provider, { value }, children);
}

export function useAccountingEntity(): Ctx {
  const ctx = useContext(AccountingEntityContext);
  if (ctx) return ctx;
  // Fallback: allow usage outside provider with a no-op active entity.
  return {
    activeEntity: SEED[0],
    availableEntities: SEED,
    fiscalYear: "FY 2024–25",
    quarter: "Q3",
    setActiveEntity: () => {},
  };
}