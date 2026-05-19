import { createContext, useContext, useEffect, useState, ReactNode, createElement } from "react";
import { useEntities } from "./accountingEntitiesStore";
import { SettingsEntity } from "../types/settings";
import { useEntityScope } from "../hooks/useEntityScope";

export interface AccountingEntity {
  id: string;
  name: string;
  country: string;
  currency: string;
  type: SettingsEntity["type"];
}

const PLACEHOLDER: AccountingEntity = {
  id: "none",
  name: "No entity",
  country: "",
  currency: "",
  type: "COMPANY",
};
const FALLBACK: AccountingEntity[] = [PLACEHOLDER];

function toAccountingEntity(e: SettingsEntity): AccountingEntity {
  return { id: e.id, name: e.name, country: e.country, currency: e.currency, type: e.type };
}

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
  const settingsEntities = useEntities();
  const scope = useEntityScope();
  const visibleSettings = scope.isUnrestricted ? settingsEntities : scope.filterEntities(settingsEntities);
  const available = (visibleSettings.length > 0 ? visibleSettings.map(toAccountingEntity) : FALLBACK);
  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) return saved;
    }
    return available[0]?.id ?? "e1";
  });
  const activeEntity =
    available.find((e) => e.id === activeId) ?? available[0] ?? FALLBACK[0];

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, activeEntity.id); } catch {}
  }, [activeEntity]);

  const value: Ctx = {
    activeEntity,
    availableEntities: available,
    fiscalYear: "FY 2024–25",
    quarter: "Q3",
    setActiveEntity: (e) => setActiveId(e.id),
  };

  return createElement(AccountingEntityContext.Provider, { value }, children);
}

export function useAccountingEntity(): Ctx {
  const ctx = useContext(AccountingEntityContext);
  if (ctx) return ctx;
  return {
    activeEntity: FALLBACK[0],
    availableEntities: FALLBACK,
    fiscalYear: "FY 2024–25",
    quarter: "Q3",
    setActiveEntity: () => {},
  };
}