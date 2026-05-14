import { ReactNode } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import AccountingPageHeader from "../shared/AccountingPageHeader";

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  filterBar?: ReactNode;
  kpiBar?: ReactNode;
  children: ReactNode;
}

export default function ReportShell({ title, subtitle, actions, filterBar, kpiBar, children }: Props) {
  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <AccountingPageHeader title={title} subtitle={subtitle} actions={actions} />
        {filterBar && (
          <div className="sticky top-0 z-20 -mx-8 px-8 py-3 bg-background/95 backdrop-blur border-b border-border">
            {filterBar}
          </div>
        )}
        {kpiBar}
        {children}
      </div>
    </AppLayout>
  );
}