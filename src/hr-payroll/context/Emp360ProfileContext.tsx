import { createContext, useContext, type ReactNode } from "react";
import type { EmployeeRow, ShiftRow } from "../lib/types";
import type { Emp360Filters } from "../lib/emp360Filters";

export type Emp360ProfileContextValue = {
  employee: EmployeeRow;
  employees: EmployeeRow[];
  shift: ShiftRow | undefined;
  cycleLabel: string;
  cycleFrom: string;
  cycleTo: string;
  listFilters: Emp360Filters;
  listBackHref: string;
  profileHref: string;
  profileSearch: string;
  canExport: boolean;
};

const Emp360ProfileContext = createContext<Emp360ProfileContextValue | null>(null);

export function Emp360ProfileProvider({
  value,
  children,
}: {
  value: Emp360ProfileContextValue;
  children: ReactNode;
}) {
  return (
    <Emp360ProfileContext.Provider value={value}>{children}</Emp360ProfileContext.Provider>
  );
}

export function useEmp360Profile() {
  const ctx = useContext(Emp360ProfileContext);
  if (!ctx) throw new Error("useEmp360Profile must be used within Emp360ProfileProvider");
  return ctx;
}
