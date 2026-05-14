import { FileScan } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import AccountingEmptyState from "../../components/shared/AccountingEmptyState";

export default function AccountingOCRPage() {
  return (
    <AppLayout>
      <div className="p-8">
        <AccountingPageHeader
          title="OCR review"
          subtitle="Accounting · Future Link Flow"
        />
        <AccountingEmptyState
          icon={FileScan}
          title="Coming soon"
          description="This module will be built in the next phase."
        />
      </div>
    </AppLayout>
  );
}
