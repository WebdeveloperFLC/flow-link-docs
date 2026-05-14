import { Upload } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";

export default function AccountingUploadPage() {
  return (
    <AppLayout>
      <div className="p-8">
        <AccountingPageHeader
          title="Upload document"
          subtitle="Accounting · Future Link Flow"
        />
        <AccountingEmptyState
          icon={Upload}
          title="Coming soon"
          description="This module will be built in the next phase."
        />
      </div>
    </AppLayout>
  );
}
