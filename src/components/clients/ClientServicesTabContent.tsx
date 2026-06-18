import { ClientServicesCard } from "@/components/clients/ClientServicesCard";
import { ClientJourneyProfileSection } from "@/components/clients/ClientJourneyProfileSection";
import { ClientProgramsCard } from "@/components/clients/ClientProgramsCard";
import { ClientLocationPreferencesSection } from "@/components/clients/ClientLocationPreferencesSection";
import type { ServiceSelection } from "@/components/leads/ServiceTabs";

type Props = {
  clientId: string;
  canEdit: boolean;
  refreshKey?: number;
  onProgramsChanged?: () => void;
  services: Partial<ServiceSelection>;
};

export function ClientServicesTabContent({
  clientId,
  canEdit,
  refreshKey = 0,
  onProgramsChanged,
  services,
}: Props) {
  return (
    <div className="space-y-6">
      <ClientServicesCard clientId={clientId} canEdit={canEdit} />
      <ClientJourneyProfileSection
        clientId={clientId}
        canEdit={canEdit}
        refreshKey={refreshKey}
        blocks={["countries"]}
        title="Interested countries"
      />
      <ClientProgramsCard clientId={clientId} canEdit={canEdit} onChanged={onProgramsChanged} />
      <ClientLocationPreferencesSection clientId={clientId} canEdit={canEdit} services={services} />
    </div>
  );
}
