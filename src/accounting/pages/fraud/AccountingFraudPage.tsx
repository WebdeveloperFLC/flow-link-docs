import { ShieldAlert } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";

export default function AccountingFraudPage() {
  return (
    <AppLayout>
      <div className="p-8">
        <AccountingPageHeader
          title="Fraud & audit"
          subtitle="Accounting · Future Link Flow"
        />
        <AccountingEmptyState
          icon={ShieldAlert}
          title="Coming soon"
          description="This module will be built in the next phase."
        />
      </div>
    </AppLayout>
  );
}
