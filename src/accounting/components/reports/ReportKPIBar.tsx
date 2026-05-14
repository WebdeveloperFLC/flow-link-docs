import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  cols?: 3 | 4 | 5;
}

export default function ReportKPIBar({ children, cols = 4 }: Props) {
  const grid = cols === 5 ? "lg:grid-cols-5" : cols === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";
  return <div className={`grid grid-cols-1 sm:grid-cols-2 ${grid} gap-4`}>{children}</div>;
}