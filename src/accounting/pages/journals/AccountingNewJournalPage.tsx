import { FilePlus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";

export default function AccountingNewJournalPage() {
  return (
    <AppLayout>
      <div className="p-8">
        <AccountingPageHeader
          title="New journal"
          subtitle="Accounting · Future Link Flow"
        />
        <AccountingEmptyState
          icon={FilePlus}
          title="Coming soon"
          description="This module will be built in the next phase."
        />
      </div>
    </AppLayout>
  );
}
